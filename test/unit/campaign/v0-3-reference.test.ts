import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/digest.js';
import { checkDryRun } from '../../../src/runner/index.js';
import { loadDryRunProfile } from '../../../src/scenario/dry-run.js';
import { repoPath } from '../../support/paths.js';

/** v0.3's dry-run profile of the 1.1 versions (task-144): every arm, the configured ones included. */
describe("v0.3's 1.1 dry-run profile (task-144, characterization)", () => {
  const file = 'campaigns/v0-3-reference.dry-run.yaml';
  const BASE = [
    'baseline',
    'baseline-docs',
    'wingfoil',
    'speckit',
    'speckit-docs',
    'openspec',
    'openspec-docs',
  ];
  const CONFIGURED = BASE.filter((arm) => arm !== 'baseline').map((arm) => `${arm}-configured`);

  it('pins the three harnesses, Claude Code 2.1.300 at medium on Sonnet 5.5, policy v5 and the thirteen arms', () => {
    const loaded = loadDryRunProfile(repoPath(file));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const profile = loaded.value;
    expect(profile.harnesses).toEqual({
      wingfoil: { tool: 'wingfoil', version: 'v0.3.1' },
      speckit: { tool: 'speckit', version: 'v1.1.0' },
      openspec: { tool: 'openspec', version: '1.14.0' },
    });
    expect(profile.agent).toMatchObject({
      name: 'claude-code',
      version: '2.1.300',
      effort: { 'claude-sonnet-5-5': 'medium' },
    });
    expect(profile.models?.default).toBe('claude-sonnet-5-5');
    expect(profile.approver_policy).toBe('v5');
    expect(profile.caps).toEqual({ step_time_s: 1800, step_tokens: 10000000, run_cost_eur: 3 });
    expect(Object.keys(profile.arm_digests ?? {}).sort()).toEqual([...BASE, ...CONFIGURED].sort());
    for (const arm of [...BASE, ...CONFIGURED])
      expect(profile.arm_digests?.[arm], arm).toBe(armDigest(repoPath(''), arm).slice(0, 12));
  });

  it('is accepted for every arm on S1, S2, S3 and S8 at 1.1', () => {
    for (const id of ['S1', 'S2', 'S3', 'S8'])
      for (const arm of [...BASE, ...CONFIGURED]) {
        const checked = checkDryRun({ id, version: '1.1', arm, profile: file }, repoPath(''));
        expect(checked.ok ? [] : checked.issues, `${id} ${arm}`).toEqual([]);
      }
  });
});
