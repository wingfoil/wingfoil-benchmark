import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { approverPolicy, approverPolicyVersions } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';

/** One final message of the approver's corpus (task-106), by its source: `<execution>/runs/…/steps/<nn>#<k>`. */
interface CorpusMessage {
  readonly source: string;
  readonly agent: 'claude-code' | 'codex';
  readonly text: string;
}

const CORPUS: readonly CorpusMessage[] = JSON.parse(
  readFileSync(repoPath('test/fixtures/approver/corpus.json'), 'utf8'),
) as CorpusMessage[];

function message(source: string): string {
  const found = CORPUS.find((m) => m.source === source);
  if (found === undefined) throw new Error(`${source}: not in the corpus`);
  return found.text;
}

function v2(): NonNullable<ReturnType<typeof approverPolicy>> {
  const policy = approverPolicy('v2');
  if (policy === undefined) throw new Error('policy v2 is not implemented');
  return policy;
}

const TERRA = 'c4c49685911c/1/runs';

describe('approver policy v2 (task-106, REQ-RUN-06)', () => {
  it('is implemented beside v1, with v1 unchanged and the same replies and cap', () => {
    expect(approverPolicyVersions()).toEqual(['v1', 'v2']);
    const v1 = approverPolicy('v1');
    expect(v1?.version).toBe('v1');
    expect(v2().version).toBe('v2');
    expect(v2().replies).toEqual(v1?.replies);
    expect(v2().maxInterventions).toBe(v1?.maxInterventions);
  });

  // bug-027: an account of documents pending approval is not a request.
  it.each([
    // bug-027's own message (v0.2's reference, Opus 5.5, S1 step 2, the round trip's reply).
    '81ebb2691f9c/1/runs/S1@1.0/wingfoil/claude-opus-5-5/r1/steps/02#2',
    // Codex's accounts in steps that completed.
    `${TERRA}/S1@1.0/wingfoil/gpt-5.6-terra/r1/steps/01#1`,
    `${TERRA}/S1@1.0/wingfoil/gpt-5.6-terra/r2/steps/03#1`,
    `${TERRA}/S3@1.0/wingfoil/gpt-5.6-terra/r1/steps/02#1`,
  ])('reads the account in %s as not waiting (bug-027)', (source) => {
    expect(v2().classify(message(source))).toBeUndefined();
  });

  it.each([
    'The decision-log needs approval.',
    'These are still pending and need their own approval if you want them approved.',
    'The task and decision log have been submitted and are pending approval.',
    'Both records require approval under the workflow.',
  ])('reads %j as not waiting (bug-027)', (text) => {
    expect(v2().classify(`Implemented and committed the change.\n\n${text}`)).toBeUndefined();
  });

  // bug-035: the six requests v1 missed in campaign-005's wingfoil arm.
  it.each([
    [`${TERRA}/S1@1.0/wingfoil/gpt-5.6-terra/r1/steps/03#1`, 'approval'],
    [`${TERRA}/S1@1.0/wingfoil/gpt-5.6-terra/r3/steps/05#1`, 'approval'],
    [`${TERRA}/S8@1.0/wingfoil/gpt-5.6-terra/r1/steps/02#1`, 'approval'],
    [`${TERRA}/S8@1.0/wingfoil/gpt-5.6-terra/r1/steps/03#1`, 'approval'],
    [`${TERRA}/S8@1.0/wingfoil/gpt-5.6-terra/r1/steps/04#1`, 'approval'],
    [`${TERRA}/S3@1.0/wingfoil/gpt-5.6-terra/r1/steps/05#1`, 'question'],
  ])('reads %s as waiting for %s (bug-035)', (source, kind) => {
    expect(v2().classify(message(source))).toBe(kind);
  });

  it('still reads the one request v1 recognised in campaign-005', () => {
    expect(v2().classify(message(`${TERRA}/S2@1.0/wingfoil/gpt-5.6-terra/r1/steps/02#1`))).toBe('approval');
  });

  it.each([
    'I need approval for the product-policy change.',
    'To proceed, I need approval of task-004 and dl-007.',
    'It needs your approval.',
    'Please reply: **Approved. Proceed.**',
    'Please reply exactly: `Approved. Proceed.` Then I will implement it.',
    'Reply "Approved. Proceed." and I will record it.',
    'Once you reply "Approved. Proceed.", I will run the approval.',
    'Please approve dl-006 and task-003, or tell me what to change.',
    'Please review and approve task-002.',
    'Can you approve it?',
  ])('reads the request %j as an approval request', (text) => {
    expect(v2().classify(`I did some work.\n\n${text}`)).toBe('approval');
  });

  it('reads a question in the closing paragraphs, though an example follows it (bug-035)', () => {
    expect(
      v2().classify('What refund policy should it use?\n\nFor example: a full refund before the start.'),
    ).toBe('question');
  });

  it('does not read a question earlier in the message', () => {
    expect(
      v2().classify('Why was it slow?\n\nBecause of the cache.\n\nFixed it.\n\nAll tests pass.'),
    ).toBeUndefined();
  });
});
