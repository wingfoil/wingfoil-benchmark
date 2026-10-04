import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort, SessionUsage, StepOutcome } from '../../../src/agents/index.js';
import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles, invocationOf } from '../../support/runner-doubles.js';
import type { AgentRequest } from '../../support/runner-doubles.js';

/** Two steps of S1 in the baseline arm, 1 EUR/USD, and caps and budget as given. */
function campaign(
  caps: Partial<{ step_time_s: number; step_tokens: number; run_cost_eur: number }> = {},
  extra: Record<string, unknown> = {},
) {
  const { file } = writeRepo(
    {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: 1 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
      caps: { step_time_s: 60, step_tokens: 1000, run_cost_eur: 3, ...caps },
      budget: { warn_eur: 100, ceiling_eur: 100 },
      currency: { usd_to_eur: 1 },
      ...extra,
    },
    ['S1@1.0'],
  );
  const checked = checkCampaign(file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return checked.value;
}

function usage(costUsd: number, tokens = 0): SessionUsage {
  return {
    inputTokens: tokens,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd,
    costEur: costUsd,
    turns: 1,
    durationMs: 1,
  };
}

function runJson(outputDir: string | undefined): Record<string, unknown> {
  return JSON.parse(readFileSync(join(outputDir ?? '', 'run.json'), 'utf8')) as Record<string, unknown>;
}

/** An agent that runs `command` in the container for each invocation, then answers as `answer` says. */
function commandAgent(
  command: (request: AgentRequest) => readonly string[],
  answer: (request: AgentRequest) => Partial<StepOutcome> = () => ({}),
): AgentPort & { calls: AgentRequest[] } {
  const calls: AgentRequest[] = [];
  const invoke = async (request: AgentRequest): Promise<StepOutcome> => {
    calls.push(request);
    await request.run(command(request));
    return { sessionId: request.sessionId, usage: usage(0), transcript: [], ...answer(request) };
  };
  return { calls, runStep: invoke, resume: invoke };
}

describe('the run cost cap during a step (task-024)', () => {
  it('ends the step and the run at the cap the agent stopped at, keeping the snapshot', async () => {
    const ports = doubles({
      usageOf: () => usage(3.02),
      stopOf: (request) => (request.step === 1 ? 'cap reached' : undefined),
    });
    const summary = await runCampaign(campaign(), ports);
    const run = summary.runs[0];

    expect(run?.outcome).toBe('cap reached');
    expect(run?.steps.map((step) => step.outcome)).toEqual(['cap reached']);
    expect(ports.recorded.steps).toHaveLength(1);
    expect(ports.recorded.gitCalls).toContainEqual(expect.stringMatching(/commit .* step 01/));
    expect(runJson(run?.outputDir)).toMatchObject({
      outcome: 'cap reached',
      steps: [{ n: 1, outcome: 'cap reached' }],
    });
  });

  it('does not resume a session the cap stopped, even when it asked something', async () => {
    const ports = doubles({
      messageOf: () => 'Which one?',
      stopOf: () => 'cap reached',
      usageOf: () => usage(3),
    });
    await runCampaign(campaign(), ports);
    expect(ports.recorded.resumes).toEqual([]);
  });
});

describe('step_time_s (task-024)', () => {
  it('runs every command of an invocation under timeout, with the seconds left of the step', async () => {
    const agent = commandAgent(() => ['echo', 'hi']);
    const ports = doubles();
    await runCampaign(campaign({ step_time_s: 90 }), { ...ports, agent });

    const timed = ports.recorded.execs.filter((exec) => exec.command[0] === 'timeout');
    expect(timed).toHaveLength(2);
    for (const { command } of timed) {
      expect(command.slice(0, 3)).toEqual(['timeout', '-k', '10']);
      expect(Number(command[3])).toBeGreaterThan(85);
      expect(Number(command[3])).toBeLessThanOrEqual(90);
      expect(command.slice(4)).toEqual(['echo', 'hi']);
    }
  });

  it('ends a step killed at its time cap as time cap reached, and records its cost as a bound', async () => {
    const agent = commandAgent(
      () => ['sleep', '100'],
      // The killed session reports nothing: no result event, no cost (C3).
      () => ({ error: 'the session ended with no result event' }),
    );
    const ports = doubles({
      execResultOf: (command) => (command[4] === 'sleep' ? { code: 124, stdout: '', stderr: '' } : undefined),
    });
    const summary = await runCampaign(campaign({ step_time_s: 60, run_cost_eur: 5 }), { ...ports, agent });
    const run = summary.runs[0];

    expect(run?.steps.map((step) => step.outcome)).toEqual(['time cap reached']);
    const record = runJson(run?.outputDir) as { steps: Record<string, unknown>[] };
    expect(record.steps[0]).toMatchObject({
      outcome: 'time cap reached',
      cost_reported: false,
      cost_bound_usd: 5,
    });
    expect(record.steps[0]).not.toHaveProperty('error');
  });

  it("records a step whose output reached the port's bound as failed, its cost as a bound (bug-011)", async () => {
    const agent = commandAgent(
      () => ['claude', '-p', 'long'],
      () => ({ error: "the agent's output passed the port's output bound; its usage is not known" }),
    );
    const ports = doubles({
      execResultOf: (command) =>
        command[4] === 'claude'
          ? { code: 1, stdout: '', stderr: 'output bound of 4096 bytes reached', outputBounded: true }
          : undefined,
    });
    const summary = await runCampaign(campaign({ step_time_s: 60, run_cost_eur: 5 }), { ...ports, agent });
    const run = summary.runs[0];

    expect(run?.outcome).toBe('failed');
    expect(run?.steps.map((step) => step.outcome)).toEqual(['failed']);
    const record = runJson(run?.outputDir) as { error: string; steps: Record<string, unknown>[] };
    expect(record.steps[0]).toMatchObject({ outcome: 'failed', cost_reported: false, cost_bound_usd: 5 });
    expect(record.error).toMatch(/output bound/);
  });

  it('reads an agent that throws on the killed command — as the fake does — as the time cap, not a failure', async () => {
    const agent: AgentPort = {
      runStep: async (request) => {
        const result = await request.run(['sleep', '100']);
        throw new Error(`'sleep 100' failed with code ${result.code}`);
      },
      resume: () => Promise.reject(new Error('no resume')),
    };
    const ports = doubles({
      execResultOf: (command) =>
        command[0] === 'timeout' ? { code: 124, stdout: '', stderr: '' } : undefined,
    });
    const summary = await runCampaign(campaign(), { ...ports, agent });
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('time cap reached');
    expect(summary.runs[0]?.error).toBeUndefined();
  });

  it('keeps the cost bound of a bounded step when the agent throws on it (bug-011)', async () => {
    const agent: AgentPort = {
      runStep: async (request) => {
        const result = await request.run(['claude', '-p', 'long']);
        throw new Error(`claude failed with code ${result.code}`);
      },
      resume: () => Promise.reject(new Error('no resume')),
    };
    const ports = doubles({
      execResultOf: (command) =>
        command[4] === 'claude'
          ? { code: 1, stdout: '', stderr: 'output bound of 4096 bytes reached', outputBounded: true }
          : undefined,
    });
    const summary = await runCampaign(campaign({ run_cost_eur: 5 }), { ...ports, agent });
    const record = runJson(summary.runs[0]?.outputDir) as { error: string; steps: Record<string, unknown>[] };
    expect(record.steps[0]).toMatchObject({ outcome: 'failed', cost_reported: false, cost_bound_usd: 5 });
    expect(record.error).toMatch(/output bound/);
  });

  it('runs no command once the step has no time left', async () => {
    // The agent thinks for 20 ms of a 1 ms step before its first command.
    const agent: AgentPort = {
      runStep: async (request) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const result = await request.run(['echo', 'late']);
        return {
          sessionId: request.sessionId,
          usage: usage(0),
          transcript: [],
          ...(result.code === 0 ? {} : { error: 'late' }),
        };
      },
      resume: () => Promise.reject(new Error('no resume')),
    };
    const ports = doubles();
    const summary = await runCampaign(campaign({ step_time_s: 0.001 }), { ...ports, agent });
    expect(ports.recorded.execs.filter((exec) => exec.command.includes('late'))).toEqual([]);
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('time cap reached');
  });

  it('counts a killed invocation at its bound against the run cap', async () => {
    const agent = commandAgent(
      () => ['sleep', '100'],
      () => ({ error: 'the session ended with no result event' }),
    );
    const ports = doubles({
      execResultOf: (command) =>
        command[0] === 'timeout' ? { code: 137, stdout: '', stderr: '' } : undefined,
    });
    const summary = await runCampaign(campaign({ run_cost_eur: 3 }), { ...ports, agent });

    // Step 1 may have spent all of its 3 EUR — the whole of what it was given — so the budget counts
    // that: step 2 is not started, and the run is at its cap.
    expect(agent.calls).toHaveLength(1);
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['time cap reached']);
    expect(summary.runs[0]?.outcome).toBe('cap reached');
  });
});

