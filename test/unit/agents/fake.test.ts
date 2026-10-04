import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fakeAgent, loadFakeScript } from '../../../src/agents/index.js';
import type { ProcessResult } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = {
  T0: {
    '1': { commands: ['touch hello.txt'] },
    '2': { commands: ['echo hi > hello.txt'] },
    '3': { session: 'not-the-one-it-was-given', commands: ['true'] },
  },
};

/** What the runner asks for: a fresh session per step (F2.2). */
function request(step: number, run: (command: readonly string[]) => Promise<ProcessResult>) {
  return {
    scenarioId: 'T0',
    step,
    prompt: `do step ${step}`,
    model: 'fake-model',
    sessionId: `session-${step}`,
    remainingCostUsd: 3,
    run,
  };
}

/** The fake's options when no recorded session is involved. */
const PLAIN = { dir: '/nowhere', usdToEur: 0.92 };

function scriptFile(content: unknown = SCRIPT): string {
  const dir = tempDir('bench-script-');
  const file = join(dir, 'script.json');
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
}

function exec(results: ProcessResult[] = []) {
  const commands: string[][] = [];
  return {
    commands,
    run: (command: readonly string[]) => {
      commands.push([...command]);
      return Promise.resolve(results.shift() ?? { code: 0, stdout: '', stderr: '' });
    },
  };
}

describe('loadFakeScript', () => {
  it('reads a script of commands per scenario and step', () => {
    const result = loadFakeScript(scriptFile());
    expect(result.ok && result.value.T0?.['1']).toEqual({ commands: ['touch hello.txt'] });
  });

  it.each([
    ['{"T0": {"1": "touch x"}}', 'T0.1'],
    ['{"T0": {"1": {"commands": []}}}', 'T0.1.commands'],
    ['{"T0": {"0": {"commands": ["x"]}}}', 'T0.0'],
    ['[]', 'script.json'],
    ['not json', 'script.json'],
  ])('reports a malformed script (%s)', (content, path) => {
    const result = loadFakeScript(scriptFile(content));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe(path);
  });

  it('reports a script that does not exist', () => {
    const result = loadFakeScript(join(tempDir('bench-script-'), 'missing.json'));
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual(['missing.json']);
  });

  it('refuses a script larger than a script has any reason to be', () => {
    const file = scriptFile(`{"T0": {"1": {"commands": ["${'x'.repeat(1024 * 1024)}"]}}}`);
    const result = loadFakeScript(file);
    expect(result.ok ? [] : result.issues.map((issue) => issue.message)).toEqual([
      expect.stringMatching(/^is larger than 1048576 bytes/),
    ]);
  });
});

