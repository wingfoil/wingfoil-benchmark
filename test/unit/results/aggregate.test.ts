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
  /** score.json's `cost.setup` (task-040): M-K3, or not recorded; absent, it was scored before it. */
  readonly setup?: { readonly costEur: number; readonly wallTimeMs?: number; readonly manualTokens?: number } | 'not recorded';
  /** Each reached step's cost in euro, in `cost.steps` (task-029); by default none listed. */
  readonly stepCosts?: readonly number[];
  /** score.json's `seed`, `m_f1`, `m_f2` and `m_d3` (task-039); absent, it was scored before them. */
  readonly continuity?: Readonly<Record<string, unknown>>;
  /** score.json's `determinism` (task-042); absent, it was scored before it. */
  readonly determinism?: { readonly interface: readonly string[]; readonly paths: readonly string[] } | 'not reached';
  /** The harness commit run.json records (REQ-RUN-14), for an arm that requires one. */
  readonly harnessCommit?: string;
  /** The scoring image score.json's `scorer` names; by default `bench-score:x`. */
  readonly scorerImage?: string;
  /** A docs control's `docs_of` (REQ-RUN-11, task-068): the harness arm it was generated from. */
  readonly docsOf?: string;
  /** The scenario hash run.json and score.json both record; by default `sha256:<scenario>`. */
  readonly scenarioHash?: string;
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
        scenario_hash: run.scenarioHash ?? `sha256:${scenario}`,
        arm: run.arm,
        model,
        repetition: run.r ?? 1,
        ...(run.harnessCommit === undefined ? {} : { harness: { tool: 'wingfoil', commit: run.harnessCommit } }),
        ...(run.docsOf === undefined ? {} : { docs_of: run.docsOf }),
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
        scenario_hash: run.scoredHash ?? run.scenarioHash ?? `sha256:${scenario}`,
        scorer: { image: run.scorerImage ?? 'bench-score:x', tsx: '4.23.15' },
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
        ...(run.determinism === undefined
          ? {}
          : {
              determinism:
                run.determinism === 'not reached'
                  ? { not_reached: true }
                  : { interface: run.determinism.interface, paths: run.determinism.paths },
            }),
        cost: {
          usd_to_eur: 0.5,
          steps: (run.stepCosts ?? []).map((stepEur, index) =>
            run.steps[index] === 'not reached'
              ? { n: index + 1, not_reached: true }
              : { n: index + 1, outcome: 'completed', ...figures(stepEur, true) },
          ),
          run: figures(eur, run.costReported ?? true),
          ...(run.setup === undefined
            ? {}
            : {
                setup:
                  run.setup === 'not recorded'
                    ? { not_recorded: true }
                    : {
                        tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0 },
                        cost_usd: run.setup.costEur * 2,
                        cost_eur: run.setup.costEur,
                        wall_time_ms: run.setup.wallTimeMs ?? 100,
                        turns: 0,
                        ...(run.setup.manualTokens === undefined ? {} : { manual_tokens: run.setup.manualTokens }),
                      },
              }),
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

  describe('M-R1–M-R3, determinism across repetitions (experiment design §4.5, REQ-SCO-07, task-042)', () => {
    const A = 'oracle/a.test.ts > a';
    const B = 'oracle/b.test.ts > b';
    const INTERFACE = ['src/x.ts: export function x(): void;', 'src/y.ts: export const y;'];
    const PATHS = ['package.json', 'src/x.ts', 'src/y.ts'];
    const rep = (r: number, overrides: Partial<RunSpec> = {}): RunSpec => ({
      arm: 'wingfoil',
      r,
      steps: [[s('a', 2, 3, ['oracle/c.test.ts > c'])]],
      determinism: { interface: INTERFACE, paths: PATHS },
      ...overrides,
    });

    it('gives each metric with its runs and n, from every pair of repetitions, and no threshold', () => {
      const dir = execution([
        rep(1),
        rep(2, {
          steps: [[s('a', 1, 3, ['oracle/c.test.ts > c', A])]],
          determinism: {
            interface: ['src/x.ts: export function x(n: number): void;', 'src/y.ts: export const y;'],
            paths: PATHS,
          },
        }),
        rep(3, {
          steps: [[s('a', 1, 3, ['oracle/c.test.ts > c', B])]],
          determinism: { interface: INTERFACE, paths: [...PATHS, 'NOTES.md'] },
        }),
      ]);
      const [group] = aggregate(dir).groups;
      const runs = [name('wingfoil', 1), name('wingfoil', 2), name('wingfoil', 3)];
      expect(group?.metrics.m_r).toEqual({
        n: 3,
        runs,
        not_reached: [],
        // c fails in all three, A and B in one each: one test of three has the same verdict everywhere.
        m_r1: { agree: 1, total: 3 },
        m_r2: {
          mean: 0.5556,
          pairs: [
            { runs: [runs[0], runs[1]], intersection: 1, union: 3 },
            { runs: [runs[0], runs[2]], intersection: 2, union: 2 },
            { runs: [runs[1], runs[2]], intersection: 1, union: 3 },
          ],
        },
        m_r3: {
          mean: 0.8333,
          pairs: [
            { runs: [runs[0], runs[1]], intersection: 3, union: 3 },
            { runs: [runs[0], runs[2]], intersection: 3, union: 4 },
            { runs: [runs[1], runs[2]], intersection: 3, union: 4 },
          ],
        },
      });
    });

    it('gives no value to a group of one run, and says n = 1', () => {
      const [group] = aggregate(execution([rep(1)])).groups;
      expect(group?.metrics.m_r).toEqual({ n: 1, runs: [name('wingfoil', 1)], not_reached: [] });
    });

    it('leaves a repetition whose final was not reached out of every metric, and lists it', () => {
      const dir = execution([
        rep(1),
        rep(2),
        rep(3, { steps: ['not reached'], final: 'not reached', determinism: 'not reached' }),
      ]);
      const [group] = aggregate(dir).groups;
      expect(group?.metrics.m_r).toMatchObject({
        n: 2,
        runs: [name('wingfoil', 1), name('wingfoil', 2)],
        not_reached: [name('wingfoil', 3)],
        m_r1: { agree: 3, total: 3 },
        m_r2: { mean: 1 },
        m_r3: { mean: 1 },
      });
      const lone = aggregate(execution([rep(1), rep(2, { steps: ['not reached'], final: 'not reached' })]));
      expect(lone.groups[0]?.metrics.m_r).toEqual({
        n: 1,
        runs: [name('wingfoil', 1)],
        not_reached: [name('wingfoil', 2)],
      });
    });

    it('gives no value when the runs differ in a pin they record, and names the pins', () => {
      const dir = execution([
        rep(1, { harnessCommit: 'aaaa' }),
        rep(2, { harnessCommit: 'bbbb', scorerImage: 'bench-score:y' }),
      ]);
      const [group] = aggregate(dir).groups;
      expect(group?.metrics.m_r).toEqual({
        n: 2,
        runs: [name('wingfoil', 1), name('wingfoil', 2)],
        not_reached: [],
        pins_differ: ['harness_commit', 'scorer'],
      });
    });

    it('gives no value when the runs ran different versions of the scenario, and names the hash', () => {
      const [group] = aggregate(execution([rep(1), rep(2, { scenarioHash: 'sha256:other' })])).groups;
      expect(group?.metrics.m_r).toMatchObject({ n: 2, pins_differ: ['scenario_hash'] });
      expect(group?.metrics.m_r).not.toHaveProperty('m_r1');
    });

    it('gives M-R1 alone when some runs were scored before task-042 and others after', () => {
      const [group] = aggregate(execution([rep(1), { ...rep(2), determinism: undefined } as RunSpec])).groups;
      expect(group?.metrics.m_r).toEqual({
        n: 2,
        runs: [name('wingfoil', 1), name('wingfoil', 2)],
        not_reached: [],
        m_r1: { agree: 3, total: 3 },
      });
    });

    it('counts two empty sets as alike', () => {
      const empty = { interface: [], paths: [] };
      const [group] = aggregate(execution([rep(1, { determinism: empty }), rep(2, { determinism: empty })])).groups;
      expect(group?.metrics.m_r).toMatchObject({ m_r2: { mean: 1 }, m_r3: { mean: 1 } });
    });

    it('gives M-R1 alone for runs scored before task-042, never a zero', () => {
      const older = (r: number): RunSpec => ({ arm: 'wingfoil', r, steps: [[s('a', 2, 3, ['oracle/c.test.ts > c'])]] });
      const [group] = aggregate(execution([older(1), older(2)])).groups;
      expect(group?.metrics.m_r).toEqual({
        n: 2,
        runs: [name('wingfoil', 1), name('wingfoil', 2)],
        not_reached: [],
        m_r1: { agree: 3, total: 3 },
      });
    });
  });

  describe('M-K3, the setup, in the cost of a group (task-040)', () => {
    it("keeps the setup's cost, wall time and manual tokens of the runs that recorded them", () => {
      const dir = execution([
        { arm: 'wingfoil', r: 1, steps: [[s('a', 1, 1)]], setup: { costEur: 0, wallTimeMs: 2000, manualTokens: 463 } },
        { arm: 'wingfoil', r: 2, steps: [[s('a', 1, 1)]], setup: { costEur: 0.5, wallTimeMs: 3000, manualTokens: 463 } },
        { arm: 'wingfoil', r: 3, steps: [[s('a', 1, 1)]], setup: 'not recorded' },
      ]);
      const [group] = aggregate(dir).groups;
      const runs = [name('wingfoil', 1), name('wingfoil', 2)];
      expect(group?.metrics.cost).toMatchObject({
        setup_cost_eur: { n: 2, runs, values: [0, 0.5], min: 0, max: 0.5 },
        setup_wall_time_ms: { n: 2, runs, values: [2000, 3000], min: 2000, max: 3000 },
        manual_tokens: { n: 2, runs, values: [463, 463], min: 463, max: 463 },
      });
    });

    it('adds none of them for runs scored before task-040', () => {
      const [group] = aggregate(execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]] }])).groups;
      expect(group?.metrics.cost).not.toHaveProperty('setup_cost_eur');
      expect(group?.metrics.cost).not.toHaveProperty('manual_tokens');
    });
  });

  describe('M-K4, break-even (experiment design §4.2, REQ-SCO-08, task-040)', () => {
    const baseline = (r = 1, model?: string): RunSpec => ({
      arm: 'baseline',
      r,
      ...(model === undefined ? {} : { model }),
      steps: [[s('a', 1, 1)], [s('a', 2, 2)]],
      stepCosts: [0.2, 0.2],
      setup: { costEur: 0 },
    });
    const arm = (overrides: Partial<RunSpec> = {}): RunSpec => ({
      arm: 'wingfoil',
      steps: [[s('a', 1, 1)], [s('a', 2, 2)]],
      stepCosts: [0.1, 0.1],
      setup: { costEur: 0.3 },
      ...overrides,
    });

    it("is the arm's setup cost over the difference in mean step cost, when its quality is not lower", () => {
      const file = aggregate(execution([baseline(), arm()]));
      expect(file.break_even).toEqual([
        {
          scenario: 'T3',
          version: '1.0',
          model: 'model-a',
          arm: 'wingfoil',
          value: 3,
          setup_cost_eur: { arm: 0.3 },
          mean_step_cost_eur: { baseline: 0.2, arm: 0.1 },
          final_m_q1: { baseline: 1, arm: 1 },
          runs: { baseline: [name('baseline')], arm: [name('wingfoil')] },
          n: { baseline: 1, arm: 1 },
        },
      ]);
    });

    it('is 0 for an arm cheaper per step whose setup cost nothing, as every v0.1 setup does', () => {
      const [entry] = aggregate(execution([baseline(), arm({ setup: { costEur: 0 } })])).break_even;
      expect(entry?.value).toBe(0);
    });

    it('is "not applicable" when the arm\'s final M-Q1 is lower, whatever its cost', () => {
      const lower = arm({ steps: [[s('a', 1, 1)], [s('a', 1, 2)]] });
      expect(aggregate(execution([baseline(), lower])).break_even[0]?.value).toBe('not applicable');
    });

    it('counts a final not reached as a pass rate of 0, a loss', () => {
      const unfinished = arm({ steps: [[s('a', 1, 1)], 'not reached'], stepCosts: [0.1, 0] });
      const [entry] = aggregate(execution([baseline(), unfinished])).break_even;
      expect(entry).toMatchObject({ value: 'not applicable', final_m_q1: { baseline: 1, arm: 0 } });
    });

    it('is "never" when the arm\'s mean step cost is not lower, equal included', () => {
      expect(aggregate(execution([baseline(), arm({ stepCosts: [0.2, 0.2] })])).break_even[0]?.value).toBe('never');
      expect(aggregate(execution([baseline(), arm({ stepCosts: [0.3, 0.3] })])).break_even[0]?.value).toBe('never');
    });

    it('averages over the runs of each group, and over every reached step', () => {
      const file = aggregate(
        execution([
          baseline(1),
          { ...baseline(2), stepCosts: [0.4, 0.4] },
          arm({ r: 1, setup: { costEur: 0.2 } }),
          arm({ r: 2, setup: { costEur: 0.4 } }),
        ]),
      );
      expect(file.break_even[0]).toMatchObject({
        value: 1.5,
        setup_cost_eur: { arm: 0.3 },
        mean_step_cost_eur: { baseline: 0.3, arm: 0.1 },
        n: { baseline: 2, arm: 2 },
      });
    });

    it('pairs baseline-docs with the baseline too, and a slice within its own model', () => {
      const file = aggregate(
        execution([
          baseline(),
          arm({ arm: 'baseline-docs', setup: { costEur: 0 } }),
          baseline(1, 'model-b'),
          arm({ model: 'model-b' }),
        ]),
      );
      expect(file.break_even.map((entry) => [entry.model, entry.arm, entry.value])).toEqual([
        ['model-a', 'baseline-docs', 0],
        ['model-b', 'wingfoil', 3],
      ]);
    });

    it('leaves out an arm with no baseline on its model, or whose setup cost was not recorded', () => {
      expect(aggregate(execution([arm()])).break_even).toEqual([]);
      expect(aggregate(execution([baseline(), arm({ setup: 'not recorded' })])).break_even).toEqual([]);
      expect(aggregate(execution([baseline(), arm({ setup: undefined })])).break_even).toEqual([]);
    });
  });

  describe('M-Q2, static quality (REQ-SCO-04, task-041)', () => {
    const quality = (findings: number, covered: number, max: number) => ({
      m_q2: {
        measured: ['src/a.ts'],
        coverage_targets: ['src/a.ts'],
        lint: { findings, lines: 100 },
        complexity: { functions: 4, sum: 4 * max - 2, max },
        duplication: { duplicated_lines: 10, lines: 100 },
        coverage: { covered, total: 50, tests: 'passed' },
      },
    });

    it('keeps each indicator apart, as integer pairs with their runs, and no composite', () => {
      const dir = execution([
        { arm: 'baseline', r: 1, steps: [[s('a', 1, 1)]], continuity: quality(2, 40, 3) },
        { arm: 'baseline', r: 2, steps: [[s('a', 1, 1)]], continuity: quality(5, 20, 6) },
        { arm: 'baseline', r: 3, steps: ['not reached'], continuity: { m_q2: { not_reached: true } } },
        { arm: 'baseline', r: 4, steps: [[s('a', 1, 1)]], continuity: { m_q2: { not_applicable: true } } },
      ]);
      const [group] = aggregate(dir).groups;
      const runs = [name('baseline', 1), name('baseline', 2)];
      expect(group?.metrics.m_q2).toEqual({
        lint: {
          n: 2,
          runs,
          values: [
            { findings: 2, lines: 100 },
            { findings: 5, lines: 100 },
          ],
          min: { findings: 2, lines: 100 },
          max: { findings: 5, lines: 100 },
        },
        complexity_mean: {
          n: 2,
          runs,
          values: [
            { sum: 10, functions: 4 },
            { sum: 22, functions: 4 },
          ],
          min: { sum: 10, functions: 4 },
          max: { sum: 22, functions: 4 },
        },
        complexity_max: { n: 2, runs, values: [3, 6], min: 3, max: 6 },
        duplication: {
          n: 2,
          runs,
          values: [
            { duplicated_lines: 10, lines: 100 },
            { duplicated_lines: 10, lines: 100 },
          ],
          min: { duplicated_lines: 10, lines: 100 },
          max: { duplicated_lines: 10, lines: 100 },
        },
        coverage: {
          n: 2,
          runs,
          values: [
            { covered: 40, total: 50 },
            { covered: 20, total: 50 },
          ],
          min: { covered: 20, total: 50 },
          max: { covered: 40, total: 50 },
        },
        not_reached: [name('baseline', 3)],
        not_applicable: [name('baseline', 4)],
      });
    });

    it('adds none for runs scored before task-041', () => {
      const [group] = aggregate(execution([{ arm: 'baseline', steps: [[s('a', 1, 1)]] }])).groups;
      expect(group?.metrics).not.toHaveProperty('m_q2');
    });
  });

  describe('continuity and regressions from the seed (REQ-SCO-12, task-039)', () => {
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

describe('each harness against its own docs control (REQ-SCO-14, task-068)', () => {
  const harness = (r = 1, passed = 3, model = 'model-a'): RunSpec => ({
    arm: 'wingfoil',
    r,
    model,
    harnessCommit: 'abc',
    steps: [[s('a', passed, 4)]],
    costEur: 0.4,
  });
  const control = (r = 1, passed = 2, docsOf: string | null = 'wingfoil', model = 'model-a'): RunSpec => ({
    arm: 'baseline-docs',
    r,
    model,
    ...(docsOf === null ? {} : { docsOf }),
    steps: [[s('a', passed, 4)]],
    costEur: 0.5,
  });
  const base: RunSpec = { arm: 'baseline', steps: [[s('a', 1, 4)]] };

  it('compares the harness with the control its docs_of names, metric by metric, with both groups’ runs', () => {
    const file = aggregate(execution([base, harness(1), harness(2), control(1), control(2)]));
    expect(file.controls).toEqual([
      {
        scenario: 'T3',
        version: '1.0',
        model: 'model-a',
        harness: 'wingfoil',
        control: 'baseline-docs',
        runs: { harness: [name('wingfoil', 1), name('wingfoil', 2)], control: [name('baseline-docs', 1), name('baseline-docs', 2)] },
        metrics: [
          {
            metric: 'M-Q1',
            outcome: 'better',
            delta: 0.25,
            certainty: 'within variance',
            harness: { n: 2, mean: 0.75, min: 0.75, max: 0.75 },
            control: { n: 2, mean: 0.5, min: 0.5, max: 0.5 },
          },
          {
            metric: 'M-K1',
            outcome: 'better',
            delta: expect.closeTo(-0.1, 9) as number,
            certainty: 'within variance',
            harness: { n: 2, mean: 0.4, min: 0.4, max: 0.4 },
            control: { n: 2, mean: 0.5, min: 0.5, max: 0.5 },
          },
        ],
      },
    ]);
  });

  it('pairs nothing for a control whose runs record no docs_of, or whose harness did not run', () => {
    expect(aggregate(execution([base, harness(), control(1, 2, null)])).controls).toEqual([]);
    expect(aggregate(execution([base, control()])).controls).toEqual([]);
  });

  it('leaves slices out, as the site’s comparisons do', () => {
    const file = aggregate(
      execution([base, harness(), control(), harness(1, 3, 'model-b'), control(1, 2, 'wingfoil', 'model-b')]),
    );
    expect(file.controls?.map((entry) => entry.model)).toEqual(['model-a']);
  });

  it('is the same bytes aggregated twice', () => {
    const dir = execution([base, harness(), control()]);
    expect(JSON.stringify(aggregate(dir))).toBe(JSON.stringify(aggregate(dir)));
  });
});