describe('step_tokens (task-024)', () => {
  it('does not resume a step whose tokens exceed its cap, and goes on to the next step', async () => {
    const ports = doubles({
      messageOf: (request) => (request.step === 1 && invocationOf(request) === 0 ? 'Which one?' : undefined),
      usageOf: (request) => usage(0.1, request.step === 1 ? 1001 : 10),
    });
    const summary = await runCampaign(campaign({ step_tokens: 1000 }), ports);

    expect(ports.recorded.resumes).toEqual([]);
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['token cap reached', 'completed']);
    expect(summary.runs[0]?.outcome).toBe('completed');
  });

  it('counts every kind of token', async () => {
    const ports = doubles({
      messageOf: () => 'Which one?',
      usageOf: () => ({
        ...usage(0.1),
        inputTokens: 1,
        outputTokens: 1,
        cacheCreationInputTokens: 1,
        cacheReadInputTokens: 998,
      }),
    });
    const summary = await runCampaign(campaign({ step_tokens: 1000 }), ports);
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('token cap reached');
  });
});

describe('the campaign ceiling during the campaign (task-024)', () => {
  it('starts no run once the runs so far have spent the ceiling', async () => {
    const checked = campaign(
      { run_cost_eur: 5 },
      { repetitions: { S1: 3 }, budget: { warn_eur: 1, ceiling_eur: 1 } },
    );
    const ports = doubles({ usageOf: () => usage(0.6) });
    const summary = await runCampaign(checked, ports);

    // Run 1 spent 1.2 EUR of a 1 EUR ceiling: runs 2 and 3 never start.
    expect(summary.runs.map((run) => run.outcome)).toEqual(['completed']);
    expect(summary.outcome).toBe('budget exhausted');
    expect(summary.completed).toBe(false);
    expect(ports.recorded.creates).toHaveLength(1);
  });

  it('runs every run while the ceiling is not reached', async () => {
    const summary = await runCampaign(
      campaign({}, { repetitions: { S1: 2 } }),
      doubles({ usageOf: () => usage(0.1) }),
    );
    expect(summary.outcome).toBe('completed');
    expect(summary.runs).toHaveLength(2);
  });
});

