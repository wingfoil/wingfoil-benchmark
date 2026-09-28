import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { executionRate, executionRuns, readStepUsage, readStoredRun } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A run.json at `<execution>/runs/<ref>/<arm>/<model>/r<k>/`, returning the run's directory. */
function run(execution: string, where: string, record: unknown): string {
  const dir = join(execution, 'runs', where);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'run.json'), typeof record === 'string' ? record : JSON.stringify(record));
  return dir;
}

const RECORD = {
  campaign: 'abcdef012345',
  scenario: 'T3',
  version: '1.0',
  scenario_hash: 'sha256:h',
  arm: 'baseline',
  model: 'fake-model',
  repetition: 1,
  outcome: 'completed',
  setup: { duration_ms: 3, commit: 'c'.repeat(40), tree: 't'.repeat(40) },
  steps: [
    { n: 1, outcome: 'completed', interventions: 0, tree: '1'.repeat(40) },
    {
      n: 2,
      outcome: 'time cap reached',
      interventions: 2,
      tree: '2'.repeat(40),
      cost_reported: false,
      cost_bound_usd: 0.25,
    },
  ],
};

describe('executionRuns (REQ-FMT-06)', () => {
  it("lists every run of an execution that has a run.json, in path order, and nothing else", () => {
    const execution = tempDir('bench-results-');
    run(execution, 'T3@1.0/wingfoil/fake-model/r1', RECORD);
    run(execution, 'T3@1.0/baseline/fake-model/r2', RECORD);
    run(execution, 'T3@1.0/baseline/fake-model/r1', RECORD);
    mkdirSync(join(execution, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r3'), { recursive: true });
    writeFileSync(join(execution, 'campaign.yaml'), 'x');

    expect(executionRuns(execution)).toEqual([
      join(execution, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1'),
      join(execution, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r2'),
      join(execution, 'runs', 'T3@1.0', 'wingfoil', 'fake-model', 'r1'),
    ]);
  });

  it('has no run in an execution with no runs/ directory', () => {
    expect(executionRuns(tempDir('bench-results-'))).toEqual([]);
  });
});

describe('readStoredRun (task-027)', () => {
  it('reads what scoring needs from a run.json, whatever else it holds', () => {
    const dir = run(tempDir('bench-results-'), 'T3@1.0/baseline/fake-model/r1', { ...RECORD, extra: 1 });
    expect(readStoredRun(dir)).toEqual({
      ok: true,
      value: {
        scenario: 'T3',
        version: '1.0',
        scenarioHash: 'sha256:h',
        arm: 'baseline',
        model: 'fake-model',
        repetition: 1,
        outcome: 'completed',
        setupTree: 't'.repeat(40),
        steps: [
          { n: 1, tree: '1'.repeat(40), outcome: 'completed', interventions: 0 },
          { n: 2, tree: '2'.repeat(40), outcome: 'time cap reached', interventions: 2, costBoundUsd: 0.25 },
        ],
      },
    });
  });

  it('reads the expected-failure mark of a run, and its absence (F3.6)', () => {
    const root = tempDir('bench-results-');
    const marked = run(root, 'a', { ...RECORD, expected_failure: { missing: ['workflow-engine'] } });
    expect(readStoredRun(marked).ok && readStoredRun(marked)).toMatchObject({
      value: { expectedFailure: { missing: ['workflow-engine'] } },
    });
    const plain = readStoredRun(run(root, 'b', RECORD));
    expect(plain.ok && plain.value.expectedFailure).toBeUndefined();
  });

  it('reads a run stored before trees were recorded, with none', () => {
    const { setup, steps, ...rest } = RECORD;
    const dir = run(tempDir('bench-results-'), 'r', {
      ...rest,
      setup: { duration_ms: setup.duration_ms },
      steps: steps.map(({ n, outcome, interventions }) => ({ n, outcome, interventions })),
    });
    const result = readStoredRun(dir);
    expect(result.ok && result.value).toMatchObject({ steps: [{ n: 1 }, { n: 2 }] });
    expect(result.ok && result.value.setupTree).toBeUndefined();
    expect(result.ok && result.value.steps[0]?.tree).toBeUndefined();
  });

  it('names run.json when it cannot be read or does not say what scoring needs', () => {
    const root = tempDir('bench-results-');
    expect(readStoredRun(run(root, 'a', '{not json'))).toEqual({
      ok: false,
      issues: [{ path: 'run.json', message: expect.stringMatching(/^is not JSON/) }],
    });
    const missing: Partial<typeof RECORD> = { ...RECORD };
    delete missing.scenario_hash;
    expect(readStoredRun(run(root, 'b', missing))).toEqual({
      ok: false,
      issues: [{ path: 'run.json.scenario_hash', message: 'is required' }],
    });
  });
});

describe('readStepUsage (task-029)', () => {
  it("reads a step's usage.json", () => {
    const dir = run(tempDir('bench-results-'), 'r', RECORD);
    const usage = {
      inputTokens: 1,
      outputTokens: 2,
      cacheCreationInputTokens: 3,
      cacheReadInputTokens: 4,
      costUsd: 0.5,
      costEur: 0.25,
      turns: 5,
      durationMs: 6,
    };
    mkdirSync(join(dir, 'steps', '02'), { recursive: true });
    writeFileSync(join(dir, 'steps', '02', 'usage.json'), JSON.stringify(usage));
    expect(readStepUsage(dir, 2)).toEqual({ ok: true, value: usage });
  });

  it('names the file when it is missing or incomplete', () => {
    const dir = run(tempDir('bench-results-'), 'r', RECORD);
    expect(readStepUsage(dir, 1)).toEqual({
      ok: false,
      issues: [{ path: 'steps/01/usage.json', message: expect.stringMatching(/^cannot be read/) }],
    });
    mkdirSync(join(dir, 'steps', '01'), { recursive: true });
    writeFileSync(join(dir, 'steps', '01', 'usage.json'), '{"inputTokens": 1}');
    const result = readStepUsage(dir, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe('steps/01/usage.json.outputTokens');
  });
});

describe('executionRate (task-029, REQ-RUN-09)', () => {
  it("reads the rate of the pins an execution ran with: a campaign's, or a dry run's", () => {
    const campaign = tempDir('bench-results-');
    writeFileSync(join(campaign, 'campaign.yaml'), 'currency:\n  usd_to_eur: 0.92\n');
    expect(executionRate(campaign)).toEqual({ ok: true, value: 0.92 });
    const dryRun = tempDir('bench-results-');
    writeFileSync(join(dryRun, 'dry-run.yaml'), 'currency: { usd_to_eur: 0.9 }\n');
    expect(executionRate(dryRun)).toEqual({ ok: true, value: 0.9 });
  });

  it('names what is missing', () => {
    const none = tempDir('bench-results-');
    expect(executionRate(none)).toEqual({
      ok: false,
      issues: [{ path: none, message: 'holds neither campaign.yaml nor dry-run.yaml' }],
    });
    writeFileSync(join(none, 'campaign.yaml'), 'currency: {}\n');
    expect(executionRate(none)).toEqual({
      ok: false,
      issues: [{ path: 'campaign.yaml.currency.usd_to_eur', message: 'is required' }],
    });
  });
});

