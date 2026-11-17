import { describe, expect, it } from 'vitest';

import { loadCampaign } from '../../../src/campaign/index.js';
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
