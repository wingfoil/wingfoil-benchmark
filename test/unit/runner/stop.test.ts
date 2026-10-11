import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkCampaign, runCampaign } from '../../../src/runner/index.js';
import { pause } from '../../../src/runner/run.js';
import type { SessionUsage } from '../../../src/agents/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles, invocationOf } from '../../support/runner-doubles.js';

/** S1 (two steps) in the baseline arm, `repetitions` times, at 1 EUR/USD, with any other field in `extra`. */
function campaign(repetitions = 1, extra: Record<string, unknown> = {}) {
  const { file } = writeRepo(
    {
      ...completeCampaignYaml(),
      harnesses: {},
      arms: ['baseline'],
      scenarios: [{ id: 'S1', version: '1.0' }],
      repetitions: { S1: repetitions },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
      caps: { step_time_s: 60, step_tokens: 1000, run_cost_eur: 3 },
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

function usage(costUsd: number): SessionUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd,
    costEur: costUsd,
    turns: 1,
    durationMs: 1,
  };
}

function json(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function execution(resultsDir: string): Record<string, unknown> {
  return json(join(resultsDir, 'execution.json'));
}

describe('an interrupt (REQ-RUN-19, task-079)', () => {
  it('cuts a rate limit wait short: the step ends interrupted at its reported cost, and is not resumed', async () => {
    const interrupt = new AbortController();
    const ports = doubles({ stopOf: () => 'rate limited', usageOf: () => usage(0.25) });
    const summary = await runCampaign(campaign(), {
      ...ports,
      signal: interrupt.signal,
      // The wait never ends by itself: only the interrupt, which comes while it is pending, can end it.
      sleep: () => {
        setTimeout(() => interrupt.abort(), 0);
        return new Promise<void>(() => {});
      },
    });

    expect(summary.runs.map((run) => run.outcome)).toEqual(['interrupted']);
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['interrupted']);
    expect(summary.runs[0]?.steps[0]?.costBoundUsd).toBeUndefined();
    expect(ports.recorded.resumes).toEqual([]);
  });

  it('kills the agent at once: the container goes while the invocation is still running', async () => {
    const interrupt = new AbortController();
    const ports = doubles();
    let killAgent: ((error: Error) => void) | undefined;
    const summary = await runCampaign(campaign(), {
      ...ports,
      signal: interrupt.signal,
      // An agent that runs until its container is removed under it, as a real session would until step_time_s.
      agent: {
        ...ports.agent,
        runStep: (request) => {
          ports.recorded.steps.push(request);
          setTimeout(() => interrupt.abort(), 0);
          return new Promise((_, reject) => {
            killAgent = reject;
          });
        },
      },
      docker: {
        ...ports.docker,
        remove: async (container) => {
          killAgent?.(new Error('the agent exited with code 137'));
          return ports.docker.remove(container);
        },
      },
    });

    expect(ports.recorded.removes).toEqual(['container-1']);
    expect(summary.runs[0]?.outcome).toBe('interrupted');
    expect(summary.runs[0]?.steps).toEqual([
      expect.objectContaining({ n: 1, outcome: 'interrupted', costBoundUsd: 3 }),
    ]);
  });

  it("sends no approver's reply once interrupted during the invocation that asked, and counts it at its bound", async () => {
    const interrupt = new AbortController();
    const ports = doubles({
      messageOf: () => 'Shall I proceed?',
      onStep: (request) => {
        if (invocationOf(request) === 0) interrupt.abort();
      },
    });
    const summary = await runCampaign(campaign(), { ...ports, signal: interrupt.signal });

    expect(ports.recorded.resumes).toEqual([]);
    expect(summary.runs[0]?.outcome).toBe('interrupted');
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['interrupted']);
    expect(summary.runs[0]?.steps[0]?.costBoundUsd).toBe(3);
  });

  it('starts no invocation once interrupted before it, and counts no bound: none was running', async () => {
    const interrupt = new AbortController();
    const ports = doubles({
      // The step's last command before its session: clearing the agent's auto-memory (bug-006).
      execResultOf: (command) => {
        if (command.join(' ').includes('.claude/projects')) interrupt.abort();
        return undefined;
      },
    });
    const summary = await runCampaign(campaign(), { ...ports, signal: interrupt.signal });

    expect(ports.recorded.steps).toEqual([]);
    expect(summary.runs[0]?.outcome).toBe('interrupted');
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['interrupted']);
    expect(summary.runs[0]?.steps[0]?.costBoundUsd).toBeUndefined();
  });

  it('settles an invocation the rate limit stopped as interrupted when the interrupt came during it', async () => {
    const interrupt = new AbortController();
    const waits: number[] = [];
    const ports = doubles({
      stopOf: () => 'rate limited',
      onStep: () => interrupt.abort(),
    });
    const summary = await runCampaign(campaign(), {
      ...ports,
      signal: interrupt.signal,
      sleep: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });

    expect(waits).toEqual([]);
    expect(summary.runs[0]?.steps).toEqual([
      expect.objectContaining({ outcome: 'interrupted', costBoundUsd: 3 }),
    ]);
  });

  it('starts no next step once interrupted after a step ended, which keeps its own outcome', async () => {
    const interrupt = new AbortController();
    const ports = doubles({
      messagesOf: () => {
        interrupt.abort();
        return [];
      },
    });
    const summary = await runCampaign(campaign(), { ...ports, signal: interrupt.signal });

    expect(ports.recorded.steps.map((request) => request.step)).toEqual([1]);
    expect(summary.runs[0]?.outcome).toBe('interrupted');
    expect(summary.runs[0]?.steps.map((step) => step.outcome)).toEqual(['completed']);
    expect(json(join(summary.runs[0]?.outputDir ?? '', 'run.json'))).toMatchObject({
      outcome: 'interrupted',
    });
  });

  it('records a run interrupted during its setup as interrupted, not failed', async () => {
    const interrupt = new AbortController();
    const ports = doubles({
      execResultOf: () => {
        interrupt.abort();
        return { code: 137, stdout: '', stderr: '' };
      },
    });
    const summary = await runCampaign(campaign(), { ...ports, signal: interrupt.signal });

    expect(summary.runs.map((run) => run.outcome)).toEqual(['interrupted']);
    expect(ports.recorded.steps).toEqual([]);
    expect(ports.recorded.removes).toEqual(['container-1']);
  });

  it('records an interrupt that killed a preparation process as the interrupt, not an error', async () => {
    const interrupt = new AbortController();
    const ports = doubles();
    const summary = await runCampaign(campaign(), {
      ...ports,
      signal: interrupt.signal,
      docker: {
        ...ports.docker,
        containersNamed: () => {
          interrupt.abort();
          return Promise.reject(new Error('docker ps exited with code 130'));
        },
      },
    });

    expect(summary.outcome).toBe('interrupted');
    expect(summary.runs).toEqual([]);
    expect(execution(summary.resultsDir)).toMatchObject({ state: 'stopped', reason: 'interrupt' });
  });

  it('starts no run when interrupted before the first, and records why', async () => {
    const interrupt = new AbortController();
    interrupt.abort();
    const ports = doubles();
    const summary = await runCampaign(campaign(2), { ...ports, signal: interrupt.signal });

    expect(ports.recorded.creates).toEqual([]);
    expect(summary.runs).toEqual([]);
    expect(summary.outcome).toBe('interrupted');
    expect(execution(summary.resultsDir)).toMatchObject({ state: 'stopped', reason: 'interrupt' });
  });
});

