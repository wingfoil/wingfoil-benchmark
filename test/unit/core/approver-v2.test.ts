import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CLASSIFIER_V1, CLASSIFIER_V2 } from '../../../src/core/approver.js';
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
    // Found in the corpus, missed by v1 and by v2's first draft.
    'I need the approver’s reply before changing code. Please provide: **“Approved. Proceed.”**',
    'Once you approve dl-007 (and task-005 if you want it closed), I will carry out the approval.',
    'Let me know if they look right and I will run `wingfoil memory approve` on your go-ahead.',
    'Once dl-005 is approved, the value will be checked deeply.',
    'The deep check is not done, because it needs an approval I do not have.',
    // Review round 1: a reply asked for in backticks, which the preparation removes, and no "please".
    'dl-003 is pending. Reply with `Approved. Proceed.` to continue.',
    'Reply `Approved. Proceed.` and I will implement it.',
    'Once approved, I will implement the change.',
  ])('reads the request %j as an approval request', (text) => {
    expect(v2().classify(`I did some work.\n\n${text}`)).toBe('approval');
  });

  it.each([
    // Accounts that name a reply or an approval without asking for one.
    'I ran the approve verb on task-004 using your reply "Approved. Proceed.", and both are now approved.',
    'I approved the decision-log with your reply "Approved. Proceed.".',
    // A request for information is a question, never an approval: its reply would make no sense.
    'Can you send one or two of the patches users reported?',
    'Please provide a concrete patch that misbehaves?',
    // Review round 1: accounts written after a reply, which a rerun on v2 produces in numbers.
    'I approved dl-003 with the reply "Approved. Proceed." as the reason.',
    'I approved both, using the approver’s reply "Approved. Proceed." as the reason.',
    'With your go-ahead, I approved dl-003 and implemented the change.',
    'Thanks for your go-ahead: dl-003 is approved and the change is committed.',
    'After dl-003 had been approved, I implemented the change.',
    'In reply to your message I approved dl-003.',
    'Reply received; dl-003 approved and the change committed.',
    'The approval went through and I don’t have anything else to change.',
  ])('does not read %j as an approval request', (text) => {
    expect(v2().classify(`I did some work.\n\n${text}`)).not.toBe('approval');
  });

  it('reads a question in the closing paragraphs, though an example follows it (bug-035)', () => {
    expect(
      v2().classify('What refund policy should it use?\n\nFor example: a full refund before the start.'),
    ).toBe('question');
  });

  it('changes v1’s reading of the corpus only where a bug says it should (criterion 4)', () => {
    // Every message of the corpus whose reading differs between v1 and v2, each reviewed by hand and named with the
    // bug it answers (test/fixtures/approver/v1-to-v2.json). A change of v2 that moves any other message fails here.
    const v1 = approverPolicy('v1');
    if (v1 === undefined) throw new Error('policy v1 is not implemented');
    const reading = (kind: string | undefined): string => kind ?? '-';
    const changed = CORPUS.filter((m) => v1.classify(m.text) !== v2().classify(m.text)).map((m) => ({
      source: m.source,
      v1: reading(v1.classify(m.text)),
      v2: reading(v2().classify(m.text)),
    }));
    const pinned = (
      JSON.parse(readFileSync(repoPath('test/fixtures/approver/v1-to-v2.json'), 'utf8')) as {
        source: string;
        v1: string;
        v2: string;
      }[]
    ).map(({ source, v1: before, v2: after }) => ({ source, v1: before, v2: after }));
    expect(changed.sort((a, b) => a.source.localeCompare(b.source))).toEqual(
      pinned.sort((a, b) => a.source.localeCompare(b.source)),
    );
    expect(CORPUS).toHaveLength(1048);
  });

  it('is frozen: its patterns and its question rule are exactly these, and changing one is v3', () => {
    expect(CLASSIFIER_V2.anywhere.slice(0, CLASSIFIER_V1.anywhere.length).map(String)).toEqual(
      CLASSIFIER_V1.anywhere.map(String),
    );
    expect(CLASSIFIER_V2.anywhere.slice(CLASSIFIER_V1.anywhere.length).map(String)).toEqual([
      String.raw`/\bplease\s+(?:reply|respond|approve|review)\b/i`,
      String.raw`/(?<!\b(?:your|the|this|that|an?|approver['’]s)\s+)(?<!\bin\s+)\b(?:reply|respond)\b[^\n]{0,40}?["“'‘*_]\s*approved\b/i`,
      String.raw`/\bif\s+the\s+reply\s+is\b/i`,
      String.raw`/(?:^|[.!?:;]\s+|\n)[^\S\n]*[*_]*(?:please\s+)?reply\s+(?:exactly\s+)?(?:with\b|:|and\b|to\s+(?:continue|proceed|approve)\b|[.!]|$)/im`,
      String.raw`/\b(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:approve|review)\b/i`,
      String.raw`/\bpending\s+your\b/i`,
      String.raw`/\b(?:once|when|after|until)\s+[^.!?\n]{0,80}?\b(?:is|are|gets?)\s+approved\b/i`,
      String.raw`/\bonce\s+approved\b/i`,
      String.raw`/\b(?:once|when|after|if)\s+you\s+approve\b/i`,
      String.raw`/\b(?:on|await|awaiting|need|want)\s+your\s+go-ahead\b/i`,
      String.raw`/\bplease\s+provide\b[^\n]{0,40}?\bapproved\b/i`,
      String.raw`/\bapproval\s+(?:that\s+)?I\s+(?:don't|don’t|do\s+not|haven't|haven’t|have\s+not)\s+(?:have|got|received)\b/i`,
    ]);
    expect(CLASSIFIER_V2.withinSentence.map((pair) => pair.map(String))).toEqual([
      [String.raw`/\b(?:needs?|requires?)\b/i`, String.raw`/^(?=([\s\S]*?\byour\b))\1[\s\S]*\bapproval\b/i`],
      [String.raw`/\bI\s+(?:need|require)\b/i`, String.raw`/\bapproval\b/i`],
      [String.raw`/\bI(?:'m|’m|\s+am)\s+asking\b/i`, String.raw`/\bapproval\b/i`],
      [String.raw`/\blet\s+me\s+know\b/i`, String.raw`/\b(?:proceed|continue|approve)/i`],
    ]);
    expect(String(CLASSIFIER_V2.questionEnd)).toBe(String.raw`/\?(?=[*_"”')\]]*(?:\s|$))/`);
    expect(String(CLASSIFIER_V2.paragraphEnd)).toBe(String.raw`/\n[^\S\n]*\n/`);
    expect(CLASSIFIER_V2.closingParagraphs).toBe(2);
  });

  it('reads a long adversarial message in linear time (review round 1)', () => {
    // "your" repeated without "approval": a backtracking pattern scans to the sentence's end from each one.
    const started = performance.now();
    expect(v2().classify(`it needs ${'your '.repeat(40_000)}`)).toBeUndefined();
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('does not read a question earlier in the message', () => {
    expect(
      v2().classify('Why was it slow?\n\nBecause of the cache.\n\nFixed it.\n\nAll tests pass.'),
    ).toBeUndefined();
  });
});
