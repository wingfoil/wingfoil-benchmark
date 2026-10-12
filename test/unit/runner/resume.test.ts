import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { SessionUsage } from '../../../src/agents/index.js';
import { checkCampaign, checkResume, runCampaign } from '../../../src/runner/index.js';
import { campaignSpendingEur } from '../../../src/results/index.js';
import { completeCampaignYaml, writeRepo } from '../../support/campaign-fixture.js';
import { doubles } from '../../support/runner-doubles.js';

/** S1 (two steps) in the baseline arm, `repetitions` times, at 1 EUR/USD, with any other field in `extra`. */
function campaign(repetitions = 2, extra: Record<string, unknown> = {}) {
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

function runDir(resultsDir: string, k: number): string {
  return join(resultsDir, 'runs', 'S1@1.0', 'baseline', 'fake-model', `r${k}`);
}

/** Every run fails at step 1: the execution completes, and every run is one to run again. */
const failing = () =>
  doubles({ errorOf: (request) => (request.step === 1 ? 'the network failed' : undefined) });

describe('a resume (REQ-RUN-19, task-080)', () => {
  it('records attempts: 1 on a first run', async () => {
    const summary = await runCampaign(campaign(1), doubles());
    expect(json(join(runDir(summary.resultsDir, 1), 'run.json'))).toMatchObject({ attempts: 1 });
  });

  it('numbers each earlier attempt, and counts them all', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, failing());
    await runCampaign(checked, failing(), { resume: first.execution });
    await runCampaign(checked, doubles(), { resume: first.execution });

    const dir = runDir(first.resultsDir, 1);
    expect(json(join(dir, 'attempts', '1', 'run.json'))).toMatchObject({ outcome: 'failed', attempts: 1 });
    expect(json(join(dir, 'attempts', '2', 'run.json'))).toMatchObject({ outcome: 'failed', attempts: 2 });
    expect(json(join(dir, 'run.json'))).toMatchObject({ outcome: 'completed', attempts: 3 });
    expect(existsSync(join(dir, 'attempts', '2', 'attempts'))).toBe(false);
    expect(existsSync(join(dir, 'attempts', '1', 'steps', '01', 'usage.json'))).toBe(true);
  });

  it('archives a run that left output but no record as an attempt, and runs it again', async () => {
    const checked = campaign(2);
    const first = await runCampaign(checked, doubles());
    const dir = runDir(first.resultsDir, 2);
    // A run killed without a record: its steps so far, no run.json.
    rmSync(join(dir, 'run.json'));

    const ports = doubles();
    const summary = await runCampaign(checked, ports, { resume: first.execution });

    expect(ports.recorded.creates).toHaveLength(1);
    expect(summary.runs.map((run) => run.outputDir)).toEqual([dir]);
    expect(existsSync(join(dir, 'attempts', '1', 'steps', '01', 'usage.json'))).toBe(true);
    expect(existsSync(join(dir, 'attempts', '1', 'run.json'))).toBe(false);
    expect(json(join(dir, 'run.json'))).toMatchObject({ attempts: 2 });
  });

  it('starts from what the execution already spent: a resume never gets a fresh ceiling', async () => {
    const checked = campaign(3, { budget: { warn_eur: 1, ceiling_eur: 1 } });
    // r1 completes, r2 fails, both spending 0.6 EUR: the ceiling stops the execution before r3.
    const first = await runCampaign(
      checked,
      doubles({
        usageOf: () => usage(0.3),
        errorOf: (request) => (request.step === 2 ? 'the network failed' : undefined),
      }),
    );
    expect(first.outcome).toBe('budget exhausted');

    const ports = doubles();
    const summary = await runCampaign(checked, ports, { resume: first.execution });

    expect(ports.recorded.creates).toEqual([]);
    expect(summary.outcome).toBe('budget exhausted');
    expect(json(join(first.resultsDir, 'execution.json'))).toMatchObject({
      state: 'stopped',
      reason: 'ceiling',
    });
  });

  it('keeps the start date and lists every resume', async () => {
    const checked = campaign(1);
    const dates = ['2026-10-12T08:00:00.000Z', '2026-10-12T08:10:00.000Z'].map((d) => new Date(d));
    const first = await runCampaign(checked, { ...failing(), date: () => dates.shift() as Date });
    const later = [
      '2026-10-12T09:00:00.000Z',
      '2026-10-12T09:10:00.000Z',
      '2026-10-12T10:00:00.000Z',
      '2026-10-12T10:10:00.000Z',
    ].map((d) => new Date(d));
    const date = () => later.shift() as Date;
    await runCampaign(checked, { ...failing(), date }, { resume: first.execution });
    await runCampaign(checked, { ...doubles(), date }, { resume: first.execution });

    expect(json(join(first.resultsDir, 'execution.json'))).toEqual({
      state: 'completed',
      started: '2026-10-12T08:00:00.000Z',
      resumed: ['2026-10-12T09:00:00.000Z', '2026-10-12T10:00:00.000Z'],
      ended: '2026-10-12T10:10:00.000Z',
    });
  });

  it('refuses an execution another invocation may be running, and leaves its record alone', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, failing());
    const record = readFileSync(join(first.resultsDir, 'execution.json'), 'utf8');
    const name = `bench-${checked.campaign.id}-${first.execution}-S1-1.0-baseline-fake-model-r1`;
    const ports = doubles({ leftovers: [name], running: [name] });

    await expect(runCampaign(checked, ports, { resume: first.execution })).rejects.toThrow(
      'another invocation may be running it',
    );
    expect(ports.recorded.creates).toEqual([]);
    expect(readFileSync(join(first.resultsDir, 'execution.json'), 'utf8')).toBe(record);
  });
});

