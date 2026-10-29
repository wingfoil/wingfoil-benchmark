import { describe, expect, it } from 'vitest';

import { CLASSIFIER_V2 } from '../../../src/core/approver.js';
import { approverPolicy, approverPolicyVersions, replyFor } from '../../../src/core/index.js';
import type { ApproverPolicy, StepVerdict } from '../../../src/core/index.js';

function policy(version: string): ApproverPolicy {
  const found = approverPolicy(version);
  if (found === undefined) throw new Error(`policy ${version} is not implemented`);
  return found;
}

const REJECT: StepVerdict = {
  kind: 'reject',
  text: 'Rejected by Dana Okafor <dana@example.org>: no contact details.',
  later: 'Dana Okafor has already reviewed this change today.',
};

describe('approver policy v3: scripted verdicts on classifier v2 (task-117, dl-029)', () => {
  it('is implemented beside a frozen v1 and v2', () => {
    expect(approverPolicyVersions()).toEqual(['v1', 'v2', 'v3']);
  });

  it("keeps v2's classifier, replies and cap; only v3 reads a scenario's verdicts", () => {
    const v2 = policy('v2');
    const v3 = policy('v3');
    expect(v3.classify).toBe(v2.classify);
    expect(v3.replies).toEqual(v2.replies);
    expect(v3.maxInterventions).toBe(v2.maxInterventions);
    expect([policy('v1').scriptedVerdicts, v2.scriptedVerdicts, v3.scriptedVerdicts]).toEqual([
      false,
      false,
      true,
    ]);
    expect(v3.classify('Please approve the change.')).toBe('approval');
    expect(CLASSIFIER_V2).toBeDefined();
  });

  it("answers a step's first approval request with its verdict, and the later ones with its later reply", () => {
    const v3 = policy('v3');
    expect(replyFor(v3, 'approval', REJECT, 0)).toBe(REJECT.text);
    expect(replyFor(v3, 'approval', REJECT, 1)).toBe(REJECT.later);
    expect(replyFor(v3, 'approval', REJECT, 2)).toBe(REJECT.later);
  });

  it('repeats the verdict when the step declares no later reply', () => {
    const approve: StepVerdict = { kind: 'approve', text: 'Approved by Dana Okafor: release it.' };
    expect(replyFor(policy('v3'), 'approval', approve, 1)).toBe(approve.text);
  });

  it("answers questions, and approval requests of a step with no verdict, with v2's replies", () => {
    const v3 = policy('v3');
    expect(replyFor(v3, 'question', REJECT, 0)).toBe(v3.replies.question);
    expect(replyFor(v3, 'approval', undefined, 0)).toBe('Approved. Proceed.');
  });

  it('never reads a verdict under v1 or v2: their replies are frozen', () => {
    for (const version of ['v1', 'v2']) {
      expect(replyFor(policy(version), 'approval', REJECT, 0)).toBe('Approved. Proceed.');
    }
  });
});
