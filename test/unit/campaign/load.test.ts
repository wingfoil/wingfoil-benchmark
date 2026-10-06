import { copyFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { campaignId, loadCampaign } from '../../../src/campaign/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { repoPath } from '../../support/paths.js';

type Yaml = Record<string, unknown>;

function issuesOf(yaml: Yaml | string, scenarios?: readonly string[]) {
  const result = loadCampaign(writeRepo(yaml, scenarios).file);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function paths(yaml: Yaml | string, scenarios?: readonly string[]): string[] {
  return issuesOf(yaml, scenarios).map((issue) => issue.path);
}

function withField(path: string[], value: unknown): Yaml {
  const yaml = completeCampaignYaml();
  let node: Yaml = yaml;
  for (const key of path.slice(0, -1)) node = node[key] as Yaml;
  const last = path[path.length - 1] as string;
  if (value === undefined) Reflect.deleteProperty(node, last);
  else node[last] = value;
  return yaml;
}

describe('loadCampaign', () => {
  it('returns the identity and the scenarios and results roots', () => {
    const { root, file } = writeRepo();
    const result = loadCampaign(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(campaignId(completeCampaignYaml()));
    expect(result.value.file).toBe(file);
    expect(result.value.resultsRoot).toBe(`${root}/results`);
    expect(result.value.armsRoot).toBe(`${root}/arms`);
    expect(result.value.scenariosRoot).toBe(`${root}/scenarios`);
  });

  it('accepts the trivial fixture campaign', () => {
    const result = loadCampaign(repoPath('test/fixtures/campaigns/smoke.yaml'));
    expect(result.ok && result.value.spec.agent.name).toBe('fake');
  });

  it('accepts a campaign without slices, with only the harness-free arms', () => {
    const yaml = completeCampaignYaml();
    yaml.models = { default: 'claude-sonnet-5' };
    yaml.harnesses = {};
    yaml.arms = ['baseline', 'baseline-docs'];
    expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
  });

  it('leaves harness coverage to the arm definitions, which it cannot read (REQ-ARC-02)', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = {};
    expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
  });

  it('gives a validated harness version the type of a string', () => {
    const result = loadCampaign(writeRepo().file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const version: string = result.value.spec.harnesses.wingfoil?.version ?? '';
    expect(version).toBe('3df305e');
  });

  it('does not repeat itself about scenarios a slice names that do not exist', () => {
    const slice = { model: 'claude-opus-5', scenarios: ['S9'], arms: ['baseline'], repetitions: 1 };
    expect(paths(withField(['models', 'slices'], [slice, { ...slice }]))).toEqual([
      'models.slices[0].scenarios[0]',
      'models.slices[1].scenarios[0]',
    ]);
  });

  it('rejects a commit that contradicts a version pinned to a SHA', () => {
    const yaml = withField(['harnesses', 'wingfoil'], {
      tool: 'wingfoil',
      version: '3df305e',
      commit: 'f'.repeat(40),
    });
    expect(issuesOf(yaml)).toEqual([
      { path: 'harnesses.wingfoil.commit', message: "must start with the version '3df305e'" },
    ]);
  });

  it('accepts a commit that extends a version pinned to a short SHA', () => {
    const yaml = withField(['harnesses', 'wingfoil'], {
      tool: 'wingfoil',
      version: '3df305e',
      commit: '3df305e' + 'a'.repeat(33),
    });
    expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
  });

  it('names an unpinned version even when YAML reads it as a number', () => {
    const yaml = withField(['harnesses', 'wingfoil'], { tool: 'wingfoil', version: 12 });
    expect(issuesOf(yaml)).toEqual([
      {
        path: 'harnesses.wingfoil.version',
        message: "'12' is not pinned: use a released version or a commit SHA, quoted",
      },
    ]);
  });

  it.each([['1.2.3+build'], ['v1.2.3+build.5']])(
    'accepts a released version with build metadata (%s)',
    (version) => {
      const yaml = withField(['harnesses', 'wingfoil'], { tool: 'wingfoil', version });
      expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
    },
  );

  it.each([['01.2.3'], ['1.2.3+']])('rejects a version that is not a released version (%s)', (version) => {
    const yaml = withField(['harnesses', 'wingfoil'], { tool: 'wingfoil', version });
    expect(paths(yaml)).toEqual(['harnesses.wingfoil.version']);
  });

  it.each([
    [
      { model: 'claude-opus-5', scenarios: ['S1', 'S1'], arms: ['baseline'], repetitions: 1 },
      'models.slices[0].scenarios',
    ],
    [
      { model: 'claude-opus-5', scenarios: ['S1'], arms: ['baseline', 'baseline'], repetitions: 1 },
      'models.slices[0].arms',
    ],
    [
      { model: 'claude-sonnet-5', scenarios: ['S1'], arms: ['baseline'], repetitions: 1 },
      'models.slices[0].model',
    ],
  ])('rejects a slice that repeats work (%j)', (value, path) => {
    expect(paths(withField(['models', 'slices'], [value]))).toEqual([path]);
  });

  it('rejects two slices that cover the same model, scenario and arm', () => {
    const slice = { model: 'claude-opus-5', scenarios: ['S1'], arms: ['baseline'], repetitions: 1 };
    expect(paths(withField(['models', 'slices'], [slice, { ...slice, repetitions: 2 }]))).toEqual([
      'models.slices[1]',
    ]);
  });

  it('reports a YAML problem on one line', () => {
    const issues = issuesOf('a: [unclosed');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message.split('\n')).toHaveLength(1);
  });

  it('reports a YAML warning as an issue instead of printing it', () => {
    expect(issuesOf('a: !unknown 1\n')).toEqual([
      { path: 'campaign.yaml', message: expect.stringMatching(/^is not valid YAML: .*[Tt]ag/) },
    ]);
  });

  it('requires the campaign file to live in a campaigns directory', () => {
    const { root } = writeRepo();
    const stray = `${root}/campaign.yaml`;
    copyFileSync(`${root}/campaigns/campaign.yaml`, stray);
    expect(loadCampaign(stray).ok).toBe(false);
    const result = loadCampaign(stray);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'campaign.yaml', message: "must live in a 'campaigns' directory, next to 'scenarios'" },
    ]);
  });

  it.each([['3df305e'], ['3df305e' + 'a'.repeat(33)], ['0.2.0'], ['v0.2.0'], ['1.0.0-rc.1']])(
    'accepts a harness pinned to %s',
    (version) => {
      const yaml = withField(['harnesses', 'wingfoil'], { tool: 'wingfoil', version });
      expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
    },
  );

  it('accepts a released version with its commit', () => {
    const yaml = withField(['harnesses', 'wingfoil'], {
      tool: 'wingfoil',
      version: '0.2.0',
      commit: 'b'.repeat(40),
    });
    expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
  });

  it.each([['latest'], ['main'], ['feature/x'], ['^0.2.0'], ['0.2'], ['abc123'], ['']])(
    'rejects a harness version that is not pinned (%j), naming the arm and the field',
    (version) => {
      const yaml = withField(['harnesses', 'wingfoil'], { tool: 'wingfoil', version });
      expect(issuesOf(yaml)).toEqual([
        {
          path: 'harnesses.wingfoil.version',
          message: `'${version}' is not pinned: use a released version or a commit SHA`,
        },
      ]);
    },
  );

  it.each([[undefined], [12], [null]])(
    'reports a harness whose commit is given but whose version is %j, without throwing',
    (version) => {
      const entry: Record<string, unknown> = { tool: 'wingfoil', commit: 'b'.repeat(40) };
      if (version !== undefined) entry.version = version;
      const yaml = withField(['harnesses', 'wingfoil'], entry);
      expect(() => loadCampaign(writeRepo(yaml).file)).not.toThrow();
      expect(paths(yaml)).toEqual(['harnesses.wingfoil.version']);
    },
  );

  it('names a harness that pins no version', () => {
    const yaml = withField(['harnesses', 'wingfoil'], { tool: 'wingfoil' });
    expect(issuesOf(yaml)).toEqual([{ path: 'harnesses.wingfoil.version', message: 'is required' }]);
  });

  it('names a missing nested field', () => {
    expect(issuesOf(withField(['agent', 'version'], undefined))).toEqual([
      { path: 'agent.version', message: 'is required' },
    ]);
  });

  it.each([
    'harnesses',
    'scenarios',
    'arms',
    'agent',
    'models',
    'repetitions',
    'approver_policy',
    'caps',
    'budget',
    'currency',
  ])('names the missing required field %s', (field) => {
    const issues = issuesOf(withField([field], undefined));
    expect(issues[0]).toEqual({ path: field, message: 'is required' });
  });

  it.each([
    ['../../../tmp/escape'],
    ['gpt-4o:2024-08-06'],
    ['x,readonly'],
    ['Claude Sonnet 5'],
    ['-leading-dash'],
  ])('rejects a model id that would not be safe in a path or a container name (%s)', (model) => {
    expect(paths(withField(['models', 'default'], model))).toEqual(['models.default']);
  });

  it.each([['a..'], ['a.'], ['a-'], ['x'.repeat(65)]])(
    'rejects a model id that is not a plain name (%s)',
    (model) => {
      expect(paths(withField(['models', 'default'], model))).toEqual(['models.default']);
    },
  );

  it.each([['claude-sonnet-5'], ['claude-opus-5'], ['gpt-4o-2024-08-06'], ['fake-model'], ['llama3.1-70b']])(
    'accepts the model id %s',
    (model) => {
      const yaml = withField(['models', 'default'], model);
      yaml.models = { default: model };
      expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
    },
  );

  it('refuses an approver policy the runner does not implement, rather than running it as v1', () => {
    // REQ-RUN-06: the policy version pins the classifier and the replies. A campaign naming v2 would
    // otherwise run v1, and its interventions could not be reconstructed from what it pinned.
    expect(issuesOf(withField(['approver_policy'], 'v2'))).toEqual([
      { path: 'approver_policy', message: "'v2' is not an approver policy this runner implements: v1" },
    ]);
  });

  it('rejects unknown keys at their own path', () => {
    expect(issuesOf({ ...completeCampaignYaml(), seed: 1 })).toEqual([
      { path: 'seed', message: 'is not a known field' },
    ]);
  });

  it.each([
    [['harnesses', 'wingfoil', 'commit'], 'abc', 'harnesses.wingfoil.commit'],
    [['harnesses', 'other'], { tool: 'x', version: '1.0.0' }, 'harnesses.other'],
    [['scenarios'], [], 'scenarios'],
    [
      ['scenarios'],
      [
        { id: 'S1', version: '1.0' },
        { id: 'S1', version: '1.0' },
      ],
      'scenarios',
    ],
    [['scenarios'], [{ id: 's1', version: '1.0' }], 'scenarios[0].id'],
    [['arms'], ['baseline', 'Wing Foil'], 'arms[1]'],
    [['arms'], ['baseline', 'baseline'], 'arms'],
    [['arms'], ['baseline-docs', 'wingfoil'], 'arms'],
    [['agent', 'name'], 'claude', 'agent.name'],
    [['agent', 'version'], 'latest', 'agent.version'],
    [['models', 'default'], '', 'models.default'],
    [
      ['models', 'slices'],
      [{ model: 'claude-opus-5', scenarios: ['S4'], arms: ['baseline'], repetitions: 1 }],
      'models.slices[0].scenarios[0]',
    ],
    [
      ['models', 'slices'],
      [{ model: 'claude-opus-5', scenarios: ['S1'], arms: ['other'], repetitions: 1 }],
      'models.slices[0].arms[0]',
    ],
    [
      ['models', 'slices'],
      [{ model: 'claude-opus-5', scenarios: ['S1'], arms: ['baseline'], repetitions: 0 }],
      'models.slices[0].repetitions',
    ],
    [['repetitions'], { S1: 3, S2: 1, S3: 1 }, 'repetitions.S8'],
    [['repetitions'], { S1: 3, S2: 1, S3: 1, S8: 1, S9: 1 }, 'repetitions.S9'],
    [['repetitions', 'S1'], 0, 'repetitions.S1'],
    [['repetitions', 'S1'], 1.5, 'repetitions.S1'],
    [['approver_policy'], '1', 'approver_policy'],
    [['caps', 'step_time_s'], 0, 'caps.step_time_s'],
    [['caps', 'run_cost_eur'], -1, 'caps.run_cost_eur'],
    [['budget', 'warn_eur'], 150, 'budget'],
    [['currency', 'usd_to_eur'], 0, 'currency.usd_to_eur'],
  ])('rejects a malformed %j', (field, value, path) => {
    expect(paths(withField(field as string[], value))).toEqual([path]);
  });

  it.each([
    ['', 'is empty'],
    ['a: [unclosed', 'is not valid YAML'],
    ['- a\n', 'expected object'],
  ])('reports a file that is not a campaign (%j)', (text, message) => {
    expect(issuesOf(text)).toEqual([{ path: 'campaign.yaml', message: expect.stringContaining(message) }]);
  });

  it('reports a file that does not exist', () => {
    const { root } = writeRepo();
    const result = loadCampaign(`${root}/campaigns/missing.yaml`);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'missing.yaml', message: expect.stringMatching(/^not found/) },
    ]);
  });

  it('reports a file that cannot be read', () => {
    const { root } = writeRepo();
    const result = loadCampaign(`${root}/campaigns`);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'campaigns', message: expect.stringMatching(/^cannot be read/) },
    ]);
  });
});