describe('the scripted fake agent', () => {
  it('runs the commands its script declares for the step', async () => {
    const runner = exec();
    const outcome = await fakeAgent(SCRIPT, PLAIN).runStep(request(2, runner.run));
    expect(runner.commands).toEqual([['sh', '-c', 'echo hi > hello.txt']]);
    // It answers with the session it was given: the ordinary case (F2.2).
    expect(outcome.sessionId).toBe('session-2');
    expect(outcome.transcript).toEqual([]);
  });

  it('replays a recorded session when the script names one (adr-002 decision 13)', async () => {
    const dir = tempDir('bench-replay-');
    const events = join(dir, 'session.jsonl');
    copyFileSync(repoPath('test/fixtures/sessions/completed.jsonl'), events);
    const file = join(dir, 'script.json');
    writeFileSync(file, JSON.stringify({ T0: { '1': { commands: ['true'], events: 'session.jsonl' } } }));
    const script = loadFakeScript(file);
    expect(script.ok).toBe(true);
    if (!script.ok) return;
    const runner = exec();

    const outcome = await fakeAgent(script.value, { dir, usdToEur: 0.92 }).runStep(request(1, runner.run));

    // The same stream the real agent produced, read by the same parser: the whole pipeline is
    // exercised without an agent and without spending.
    expect(outcome.usage.costUsd).toBeCloseTo(0.009874, 10);
    expect(outcome.transcript).toHaveLength(4);
    expect(runner.commands).toEqual([['sh', '-c', 'true']]);
    // And the models it reports, as the real agent's (task-054).
    expect(Object.keys(outcome.models ?? {})).toEqual(['claude-haiku-4-5']);
    expect(outcome.models?.['claude-haiku-4-5']?.costUsd).toBeCloseTo(0.009874, 10);
  });

  it('reports a replayed session that failed, instead of calling the step a success', async () => {
    // Every acceptance test and every later wave runs through this path (adr-002 decision 13): an
    // agent that cannot report a failure makes a failing step untestable everywhere.
    const dir = tempDir('bench-replay-');
    copyFileSync(repoPath('test/fixtures/sessions/failed-subtype-success.jsonl'), join(dir, 'session.jsonl'));
    const file = join(dir, 'script.json');
    writeFileSync(file, JSON.stringify({ T0: { '1': { commands: ['true'], events: 'session.jsonl' } } }));
    const script = loadFakeScript(file);
    expect(script.ok).toBe(true);
    if (!script.ok) return;

    const outcome = await fakeAgent(script.value, { dir, usdToEur: 0.92 }).runStep(request(1, exec().run));

    expect(outcome.error).toMatch(/api_error/);
    // And what it spent before failing is still reported.
    expect(outcome.transcript.length).toBeGreaterThan(0);
  });

  it('replays a recorded rate limit as a stop, not as a completed step (task-051)', async () => {
    // test/fixtures/sessions/rate-limited.jsonl: bug-010's 429, reconstructed from the fields the bug quotes.
    const dir = tempDir('bench-replay-');
    copyFileSync(repoPath('test/fixtures/sessions/rate-limited.jsonl'), join(dir, 'session.jsonl'));
    const file = join(dir, 'script.json');
    writeFileSync(file, JSON.stringify({ T0: { '1': { commands: ['true'], events: 'session.jsonl' } } }));
    const script = loadFakeScript(file);
    expect(script.ok).toBe(true);
    if (!script.ok) return;

    const outcome = await fakeAgent(script.value, { dir, usdToEur: 0.92 }).runStep(request(1, exec().run));

    expect(outcome.stop).toBe('rate limited');
    expect(outcome.error).toBeUndefined();
  });

  it('reports a recorded session it cannot read, rather than replaying nothing', async () => {
    const dir = tempDir('bench-replay-');
    const file = join(dir, 'script.json');
    writeFileSync(file, JSON.stringify({ T0: { '1': { commands: ['true'], events: 'missing.jsonl' } } }));
    const script = loadFakeScript(file);
    expect(script.ok).toBe(true);
    if (!script.ok) return;

    await expect(
      fakeAgent(script.value, { dir, usdToEur: 0.92 }).runStep(request(1, exec().run)),
    ).rejects.toThrow(/missing.jsonl/);
  });

  it("can answer with a different session, so that the runner's check has something to catch", async () => {
    const runner = exec();
    const outcome = await fakeAgent(SCRIPT, PLAIN).runStep(request(3, runner.run));
    expect(outcome.sessionId).toBe('not-the-one-it-was-given');
  });

  it('fails when the script says nothing about the step, so that nothing passes silently', async () => {
    const runner = exec();
    await expect(fakeAgent(SCRIPT, PLAIN).runStep(request(9, runner.run))).rejects.toThrow(
      /no scripted commands for T0 step 9/,
    );
    expect(runner.commands).toEqual([]);
  });

  it('fails when a command fails, naming its output', async () => {
    const runner = exec([{ code: 2, stdout: '', stderr: 'boom' }]);
    await expect(fakeAgent(SCRIPT, PLAIN).runStep(request(1, runner.run))).rejects.toThrow(
      /touch hello.txt.*boom/s,
    );
  });
});

