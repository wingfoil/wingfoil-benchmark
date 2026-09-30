import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { readableTranscript } from '../../../src/agents/index.js';
import { repoPath } from '../../support/paths.js';

const event = (value: unknown) => JSON.stringify(value);

/** A session with a tool call and its result, in Claude Code's stream-json, as the adapter stores it. */
const SESSION = [
  event({ type: 'system', subtype: 'init', session_id: 's1', tools: ['Bash', 'Read'] }),
  event({
    type: 'assistant',
    message: {
      content: [
        { type: 'thinking', thinking: '', signature: 'x' },
        { type: 'text', text: 'I will look at the files first.' },
        { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls -la src', description: 'List' } },
      ],
    },
  }),
  event({
    type: 'user',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 't1',
          content: ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].join('\n'),
        },
      ],
    },
  }),
  event({
    type: 'user',
    message: {
      content: [{ type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'ok' }] }],
    },
  }),
  event({
    type: 'result',
    subtype: 'success',
    num_turns: 3,
    stop_reason: 'end_turn',
    total_cost_usd: 0.0123,
  }),
];

describe('readableTranscript (F5.3, task-043)', () => {
  it("keeps the assistant's text, a tool call on one line, a result's first five lines, and the result", () => {
    expect(readableTranscript(SESSION, { full: false })).toEqual([
      '- assistant: I will look at the files first.',
      '- tool Bash: {"command":"ls -la src","description":"List"}',
      '  > one',
      '  > two',
      '  > three',
      '  > four',
      '  > five',
      '  > … 2 more lines',
      '  > ok',
      '- result: success, end_turn, 3 turns, 0.0123 USD',
    ]);
  });

  it('prints every line of a tool result with full', () => {
    const lines = readableTranscript(SESSION, { full: true });
    expect(lines).toContain('  > seven');
    expect(lines.some((line) => line.includes('more lines'))).toBe(false);
  });

  it('cuts a long tool input and a line it does not know to 200 characters', () => {
    const long = 'x'.repeat(500);
    const lines = readableTranscript(
      [
        event({
          type: 'assistant',
          message: { content: [{ type: 'tool_use', name: 'Write', input: { content: long } }] },
        }),
        `not json ${long}`,
      ],
      { full: false },
    );
    expect(lines.map((line) => line.length)).toEqual([200, 200]);
    expect(lines[0]?.endsWith('…')).toBe(true);
    expect(lines[1]?.startsWith('- ? not json')).toBe(true);
  });

  it('reads the sessions the real agent produced (W2 spike)', () => {
    const lines = (name: string) =>
      readableTranscript(
        readFileSync(repoPath(`test/fixtures/sessions/${name}.jsonl`), 'utf8')
          .trim()
          .split('\n'),
        {
          full: false,
        },
      );
    expect(lines('completed')).toEqual([
      '- assistant: ready',
      expect.stringMatching(/^- result: success, end_turn, 1 turns, /),
    ]);
    expect(lines('truncated-no-result').at(-1)).toMatch(/^- assistant: /);
  });
});
