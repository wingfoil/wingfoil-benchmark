import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { codexAgent, codexSecrets, readCodexSession } from '../../../src/agents/index.js';
import type { ProcessResult } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A stream in the shape Codex 0.162.1's source gives (test/fixtures/codex-sessions/README.md). */
function stream(name: string): string[] {
  return readFileSync(repoPath(join('test/fixtures/codex-sessions', name)), 'utf8')
    .split('\n')
    .filter(Boolean);
}

const RATE = 0.92;
const MODEL = 'gpt-6.1-sol';
const THREAD = '019a3c7e-5b1d-7c40-9e2a-6f0d4b8c1a21';

/** completed.jsonl's totals at gpt-6.1-sol's list prices: 2000 fresh, 18000 cached, 4000 written, 1500 out. */
const COMPLETED_USD = (2000 * 2 + 18000 * 0.1 + 4000 * 2.5 + 1500 * 10) / 1e6;
/** resumed.jsonl's totals, the same thread later: 2000 fresh, 33000 cached, 5000 written, 2100 out. */
const RESUMED_USD = (2000 * 2 + 33000 * 0.1 + 5000 * 2.5 + 2100 * 10) / 1e6;

describe('reading a Codex session (REQ-RUN-09 as amended in 1.32)', () => {
  it('takes fresh input as what is left of input_tokens after the cached and the written tokens', () => {
    const session = readCodexSession(stream('completed.jsonl'), { model: MODEL, usdToEur: RATE });

    expect(session.outcome).toBe('completed');
    expect(session.threadId).toBe(THREAD);
    expect(session.usage).toMatchObject({
      inputTokens: 2000,
      cacheReadInputTokens: 18000,
      cacheCreationInputTokens: 4000,
      outputTokens: 1500,
      turns: 1,
    });
    expect(session.usage.costUsd).toBeCloseTo(COMPLETED_USD, 10);
    expect(session.usage.costEur).toBeCloseTo(COMPLETED_USD * RATE, 10);
  });

  it("reads an invocation's tokens as its thread's total less the total before it, and its cost as the total", () => {
    const first = readCodexSession(stream('completed.jsonl'), { model: MODEL, usdToEur: RATE });
    const resumed = readCodexSession(stream('resumed.jsonl'), {
      model: MODEL,
      usdToEur: RATE,
      before: first.totals,
    });

    expect(resumed.usage).toMatchObject({
      inputTokens: 0,
      cacheReadInputTokens: 15000,
      cacheCreationInputTokens: 1000,
      outputTokens: 600,
      turns: 1,
    });
    // The cost is the session's running total, as the port asks (StepOutcome.usage).
    expect(resumed.usage.costUsd).toBeCloseTo(RESUMED_USD, 10);
  });

  it('prices the model from the pinned table and records the basis as price-table (bug-016)', () => {
    const session = readCodexSession(stream('completed.jsonl'), { model: MODEL, usdToEur: RATE });

    expect(Object.keys(session.models)).toEqual([MODEL]);
    expect(session.models[MODEL]).toMatchObject({
      inputTokens: 2000,
      cacheReadInputTokens: 18000,
      cacheCreationInputTokens: 4000,
      outputTokens: 1500,
      costBasis: 'price-table',
    });
    expect(session.models[MODEL]?.costUsd).toBeCloseTo(COMPLETED_USD, 10);
  });

  it('records a model the table does not hold as unknown, at no cost, so that the estimate refuses it', () => {
    const session = readCodexSession(stream('completed.jsonl'), { model: 'gpt-unpriced', usdToEur: RATE });

    expect(session.usage.costUsd).toBe(0);
    expect(session.models['gpt-unpriced']?.costBasis).toBe('unknown');
  });

  it('takes the final message from the last agent_message item', () => {
    const session = readCodexSession(stream('completed.jsonl'), { model: MODEL, usdToEur: RATE });
    expect(session.finalMessage).toBe('Added src/index.ts with the inventory API.');
  });

  it('fails a turn that failed, with its message', () => {
    const session = readCodexSession(stream('failed.jsonl'), { model: MODEL, usdToEur: RATE });

    expect(session.outcome).toBe('failed');
    expect(session.error).toBe('stream disconnected before completion');
  });

  it('fails a stream with no turn.completed, rather than a session that used nothing', () => {
    const session = readCodexSession(stream('no-turn-completed.jsonl'), { model: MODEL, usdToEur: RATE });

    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/no turn\.completed/);
  });

  it("reads the plan's usage limit as quota exhausted (REQ-RUN-13 as amended in 1.32, documented shape)", () => {
    const session = readCodexSession(stream('usage-limit.jsonl'), { model: MODEL, usdToEur: RATE });
    expect(session.outcome).toBe('quota exhausted');
  });

  it("reads the API's quota message as quota exhausted too", () => {
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"turn.failed","error":{"message":"Quota exceeded. Check your plan and billing details."}}',
    ];
    expect(readCodexSession(lines, { model: MODEL, usdToEur: RATE }).outcome).toBe('quota exhausted');
  });

  it('reads a rate limit as rate limited, not as a failure', () => {
    const session = readCodexSession(stream('rate-limited.jsonl'), { model: MODEL, usdToEur: RATE });
    expect(session.outcome).toBe('rate limited');
  });

  it("takes a total below the thread's previous one as the invocation's own, never as a negative delta (review 1)", () => {
    const first = readCodexSession(stream('completed.jsonl'), { model: MODEL, usdToEur: RATE });
    const lower = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"turn.completed","usage":{"input_tokens":3000,"cached_input_tokens":1000,"cache_write_input_tokens":0,"output_tokens":100,"reasoning_output_tokens":0}}',
    ];
    const resumed = readCodexSession(lower, { model: MODEL, usdToEur: RATE, before: first.totals });

    expect(resumed.usage).toMatchObject({ inputTokens: 2000, cacheReadInputTokens: 1000, outputTokens: 100 });
    expect(resumed.totals).toEqual({ input: 27000, cached: 19000, written: 4000, output: 1600 });
    expect(resumed.usage.costUsd).toBeCloseTo(COMPLETED_USD + (2000 * 2 + 1000 * 0.1 + 100 * 10) / 1e6, 10);
  });

  it('decides once, at the first turn.completed, that a resume restarted its count (review 3)', () => {
    const first = readCodexSession(stream('completed.jsonl'), { model: MODEL, usdToEur: RATE });
    const usage = (input: number, cached: number, written: number, output: number) =>
      JSON.stringify({
        type: 'turn.completed',
        usage: {
          input_tokens: input,
          cached_input_tokens: cached,
          cache_write_input_tokens: written,
          output_tokens: output,
          reasoning_output_tokens: 0,
        },
      });
    // Restarted: the first total is below the step's; the second, still the resume's own, has grown past it.
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      usage(3000, 1000, 0, 100),
      usage(30000, 20000, 5000, 2000),
    ];
    const resumed = readCodexSession(lines, { model: MODEL, usdToEur: RATE, before: first.totals });

    expect(resumed.totals).toEqual({ input: 54000, cached: 38000, written: 9000, output: 3500 });
  });

  it('keeps the last error event as the failure of a stream with no turn, when it names no limit (review 3)', () => {
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"error","message":"unexpected status 401 Unauthorized"}',
    ];
    expect(readCodexSession(lines, { model: MODEL, usdToEur: RATE }).error).toBe(
      'unexpected status 401 Unauthorized',
    );
  });

  it("does not fail a session on Codex's own retries, which it reports as error events", () => {
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"error","message":"Reconnecting... 2/5 (stream disconnected before completion)"}',
      ...stream('completed.jsonl').slice(1),
    ];
    expect(readCodexSession(lines, { model: MODEL, usdToEur: RATE }).outcome).toBe('completed');
  });

  it('reads a limit an error event names when the stream ends with no turn.failed (review 2)', () => {
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"turn.started"}',
      '{"type":"error","message":"You’ve hit your usage limit. Try again later."}',
    ];
    expect(readCodexSession(lines, { model: MODEL, usdToEur: RATE }).outcome).toBe('quota exhausted');
  });

  it('does not turn a later failure of the turn into a stop because an earlier error named a limit (review 2)', () => {
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"error","message":"rate limit exceeded: Rate limit reached. Retrying."}',
      '{"type":"error","message":"Reconnecting... 2/5 (stream disconnected before completion)"}',
      '{"type":"turn.failed","error":{"message":"the context window is full"}}',
    ];
    const session = readCodexSession(lines, { model: MODEL, usdToEur: RATE });

    expect(session.outcome).toBe('failed');
    expect(session.error).toBe('the context window is full');
  });

  it.each([
    ['exceeded retry limit, last status: 429 Too Many Requests', 'rate limited'],
    ['You hit your spend cap for this workspace.', 'quota exhausted'],
    ['Your workspace is out of credits.', 'quota exhausted'],
  ])("reads Codex's '%s' as %s", (message, outcome) => {
    const lines = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      JSON.stringify({ type: 'turn.failed', error: { message } }),
    ];
    expect(readCodexSession(lines, { model: MODEL, usdToEur: RATE }).outcome).toBe(outcome);
  });

  it('reports a line that is not JSON rather than skipping it', () => {
    const session = readCodexSession(['not json'], { model: MODEL, usdToEur: RATE });

    expect(session.outcome).toBe('failed');
    expect(session.error).toMatch(/not valid JSON/);
  });

  it('keeps every line of the stream as the transcript', () => {
    const lines = stream('completed.jsonl');
    expect(readCodexSession(lines, { model: MODEL, usdToEur: RATE }).transcript).toEqual(lines);
  });
});