describe('execution.json (REQ-FMT-06 as amended, task-079)', () => {
  it('says running while the execution runs, then completed with both dates', async () => {
    const dates = [new Date('2026-10-11T08:00:00.000Z'), new Date('2026-10-11T09:00:00.000Z')];
    const seen: unknown[] = [];
    let resultsDir = '';
    const ports = doubles({
      onStep: (request) => {
        if (request.step === 1) seen.push(json(join(resultsDir, 'execution.json')));
      },
    });
    const checked = campaign();
    resultsDir = join(checked.campaign.resultsRoot, checked.campaign.id, '1');
    const summary = await runCampaign(checked, { ...ports, date: () => dates.shift() as Date });

    expect(seen).toEqual([{ state: 'running', started: '2026-10-11T08:00:00.000Z' }]);
    expect(summary.outcome).toBe('completed');
    expect(execution(summary.resultsDir)).toEqual({
      state: 'completed',
      started: '2026-10-11T08:00:00.000Z',
      ended: '2026-10-11T09:00:00.000Z',
    });
  });

  it('is completed when every run ran, even if some failed', async () => {
    const ports = doubles({ errorOf: (request) => (request.step === 2 ? 'boom' : undefined) });
    const summary = await runCampaign(campaign(2), ports);

    expect(summary.runs.map((run) => run.outcome)).toEqual(['failed', 'failed']);
    expect(execution(summary.resultsDir)).toMatchObject({ state: 'completed' });
  });

  it('records a stop at the ceiling as ceiling, and one at the quota as quota', async () => {
    const atCeiling = await runCampaign(
      campaign(3, { budget: { warn_eur: 1, ceiling_eur: 1 } }),
      doubles({ usageOf: () => usage(0.6) }),
    );
    expect(execution(atCeiling.resultsDir)).toMatchObject({ state: 'stopped', reason: 'ceiling' });

    const atQuota = await runCampaign(campaign(2), {
      ...doubles({ stopOf: () => 'quota exhausted' }),
    });
    expect(execution(atQuota.resultsDir)).toMatchObject({ state: 'stopped', reason: 'quota' });
  });

  it('records an execution that could not go on as stopped by an error, and still throws', async () => {
    const checked = campaign();
    const ports = doubles({ failing: { call: 'list', error: 'the Docker daemon is not running' } });

    await expect(runCampaign(checked, ports)).rejects.toThrow('the Docker daemon is not running');
    const resultsDir = join(checked.campaign.resultsRoot, checked.campaign.id, '1');
    expect(execution(resultsDir)).toMatchObject({
      state: 'stopped',
      reason: 'error',
      detail: expect.stringContaining('the Docker daemon is not running'),
    });
  });
});

