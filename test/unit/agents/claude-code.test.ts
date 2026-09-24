import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadAgentToken, readSession, scrub } from '../../../src/agents/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A stream recorded from the real agent during the W2 spike (task-004). */
function recorded(name: string): string[] {
  return readFileSync(repoPath(join('test/fixtures/sessions', name)), 'utf8').split('\n').filter(Boolean);
}

/** The campaign rate of the fixtures: 0.92 € per $. */
const RATE = 0.92;

describe('reading a session (REQ-RUN-09)', () => {
  it('takes usage from the result event, with the cost in both currencies', () => {
    const session = readSession(recorded('completed.jsonl'), RATE);

    expect(session.outcome).toBe('completed');
    expect(session.sessionId).toBe('866c649d-7cdc-4192-a033-75c01a9b543f');
    expect(session.usage).toEqual({
      inputTokens: 10,
      outputTokens: 43,
      cacheCreationInputTokens: 2881,
      cacheReadInputTokens: 17560,
      costUsd: 0.009874,
      costEur: 0.009874 * RATE,
      turns: 1,
      durationMs: 2079,
    });
  });

  it('reads the same shape from another model, so the adapter is not tuned to one', () => {
    const session = readSession(recorded('completed-sonnet.jsonl'), RATE);
    expect(session.outcome).toBe('completed');
    expect(session.usage.costUsd).toBeGreaterThan(0);
    expect(session.usage.turns).toBe(1);
  });

  it('calls a session failed when is_error is set, whatever subtype says', () => {
    // The spike recorded this: "subtype": "success" on a session that authenticated nothing.
    const events = recorded('failed-subtype-success.jsonl');
    expect(events.some((line) => line.includes('"subtype":"success"'))).toBe(true);

    const session = readSession(events, RATE);

    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/api_error/);
  });

  it('calls a stream with no result event failed, not a session that used nothing', () => {
    const session = readSession(recorded('truncated-no-result.jsonl'), RATE);

    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/no result event/);
  });

  it('sums the result events of a step, so a resumed step is not under-reported', () => {
    // One step, two invocations: the step and the reply that resumed it (REQ-RUN-07, task-007).
    const first = readSession(recorded('completed.jsonl'), RATE);
    const both = readSession([...recorded('completed.jsonl'), ...recorded('resumed.jsonl')], RATE);

    expect(both.usage.costUsd).toBeGreaterThan(first.usage.costUsd);
    expect(both.usage.turns).toBeGreaterThan(first.usage.turns);
    expect(both.outcome).toBe('completed');
  });

  it('keeps every event of the stream as the transcript', () => {
    const events = recorded('question.jsonl');
    expect(readSession(events, RATE).transcript).toEqual(events);
  });

  it('reports a line that is not JSON rather than skipping it', () => {
    const session = readSession(['not json'], RATE);
    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/is not valid JSON/);
  });
});

describe('scrubbing a transcript (REQ-NFR-01)', () => {
  it('replaces every known secret value, wherever it appears', () => {
    const text = 'Authorization: Bearer sk-ant-oat01-SECRET and again sk-ant-oat01-SECRET';
    expect(scrub(text, ['sk-ant-oat01-SECRET'])).toBe(
      'Authorization: Bearer [redacted] and again [redacted]',
    );
  });

  it('leaves a transcript alone when it holds no known secret', () => {
    const text = recorded('completed.jsonl').join('\n');
    expect(scrub(text, ['sk-ant-oat01-SECRET'])).toBe(text);
  });

  it('ignores an empty secret, which would otherwise redact everything', () => {
    expect(scrub('hello', ['', '   '])).toBe('hello');
  });
});

describe('the agent token (REQ-RUN-15)', () => {
  function tokenFile(content: string): string {
    const file = join(tempDir('bench-token-'), 'token');
    writeFileSync(file, content);
    return file;
  }

  it('reads the token, stripped of the whitespace a paste leaves behind', () => {
    // The spike lost a session to exactly this: a token wrapped across two lines.
    const result = loadAgentToken(tokenFile('sk-ant-oat01-AAAA\nBBBB\n'));
    expect(result.ok && result.value).toBe('sk-ant-oat01-AAAABBBB');
  });

  it('refuses a file that holds nothing but whitespace, before a session starts', () => {
    const result = loadAgentToken(tokenFile('  \n\t\n'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/is empty/);
  });

  it('refuses a file that cannot be read, naming it', () => {
    const result = loadAgentToken(join(tempDir('bench-token-'), 'missing'));
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['missing']);
  });
});
