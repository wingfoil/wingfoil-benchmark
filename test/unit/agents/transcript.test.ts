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
      '  < ready',
    ]);
    expect(lines('truncated-no-result').at(-1)).toMatch(/^- assistant: /);
  });

  it("says an error: a result with is_error, a tool result that failed, and keeps the result's text", () => {
    const lines = readableTranscript(
      [
        event({
          type: 'user',
          message: { content: [{ type: 'tool_result', is_error: true, content: 'command not found' }] },
        }),
        event({ type: 'user', message: { content: 'Continue, please.' } }),
        event({
          type: 'result',
          subtype: 'success',
          is_error: true,
          num_turns: 1,
          stop_reason: 'stop_sequence',
          total_cost_usd: 0,
          result: 'Failed to authenticate.\nAPI Error: 401',
        }),
        'null',
      ],
      { full: false },
    );
    expect(lines).toEqual([
      '  > (error) command not found',
      '- user: Continue, please.',
      '- result: error (success), stop_sequence, 1 turns, 0.0000 USD',
      '  < Failed to authenticate.',
      '  < API Error: 401',
      '- ? null',
    ]);
  });

  it("shows the question a session ended on, which only its result holds (W2 spike's sessions)", () => {
    const lines = readableTranscript(
      readFileSync(repoPath('test/fixtures/sessions/question.jsonl'), 'utf8').trim().split('\n'),
      { full: false },
    );
    expect(lines[1]).toMatch(/^ {2}< What specifically needs to be cached/);
  });

  it("cuts the user's text to one line unless full", () => {
    const long = ['first', 'x'.repeat(300), 'third'].join('\n');
    const user = event({ type: 'user', message: { content: long } });
    expect(readableTranscript([user], { full: false })).toEqual([
      `- user: first ${'x'.repeat(300)} third`.slice(0, 199) + '…',
    ]);
    expect(readableTranscript([user], { full: true })).toEqual([`- user: ${long}`]);
  });
});
