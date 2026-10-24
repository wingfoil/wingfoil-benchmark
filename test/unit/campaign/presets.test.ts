import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { loadCampaign, mergePreset } from '../../../src/campaign/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** dl-022, task-101: presets, `extends:` and the identity of the resolved campaign (REQ-FMT-01, REQ-FMT-02 1.34). */
describe('mergePreset', () => {
  it('merges maps by key, the file winning, and replaces lists whole', () => {
    const preset = {
      caps: { step_time_s: 1800, run_cost_eur: 5 },
      arms: ['baseline', 'wingfoil'],
      approver_policy: 'v1',
    };
    const file = { caps: { run_cost_eur: 2 }, arms: ['baseline'] };

    expect(mergePreset(preset, file)).toEqual({
      caps: { step_time_s: 1800, run_cost_eur: 2 },
      arms: ['baseline'],
      approver_policy: 'v1',
    });
  });

  it('merges nested maps by key at every level', () => {
    expect(
      mergePreset({ agent: { effort: { a: 'low', b: 'low' } } }, { agent: { effort: { b: 'high' } } }),
    ).toEqual({
      agent: { effort: { a: 'low', b: 'high' } },
    });
  });
});

/** The presets of dl-022 and dl-023, each validated when a minimal file extends it. */
const MINIMAL: Readonly<Record<string, Record<string, unknown>>> = {
  reference: {},
  'baseline-across-agents': {
    agent: { name: 'claude-code', version: '2.1.300', effort: { 'claude-sonnet-5-5': 'medium' } },
    models: { default: 'claude-sonnet-5-5' },
  },
  'harness-vs-docs': {
    harnesses: { wingfoil: { tool: 'wingfoil', version: 'v0.3.0' } },
    arms: ['baseline', 'baseline-docs', 'wingfoil'],
    arm_digests: { baseline: '964b1354526c', 'baseline-docs': '2ac51091da99', wingfoil: '45a5cce3de19' },
  },
  smoke: {},
  repetitions: {
    scenarios: [{ id: 'S2', version: '1.0' }],
    arms: ['baseline'],
    arm_digests: { baseline: '964b1354526c' },
    harnesses: {},
    repetitions: { S2: 3 },
  },
};

describe("the repository's presets (dl-022, dl-023)", () => {
  it('holds the five presets, each with a one-line description', () => {
    const names = readdirSync(repoPath('campaigns/presets'))
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => name.replace(/\.yaml$/, ''))
      .sort();
    expect(names).toEqual(Object.keys(MINIMAL).sort());
    for (const name of names) {
      const preset = parse(readFileSync(repoPath(`campaigns/presets/${name}.yaml`), 'utf8')) as Record<
        string,
        unknown
      >;
      expect(typeof preset.description, name).toBe('string');
      expect(String(preset.description), name).not.toContain('\n');
      expect(preset, name).not.toHaveProperty('extends');
    }
  });

  it.each(Object.entries(MINIMAL))('validates %s when a minimal file extends it', (name, own) => {
    const root = tempDir('bench-presets-');
    mkdirSync(join(root, 'campaigns'));
    cpSync(repoPath('campaigns/presets'), join(root, 'campaigns', 'presets'), { recursive: true });
    const file = join(root, 'campaigns', `${name}-minimal.yaml`);
    writeFileSync(file, stringify({ extends: `presets/${name}.yaml`, ...own }));

    const result = loadCampaign(file);

    expect(result.ok ? [] : result.issues).toEqual([]);
  });
});

describe('the identities of the campaigns that extend nothing (characterization)', () => {
  it.each([
    ['v0-2-reference', '81ebb2691f9c'],
    ['v0-2-bridge', 'bf3a1ac7dff5'],
  ])('keeps %s as %s', (name, id) => {
    const result = loadCampaign(repoPath(`campaigns/${name}.yaml`));
    expect(result.ok && result.value.id).toBe(id);
  });
});