describe('subscription quota (REQ-RUN-13, task-024)', () => {
  it('ends the step, the run and the campaign, keeping what completed', async () => {
    const checked = campaign({}, { repetitions: { S1: 3 } });
    let sessions = 0;
    const ports = doubles({
      stopOf: () => {
        sessions += 1;
        // Run 1 completes (two steps); run 2's first session meets the quota.
        return sessions === 3 ? 'quota exhausted' : undefined;
      },
    });
    const summary = await runCampaign(checked, ports);

    expect(summary.runs.map((run) => run.outcome)).toEqual(['completed', 'quota exhausted']);
    expect(summary.runs[1]?.steps.map((step) => step.outcome)).toEqual(['quota exhausted']);
    expect(summary.outcome).toBe('quota exhausted');
    expect(ports.recorded.creates).toHaveLength(2);
  });
});

describe('a rate limit, waited out (REQ-RUN-13 as amended in 1.24, bug-010, task-051)', () => {
  /** A clock the waits move, so that no test waits and the step's time cap can be seen to follow them. */
  function clock() {
    const state = { now: 0, waits: [] as number[] };
    return {
      state,
      now: () => state.now,
      sleep: (ms: number) => {
        state.waits.push(ms);
        state.now += ms;
        return Promise.resolve();
      },
    };
  }

  it('waits, resumes the same session with a fixed message, and goes on; the wait is not an intervention', async () => {
    const checked = campaign();
    let sessions = 0;
    const ports = doubles({
      stopOf: () => {
        sessions += 1;
        // Step 1's session meets the rate limit; its resume and step 2 go through.
        return sessions === 1 ? 'rate limited' : undefined;
      },
    });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    expect(summary.runs.map((run) => run.outcome)).toEqual(['completed']);
    const [step1, step2] = summary.runs[0]?.steps ?? [];
    expect(step1?.outcome).toBe('completed');
    expect(step2?.outcome).toBe('completed');
    expect(time.state.waits).toEqual([120_000]);
    expect(ports.recorded.resumes).toHaveLength(1);
    expect(ports.recorded.resumes[0]).toMatchObject({ step: 1, reply: 'Continue.' });
    expect(ports.recorded.resumes[0]?.sessionId).toBe(ports.recorded.steps[0]?.sessionId);
    expect(step1?.interventions).toEqual([]);
    expect(step1?.rateLimitWaits).toEqual([{ afterInvocation: 1, waitedS: 120 }]);
  });

  it('gives up after its last wait: the step ends quota exhausted, and so do the run and the campaign', async () => {
    const checked = campaign({}, { repetitions: { S1: 2 } });
    const ports = doubles({ stopOf: () => 'rate limited' });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    expect(time.state.waits).toEqual([120_000, 300_000, 900_000, 1_800_000]);
    expect(ports.recorded.resumes).toHaveLength(4);
    expect(summary.runs.map((run) => run.outcome)).toEqual(['quota exhausted']);
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['quota exhausted']);
    expect(summary.runs[0]?.steps[0]?.rateLimitWaits?.map((wait) => wait.waitedS)).toEqual([
      120, 300, 900, 1800,
    ]);
    expect(summary.outcome).toBe('quota exhausted');
  });

  it("does not count a wait against the step's time cap, and keeps what was used before it", async () => {
    // A 60 s step: the session works 50 s, meets the rate limit, waits 120 s; its resume has the 10 s left, not
    // nothing (the deadline moved by the wait) and not 60 s (the time used before it kept).
    const checked = campaign({ step_time_s: 60 });
    const time = clock();
    let sessions = 0;
    const ports = doubles({
      onStep: (request) => {
        if (invocationOf(request) === 0 && request.step === 1) time.state.now += 50_000;
        else void request.run(['true']);
      },
      stopOf: () => {
        sessions += 1;
        return sessions === 1 ? 'rate limited' : undefined;
      },
    });
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    expect(summary.runs[0]?.steps[0]?.outcome).toBe('completed');
    const timeouts = ports.recorded.execs
      .map((exec) => exec.command)
      .filter((command) => command[0] === 'timeout')
      .map((command) => Number(command[3]));
    expect(timeouts[0]).toBe(10);
  });

  it('does not resume a step over its token cap: it ends at the token cap, without waiting', async () => {
    const checked = campaign({ step_tokens: 1000 });
    const ports = doubles({ stopOf: () => 'rate limited', usageOf: () => usage(0.1, 5000) });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    expect(time.state.waits).toEqual([]);
    expect(ports.recorded.resumes).toHaveLength(0);
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('token cap reached');
  });

  it("numbers every resume of a step in order, an approver's reply and a rate limit's alike", async () => {
    const checked = campaign();
    const ports = doubles({
      // Step 1: the session asks a question; the approver's reply meets the rate limit; after the wait, done.
      messageOf: (request) => (request.step === 1 && invocationOf(request) === 0 ? 'Which one?' : undefined),
      stopOf: (request) => (request.step === 1 && invocationOf(request) === 1 ? 'rate limited' : undefined),
    });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    const step1 = ports.recorded.resumes.filter((resume) => resume.step === 1);
    expect(step1.map((resume) => [resume.intervention, resume.reply === 'Continue.'])).toEqual([
      [1, false],
      [2, true],
    ]);
    expect(summary.runs[0]?.steps[0]?.interventions).toHaveLength(1);
    expect(summary.runs[0]?.steps[0]?.rateLimitWaits).toEqual([{ afterInvocation: 2, waitedS: 120 }]);
    expect(summary.runs[0]?.steps[0]?.outcome).toBe('completed');
  });

  it('ends quota exhausted when the resume after a wait meets the usage limit', async () => {
    const checked = campaign();
    let sessions = 0;
    const ports = doubles({
      stopOf: () => {
        sessions += 1;
        return sessions === 1 ? 'rate limited' : 'quota exhausted';
      },
    });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    expect(time.state.waits).toEqual([120_000]);
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['quota exhausted']);
    expect(summary.outcome).toBe('quota exhausted');
  });

  it('neither waits nor resumes once the run has spent its cost cap: the step ends at the cap', async () => {
    const checked = campaign({ run_cost_eur: 3 });
    const ports = doubles({ stopOf: () => 'rate limited', usageOf: () => usage(3) });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });

    expect(time.state.waits).toEqual([]);
    expect(ports.recorded.resumes).toHaveLength(0);
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['cap reached']);
    expect(summary.runs[0]?.outcome).toBe('cap reached');
  });

  it("records each wait in run.json, beside the step, apart from the approver's interventions", async () => {
    const checked = campaign();
    let sessions = 0;
    const ports = doubles({
      stopOf: () => {
        sessions += 1;
        return sessions === 1 ? 'rate limited' : undefined;
      },
    });
    const time = clock();
    const summary = await runCampaign(checked, { ...ports, now: time.now, sleep: time.sleep });
    const record = JSON.parse(readFileSync(join(summary.runs[0]?.outputDir ?? '', 'run.json'), 'utf8')) as {
      steps: { rate_limit_waits?: unknown; interventions: number }[];
      interventions: unknown[];
    };
    expect(record.steps[0]?.rate_limit_waits).toEqual([{ after_invocation: 1, waited_s: 120 }]);
    expect(record.steps[0]?.interventions).toBe(0);
    expect(record.interventions).toEqual([]);
  });
});
