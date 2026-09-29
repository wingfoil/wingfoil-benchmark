import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { AGGREGATE_FILE, aggregateExecution, writeAggregate } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const CAMPAIGN = 'c0ffee000001';

/** A suite on a snapshot, as score.json v1 writes it: its id, its tally and its failing tests. */
interface Suite {
  readonly id: string;
  readonly passed: number;
  readonly total: number;
  readonly failed?: readonly string[];
}

interface RunSpec {
  readonly scenario?: string;
  readonly arm: string;
  readonly model?: string;
  readonly r?: number;
  /** The run's steps: its suites, or not reached. */
  readonly steps: readonly (readonly Suite[] | 'not reached')[];
  readonly final?: readonly Suite[] | 'not reached';
  readonly holdout?: { readonly final: readonly Suite[] } | { readonly reason: string };
  readonly expectedFailure?: readonly string[];
  readonly costEur?: number;
  readonly costReported?: boolean;
  /** The hash score.json records, when it differs from run.json's. */
  readonly scoredHash?: string;
  /** score.json's `checks` (task-035); absent, the run was scored before checks were. */
  readonly checks?: readonly unknown[];
  /** score.json's `seed`, `m_f1`, `m_f2` and `m_d3` (task-039); absent, it was scored before them. */
  readonly continuity?: Readonly<Record<string, unknown>>;
}

const tally = (suites: readonly Suite[]) => ({
  passed: suites.reduce((sum, suite) => sum + suite.passed, 0),
  total: suites.reduce((sum, suite) => sum + suite.total, 0),
});
const publicSuites = (suites: readonly Suite[]) =>
  suites.map(({ id, passed, total, failed }) => ({ id, passed, total, failed: failed ?? [] }));
const figures = (eur: number, reported: boolean) => ({
  tokens: { input: 10, output: 5, cache_creation: 0, cache_read: 1 },
  cost_usd: eur * 2,
  cost_eur: eur,
  cost_reported: reported,
  wall_time_ms: 1000,
  turns: 3,
  interventions: 0,
});