describe('fail_fast (REQ-RUN-19, REQ-NFR-03 as amended, task-079)', () => {
  it('does not stop for failures with different errors', async () => {
    let failures = 0;
    const ports = doubles({
      errorOf: (request) => {
        if (request.step !== 1) return undefined;
        failures += 1;
        return `error number ${failures}`;
      },
    });
    const summary = await runCampaign(campaign(3, { fail_fast: { same_error: 2 } }), ports);

    expect(ports.recorded.creates).toHaveLength(3);
    expect(summary.outcome).toBe('completed');
  });

  it('does not stop for the same error text at different steps', async () => {
    let run = 0;
    const ports = doubles({
      // A session that fails before naming itself: the run's error is the agent's text alone, whatever the step.
      onStep: (request) => {
        if (request.step === 1) run += 1;
        if (request.step === run) throw new Error('the same error');
      },
    });
    const summary = await runCampaign(campaign(3, { fail_fast: { same_error: 2 } }), ports);

    expect(summary.runs.map((r) => [r.outcome, r.error, r.failedStep])).toEqual([
      ['failed', 'the same error', 1],
      ['failed', 'the same error', 2],
      ['completed', undefined, undefined],
    ]);
    expect(summary.outcome).toBe('completed');
  });

  it('does not stop after the last planned run: every run ran, and the execution is completed', async () => {
    const ports = doubles({ errorOf: (request) => (request.step === 1 ? 'the same error' : undefined) });
    const summary = await runCampaign(campaign(2, { fail_fast: { same_error: 2 } }), ports);

    expect(summary.runs.map((r) => r.outcome)).toEqual(['failed', 'failed']);
    expect(summary.outcome).toBe('completed');
    expect(execution(summary.resultsDir)).toMatchObject({ state: 'completed' });
  });

  it('counts a failure before step 1 at step 0, and stops after one with same_error 1', async () => {
    const ports = doubles({ failing: { call: 'start', error: 'no such image' } });
    const summary = await runCampaign(campaign(3, { fail_fast: { same_error: 1 } }), ports);

    expect(ports.recorded.creates).toHaveLength(1);
    expect(summary.outcome).toBe('fail_fast');
    expect(String(execution(summary.resultsDir).detail)).toContain('1 run failed at step 00');
  });

  it('never stops a campaign that does not set it (REQ-NFR-03)', async () => {
    const ports = doubles({ errorOf: (request) => (request.step === 1 ? 'the same error' : undefined) });
    const summary = await runCampaign(campaign(3), ports);

    expect(ports.recorded.creates).toHaveLength(3);
    expect(summary.outcome).toBe('completed');
    expect(existsSync(join(summary.resultsDir, 'execution.json'))).toBe(true);
  });
});

describe("the default rate limit wait (task-079's review)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears its timer when interrupted, so that no process is kept alive by it', async () => {
    vi.useFakeTimers();
    const interrupt = new AbortController();
    const waited = pause(1_800_000, interrupt.signal);
    expect(vi.getTimerCount()).toBe(1);

    interrupt.abort();
    await waited;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends on its own after its time, without a signal or with one never aborted', async () => {
    vi.useFakeTimers();
    const interrupt = new AbortController();
    const waits = [pause(1000, undefined), pause(1000, interrupt.signal)];
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all(waits);
    expect(vi.getTimerCount()).toBe(0);
  });
});
