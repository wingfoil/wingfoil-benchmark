import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/digest.js';
import { loadCampaign } from '../../../src/campaign/index.js';
import { checkDryRun } from '../../../src/runner/index.js';
import { loadDryRunProfile } from '../../../src/scenario/dry-run.js';
import { repoPath } from '../../support/paths.js';

/**
 * v0.3's reference campaign (task-154, criterion 3): `presets/reference.yaml` holds the pins every 1.1 dry run ran
 * (`campaigns/v0-3-reference.dry-run.yaml`, task-144) and the review loop dry runs 208-215 ran
 * (`campaigns/v0-3-review-loop.dry-run.yaml`, task-151), with the approver's choices of 2026-11-17: thirteen arms,
 * S1 x 3 and the other scenarios x 1, the review loop, and one slice, Haiku 5.5 on S1 and S3 in baseline and wingfoil.
 */
describe("v0.3's reference campaign (task-154, characterization)", () => {
  const campaign = () => {
    const loaded = loadCampaign(repoPath('campaigns/v0-3-reference.yaml'));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    return loaded.value.spec;
  };
  const profile = (path: string) => {
    const loaded = loadDryRunProfile(repoPath(path));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    return loaded.value;
  };

  it('pins what the 1.1 dry runs ran: harnesses, agent, policy, caps, rate, arm digests and the review loop', () => {
    const spec = campaign();
    const reference = profile('campaigns/v0-3-reference.dry-run.yaml');
    expect(spec.harnesses).toEqual(reference.harnesses);
    expect(spec.agent.name).toBe(reference.agent.name);
    expect(spec.agent.version).toBe(reference.agent.version);
    expect(spec.agent.effort).toEqual({ 'claude-sonnet-5-5': 'medium', 'claude-haiku-5-5': 'medium' });
    expect(spec.approver_policy).toBe(reference.approver_policy);
    expect(spec.caps).toEqual(reference.caps);
    expect(spec.currency).toEqual(reference.currency);
    expect(spec.arm_digests).toEqual(reference.arm_digests);
    expect(spec.review_loop).toEqual(profile('campaigns/v0-3-review-loop.dry-run.yaml').review_loop);
  });

  it("holds the budget the approver approved at task-154's gate (2026-11-18)", () => {
    expect(campaign().budget).toEqual({ warn_eur: 65, ceiling_eur: 80 });
  });

  it("holds the approver's choices: thirteen arms, the 1.1 scenarios, S1 x 3, the Haiku slice", () => {
    const spec = campaign();
    expect(spec.arms).toHaveLength(13);
    expect(Object.keys(spec.arm_digests ?? {}).sort()).toEqual([...spec.arms].sort());
    expect(spec.scenarios).toEqual(['S1', 'S2', 'S3', 'S8'].map((id) => ({ id, version: '1.1' })));
    expect(spec.repetitions).toEqual({ S1: 3, S2: 1, S3: 1, S8: 1 });
    expect(spec.models).toEqual({
      default: 'claude-sonnet-5-5',
      slices: [
        {
          model: 'claude-haiku-5-5',
          scenarios: ['S1', 'S3'],
          arms: ['baseline', 'wingfoil'],
          repetitions: 1,
        },
      ],
    });
  });
});

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