/** An execution under a fresh `results/`, whose runs are stored and scored as `runs` says. */
function execution(runs: readonly RunSpec[], pins = 'models:\n  default: model-a\n'): string {
  const dir = join(tempDir('bench-aggregate-'), 'results', CAMPAIGN, '1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'campaign.yaml'), pins);
  for (const run of runs) {
    const scenario = run.scenario ?? 'T3';
    const model = run.model ?? 'model-a';
    const runDir = join(dir, 'runs', `${scenario}@1.0`, run.arm, model, `r${run.r ?? 1}`);
    mkdirSync(runDir, { recursive: true });
    const final = run.final ?? run.steps[run.steps.length - 1] ?? 'not reached';
    writeFileSync(
      join(runDir, 'run.json'),
      JSON.stringify({
        scenario,
        version: '1.0',
        scenario_hash: `sha256:${scenario}`,
        arm: run.arm,
        model,
        repetition: run.r ?? 1,
        outcome: final === 'not reached' ? 'failed' : 'completed',
        steps: [],
      }),
    );
    const eur = run.costEur ?? 0.5;
    writeFileSync(
      join(runDir, 'score.json'),
      JSON.stringify({
        score_version: 1,
        scenario,
        version: '1.0',
        scenario_hash: run.scoredHash ?? `sha256:${scenario}`,
        scorer: { image: 'bench-score:x', tsx: '4.23.15' },
        steps: run.steps.map((step, index) =>
          step === 'not reached'
            ? { n: index + 1, not_reached: true }
            : { n: index + 1, suites: publicSuites(step), m_q1: tally(step) },
        ),
        final:
          final === 'not reached'
            ? { not_reached: true }
            : { step: run.steps.length, suites: publicSuites(final), m_q1: tally(final) },
        holdout:
          run.holdout === undefined
            ? { scored: false, reason: 'not configured' }
            : 'reason' in run.holdout
              ? { scored: false, reason: run.holdout.reason }
              : {
                  scored: true,
                  hash: 'sha256:h',
                  steps: [],
                  final: {
                    step: run.steps.length,
                    suites: run.holdout.final.map(({ id, passed, total }) => ({ id, passed, total })),
                    m_q1: tally(run.holdout.final),
                  },
                },
        ...(run.checks === undefined ? {} : { checks: run.checks }),
        ...run.continuity,
        cost: {
          usd_to_eur: 0.5,
          steps: [],
          run: figures(eur, run.costReported ?? true),
        },
        expected_failure: run.expectedFailure === undefined ? null : { missing: run.expectedFailure },
      }),
    );
  }
  return dir;
}

const name = (arm: string, r = 1, model = 'model-a', scenario = 'T3') =>
  `${CAMPAIGN}/1/runs/${scenario}@1.0/${arm}/${model}/r${r}`;

function aggregate(dir: string) {
  const result = aggregateExecution(dir);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

const s = (id: string, passed: number, total: number, failed?: string[]): Suite => ({ id, passed, total, failed });

describe('aggregateExecution (F5.1, REQ-FMT-07)', () => {
  it('groups the runs by scenario version, arm and model, each run named by its path under results/', () => {
    const dir = execution([
      { arm: 'wingfoil', r: 2, steps: [[s('a', 1, 2)]] },
      { arm: 'baseline', steps: [[s('a', 2, 2)]] },
      { arm: 'wingfoil', r: 1, steps: [[s('a', 0, 2)]] },
      { scenario: 'S9', arm: 'baseline', steps: [[s('a', 1, 1)]] },
    ]);
    const file = aggregate(dir);
    expect([file.aggregate_version, file.campaign, file.execution, file.model]).toEqual([
      1,
      CAMPAIGN,
      1,
      'model-a',
    ]);
    expect(file.groups.map((g) => [g.scenario, g.version, g.arm, g.model, g.runs, g.n, g.preliminary])).toEqual([
      ['S9', '1.0', 'baseline', 'model-a', [name('baseline', 1, 'model-a', 'S9')], 1, true],
      ['T3', '1.0', 'baseline', 'model-a', [name('baseline')], 1, true],
      ['T3', '1.0', 'wingfoil', 'model-a', [name('wingfoil', 1), name('wingfoil', 2)], 2, false],
    ]);
    expect(file.slices).toEqual([]);
  });

  it('keeps every value with its runs and its n, and a range only from two runs', () => {
    const dir = execution([
      { arm: 'baseline', r: 1, steps: [[s('a', 1, 4)]] },
      { arm: 'baseline', r: 2, steps: [[s('a', 3, 4)]] },
      { arm: 'baseline', r: 3, steps: [[s('a', 2, 4)]] },
      { arm: 'wingfoil', steps: [[s('a', 4, 4)]] },
    ]);
    const [three, one] = aggregate(dir).groups;
    const runs = [name('baseline', 1), name('baseline', 2), name('baseline', 3)];
    expect(three?.metrics.m_q1.final.m_q1).toEqual({
      n: 3,
      runs,
      values: [
        { passed: 1, total: 4 },
        { passed: 3, total: 4 },
        { passed: 2, total: 4 },
      ],
      min: { passed: 1, total: 4 },
      max: { passed: 3, total: 4 },
    });
    expect(three?.metrics.m_q1.steps[0]?.suites).toEqual([
      { id: 'a', value: expect.objectContaining({ n: 3, runs }) },
    ]);
    expect(one?.metrics.m_q1.final.m_q1).toEqual({
      n: 1,
      runs: [name('wingfoil')],
      values: [{ passed: 4, total: 4 }],
    });
  });

  it("keeps a slice's runs apart from the default model's (T14)", () => {
    const dir = execution([
      { arm: 'baseline', steps: [[s('a', 1, 1)]] },
      { arm: 'baseline', model: 'model-b', steps: [[s('a', 0, 1)]] },
    ]);
    const file = aggregate(dir);
    expect(file.groups.map((g) => g.model)).toEqual(['model-a']);
    expect(file.slices.map((g) => [g.model, g.runs])).toEqual([['model-b', [name('baseline', 1, 'model-b')]]]);
  });

  it('marks an expected failure as a loss, naming the capability, and keeps what it measured', () => {
    const dir = execution([{ arm: 'wingfoil', steps: [[s('a', 1, 1)]], expectedFailure: ['workflow-engine'] }]);
    const [group] = aggregate(dir).groups;
    expect(group?.losses).toEqual([{ run: name('wingfoil'), reason: 'expected failure (missing workflow-engine)' }]);
    expect(group?.metrics.m_q1.final.m_q1.values).toEqual([{ passed: 1, total: 1 }]);
  });

  it('counts a final snapshot not reached as a loss worth nothing, and leaves an unreached step out', () => {
    const dir = execution([
      { arm: 'baseline', r: 1, steps: [[s('a', 1, 2)], [s('a', 2, 2), s('b', 3, 3)]] },
      { arm: 'baseline', r: 2, steps: [[s('a', 1, 2)], 'not reached'], final: 'not reached' },
    ]);
    const [group] = aggregate(dir).groups;
    expect(group?.losses).toEqual([{ run: name('baseline', 2), reason: 'final not reached' }]);
    expect(group?.metrics.m_q1.final.m_q1.values).toEqual([
      { passed: 5, total: 5 },
      { passed: 0, total: 5 },
    ]);
    expect(group?.metrics.m_q1.final.not_reached).toEqual([name('baseline', 2)]);
    const second = group?.metrics.m_q1.steps[1];
    expect([second?.m_q1.n, second?.m_q1.runs, second?.not_reached]).toEqual([
      1,
      [name('baseline', 1)],
      [name('baseline', 2)],
    ]);
  });

  it('keeps the hold-out apart, says "not scored" rather than zero, and names the runs it lacks', () => {
    const none = aggregate(execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]] }])).groups[0];
    expect(none?.metrics.holdout).toEqual({ scored: false, reason: 'not configured' });

    const mixed = aggregate(
      execution([
        { arm: 'baseline', r: 1, steps: [[s('a', 1, 1)]], holdout: { final: [s('a', 1, 3)] } },
        { arm: 'baseline', r: 2, steps: [[s('a', 1, 1)]], holdout: { reason: 'not configured' } },
      ]),
    ).groups[0];
    expect(mixed?.metrics.holdout).toMatchObject({
      scored: true,
      not_scored: [{ run: name('baseline', 2), reason: 'not configured' }],
      final: { m_q1: { n: 1, runs: [name('baseline', 1)], values: [{ passed: 1, total: 3 }] } },
    });
  });

  it("counts a suite's regressions from one step it is scored at to the next (M-D3, step to step)", () => {
    const dir = execution([
      {
        arm: 'baseline',
        steps: [
          [s('p', 1, 3, ['t2', 't3'])],
          [s('p', 2, 3, ['t3'])],
          [s('p', 1, 3, ['t1', 't3'])],
        ],
      },
    ]);
    const [group] = aggregate(dir).groups;
    expect(group?.metrics.regressions).toEqual([
      { suite: 'p', step: 2, value: { n: 1, runs: [name('baseline')], values: [0] } },
      { suite: 'p', step: 3, value: { n: 1, runs: [name('baseline')], values: [1] } },
    ]);
  });

  describe('continuity and regressions from the seed (REQ-SCO-11, task-039)', () => {
    const seed = (passed: number) => ({ suites: [], m_q1: { passed, total: 4 } });
    const respected = (id: string) => ({ id, outcome: 'respected', failed: [] });

    it('keeps M-F1 as a share and per decision, counting a final not reached as nothing consistent', () => {
      const dir = execution([
        {
          arm: 'baseline',
          r: 1,
          steps: [[s('a', 1, 1)]],
          continuity: {
            m_f1: {
              consistent: 2,
              total: 2,
              decisions: [respected('D1'), { id: 'D3', outcome: 'revised', failed: [], check: 'd3-revision' }],
            },
          },
        },
        {
          arm: 'baseline',
          r: 2,
          steps: [[s('a', 1, 1)]],
          continuity: {
            m_f1: {
              consistent: 1,
              total: 2,
              decisions: [respected('D1'), { id: 'D3', outcome: 'failed', failed: [], check: 'd3-revision' }],
            },
          },
        },
        { arm: 'baseline', r: 3, steps: ['not reached'], continuity: { m_f1: { not_reached: true } } },
      ]);
      const [group] = aggregate(dir).groups;
      const runs = [name('baseline', 1), name('baseline', 2), name('baseline', 3)];
      expect(group?.metrics.m_f1).toEqual({
        share: {
          n: 3,
          runs,
          values: [
            { passed: 2, total: 2 },
            { passed: 1, total: 2 },
            { passed: 0, total: 2 },
          ],
          min: { passed: 0, total: 2 },
          max: { passed: 2, total: 2 },
        },
        decisions: [
          {
            id: 'D1',
            consistent: {
              n: 3,
              runs,
              values: [
                { passed: 1, total: 1 },
                { passed: 1, total: 1 },
                { passed: 0, total: 1 },
              ],
              min: { passed: 0, total: 1 },
              max: { passed: 1, total: 1 },
            },
            outcomes: { respected: 2, revised: 0, failed: 0 },
          },
          {
            id: 'D3',
            consistent: {
              n: 3,
              runs,
              values: [
                { passed: 1, total: 1 },
                { passed: 0, total: 1 },
                { passed: 0, total: 1 },
              ],
              min: { passed: 0, total: 1 },
              max: { passed: 1, total: 1 },
            },
            outcomes: { respected: 0, revised: 1, failed: 1 },
          },
        ],
        not_reached: [name('baseline', 3)],
      });
    });

    it('keeps M-F2 per step after the first: its cost and its M-Q1, with the runs that never reached it', () => {
      const dir = execution([
        {
          arm: 'baseline',
          r: 1,
          steps: [[s('a', 1, 1)], [s('a', 1, 1)]],
          continuity: { m_f2: { steps: [{ n: 2, cost_eur: 0.25, m_q1: { passed: 1, total: 1 } }] } },
        },
        {
          arm: 'baseline',
          r: 2,
          steps: [[s('a', 1, 1)], 'not reached'],
          continuity: { m_f2: { steps: [{ n: 2, not_reached: true }] } },
        },
      ]);
      const [group] = aggregate(dir).groups;
      expect(group?.metrics.m_f2).toEqual({
        steps: [
          {
            step: 2,
            cost_eur: { n: 1, runs: [name('baseline', 1)], values: [0.25] },
            m_q1: { n: 1, runs: [name('baseline', 1)], values: [{ passed: 1, total: 1 }] },
            not_reached: [name('baseline', 2)],
          },
        ],
      });
    });

    it("keeps M-D3 per run; a final not reached loses every test that passed on the seed", () => {
      const dir = execution([
        {
          arm: 'baseline',
          r: 1,
          steps: [[s('a', 1, 1)]],
          continuity: { seed: seed(3), m_d3: { count: 1, tests: ['x > t1'] } },
        },
        {
          arm: 'baseline',
          r: 2,
          steps: ['not reached'],
          continuity: { seed: seed(3), m_d3: { not_reached: true } },
        },
      ]);
      const [group] = aggregate(dir).groups;
      expect(group?.metrics.m_d3).toEqual({
        value: { n: 2, runs: [name('baseline', 1), name('baseline', 2)], values: [1, 3], min: 1, max: 3 },
        not_reached: [name('baseline', 2)],
      });
    });

    it('adds none of them for runs scored before task-039, which still aggregate', () => {
      const [group] = aggregate(execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]] }])).groups;
      expect(group?.metrics).not.toHaveProperty('m_f1');
      expect(group?.metrics).not.toHaveProperty('m_f2');
      expect(group?.metrics).not.toHaveProperty('m_d3');
    });
  });

  it('keeps each check per step as a tally of one, with its runs, and the runs that never reached it (task-035)', () => {
    const passed = (n: number) => ({ n, passed: true, where: { file: 'NOTES.md' } });
    const failed = (n: number) => ({ n, passed: false });
    const dir = execution([
      {
        arm: 'baseline',
        r: 1,
        steps: [[s('a', 1, 1)], 'not reached'],
        final: 'not reached',
        checks: [{ id: 'dup', kind: 'content', steps: [passed(1), { n: 2, not_reached: true }] }],
      },
      {
        arm: 'baseline',
        r: 2,
        steps: [[s('a', 1, 1)], [s('a', 1, 1)]],
        checks: [{ id: 'dup', kind: 'content', steps: [failed(1), passed(2)] }],
      },
      // Scored before task-035: no `checks` key, so nothing to count, and no error.
      { arm: 'baseline', r: 3, steps: [[s('a', 1, 1)], [s('a', 1, 1)]] },
    ]);
    const [group] = aggregate(dir).groups;
    expect(group?.metrics.checks).toEqual([
      {
        id: 'dup',
        kind: 'content',
        steps: [
          {
            step: 1,
            passed: {
              n: 2,
              runs: [name('baseline', 1), name('baseline', 2)],
              values: [
                { passed: 1, total: 1 },
                { passed: 0, total: 1 },
              ],
              min: { passed: 0, total: 1 },
              max: { passed: 1, total: 1 },
            },
            not_reached: [],
          },
          {
            step: 2,
            passed: { n: 1, runs: [name('baseline', 2)], values: [{ passed: 1, total: 1 }] },
            not_reached: [name('baseline', 1)],
          },
        ],
      },
    ]);
  });

  it("keeps a directive check's violations per step as a value with its runs (M-E1, task-037)", () => {
    const step = (n: number, violations: number) => ({
      n,
      passed: violations === 0,
      violations,
      found: Array.from({ length: violations }, () => ({ dependency: 'x' })),
    });
    const dir = execution([
      { arm: 'baseline', r: 1, steps: [[s('a', 1, 1)]], checks: [{ id: 'r1', kind: 'dependencies', steps: [step(1, 2)] }] },
      { arm: 'baseline', r: 2, steps: [[s('a', 1, 1)]], checks: [{ id: 'r1', kind: 'dependencies', steps: [step(1, 0)] }] },
    ]);
    const [group] = aggregate(dir).groups;
    const runs = [name('baseline', 1), name('baseline', 2)];
    expect(group?.metrics.checks).toEqual([
      {
        id: 'r1',
        kind: 'dependencies',
        steps: [
          {
            step: 1,
            passed: {
              n: 2,
              runs,
              values: [
                { passed: 0, total: 1 },
                { passed: 1, total: 1 },
              ],
              min: { passed: 0, total: 1 },
              max: { passed: 1, total: 1 },
            },
            violations: { n: 2, runs, values: [2, 0], min: 0, max: 2 },
            not_reached: [],
          },
        ],
      },
    ]);
  });

  it('lists no check for a group none of whose runs has one', () => {
    const [group] = aggregate(execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]], checks: [] }])).groups;
    expect(group?.metrics.checks).toEqual([]);
  });

  it('keeps the cost figures of each run, naming the runs whose cost is a bound', () => {
    const dir = execution([
      { arm: 'baseline', r: 1, steps: [[s('a', 1, 1)]], costEur: 0.25 },
      { arm: 'baseline', r: 2, steps: [[s('a', 1, 1)]], costEur: 0.75, costReported: false },
    ]);
    const cost = aggregate(dir).groups[0]?.metrics.cost;
    expect(cost?.cost_eur).toEqual({
      n: 2,
      runs: [name('baseline', 1), name('baseline', 2)],
      values: [0.25, 0.75],
      min: 0.25,
      max: 0.75,
    });
    expect(cost?.turns.values).toEqual([3, 3]);
    expect(cost?.bound).toEqual([name('baseline', 2)]);
  });

  it('refuses a run with no score, an unknown score version, or a score of another scenario version', () => {
    const dir = execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]] }]);
    const scoreFile = join(dir, 'runs', 'T3@1.0', 'baseline', 'model-a', 'r1', 'score.json');
    const original = readFileSync(scoreFile, 'utf8');

    writeFileSync(scoreFile, original.replace('"score_version":1', '"score_version":2'));
    expect(aggregateExecution(dir)).toMatchObject({
      ok: false,
      issues: [{ path: 'runs/T3@1.0/baseline/model-a/r1/score.json', message: expect.stringMatching(/score_version/) }],
    });

    writeFileSync(scoreFile, original.replace('"scenario_hash":"sha256:T3"', '"scenario_hash":"sha256:other"'));
    expect(aggregateExecution(dir)).toMatchObject({
      ok: false,
      issues: [
        {
          path: 'runs/T3@1.0/baseline/model-a/r1/score.json',
          message: 'scores another version of the scenario than the run ran',
        },
      ],
    });

    writeFileSync(scoreFile, '{ not json');
    expect(aggregateExecution(dir)).toMatchObject({
      ok: false,
      issues: [{ path: 'runs/T3@1.0/baseline/model-a/r1/score.json', message: expect.stringMatching(/^is not JSON/) }],
    });

    rmSync(scoreFile);
    expect(aggregateExecution(dir)).toMatchObject({
      ok: false,
      issues: [{ path: 'runs/T3@1.0/baseline/model-a/r1', message: 'is not scored' }],
    });
  });

  it('needs the default model the campaign pinned', () => {
    const dir = execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]] }], 'currency:\n  usd_to_eur: 1\n');
    expect(aggregateExecution(dir)).toMatchObject({ ok: false, issues: [{ path: 'campaign.yaml.models' }] });
  });

  it('writes the same bytes when aggregated twice (REQ-SCO-03)', () => {
    const dir = execution([
      { arm: 'wingfoil', steps: [[s('a', 1, 2, ['x'])]], expectedFailure: ['workflow-engine'] },
      { arm: 'baseline', steps: [[s('a', 2, 2)]], holdout: { final: [s('a', 1, 1)] } },
    ]);
    writeAggregate(dir, aggregate(dir));
    const first = readFileSync(join(dir, AGGREGATE_FILE), 'utf8');
    writeAggregate(dir, aggregate(dir));
    expect(readFileSync(join(dir, AGGREGATE_FILE), 'utf8')).toBe(first);
    expect(first.endsWith('\n')).toBe(true);
  });
});
