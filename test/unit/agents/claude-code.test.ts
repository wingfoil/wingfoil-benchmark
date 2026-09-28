import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { claudeCodeAgent, loadAgentToken, readSession, scrub } from '../../../src/agents/index.js';
import type { ProcessResult } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A stream recorded from the real agent during the W2 spike (task-004). */
function recorded(name: string): string[] {
  return readFileSync(repoPath(join('test/fixtures/sessions', name)), 'utf8')
    .split('\n')
    .filter(Boolean);
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
      outputTokens: 40,
      cacheCreationInputTokens: 6628,
      cacheReadInputTokens: 13790,
      costUsd: 0.009874,
      costEur: 0.009874 * RATE,
      turns: 1,
      durationMs: 4236,
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

  it("sums a session's work across a resume, but takes its cost as the session's latest total", () => {
    // The spike's own pair: a session that asked a question (P4) and its resume (P6), one session.
    // Tokens, turns and wall time are reported per invocation; `total_cost_usd` is the session's
    // running total — P6 reports 0.0681071 = P4's 0.00734975 + its own 0.06075735, and its
    // modelUsage still carries P4's entry. Summing the cost would count P4 twice.
    const both = readSession([...recorded('question.jsonl'), ...recorded('resumed.jsonl')], RATE);

    expect(both.usage).toEqual({
      inputTokens: 10 + 98,
      outputTokens: 393 + 4967,
      cacheCreationInputTokens: 2895 + 6399,
      cacheReadInputTokens: 17560 + 278256,
      costUsd: 0.0681071,
      costEur: 0.0681071 * RATE,
      turns: 1 + 12,
      durationMs: 5288 + 51037,
    });
    expect(both.outcome).toBe('completed');
  });

  it('keeps every event of the stream as the transcript', () => {
    const events = recorded('question.jsonl');
    expect(readSession(events, RATE).transcript).toEqual(events);
  });

  it('names the session the agent ended in, not the one it was asked for', () => {
    // The init event echoes the --session-id the runner passed, so reading the first session_id
    // compares that id with itself. The result event is the one that says what actually ran.
    const events = [
      '{"type":"system","subtype":"init","session_id":"the-id-the-runner-gave"}',
      '{"type":"result","is_error":false,"terminal_reason":"completed","session_id":"a-session-of-its-own"}',
    ];
    expect(readSession(events, RATE).sessionId).toBe('a-session-of-its-own');
  });

  it('fails a session that ended for any reason other than completing (adr-002 decision 6)', () => {
    // --max-budget-usd is emitted in W2, so a budget-terminated session is reachable now.
    const events = ['{"type":"result","terminal_reason":"max_budget_exceeded","total_cost_usd":3}'];
    const session = readSession(events, RATE);

    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/max_budget_exceeded/);
    // What it spent before it was cut off is still recorded: the money was spent either way.
    expect(session.usage.costUsd).toBe(3);
  });

  it('reads a session its --max-budget-usd stopped as cap reached, not as a failure (task-024, C1)', () => {
    // C1's result event, trimmed: what Claude Code 2.1.280 wrote when its 0.04 USD cap stopped it.
    const events = [
      '{"type":"result","subtype":"error_max_budget_usd","is_error":true,"terminal_reason":"budget_exhausted",' +
        '"total_cost_usd":0.0418931,"num_turns":14,"session_id":"s","result":"","errors":["Reached maximum budget ($0.04)"]}',
    ];
    const session = readSession(events, RATE);
    expect(session.outcome).toBe('cap reached');
    expect(session.error).toBeUndefined();
    expect(session.usage.costUsd).toBe(0.0418931);
  });

  it('reads a session the subscription quota stopped as quota exhausted (REQ-RUN-13, unverified shape)', () => {
    for (const event of [
      '{"type":"result","is_error":true,"terminal_reason":"api_error","result":"Claude AI usage limit reached|1760000000"}',
      '{"type":"result","is_error":true,"terminal_reason":"api_error","errors":["rate_limit_error: quota"]}',
    ]) {
      expect(readSession([event], RATE).outcome).toBe('quota exhausted');
    }
    // Another API error is a failure, as before.
    expect(
      readSession(
        ['{"type":"result","is_error":true,"terminal_reason":"api_error","result":"overloaded"}'],
        RATE,
      ).outcome,
    ).toBe('failed');
  });

  it('reports the stop of the session through the port', async () => {
    const stream =
      '{"type":"result","subtype":"error_max_budget_usd","is_error":true,"terminal_reason":"budget_exhausted","total_cost_usd":0.04,"session_id":"s"}\n';
    const agent = claudeCodeAgent({ token: 'sk-ant-oat01-TEST', usdToEur: 1 });
    const outcome = await agent.runStep({
      scenarioId: 'S1',
      step: 1,
      prompt: 'p',
      model: 'm',
      sessionId: 's',
      remainingCostUsd: 0.04,
      run: () => Promise.resolve({ code: 1, stdout: stream, stderr: '' }),
    });
    expect(outcome).toMatchObject({ sessionId: 's', stop: 'cap reached' });
    expect(outcome.error).toBeUndefined();
  });

  it('does not take a non-boolean is_error for a success', () => {
    const session = readSession(['{"type":"result","is_error":"true","terminal_reason":"completed"}'], RATE);
    expect(session.outcome).toBe('failed');
  });

  it('reports a line that is not an object rather than crashing on it', () => {
    // `null` parses, so the JSON guard alone lets it through and the next property access throws.
    expect(readSession(['null'], RATE).outcome).toBe('failed');
    expect(readSession(['null'], RATE).error).toMatch(/not an object/);
  });

  it('reports a line that is not JSON rather than skipping it', () => {
    const session = readSession(['not json'], RATE);
    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/is not valid JSON/);
  });
});

