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
    expect(issues).toEqual([
      { path: 'arms[0]', message: 'baseline: setup is required; manual is required' },
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

  it.each([['baseline'], ['baseline-docs']])('rejects a harness on the %s arm, which requires none', (arm) => {
    const yaml = completeCampaignYaml();
    yaml.harnesses = {
      wingfoil: { tool: 'wingfoil', version: '3df305e' },
      [arm]: { tool: 'x', version: '1.0.0' },
    };
    expect(issuesOf(yaml)).toEqual([
      { path: `harnesses.${arm}`, message: 'must not be set: the arm runs the plain agent' },
    ]);
  });

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
        stringify({ ...plainArmYaml('constructor'), requires: 'openspec' }),
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
