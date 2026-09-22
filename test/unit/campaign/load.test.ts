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
  it('returns the identity, the loaded scenarios and the results root', () => {
    const { root, file } = writeRepo();
    const result = loadCampaign(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(campaignId(completeCampaignYaml()));
    expect(result.value.file).toBe(file);
    expect(result.value.resultsRoot).toBe(`${root}/results`);
    expect(result.value.scenarios[0]?.dir).toBe(`${root}/scenarios/S1/1.0`);
  });

  it('accepts the trivial fixture campaign', () => {
    const result = loadCampaign(repoPath('test/fixtures/campaigns/smoke.yaml'));
    expect(result.ok && result.value.spec.agent.name).toBe('fake');
  });

  it('accepts a campaign without slices, harnesses or optional commit', () => {
    const yaml = completeCampaignYaml();
    yaml.models = { default: 'claude-sonnet-5' };
    yaml.harnesses = {};
    expect(loadCampaign(writeRepo(yaml).file).ok).toBe(true);
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

  it('reports scenarios that do not load, naming the entry and the scenario', () => {
    const issues = issuesOf(completeCampaignYaml(), ['S1@1.0', 'S2@1.0', 'S8@1.0']);
    expect(issues).toEqual([
      { path: 'scenarios[2]', message: expect.stringMatching(/^S3@1\.0: scenario\.yaml not found/) },
    ]);
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