describe('the final assistant message (REQ-RUN-06, dl-004)', () => {
  it('reads it from the result event, which is what the approver classifies', () => {
    // In every untrimmed stream of the spike, the result field is byte-identical to the last
    // assistant text. The trimmed fixtures kept only the result event, so this is where it is read.
    expect(readSession(recorded('question.jsonl'), RATE).finalMessage).toBe(
      'What specifically needs to be cached — database queries, API responses, computed results, or something else?',
    );
    expect(readSession(recorded('approval.jsonl'), RATE).finalMessage).toMatch(
      /^[\s\S]*Are you sure you want me to delete all files under `\/workspace`\?[\s\S]*instead\.$/,
    );
    expect(readSession(recorded('completed.jsonl'), RATE).finalMessage).toBe('ready');
  });

  it("takes the last session's message when a stream holds more than one result", () => {
    const both = readSession([...recorded('question.jsonl'), ...recorded('completed.jsonl')], RATE);
    expect(both.finalMessage).toBe('ready');
  });

  it("clears an earlier message when a later result carries none: the last session's is the one", () => {
    const events = [
      ...recorded('question.jsonl'),
      '{"type":"result","is_error":false,"terminal_reason":"completed"}',
    ];
    expect(readSession(events, RATE).finalMessage).toBeUndefined();
  });

  it('has none when the stream has no result event', () => {
    expect(readSession(recorded('truncated-no-result.jsonl'), RATE).finalMessage).toBeUndefined();
  });

  it('has none when the result event carries no text', () => {
    const session = readSession(['{"type":"result","is_error":false,"terminal_reason":"completed"}'], RATE);
    expect(session.outcome).toBe('completed');
    expect(session.finalMessage).toBeUndefined();
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

describe('the Claude Code adapter (REQ-RUN-04)', () => {
  function runner(stdout: string) {
    const commands: string[][] = [];
    return {
      commands,
      run: (command: readonly string[]) => {
        commands.push([...command]);
        return Promise.resolve({ code: 0, stdout, stderr: '' });
      },
    };
  }

  const request = (run: (command: readonly string[]) => Promise<ProcessResult>) => ({
    scenarioId: 'S1',
    step: 1,
    prompt: 'add a caching layer',
    model: 'claude-sonnet-5',
    sessionId: '0babeb92-e70d-409c-8916-c15c542e5112',
    remainingCostUsd: 2.75,
    run,
  });

  it('builds the command line REQ-RUN-04 specifies, argument by argument', async () => {
    const exec = runner(recorded('completed.jsonl').join('\n'));

    await claudeCodeAgent({ token: 'sk-ant-oat01-SECRET', usdToEur: RATE }).runStep(request(exec.run));

    expect(exec.commands).toEqual([
      [
        'claude',
        '-p',
        'add a caching layer',
        '--output-format',
        'stream-json',
        '--verbose',
        '--model',
        'claude-sonnet-5',
        '--session-id',
        '0babeb92-e70d-409c-8916-c15c542e5112',
        '--permission-mode',
        'bypassPermissions',
        '--setting-sources',
        'project',
        '--max-budget-usd',
        '2.75',
      ],
    ]);
  });

  it("adds the arm's MCP configuration, and only it, when the arm has one (adr-003 decision 12)", async () => {
    const exec = runner(recorded('completed.jsonl').join('\n'));

    await claudeCodeAgent({ token: 'x', usdToEur: RATE }).runStep({
      ...request(exec.run),
      mcpConfig: '/home/node/mcp.json',
    });

    expect(exec.commands[0]?.slice(-3)).toEqual([
      '--mcp-config',
      '/home/node/mcp.json',
      '--strict-mcp-config',
    ]);
  });

  it('reports the usage and the session the agent actually used', async () => {
    const exec = runner(recorded('completed.jsonl').join('\n'));

    const outcome = await claudeCodeAgent({ token: 'x', usdToEur: RATE }).runStep(request(exec.run));

    expect(outcome.sessionId).toBe('866c649d-7cdc-4192-a033-75c01a9b543f');
    expect(outcome.usage.costUsd).toBeCloseTo(0.009874, 10);
    expect(outcome.transcript).toHaveLength(4);
  });

  it('scrubs the token out of the transcript before it is stored (REQ-NFR-01)', async () => {
    const token = 'sk-ant-oat01-SECRET';
    const exec = runner(
      `{"type":"result","is_error":false,"terminal_reason":"completed","leaked":"${token}"}`,
    );

    const outcome = await claudeCodeAgent({ token, usdToEur: RATE }).runStep(request(exec.run));

    expect(outcome.transcript.join('\n')).not.toContain(token);
    expect(outcome.transcript.join('\n')).toContain('[redacted]');
  });

  it('resumes a session with the command line the spike measured, and the remaining cap (REQ-RUN-07)', async () => {
    const exec = runner(recorded('resumed.jsonl').join('\n'));

    const outcome = await claudeCodeAgent({ token: 'x', usdToEur: RATE }).resume({
      scenarioId: 'S1',
      step: 2,
      intervention: 1,
      sessionId: '691b34d4-6948-402b-8804-9f8016feb677',
      reply: 'Approved. Proceed.',
      remainingCostUsd: 1.25,
      run: exec.run,
    });

    // No --model and no --session-id: the spike resumed without them and the session kept its model.
    expect(exec.commands).toEqual([
      [
        'claude',
        '--resume',
        '691b34d4-6948-402b-8804-9f8016feb677',
        '-p',
        'Approved. Proceed.',
        '--output-format',
        'stream-json',
        '--verbose',
        '--permission-mode',
        'bypassPermissions',
        '--setting-sources',
        'project',
        '--max-budget-usd',
        '1.25',
      ],
    ]);
    expect(outcome.sessionId).toBe('691b34d4-6948-402b-8804-9f8016feb677');
    expect(outcome.usage.costUsd).toBeCloseTo(0.0681071, 10);
    expect(outcome.finalMessage).toMatch(/requires Redis on localhost:6379\)\.$/);
  });

  it("keeps the MCP configuration on a resume, or the resumed session would lose the arm's tools", async () => {
    const exec = runner(recorded('resumed.jsonl').join('\n'));

    await claudeCodeAgent({ token: 'x', usdToEur: RATE }).resume({
      scenarioId: 'S1',
      step: 2,
      intervention: 1,
      sessionId: '691b34d4-6948-402b-8804-9f8016feb677',
      reply: 'Approved. Proceed.',
      remainingCostUsd: 1.25,
      mcpConfig: '/home/node/mcp.json',
      run: exec.run,
    });

    expect(exec.commands[0]?.slice(-3)).toEqual([
      '--mcp-config',
      '/home/node/mcp.json',
      '--strict-mcp-config',
    ]);
  });

  it('scrubs the token out of a resumed transcript too, and reports its failure', async () => {
    const token = 'sk-ant-oat01-SECRET';
    const exec = runner(
      `{"type":"result","is_error":true,"terminal_reason":"completed","leaked":"${token}"}`,
    );

    const outcome = await claudeCodeAgent({ token, usdToEur: RATE }).resume({
      scenarioId: 'S1',
      step: 1,
      intervention: 1,
      sessionId: 's',
      reply: 'Approved. Proceed.',
      remainingCostUsd: 1,
      run: exec.run,
    });

    expect(outcome.transcript.join('\n')).not.toContain(token);
    expect(outcome.error).toMatch(/is_error true/);
  });

  it('passes the final message of a step on, for the approver to read', async () => {
    const exec = runner(recorded('approval.jsonl').join('\n'));
    const outcome = await claudeCodeAgent({ token: 'x', usdToEur: RATE }).runStep(request(exec.run));
    expect(outcome.finalMessage).toContain('Are you sure');
  });

  it('reports a failed session with what it spent, rather than throwing it away', async () => {
    const exec = runner(recorded('failed-subtype-success.jsonl').join('\n'));

    const outcome = await claudeCodeAgent({ token: 'x', usdToEur: RATE }).runStep(request(exec.run));

    expect(outcome.error).toMatch(/api_error/);
    // The transcript survives the failure: it is the only evidence of why the session stopped.
    expect(outcome.transcript.length).toBeGreaterThan(0);
  });
});
