import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLASSIFIER_V1 } from '../../../src/core/approver.js';
import { approverPolicy, classify } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';

/**
 * The final message of a session the real agent produced during the W2 spike (task-004): the
 * `result` field of its result event, which is what dl-004's rules are written against.
 */
function finalMessageOf(name: string): string {
  const lines = readFileSync(repoPath(join('test/fixtures/sessions', name)), 'utf8')
    .split('\n')
    .filter(Boolean);
  const result = lines.map((line) => JSON.parse(line) as { type: string; result?: string }).at(-1);
  if (result?.type !== 'result' || typeof result.result !== 'string') throw new Error(`${name}: no result`);
  return result.result;
}

describe('the waiting-for-input classifier v1 (REQ-RUN-06, dl-004)', () => {
  it('reads the real approval request as one, although it does not end with a question', () => {
    // The test a trailing-question rule alone fails: its question mark is mid-message.
    const message = finalMessageOf('approval.jsonl');
    expect(message.trimEnd().endsWith('?')).toBe(false);
    expect(message).toContain('Are you sure');

    expect(classify(message)).toBe('approval');
  });

  it('reads the real question as a question', () => {
    expect(classify(finalMessageOf('question.jsonl'))).toBe('question');
  });

  it('reads a session that simply finished as not waiting', () => {
    expect(classify(finalMessageOf('completed.jsonl'))).toBeUndefined();
    expect(classify(finalMessageOf('resumed.jsonl'))).toBeUndefined();
  });

  it.each([
    'Are you sure this is what you want.',
    'Please confirm the target branch.',
    'Can you confirm the schema first.',
    'Could you confirm that.',
    'This change needs your approval.',
    'The migration requires explicit approval before it runs.',
    'I need approval.',
    'It requires approval.',
    'I would like permission to drop the table.',
    'May I delete the old files.',
    'Shall I go ahead.',
    'Do you want me to rewrite it.',
    'Would you like me to add tests.',
    'Awaiting your go-ahead.',
    'Waiting for your decision.',
    'Let me know if I should proceed.',
    'Let me know when to continue.',
    'Let me know whether you approve.',
    'ARE YOU SURE.',
  ])('matches the approval pattern in %j, in any case', (message) => {
    for (const variant of [message, message.toUpperCase(), message.toLowerCase()]) {
      expect(classify(`I did some work.\n\n${variant}\n\nThat is all for now.`)).toBe('approval');
    }
  });

  it('classifies a message that is both an approval request and a question as an approval request', () => {
    // Rule 1 before rule 2: the order REQ-RUN-06 requires, proven.
    expect(classify('Do you want me to delete the cache directory?')).toBe('approval');
  });

  it('does not match a pattern inside a fenced code block or an inline code span', () => {
    const fenced = [
      'Done. Here is the prompt I used:',
      '```',
      'Are you sure? Please confirm.',
      '```',
      'All set.',
    ];
    expect(classify(fenced.join('\n'))).toBeUndefined();
    expect(classify('Added a `confirm()` call: `are you sure` is its text. All set.')).toBeUndefined();
    expect(classify(['Done.', '~~~', 'may I', '~~~'].join('\n'))).toBeUndefined();
  });

  it('keeps a within-one-sentence pattern within one sentence', () => {
    expect(classify('We need to talk. The approval process is documented.')).toBeUndefined();
    expect(classify('Let me know. I will proceed tomorrow.')).toBeUndefined();
    expect(classify('This needs a test\n\napproval of the fixture is automatic')).toBeUndefined();
  });

  it('keeps a sentence together across a single line break, which wraps rather than ends it', () => {
    // A false negative costs more than a false positive (dl-004): a wrapped line is one sentence.
    expect(classify('The migration needs\nyour approval.')).toBe('approval');
  });

  it('does not take a word that merely contains a pattern for the pattern', () => {
    expect(classify('The dismay I felt was brief. All done.')).toBeUndefined();
    expect(classify('Unneeds approval-free steps. Done.')).toBeUndefined();
  });

  it('reads a question only at the end of the message', () => {
    expect(classify('Why was it slow? Because of the cache. Fixed.')).toBeUndefined();
    expect(classify('Fixed the cache.\n\nWhich database should the cache use?')).toBe('question');
  });

  it('reads the last non-empty line, with trailing whitespace and emphasis removed', () => {
    expect(classify('Done.\n\n**Which one should I keep?**  \n\n\n')).toBe('question');
    expect(classify('Done.\n\n_Which one should I keep?_')).toBe('question');
    expect(classify('Done.\n\n*Which one?*\t')).toBe('question');
  });

  it('reads a question that ends before a code block the agent quotes', () => {
    expect(classify(['Which of these should stay?', '```', 'a.ts', 'b.ts', '```'].join('\n'))).toBe(
      'question',
    );
  });

  it('reads an empty message as not waiting', () => {
    expect(classify('')).toBeUndefined();
    expect(classify('```\nonly code?\n```')).toBeUndefined();
  });
});

