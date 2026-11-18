import { describe, expect, it } from 'vitest';

import { loadCampaign } from '../../../src/campaign/index.js';
import { repoPath } from '../../support/paths.js';

/**
 * v0.3's validation (task-159, plan-005 step 4, dl-010 B): one run per arm of the reference campaign on S1@1.1, the
 * scenario with calibration's largest step transcript. Every pin is the reference campaign's.
 */
describe("v0.3's validation campaign (task-159, characterization)", () => {
  const spec = (file: string) => {
    const loaded = loadCampaign(repoPath(file));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    return loaded.value.spec;
  };
  const validation = () => spec('campaigns/v0-3-validation.yaml');
  const reference = () => spec('campaigns/v0-3-reference.yaml');

  it('holds every pin of the reference campaign: harnesses, arms, agent, policy, caps, rate, digests and loop', () => {
    const [ours, theirs] = [validation(), reference()];
    expect(ours.harnesses).toEqual(theirs.harnesses);
    expect(ours.arms).toEqual(theirs.arms);
    expect(ours.arms).toHaveLength(13);
    expect(ours.agent.name).toBe(theirs.agent.name);
    expect(ours.agent.version).toBe(theirs.agent.version);
    expect(ours.agent.effort?.['claude-sonnet-5-5']).toBe(theirs.agent.effort?.['claude-sonnet-5-5']);
    expect(ours.approver_policy).toBe(theirs.approver_policy);
    expect(ours.caps).toEqual(theirs.caps);
    expect(ours.fail_fast).toEqual(theirs.fail_fast);
    expect(ours.currency).toEqual(theirs.currency);
    expect(ours.arm_digests).toEqual(theirs.arm_digests);
    expect(ours.review_loop).toEqual(theirs.review_loop);
  });

  it('runs S1@1.1 once per arm on Sonnet 5.5, with no slice, under the consented budget', () => {
    const ours = validation();
    expect(ours.scenarios).toEqual([{ id: 'S1', version: '1.1' }]);
    expect(ours.repetitions).toEqual({ S1: 1 });
    expect(ours.models).toEqual({ default: 'claude-sonnet-5-5' });
    expect(ours.budget).toEqual({ warn_eur: 12, ceiling_eur: 15 });
  });
});