describe('the scripted fake agent, resumed by the approver (REQ-RUN-07)', () => {
  /** A script whose step 1 replays `question.jsonl`, then one scripted resume per entry. */
  function resumable(resumes: unknown[]) {
    const dir = tempDir('bench-resume-');
    for (const name of ['question.jsonl', 'approval.jsonl', 'resumed.jsonl']) {
      copyFileSync(repoPath(join('test/fixtures/sessions', name)), join(dir, name));
    }
    const file = join(dir, 'script.json');
    writeFileSync(
      file,
      JSON.stringify({ T0: { '1': { commands: ['true'], events: 'question.jsonl', resumes } } }),
    );
    const script = loadFakeScript(file);
    if (!script.ok) throw new Error(JSON.stringify(script.issues));
    return fakeAgent(script.value, { dir, usdToEur: 0.92 });
  }

  const resumeRequest = (
    intervention: number,
    run: (command: readonly string[]) => Promise<ProcessResult>,
  ) => ({
    scenarioId: 'T0',
    step: 1,
    intervention,
    sessionId: 'session-1',
    reply: 'Approved. Proceed.',
    remainingCostUsd: 3,
    run,
  });

  it('passes on the final message of the session it replays', async () => {
    const outcome = await resumable([]).runStep(request(1, exec().run));
    expect(outcome.finalMessage).toMatch(/^What specifically needs to be cached/);
  });

  it('replays the scripted resume of each intervention, in order, running its commands', async () => {
    const agent = resumable([
      { events: 'approval.jsonl' },
      { commands: ['echo done > done.txt'], events: 'resumed.jsonl' },
    ]);
    const runner = exec();

    const first = await agent.resume(resumeRequest(1, runner.run));
    const second = await agent.resume(resumeRequest(2, runner.run));

    expect(first.finalMessage).toContain('Are you sure');
    expect(first.usage.costUsd).toBeCloseTo(0.00634725, 10);
    expect(second.usage.costUsd).toBeCloseTo(0.0681071, 10);
    expect(second.transcript).toHaveLength(3);
    // It answers in the session it was resumed in.
    expect(second.sessionId).toBe('session-1');
    expect(runner.commands).toEqual([['sh', '-c', 'echo done > done.txt']]);
  });

  it('can answer a resume from another session, so that the guard has something to catch', async () => {
    const agent = resumable([{ session: 'elsewhere', events: 'resumed.jsonl' }]);
    expect((await agent.resume(resumeRequest(1, exec().run))).sessionId).toBe('elsewhere');
  });

  it('fails a resume its script does not foresee, rather than replaying nothing', async () => {
    const agent = resumable([{ events: 'resumed.jsonl' }]);
    await expect(agent.resume(resumeRequest(2, exec().run))).rejects.toThrow(
      /no scripted resume 2 for T0 step 1/,
    );
    await expect(
      fakeAgent(SCRIPT, PLAIN).resume({ ...resumeRequest(1, exec().run), step: 9 }),
    ).rejects.toThrow(/no scripted resume 1 for T0 step 9/);
  });

  it('fails a resume whose command fails', async () => {
    const agent = resumable([{ commands: ['false'], events: 'resumed.jsonl' }]);
    await expect(
      agent.resume(resumeRequest(1, exec([{ code: 1, stdout: '', stderr: 'nope' }]).run)),
    ).rejects.toThrow(/'false' failed with code 1/);
  });

  it.each([
    ['{"T0": {"1": {"commands": ["true"], "resumes": [{}]}}}', 'T0.1.resumes[0].events'],
    [
      '{"T0": {"1": {"commands": ["true"], "resumes": [{"events": "a", "extra": 1}]}}}',
      'T0.1.resumes[0].extra',
    ],
  ])('reports a malformed resume (%s)', (content, path) => {
    const result = loadFakeScript(scriptFile(content));
    expect(result.ok ? [] : result.issues.map((issue) => issue.path)).toEqual([path]);
  });
});