describe('the classifier v1, at its edges (review of task-007)', () => {
  it('is frozen: its patterns are exactly these, and changing one is v2 (dl-004)', () => {
    expect(CLASSIFIER_V1.anywhere.map(String)).toEqual([
      String.raw`/\bare\s+you\s+sure\b/i`,
      String.raw`/\b(?:please|can\s+you|could\s+you)\s+confirm\b/i`,
      String.raw`/\bpermission\s+to\b/i`,
      String.raw`/\b(?:may|shall)\s+I\b/i`,
      String.raw`/\b(?:do\s+you\s+want|would\s+you\s+like)\s+me\s+to\b/i`,
      String.raw`/\b(?:awaiting|waiting\s+for)\s+your\b/i`,
    ]);
    expect(CLASSIFIER_V1.withinSentence.map((pair) => pair.map(String))).toEqual([
      [String.raw`/\b(?:needs?|requires?)\b/i`, String.raw`/\bapproval\b/i`],
      [String.raw`/\blet\s+me\s+know\b/i`, String.raw`/\b(?:proceed|continue|approve)/i`],
    ]);
  });

  it('reads a within-sentence pattern in its order: the first words, then the second', () => {
    expect(classify('Approval is not needed here. Done.')).toBeUndefined();
    expect(classify('Proceed only after tests pass, let me know the result. Done.')).toBeUndefined();
  });

  it('does not end a sentence at a dot inside a word, such as a file name or a version', () => {
    // False negatives cost more than false positives (dl-004).
    expect(classify('Let me know if the changes to config.yaml are OK and I will proceed')).toBe('approval');
    expect(classify('Upgrading to v1.2 needs your approval')).toBe('approval');
  });

  it('ends a sentence at ! and ?, and at a blank line made of spaces', () => {
    expect(classify('We need to talk! The approval process is documented.')).toBeUndefined();
    expect(classify('Need a hand? Approval is automatic here.')).toBeUndefined();
    expect(classify('This needs a test\n   \napproval of the fixture is automatic')).toBeUndefined();
  });

  it('reads a trailing question whatever whitespace follows it', () => {
    expect(classify('Should I keep it?\n   ')).toBe('question');
    expect(classify('Which option?\r\n')).toBe('question');
  });

  it('removes indented fences, longer fences and tilde fences', () => {
    expect(classify('Done.\n  ```\n  are you sure\n  ```')).toBeUndefined();
    expect(classify('````\nmay I\n````\nDone.')).toBeUndefined();
    expect(classify('~~~~\nshall I\n~~~~\nDone.')).toBeUndefined();
  });

  it('closes a fence only with the same character, at least as long, and nothing else on the line', () => {
    // CommonMark: each of these lines stays inside the block, so what follows is still code.
    expect(classify('```\n~~~\nshall I\n```\nDone.')).toBeUndefined();
    expect(classify('````\n```\nshall I\n````\nDone.')).toBeUndefined();
    expect(classify('```js\nfoo\n```js\nDo you want me to proceed?\n```\nDone.')).toBeUndefined();
    // And once closed, what follows is read again.
    expect(classify('```\ncode\n```\nShall I merge it.')).toBe('approval');
  });

  it('runs a fence never closed to the end of the message, as CommonMark does', () => {
    expect(classify('Here is the plan:\n```\ncode\nDo you want me to proceed?')).toBeUndefined();
  });

  it('opens a fence only at the start of a line, never in the middle of prose', () => {
    expect(classify('Wrap it in ``` fences, then\nshall I commit it.')).toBe('approval');
  });

  it('ends a sentence at a full stop followed by a line break', () => {
    expect(classify('We need to talk.\nThe approval is automatic')).toBeUndefined();
  });

  it('closes a fence written with CRLF line endings', () => {
    expect(classify('```\r\nmay I\r\n```\r\nShall I merge it.')).toBe('approval');
  });

  it('does not let an inline code span run across a line break', () => {
    // A lone backtick on one line must not pair with one on the next and swallow what lies between.
    expect(classify('It printed a ` on its own.\nDo you want me to delete `tmp` too.')).toBe('approval');
  });

  it('matches whole words only at both ends of a pattern', () => {
    expect(classify('Ivan may Implement it later. Done.')).toBeUndefined();
    expect(classify('The form shows a please confirmation banner. Done.')).toBeUndefined();
  });

  it('reads a very long message in linear time', () => {
    // A message with many trigger words and no sentence end used to take seconds per 100 KB.
    const started = performance.now();
    expect(
      classify(`${'need '.repeat(100_000)}${'let me know '.repeat(40_000)}${'*'.repeat(100_000)}x`),
    ).toBe(undefined);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('the approver policy (experiment design §3.5)', () => {
  it('v1 answers with the replies of the policy, and allows three interventions per step', () => {
    const policy = approverPolicy('v1');
    expect(policy?.replies).toEqual({
      approval: 'Approved. Proceed.',
      question: 'No further input is available. Make the most reasonable choice, record it, and proceed.',
    });
    expect(policy?.maxInterventions).toBe(3);
    expect(policy?.classify).toBe(classify);
  });

  it('knows no other version', () => {
    expect(approverPolicy('v2')).toBeUndefined();
    expect(approverPolicy('toString')).toBeUndefined();
  });
});