describe("the Codex credential's secrets (REQ-NFR-01 as amended in 1.32)", () => {
  it("names every long string of auth.json, but not the refresh's timestamp", () => {
    const text = JSON.stringify({
      auth_mode: 'chatgpt',
      OPENAI_API_KEY: null,
      tokens: {
        id_token: 'eyJhbGciOiJSUzI1NiJ9.id-token-value-long',
        access_token: 'eyJhbGciOiJSUzI1NiJ9.access-token-value-long',
        refresh_token: 'rt_refresh-token-value-long-enough',
        account_id: '6f1c2a90-3b6e-4f43-9d8f-2a7e0c5b1d44',
      },
      last_refresh: '2026-10-15T09:12:44.123456Z',
    });

    expect(codexSecrets(text).sort()).toEqual(
      [
        '6f1c2a90-3b6e-4f43-9d8f-2a7e0c5b1d44',
        'eyJhbGciOiJSUzI1NiJ9.access-token-value-long',
        'eyJhbGciOiJSUzI1NiJ9.id-token-value-long',
        'rt_refresh-token-value-long-enough',
      ].sort(),
    );
  });

  it('names nothing in a file that is not JSON, rather than throwing', () => {
    expect(codexSecrets('{ not json')).toEqual([]);
  });
});

describe('the Codex adapter (REQ-RUN-04 as amended in 1.32)', () => {
  const SESSION = '0babeb92-e70d-409c-8916-c15c542e5112';

  function authFile(accessToken: string): string {
    const file = join(tempDir('bench-codex-'), 'auth.json');
    writeFileSync(
      file,
      JSON.stringify({ tokens: { access_token: accessToken, refresh_token: 'rt_refresh-value-0001' } }),
    );
    return file;
  }

  function runner(outputs: string[], onRun?: () => void) {
    const commands: string[][] = [];
    return {
      commands,
      run: (command: readonly string[]): Promise<ProcessResult> => {
        commands.push([...command]);
        onRun?.();
        return Promise.resolve({ code: 0, stdout: outputs.shift() ?? '', stderr: '' });
      },
    };
  }

  const step = (run: (command: readonly string[]) => Promise<ProcessResult>, effort?: string) => ({
    scenarioId: 'S3',
    step: 1,
    prompt: 'add a caching layer',
    model: MODEL,
    sessionId: SESSION,
    remainingCostUsd: 3.39,
    ...(effort === undefined ? {} : { effort }),
    run,
  });

  it('builds the step command line argument by argument, with the effort as a config override', async () => {
    const exec = runner([stream('completed.jsonl').join('\n')]);

    await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step(exec.run, 'medium'),
    );

    expect(exec.commands).toEqual([
      [
        'codex',
        'exec',
        '--json',
        '--model',
        MODEL,
        '-c',
        'model_reasoning_effort="medium"',
        '--dangerously-bypass-approvals-and-sandbox',
        '--skip-git-repo-check',
        '--strict-config',
        '--',
        'add a caching layer',
      ],
    ]);
  });

  it('passes no effort for none, or when nothing is pinned', async () => {
    const exec = runner([stream('completed.jsonl').join('\n'), stream('completed.jsonl').join('\n')]);
    const agent = codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE });

    await agent.runStep(step(exec.run, 'none'));
    await agent.runStep(step(exec.run));

    for (const command of exec.commands) expect(command.join(' ')).not.toContain('model_reasoning_effort');
  });

  it("answers for the runner's session id once Codex started its thread", async () => {
    const exec = runner([stream('completed.jsonl').join('\n')]);

    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step(exec.run),
    );

    expect(outcome.sessionId).toBe(SESSION);
    expect(outcome.error).toBeUndefined();
    expect(outcome.usage.costUsd).toBeCloseTo(COMPLETED_USD, 10);
    expect(outcome.models?.[MODEL]?.costBasis).toBe('price-table');
    expect(outcome.finalMessage).toBe('Added src/index.ts with the inventory API.');
    expect(outcome.transcript.join('\n')).toContain(THREAD);
  });

  it('says that a session with no turn.completed reported no usage, so that the runner counts it at its bound', async () => {
    const exec = runner([stream('no-turn-completed.jsonl').join('\n')]);

    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step(exec.run),
    );

    expect(outcome.error).toBeDefined();
    expect(outcome.costUnknown).toBe(true);
  });

  it('reports the usage of a session that failed after a turn.completed as known', async () => {
    const exec = runner([stream('failed.jsonl').join('\n')]);

    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step(exec.run),
    );

    expect(outcome.costUnknown).toBeUndefined();
  });

  it('forgets its threads at the end of a run (dl-024)', async () => {
    const exec = runner([stream('completed.jsonl').join('\n')]);
    const agent = codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE });
    await agent.runStep(step(exec.run, 'medium'));

    agent.endRun?.();
    const resumed = await agent.resume({
      scenarioId: 'S3',
      step: 1,
      intervention: 1,
      sessionId: SESSION,
      reply: 'Continue.',
      remainingCostUsd: 3,
      effort: 'medium',
      run: exec.run,
    });

    expect(resumed.error).toMatch(/no Codex thread for session/);
    expect(exec.commands).toHaveLength(1);
  });

  it("resumes Codex's thread, not the runner's id, and reads the resume against the thread's total", async () => {
    const exec = runner([stream('completed.jsonl').join('\n'), stream('resumed.jsonl').join('\n')]);
    const agent = codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE });

    await agent.runStep(step(exec.run, 'medium'));
    const resumed = await agent.resume({
      scenarioId: 'S3',
      step: 1,
      intervention: 1,
      sessionId: SESSION,
      reply: 'Continue.',
      remainingCostUsd: 3,
      effort: 'medium',
      run: exec.run,
    });

    expect(exec.commands[1]).toEqual([
      'codex',
      'exec',
      'resume',
      '--json',
      '-c',
      'model_reasoning_effort="medium"',
      '--dangerously-bypass-approvals-and-sandbox',
      '--skip-git-repo-check',
      '--strict-config',
      '--',
      THREAD,
      'Continue.',
    ]);
    expect(resumed.sessionId).toBe(SESSION);
    expect(resumed.usage).toMatchObject({ inputTokens: 0, cacheReadInputTokens: 15000, outputTokens: 600 });
    expect(resumed.usage.costUsd).toBeCloseTo(RESUMED_USD, 10);
  });

  it('resumes a thread whose stream does not start it again, as the same session', async () => {
    const exec = runner([stream('completed.jsonl').join('\n'), stream('resumed.jsonl').slice(1).join('\n')]);
    const agent = codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE });

    await agent.runStep(step(exec.run));
    const resumed = await agent.resume({
      scenarioId: 'S3',
      step: 1,
      intervention: 1,
      sessionId: SESSION,
      reply: 'Continue.',
      remainingCostUsd: 3,
      run: exec.run,
    });

    expect(resumed.sessionId).toBe(SESSION);
    expect(resumed.error).toBeUndefined();
    expect(resumed.usage.cacheReadInputTokens).toBe(15000);
  });

  it('fails a resume that Codex answered in another thread, reporting no session', async () => {
    const other = stream('resumed.jsonl').map((line) =>
      line.replace(THREAD, '019a0000-ffff-7000-8000-000000000000'),
    );
    const exec = runner([stream('completed.jsonl').join('\n'), other.join('\n')]);
    const agent = codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE });

    await agent.runStep(step(exec.run));
    const resumed = await agent.resume({
      scenarioId: 'S3',
      step: 1,
      intervention: 1,
      sessionId: SESSION,
      reply: 'Continue.',
      remainingCostUsd: 3,
      run: exec.run,
    });

    expect(resumed.sessionId).toBe('');
    expect(resumed.error).toMatch(/resumed thread .*, not /);
  });

  it('refuses to resume a session it never started, without running anything', async () => {
    const exec = runner([]);

    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).resume({
      scenarioId: 'S3',
      step: 1,
      intervention: 1,
      sessionId: SESSION,
      reply: 'Continue.',
      remainingCostUsd: 3,
      run: exec.run,
    });

    expect(exec.commands).toEqual([]);
    expect(outcome.error).toMatch(/no Codex thread/);
  });

  it('reports no session when Codex never started its thread', async () => {
    const exec = runner(['{"type":"turn.failed","error":{"message":"not logged in"}}']);

    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step(exec.run),
    );

    expect(outcome.sessionId).toBe('');
    expect(outcome.error).toBe('not logged in');
  });

  it('scrubs the credential read before the invocation and the one a refresh wrote during it', async () => {
    const file = authFile('at-before-refresh-0001');
    const leaked = [
      `{"type":"thread.started","thread_id":"${THREAD}"}`,
      '{"type":"item.completed","item":{"id":"i","type":"agent_message","text":"at-before-refresh-0001 at-after-refresh-0002"}}',
      '{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}',
    ].join('\n');
    // The refresh: Codex rewrites auth.json in place while the session runs.
    const exec = runner([leaked], () =>
      writeFileSync(file, JSON.stringify({ tokens: { access_token: 'at-after-refresh-0002' } })),
    );

    const outcome = await codexAgent({ authFile: file, usdToEur: RATE }).runStep(step(exec.run));

    const text = outcome.transcript.join('\n');
    expect(text).not.toContain('at-before-refresh-0001');
    expect(text).not.toContain('at-after-refresh-0002');
    expect(text).toContain('[redacted]');
  });

  it('measures the wall time of the invocation, which Codex does not report', async () => {
    const times = [1_000, 5_500];
    const exec = runner([stream('completed.jsonl').join('\n')]);

    const outcome = await codexAgent({
      authFile: authFile('at-0001-long-access'),
      usdToEur: RATE,
      now: () => times.shift() ?? 0,
    }).runStep(step(exec.run));

    expect(outcome.usage.durationMs).toBe(4_500);
  });

  it('reports a stop of the plan as a stop, through the port', async () => {
    const exec = runner([stream('usage-limit.jsonl').join('\n')]);

    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step(exec.run),
    );

    expect(outcome.stop).toBe('quota exhausted');
    expect(outcome.error).toBeUndefined();
  });

  it("fails a step whose output reached the port's bound by name (bug-011)", async () => {
    const commands: string[][] = [];
    const outcome = await codexAgent({ authFile: authFile('at-0001-long-access'), usdToEur: RATE }).runStep(
      step((command) => {
        commands.push([...command]);
        return Promise.resolve({ code: 0, stdout: '{"type":"thread.st', stderr: '', outputBounded: true });
      }),
    );

    expect(outcome.error).toMatch(/output bound/);
  });
});

describe("a recorded Codex 0.162.1 session (task-094's P0, 2026-10-15)", () => {
  it('reads the real step and its resume as the fixtures in the source shape are read', () => {
    const step = readCodexSession(stream('recorded-p0-step.jsonl'), { model: MODEL, usdToEur: RATE });
    const resume = readCodexSession(stream('recorded-p0-resume.jsonl'), {
      model: MODEL,
      usdToEur: RATE,
      before: step.totals,
      threadId: step.threadId,
    });

    expect(step.outcome).toBe('completed');
    expect(step.usage).toMatchObject({
      inputTokens: 13536,
      cacheReadInputTokens: 104576,
      outputTokens: 3461,
    });
    expect(step.usage.costUsd).toBeCloseTo((13536 * 2 + 104576 * 0.1 + 3461 * 10) / 1e6, 10);
    // The resume reported the thread's total, the step's included: its own tokens are the difference.
    expect(resume.threadId).toBe(step.threadId);
    expect(resume.outcome).toBe('completed');
    expect(resume.usage).toMatchObject({ inputTokens: 267, cacheReadInputTokens: 19200, outputTokens: 70 });
    expect(resume.usage.costUsd).toBeCloseTo(0.0752936, 7);
  });
});