describe('a resume, after the first review (task-080)', () => {
  it('refuses a stopped container this execution left behind, before counting a phantom attempt', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, failing());
    const record = readFileSync(join(first.resultsDir, 'execution.json'), 'utf8');
    const name = `bench-${checked.campaign.id}-${first.execution}-S1-1.0-baseline-fake-model-r1`;
    const ports = doubles({ leftovers: [name] });

    await expect(runCampaign(checked, ports, { resume: first.execution })).rejects.toThrow(
      `docker rm --force ${name}`,
    );
    expect(existsSync(join(runDir(first.resultsDir, 1), 'attempts'))).toBe(false);
    expect(readFileSync(join(first.resultsDir, 'execution.json'), 'utf8')).toBe(record);
  });

  it('says what it runs and what it keeps, each by outcome, and warns of an execution left running', async () => {
    const checked = campaign(3);
    let run = 0;
    const first = await runCampaign(
      checked,
      doubles({
        onStep: (request) => {
          if (request.step === 1) run += 1;
        },
        errorOf: (request) => (request.step === 1 && run === 2 ? 'the network failed' : undefined),
      }),
    );
    rmSync(join(runDir(first.resultsDir, 3), 'run.json'));
    const file = join(first.resultsDir, 'execution.json');
    writeFileSync(file, JSON.stringify({ ...json(file), state: 'running' }));
    const lines: string[] = [];
    const errors: string[] = [];
    await runCampaign(
      checked,
      { ...doubles(), log: (line) => lines.push(line), logError: (line) => errors.push(line) },
      { resume: first.execution },
    );

    expect(lines).toContain('resume: 2 runs to run (1 failed, 1 left no record), 1 run kept (1 completed)');
    expect(errors.some((line) => line.includes('says it is running'))).toBe(true);
  });

  it('leaves execution.json as it was when a run record cannot be read', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, failing());
    const record = readFileSync(join(first.resultsDir, 'execution.json'), 'utf8');
    writeFileSync(join(runDir(first.resultsDir, 1), 'run.json'), '{ truncated');

    await expect(runCampaign(checked, doubles(), { resume: first.execution })).rejects.toThrow(
      'runs/S1@1.0/baseline/fake-model/r1/run.json cannot be read',
    );
    expect(readFileSync(join(first.resultsDir, 'execution.json'), 'utf8')).toBe(record);
  });

  it("keeps a docs control's generated rules as its kept runs ran with them", async () => {
    const { file } = writeRepo(
      {
        ...completeCampaignYaml(),
        arms: ['baseline', 'baseline-docs', 'wingfoil'],
        scenarios: [{ id: 'S1', version: '1.0' }],
        repetitions: { S1: 1 },
        agent: { name: 'fake', version: '1.0.0' },
        models: { default: 'fake-model' },
        currency: { usd_to_eur: 1 },
      },
      ['S1@1.0'],
    );
    const checked = checkCampaign(file);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const clones = { harnessSources: { wingfoil: '/clones/wingfoil' } };
    const first = await runCampaign(checked.value, { ...failing(), ...clones });
    const rules = join(first.resultsDir, 'generated', 'S1@1.0', 'baseline-docs', 'PROJECT_RULES.md');
    const before = readFileSync(rules, 'utf8');

    const ports = doubles();
    await runCampaign(checked.value, { ...ports, ...clones }, { resume: first.execution });

    expect(
      ports.recorded.runOnce.filter((request) => request.command.join(' ').includes('/build/arm/')),
    ).toEqual([]);
    expect(readFileSync(rules, 'utf8')).toBe(before);
  });
});

