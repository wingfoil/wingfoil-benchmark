import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { checkCampaign } from '../../../src/runner/index.js';
import { plainArmYaml } from '../../support/arm-fixture.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';

type Yaml = Record<string, unknown>;

function issuesOf(yaml: Yaml, change?: (root: string) => void) {
  const { root, file } = writeRepo(yaml, ['S1@1.0', 'S2@1.0', 'S3@1.0', 'S8@1.0']);
  change?.(root);
  const result = checkCampaign(file);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

/** Only the plain arms, with no slice naming wingfoil. */
function plainCampaign(arms: string[]): Yaml {
  const yaml = completeCampaignYaml();
  yaml.arms = arms;
  yaml.harnesses = {};
  yaml.models = { default: 'claude-sonnet-5' };
  return yaml;
}

describe('checkCampaign, arms and harnesses (REQ-FMT-01, REQ-FMT-05, dl-003)', () => {
  it('loads every arm the campaign names, in its order', () => {
    const result = checkCampaign(writeRepo(completeCampaignYaml()).file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.arms.map((arm) => arm.name)).toEqual(['baseline', 'baseline-docs', 'wingfoil']);
    expect(result.value.arms[2]?.requires).toBe('wingfoil');
  });

  it('rejects an arm with no definition, at its campaign entry', () => {
    const issues = issuesOf(completeCampaignYaml(), (root) =>
      rmSync(join(root, 'arms', 'baseline-docs'), { recursive: true }),
    );
    expect(issues).toEqual([
      { path: 'arms[1]', message: expect.stringMatching(/^baseline-docs: arm\.yaml not found in /) },
    ]);
  });

  it('rejects an arm whose definition does not load, naming its issues', () => {
    const issues = issuesOf(completeCampaignYaml(), (root) =>
      writeFileSync(join(root, 'arms', 'baseline', 'arm.yaml'), stringify({ name: 'baseline' })),
    );
    expect(issues).toEqual([{ path: 'arms[0]', message: 'baseline: setup is required; manual is required' }]);
  });

  // task-014, REQ-FMT-05 — characterization: task-012's loader already rejects it at the check.
  it('rejects an arm whose manual names a missing file when the campaign is checked, not when it runs', () => {
    const issues = issuesOf(completeCampaignYaml(), (root) =>
      rmSync(join(root, 'arms', 'wingfoil', 'manual.md')),
    );
    expect(issues).toEqual([
      { path: 'arms[2]', message: "wingfoil: manual file 'manual.md' does not exist" },
    ]);
  });

  // Characterization: what the interim rule of dl-003 enforced, now read from each arm's `requires`.
  it('requires a harness for an arm that requires a tool (wingfoil)', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = {};
    expect(issuesOf(yaml)).toEqual([
      { path: 'harnesses.wingfoil', message: "is required: the arm requires the harness 'wingfoil'" },
    ]);
  });

  it.each([['baseline'], ['baseline-docs']])(
    'rejects a harness on the %s arm, which requires none',
    (arm) => {
      const yaml = completeCampaignYaml();
      yaml.harnesses = {
        wingfoil: { tool: 'wingfoil', version: '3df305e' },
        [arm]: { tool: 'x', version: '1.0.0' },
      };
      expect(issuesOf(yaml)).toEqual([
        { path: `harnesses.${arm}`, message: 'must not be set: the arm runs the plain agent' },
      ]);
    },
  );

  // Red-first: what the fixed list of dl-003 could not know.
  it('accepts a new plain-agent arm with no harness, which the fixed list would have refused', () => {
    const { root, file } = writeRepo(plainCampaign(['baseline', 'baseline-notes']));
    expect(root).toBeDefined();
    expect(checkCampaign(file).ok).toBe(true);
  });

  it('requires a harness for a new arm that requires a tool, even one named like an Object property', () => {
    const issues = issuesOf(plainCampaign(['baseline', 'constructor']), (root) =>
      writeFileSync(
        join(root, 'arms', 'constructor', 'arm.yaml'),
        stringify({ ...plainArmYaml('constructor'), requires: 'openspec', telemetry_off: [] }),
      ),
    );
    expect(issues).toEqual([
      { path: 'harnesses.constructor', message: "is required: the arm requires the harness 'openspec'" },
    ]);
  });

  it('rejects a harness whose tool is not the one the arm requires', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'openspec', version: '1.0.0' } };
    expect(issuesOf(yaml)).toEqual([
      { path: 'harnesses.wingfoil.tool', message: "is 'openspec', but the arm requires 'wingfoil'" },
    ]);
  });
});

