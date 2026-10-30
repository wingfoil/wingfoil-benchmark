import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/digest.js';
import { checkDryRun } from '../../../src/runner/index.js';
import { loadDryRunProfile } from '../../../src/scenario/dry-run.js';
import { repoPath } from '../../support/paths.js';

/** S10's calibration profile (task-119): the step-A arms on WingFoil v0.3.1, Claude Code 2.1.300, policy v4. */
describe("S10's calibration profile (task-119, characterization)", () => {
  const file = 'campaigns/s10-calibration.dry-run.yaml';

  it('pins Claude Code 2.1.300 at medium on Haiku 5.5 and Sonnet 5.5, WingFoil v0.3.1, policy v4 and the arms', () => {
    const loaded = loadDryRunProfile(repoPath(file));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const profile = loaded.value;
    expect(profile.agent).toMatchObject({
      name: 'claude-code',
      version: '2.1.300',
      effort: { 'claude-haiku-5-5': 'medium', 'claude-sonnet-5-5': 'medium' },
    });
    expect(profile.harnesses).toEqual({ wingfoil: { tool: 'wingfoil', version: 'v0.3.1' } });
    expect(profile.approver_policy).toBe('v4');
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil'])
      expect(profile.arm_digests?.[arm], arm).toBe(armDigest(repoPath(''), arm).slice(0, 12));
  });

  it('is accepted for S10 in each arm, where the default profile (policy v1) is refused', () => {
    for (const arm of ['baseline', 'baseline-docs', 'wingfoil']) {
      const checked = checkDryRun({ id: 'S10', version: '1.0', arm, profile: file }, repoPath(''));
      expect(checked.ok ? [] : checked.issues, arm).toEqual([]);
    }
    const refused = checkDryRun({ id: 'S10', version: '1.0', arm: 'baseline' }, repoPath(''));
    expect(refused.ok ? [] : refused.issues.map((issue) => issue.path)).toEqual(['scenario']);
  });
});
