import { cpSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { loadCampaign, mergePreset } from '../../../src/campaign/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
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

/** A repository (writeRepo's) whose campaign file is `own`, with `presets` written under `campaigns/presets/`. */
function extending(own: Record<string, unknown>, presets: Record<string, unknown> = {}): string {
  const { root, file } = writeRepo();
  mkdirSync(join(root, 'campaigns', 'presets', 'sub'), { recursive: true });
  for (const [name, content] of Object.entries(presets)) {
    writeFileSync(join(root, 'campaigns', 'presets', name), stringify(content));
  }
  writeFileSync(file, stringify(own));
  return file;
}

const PRESET = { description: 'every arm', ...completeCampaignYaml() };

function issues(file: string): { path: string; message: string }[] {
  const result = loadCampaign(file);
  return result.ok ? [] : [...result.issues];
}

describe('extends: refusals and edge paths (REQ-FMT-01 as amended in 1.34)', () => {
  it.each([[['a']], [null], [3]])('refuses an extends that is not a path (%j)', (named) => {
    expect(issues(extending({ extends: named }))).toEqual([
      { path: 'extends', message: 'must name a file in campaigns/presets/' },
    ]);
  });

  it('refuses a preset in a subdirectory of campaigns/presets/', () => {
    const file = extending({ extends: 'presets/sub/x.yaml' }, { 'sub/x.yaml': PRESET });
    expect(issues(file)).toEqual([
      { path: 'extends', message: "'presets/sub/x.yaml' must name a file in campaigns/presets/" },
    ]);
  });

  it('refuses a preset that is a symbolic link', () => {
    const file = extending({ extends: 'presets/link.yaml' }, { 'real.yaml': PRESET });
    symlinkSync(join(file, '..', 'presets', 'real.yaml'), join(file, '..', 'presets', 'link.yaml'));
    expect(issues(file)).toEqual([
      { path: 'extends', message: "'presets/link.yaml' must not be a symbolic link" },
    ]);
  });

  it('accepts a preset whose name begins with two dots', () => {
    expect(issues(extending({ extends: 'presets/..x.yaml' }, { '..x.yaml': PRESET }))).toEqual([]);
  });

  it('refuses a description that is not a line of text as having none', () => {
    const file = extending({ extends: 'presets/p.yaml' }, { 'p.yaml': { ...PRESET, description: 42 } });
    expect(issues(file)).toEqual([
      { path: 'extends', message: expect.stringMatching(/^'presets\/p.yaml' has no one-line description/) },
    ]);
  });

  it('says that a key the preset sets cannot be removed when the resolved campaign is refused', () => {
    const file = extending(
      {
        extends: 'presets/p.yaml',
        arms: ['baseline', 'baseline-docs'],
        scenarios: [{ id: 'S1', version: '1.0' }],
      },
      { 'p.yaml': PRESET },
    );
    const found = issues(file);
    expect(found.length).toBeGreaterThan(1);
    expect(found.at(-1)).toEqual({
      path: 'extends',
      message: expect.stringMatching(/campaign resolved from 'presets\/p.yaml'.*a key the preset sets, a file cannot remove it/),
    });
  });

  it('refuses a misplaced file that extends a preset for its place first', () => {
    const root = tempDir('bench-misplaced-');
    const file = join(root, 'c.yaml');
    writeFileSync(file, stringify({ extends: 'presets/p.yaml' }));
    expect(issues(file)).toEqual([
      { path: 'c.yaml', message: "must live in a 'campaigns' directory, next to 'scenarios'" },
    ]);
  });
});

describe('extends: review round 2 (task-101)', () => {
  it('refuses a dangling symbolic link as a symbolic link', () => {
    const file = extending({ extends: 'presets/gone.yaml' });
    symlinkSync(join(file, '..', 'presets', 'nowhere.yaml'), join(file, '..', 'presets', 'gone.yaml'));
    expect(issues(file)).toEqual([
      { path: 'extends', message: "'presets/gone.yaml' must not be a symbolic link" },
    ]);
  });

  it('refuses a campaigns/presets/ that is itself a symbolic link', () => {
    const elsewhere = tempDir('bench-presets-elsewhere-');
    writeFileSync(join(elsewhere, 'p.yaml'), stringify(PRESET));
    const { root, file } = writeRepo();
    symlinkSync(elsewhere, join(root, 'campaigns', 'presets'));
    writeFileSync(file, stringify({ extends: 'presets/p.yaml' }));
    expect(issues(file)).toEqual([{ path: 'extends', message: "'presets/' must not be a symbolic link" }]);
  });

  it('keeps the schema before the place for a misplaced file that extends nothing (characterization)', () => {
    const root = tempDir('bench-misplaced-');
    const file = join(root, 'c.yaml');
    writeFileSync(file, stringify({ arms: ['baseline'] }));
    expect(issues(file)[0]).toEqual({ path: 'harnesses', message: 'is required' });
  });
});