describe('checkCampaign and the eligibility register (REQ-FMT-01 as amended, F7.4)', () => {
  it('reports an invalid register at its fields when a harness arm needs it', () => {
    const { root, file } = writeRepo(completeCampaignYaml());
    writeFileSync(join(root, 'eligibility', 'register.yaml'), stringify({ criteria: [], entries: [] }));
    const result = checkCampaign(file);
    expect(result.ok ? [] : result.issues).toEqual([
      {
        path: 'eligibility/register.yaml: criteria',
        message:
          'must be the five published criteria in order: agent-and-model, pinnable, headless-container, workflow-harness, no-own-llm',
      },
    ]);
  });

  it('ignores the register of a campaign without a harness arm, even an invalid one, or none', () => {
    const yaml = {
      ...completeCampaignYaml(),
      arms: ['baseline'],
      harnesses: {},
      models: { default: 'claude-sonnet-5' },
    };
    const { root, file } = writeRepo(yaml);
    writeFileSync(join(root, 'eligibility', 'register.yaml'), 'entries: [\n');
    expect(checkCampaign(file).ok).toBe(true);
    rmSync(join(root, 'eligibility'), { recursive: true });
    expect(checkCampaign(file).ok).toBe(true);
  });

  it('reports a wrong harness pin once, by harness coverage, and not again as unassessed', () => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = { wingfoil: { tool: 'speckit', version: '9.9.9' } };
    const result = checkCampaign(writeRepo(yaml).file);
    expect(result.ok ? [] : result.issues).toEqual([
      { path: 'harnesses.wingfoil.tool', message: "is 'speckit', but the arm requires 'wingfoil'" },
    ]);
  });
});

describe('what v0.2 asks of an arm definition (REQ-FMT-05 as amended, task-066)', () => {
  function withArm(name: string, yaml: Record<string, unknown>) {
    const repo = writeRepo(plainCampaign(['baseline', name]));
    writeFileSync(join(repo.root, 'arms', name, 'arm.yaml'), stringify({ ...plainArmYaml(name), ...yaml }));
    const result = checkCampaign(repo.file);
    return result.ok ? [] : result.issues;
  }

  it('refuses a docs control that also requires a tool', () => {
    expect(
      withArm('notes-docs', { docs_of: 'baseline', requires: 'tool', telemetry_off: [] }),
    ).toContainEqual({
      path: 'arms[1]',
      message: 'notes-docs: docs_of and requires: a docs control runs the plain agent',
    });
  });

  it('wants telemetry settings as NAME=value', () => {
    expect(withArm('notes', { telemetry_off: ['DO_NOT_TRACK'] })).toEqual([
      {
        path: 'arms[1]',
        message: expect.stringMatching(/^notes: telemetry_off\[0\] must be NAME=value/) as unknown,
      },
    ]);
  });

  it("refuses a telemetry setting on a variable the runner or the agent owns: it would change the agent, not the tool's telemetry", () => {
    for (const setting of [
      'ANTHROPIC_BASE_URL=x',
      'ANTHROPIC_AUTH_TOKEN=x',
      'CLAUDE_CODE_DISABLE_AUTO_MEMORY=0',
    ]) {
      const name = setting.slice(0, setting.indexOf('='));
      expect(withArm('notes', { telemetry_off: ['DO_NOT_TRACK=1', setting] })).toEqual([
        {
          path: 'arms[1]',
          message: `notes: telemetry_off[1] sets ${name}, which the runner or the agent owns: only a tool's own telemetry is set here`,
        },
      ]);
    }
  });
});