describe('campaignId', () => {
  it('is the first 12 hex characters of the SHA-256 of the canonical JSON', () => {
    // sha256('{"a":1}') = 015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862
    expect(campaignId({ a: 1 })).toBe('015abd7f5cc5');
  });

  it('changes when any value changes', () => {
    const changed = withField(['repetitions', 'S1'], 2);
    expect(campaignId(changed)).not.toBe(campaignId(completeCampaignYaml()));
  });
});

describe('arm digests in the campaign file (REQ-FMT-01 as amended, REQ-FMT-13)', () => {
  const arms = (completeCampaignYaml().arms as string[]) ?? [];
  const pinned = (digest = 'a'.repeat(12)) => Object.fromEntries(arms.map((arm) => [arm, digest]));

  function issues(armDigests: unknown): string[] {
    const result = loadCampaign(writeRepo({ ...completeCampaignYaml(), arm_digests: armDigests }).file);
    return result.ok ? [] : result.issues.map((issue) => `${issue.path} ${issue.message}`);
  }

  it('wants 12 hex characters per arm', () => {
    expect(issues({ ...pinned(), baseline: 'ABC' })).toEqual([
      'arm_digests.baseline must be 12 hex characters',
    ]);
  });

  it('wants every arm of the campaign, and no other', () => {
    const { baseline: _dropped, ...withoutBaseline } = pinned();
    expect(issues({ ...withoutBaseline, ghost: 'b'.repeat(12) })).toEqual([
      "arm_digests.ghost is not one of the campaign's arms",
      'arm_digests.baseline is required: a campaign that pins arm digests pins every arm',
    ]);
  });

  it('changes the campaign identity, since the identity hashes the file', () => {
    const plain = loadCampaign(writeRepo(completeCampaignYaml()).file);
    const withDigests = loadCampaign(writeRepo({ ...completeCampaignYaml(), arm_digests: pinned() }).file);
    expect(plain.ok && withDigests.ok && plain.value.id !== withDigests.value.id).toBe(true);
  });
});