describe('a resume, after the second review (task-080)', () => {
  it('numbers a new attempt after the highest, so that a gap never overwrites one', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, failing());
    const dir = runDir(first.resultsDir, 1);
    mkdirSync(join(dir, 'attempts', '3'), { recursive: true });
    writeFileSync(join(dir, 'attempts', '3', 'run.json'), '{"outcome":"failed","attempts":3}');

    await runCampaign(checked, doubles(), { resume: first.execution });

    expect(json(join(dir, 'attempts', '3', 'run.json'))).toEqual({ outcome: 'failed', attempts: 3 });
    expect(json(join(dir, 'attempts', '4', 'run.json'))).toMatchObject({ outcome: 'failed' });
    expect(json(join(dir, 'run.json'))).toMatchObject({ outcome: 'completed', attempts: 5 });
  });
});

describe('checkResume (REQ-RUN-19, task-080)', () => {
  it('accepts a stopped or completed execution of the same campaign, not aggregated', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, doubles());
    expect(checkResume(checked, `${checked.campaign.id}/${first.execution}`)).toEqual({ ok: true, value: 1 });
  });

  it('refuses another campaign, a missing execution, one without execution.json, and an aggregated one', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, doubles());
    const id = checked.campaign.id;
    const reasons = (target: string) => {
      const result = checkResume(checked, target);
      return result.ok ? [] : result.issues.map((issue) => issue.message);
    };

    expect(reasons(`abcdef012345/1`)).toEqual([
      `the campaign file is campaign ${id}, not abcdef012345: resuming would mix results`,
    ]);
    expect(reasons(`${id}/9`)).toEqual([`results/${id}/9 does not exist: there is nothing to resume`]);

    const old = join(checked.campaign.resultsRoot, id, '7');
    mkdirSync(old, { recursive: true });
    expect(reasons(`${id}/7`)).toEqual([
      `results/${id}/7 has no execution.json: an execution from before v0.2 records no state, and cannot be resumed`,
    ]);

    writeFileSync(join(first.resultsDir, 'aggregate.json'), '{}\n');
    expect(reasons(`${id}/1`)).toEqual([
      `results/${id}/1 is already aggregated: a resume would change results already published`,
    ]);
  });
});

describe('the ceiling across executions (REQ-RUN-08, REQ-CLI-02 as amended, task-081)', () => {
  it('counts what every execution of the campaign spent, attempts and bounds included', async () => {
    const checked = campaign(2, { currency: { usd_to_eur: 0.5 } });
    // First: two runs of two steps, each step 0.25 EUR.
    await runCampaign(checked, doubles({ usageOf: () => usage(0.25) }));
    // Second: two runs whose step 1 fails after spending 0.25 EUR, then re-run at 0.5 EUR a step.
    const second = await runCampaign(
      checked,
      doubles({
        usageOf: () => usage(0.25),
        errorOf: (request) => (request.step === 1 ? 'the network failed' : undefined),
      }),
    );
    await runCampaign(checked, doubles({ usageOf: () => usage(0.5) }), { resume: second.execution });
    // A step killed at its bound: 2 USD at 0.5 EUR/USD counts 1 EUR, above the 0.1 EUR it reported.
    const file = join(runDir(second.resultsDir, 1), 'run.json');
    const run = json(file) as { steps: Record<string, unknown>[] };
    run.steps[0] = { ...run.steps[0], usage: { ...usage(0.1) }, cost_bound_usd: 2 };
    writeFileSync(file, JSON.stringify(run));

    // 1 (first) + 0.5 (second's attempts) + 1 (bound) + 0.5 (its step 2) + 1 (r2 re-run).
    expect(campaignSpendingEur(checked.campaign.resultsRoot, checked.campaign.id, 0.5)).toBe(4);
  });

  it('names a record it cannot read, under results/, a null one included', async () => {
    const checked = campaign(1);
    const first = await runCampaign(checked, doubles());
    const file = join(runDir(first.resultsDir, 1), 'run.json');
    const name = `${checked.campaign.id}/1/runs/S1@1.0/baseline/fake-model/r1/run.json cannot be read`;
    for (const text of ['{ truncated', 'null']) {
      writeFileSync(file, text);
      expect(() => campaignSpendingEur(checked.campaign.resultsRoot, checked.campaign.id, 1)).toThrow(name);
    }
  });

  it('stops starting runs in a new execution once the earlier ones spent the ceiling', async () => {
    const checked = campaign(2, { budget: { warn_eur: 1, ceiling_eur: 1 } });
    await runCampaign(checked, doubles({ usageOf: () => usage(0.5) }));

    const ports = doubles();
    const summary = await runCampaign(checked, ports);

    expect(ports.recorded.creates).toEqual([]);
    expect(summary.outcome).toBe('budget exhausted');
  });
});
