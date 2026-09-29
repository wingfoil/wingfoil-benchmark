import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { z } from 'zod';

import { fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';

import { executionRuns, readStoredRun } from './runs.js';

/** Where an execution's aggregate is stored, beside its runs (REQ-FMT-06). */
export const AGGREGATE_FILE = 'aggregate.json';

/** The version of `aggregate.json` this module writes. */
export const AGGREGATE_VERSION = 1;

/** The `score.json` version this module reads (task-027). */
const SCORE_VERSION = 1;

const SCORE_FILE = 'score.json';

/** M-Q1 as its two integers: no ratio, so no float, enters the aggregate. */
export interface Tally {
  readonly passed: number;
  readonly total: number;
}

/**
 * One aggregated value (REQ-FMT-07): the runs it was computed from, by path under `results/`, its `n`,
 * each run's own figure in the order of `runs`, and — from two runs — the lowest and the highest.
 */
export interface Value<T> {
  readonly n: number;
  readonly runs: readonly string[];
  readonly values: readonly T[];
  readonly min?: T;
  readonly max?: T;
}

/** A snapshot across the runs of a group: M-Q1, each suite's, and the runs that never reached it. */
export interface SnapshotAggregate {
  readonly m_q1: Value<Tally>;
  readonly suites: readonly { readonly id: string; readonly value: Value<Tally> }[];
  readonly not_reached: readonly string[];
}

export interface StepAggregate extends SnapshotAggregate {
  readonly step: number;
}

export type HoldoutAggregate =
  | { readonly scored: false; readonly reason: string }
  | {
      readonly scored: true;
      readonly not_scored: readonly { readonly run: string; readonly reason: string }[];
      readonly steps: readonly StepAggregate[];
      readonly final: SnapshotAggregate;
    };

/** A run's M-K1 and M-K2 (task-029) across the group, and the runs whose cost is a bound (task-024). */
export interface CostAggregate {
  readonly cost_eur: Value<number>;
  readonly cost_usd: Value<number>;
  readonly tokens_input: Value<number>;
  readonly tokens_output: Value<number>;
  readonly tokens_cache_creation: Value<number>;
  readonly tokens_cache_read: Value<number>;
  readonly wall_time_ms: Value<number>;
  readonly turns: Value<number>;
  readonly interventions: Value<number>;
  readonly bound: readonly string[];
  /** M-K3 (task-040), over the runs that recorded their setup; absent when none did. */
  readonly setup_cost_eur?: Value<number>;
  readonly setup_wall_time_ms?: Value<number>;
  /** The manual's tokens (REQ-RUN-12), over the runs that recorded them. */
  readonly manual_tokens?: Value<number>;
}

/** One scenario version in one arm with one model: its runs and what they measured. */
export interface Group {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly runs: readonly string[];
  readonly n: number;
  /** A single run (experiment design §4.6): a preliminary result, with no variance. */
  readonly preliminary: boolean;
  /** The runs that count as losses (REQ-SCO-10, adr-004), with why. */
  readonly losses: readonly { readonly run: string; readonly reason: string }[];
  readonly metrics: {
    readonly m_q1: { readonly steps: readonly StepAggregate[]; readonly final: SnapshotAggregate };
    readonly holdout: HoldoutAggregate;
    readonly cost: CostAggregate;
    /** A public suite's tests failing at a step and not at the previous step it is scored at. */
    readonly regressions: readonly { readonly suite: string; readonly step: number; readonly value: Value<number> }[];
    /** Each check on each of its steps (REQ-SCO-06, task-035): a tally of one per run, passed or not. */
    readonly checks: readonly CheckAggregate[];
    /** M-F1 (REQ-SCO-12, task-039), when the group's scenario lists decisions. */
    readonly m_f1?: MF1Aggregate;
    /** M-F2 (REQ-SCO-12, task-039), when the group's runs were scored with it. */
    readonly m_f2?: MF2Aggregate;
    /** M-D3 from the seed (REQ-SCO-12, task-039), when the group's runs were scored with it. */
    readonly m_d3?: MD3Aggregate;
    /** M-Q2 (REQ-SCO-04, task-041), when the group's runs were scored with it. */
    readonly m_q2?: MQ2Aggregate;
  };
}

/**
 * M-Q2 across a group (task-041): each indicator apart, as the integers it is a ratio of, over the runs
 * that measured something; no composite. The runs with no final snapshot, and those that changed no
 * source file, are named apart: nothing was measured, so nothing is counted.
 */
export interface MQ2Aggregate {
  readonly lint: Value<{ readonly findings: number; readonly lines: number }>;
  readonly complexity_mean: Value<{ readonly sum: number; readonly functions: number }>;
  readonly complexity_max: Value<number>;
  readonly duplication: Value<{ readonly duplicated_lines: number; readonly lines: number }>;
  readonly coverage: Value<{ readonly covered: number; readonly total: number }>;
  readonly not_reached: readonly string[];
  readonly not_applicable: readonly string[];
}

/**
 * M-F1 across a group (task-039): the share of decisions respected or revised, and each decision as a
 * tally of one per run with how many runs had each outcome. A final not reached is a loss: nothing
 * consistent (task-034's rule for M-Q1), and the run is listed.
 */
export interface MF1Aggregate {
  readonly share: Value<Tally>;
  readonly decisions: readonly {
    readonly id: string;
    readonly consistent: Value<Tally>;
    readonly outcomes: { readonly respected: number; readonly revised: number; readonly failed: number };
  }[];
  readonly not_reached: readonly string[];
}

/** M-F2 across a group: each step after the first, its cost in euro and its M-Q1, and the runs that never reached it. */
export interface MF2Aggregate {
  readonly steps: readonly {
    readonly step: number;
    readonly cost_eur: Value<number>;
    readonly m_q1: Value<Tally>;
    readonly not_reached: readonly string[];
  }[];
}

/** M-D3 across a group: regressions per run; a final not reached loses every test that passed on the seed. */
export interface MD3Aggregate {
  readonly value: Value<number>;
  readonly not_reached: readonly string[];
}

/** A check across the runs of a group that scored it (task-035). */
export interface CheckAggregate {
  readonly id: string;
  readonly kind: string;
  readonly steps: readonly {
    readonly step: number;
    readonly passed: Value<Tally>;
    /** A directive check's violations (M-E1, task-037), per run that reached the step. */
    readonly violations?: Value<number>;
    readonly not_reached: readonly string[];
  }[];
}

/** `aggregate.json`, version 1 (F5.1): no timestamp, keys and entries in a fixed order (REQ-SCO-03). */
export interface AggregateFile {
  readonly aggregate_version: number;
  readonly campaign: string;
  readonly execution: number;
  /** The campaign's default model: the groups' model; every other model's runs are `slices` (T14). */
  readonly model: string;
  readonly groups: readonly Group[];
  readonly slices: readonly Group[];
  /** M-K4 (REQ-SCO-08, task-040): each arm against the baseline of its scenario version and model. */
  readonly break_even: readonly BreakEven[];
}

/**
 * M-K4 for one arm (experiment design §4.2, REQ-SCO-08 as amended in 1.15): a number of runs, or why
 * there is none; with what it was computed from, each kept to a millionth, and both groups' runs.
 */
export interface BreakEven {
  readonly scenario: string;
  readonly version: string;
  readonly model: string;
  readonly arm: string;
  readonly value: number | 'not applicable' | 'never';
  readonly setup_cost_eur: { readonly arm: number };
  readonly mean_step_cost_eur: { readonly baseline: number; readonly arm: number };
  readonly final_m_q1: { readonly baseline: number; readonly arm: number };
  readonly runs: { readonly baseline: readonly string[]; readonly arm: readonly string[] };
  readonly n: { readonly baseline: number; readonly arm: number };
}

// What aggregation reads of a score.json (task-027): its own schema, as results/ cannot import scoring/.
const tally = z.object({ passed: z.number().int(), total: z.number().int() });
const suite = tally.extend({ id: z.string(), failed: z.array(z.string()).optional() });
const step = z.union([
  z.object({ n: z.number().int(), not_reached: z.literal(true) }),
  z.object({ n: z.number().int(), suites: z.array(suite), m_q1: tally.optional() }),
]);
const final = z.union([
  z.object({ not_reached: z.literal(true) }),
  z.object({ step: z.number().int(), suites: z.array(suite), m_q1: tally.optional() }),
]);
const costFigures = z.object({
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    cache_creation: z.number(),
    cache_read: z.number(),
  }),
  cost_usd: z.number(),
  cost_eur: z.number(),
  cost_reported: z.boolean(),
  wall_time_ms: z.number(),
  turns: z.number(),
  interventions: z.number(),
});
const scoreSchema = z.object({
  score_version: z.literal(SCORE_VERSION),
  scenario_hash: z.string(),
  steps: z.array(step),
  final,
  holdout: z.union([
    z.object({ scored: z.literal(false), reason: z.string() }),
    z.object({ scored: z.literal(true), steps: z.array(step), final }),
  ]),
  // Optional: a score.json written before task-035 has no checks, and still aggregates.
  checks: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        steps: z.array(
          z.union([
            z.object({ n: z.number().int(), not_reached: z.literal(true) }),
            z.object({ n: z.number().int(), passed: z.boolean(), violations: z.number().int().optional() }),
          ]),
        ),
      }),
    )
    .optional(),
  // Optional: a score.json written before task-039 has none of these, and still aggregates.
  seed: z.object({ suites: z.array(suite), m_q1: tally.optional() }).optional(),
  m_f1: z
    .union([
      z.object({ not_reached: z.literal(true) }),
      z.object({
        consistent: z.number().int(),
        total: z.number().int(),
        decisions: z.array(z.object({ id: z.string(), outcome: z.enum(['respected', 'revised', 'failed']) })),
      }),
    ])
    .optional(),
  m_f2: z
    .object({
      steps: z.array(
        z.union([
          z.object({ n: z.number().int(), not_reached: z.literal(true) }),
          z.object({ n: z.number().int(), cost_eur: z.number(), m_q1: tally.optional() }),
        ]),
      ),
    })
    .optional(),
  m_d3: z
    .union([z.object({ not_reached: z.literal(true) }), z.object({ count: z.number().int() })])
    .optional(),
  // Optional: M-Q2 (task-041); a score.json written before it has none.
  m_q2: z
    .union([
      z.object({ not_reached: z.literal(true) }),
      z.object({ not_applicable: z.literal(true) }),
      z.object({
        lint: z.object({ findings: z.number().int(), lines: z.number().int() }),
        complexity: z.object({ functions: z.number().int(), sum: z.number().int(), max: z.number().int() }),
        duplication: z.object({ duplicated_lines: z.number().int(), lines: z.number().int() }),
        coverage: z.object({ covered: z.number().int(), total: z.number().int() }),
      }),
    ])
    .optional(),
  cost: z.object({
    run: costFigures,
    // Optional: read for M-K4's mean step cost (task-040); a score.json before task-029 has none.
    steps: z
      .array(
        z.union([
          z.object({ n: z.number().int(), not_reached: z.literal(true) }),
          z.object({ n: z.number().int(), cost_eur: z.number() }),
        ]),
      )
      .optional(),
    // Optional: M-K3 (task-040); a score.json written before it has none.
    setup: z
      .union([
        z.object({ not_recorded: z.literal(true) }),
        z.object({ cost_eur: z.number(), wall_time_ms: z.number(), manual_tokens: z.number().optional() }),
      ])
      .optional(),
  }),
  expected_failure: z.object({ missing: z.array(z.string()) }).nullable(),
});
type Score = z.infer<typeof scoreSchema>;
type StepScore = z.infer<typeof step>;
type FinalScore = z.infer<typeof final>;
type SuiteScore = z.infer<typeof suite>;

const pinsSchema = z.object({ models: z.object({ default: z.string() }) });

interface ScoredRun {
  readonly name: string;
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly score: Score;
}

/**
 * The aggregate of the campaign execution in `executionDir` (F5.1), from what is committed only
 * (REQ-RES-06): each run's `run.json` and `score.json`, and the execution's `campaign.yaml`. Every run
 * must be scored, by this `score.json` version, for the scenario version it ran; otherwise nothing is
 * aggregated, since a value with runs missing from it is not one REQ-FMT-07 allows.
 */
export function aggregateExecution(executionDir: string): Result<AggregateFile> {
  const pins = readYamlFile(join(executionDir, 'campaign.yaml'));
  if (!pins.ok) return pins;
  const parsedPins = parseWith(pinsSchema, pins.value, 'campaign.yaml');
  if (!parsedPins.ok) {
    return fail(parsedPins.issues.map((issue) => ({ ...issue, path: `campaign.yaml.${issue.path}` })));
  }
  const campaign = basename(dirname(executionDir));
  const execution = Number(basename(executionDir));
  const runs: ScoredRun[] = [];
  const issues: Issue[] = [];
  for (const runDir of executionRuns(executionDir)) {
    const read = readScored(executionDir, runDir, campaign, execution);
    if (read.ok) runs.push(read.value);
    else issues.push(...read.issues);
  }
  if (issues.length > 0) return fail(issues);
  if (runs.length === 0) return fail([{ path: executionDir, message: 'holds no run' }]);

  const model = parsedPins.value.models.default;
  const grouped = groupRuns(runs);
  const groups = grouped.map(aggregateGroup);
  return ok({
    aggregate_version: AGGREGATE_VERSION,
    campaign,
    execution,
    model,
    groups: groups.filter((group) => group.model === model),
    slices: groups.filter((group) => group.model !== model),
    break_even: breakEven(grouped),
  });
}

/** Write `aggregate` beside the execution's runs. */
export function writeAggregate(executionDir: string, aggregate: AggregateFile): void {
  writeFileSync(join(executionDir, AGGREGATE_FILE), `${JSON.stringify(aggregate, undefined, 2)}\n`);
}

function readScored(executionDir: string, runDir: string, campaign: string, execution: number): Result<ScoredRun> {
  const at = relative(executionDir, runDir).split(/[\\/]/).join('/');
  const run = readStoredRun(runDir);
  if (!run.ok) return fail(run.issues.map((issue) => ({ ...issue, path: `${at}/${issue.path}` })));
  const file = join(runDir, SCORE_FILE);
  if (!existsSync(file)) return fail([{ path: at, message: 'is not scored' }]);
  const label = `${at}/${SCORE_FILE}`;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([{ path: label, message: `is not JSON: ${(error as Error).message}` }]);
  }
  const version = (data as { score_version?: unknown } | null)?.score_version;
  if (version !== SCORE_VERSION) {
    return fail([
      { path: label, message: `score_version ${String(version)} is not the one aggregation reads (${SCORE_VERSION})` },
    ]);
  }
  const parsed = parseWith(scoreSchema, data, SCORE_FILE);
  if (!parsed.ok) return fail(parsed.issues.map((issue) => ({ ...issue, path: `${label}.${issue.path}` })));
  if (parsed.value.scenario_hash !== run.value.scenarioHash) {
    return fail([{ path: label, message: 'scores another version of the scenario than the run ran' }]);
  }
  return ok({
    name: `${campaign}/${execution}/${at}`,
    scenario: run.value.scenario,
    version: run.value.version,
    arm: run.value.arm,
    model: run.value.model,
    score: parsed.value,
  });
}

/** Runs by scenario, version, arm and model, in that order by UTF-16 code unit; runs by name within. */
function groupRuns(runs: readonly ScoredRun[]): ScoredRun[][] {
  // NUL sorts below every character of a name, so joined keys order as their parts do.
  const key = (run: ScoredRun) => [run.scenario, run.version, run.arm, run.model].join('\u0000');
  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const groups = new Map<string, ScoredRun[]>();
  for (const run of runs) groups.set(key(run), [...(groups.get(key(run)) ?? []), run]);
  return [...groups.entries()]
    .sort(([a], [b]) => byName(a, b))
    .map(([, group]) => [...group].sort((a, b) => byName(a.name, b.name)));
}

function aggregateGroup(runs: readonly ScoredRun[]): Group {
  const first = runs[0] as ScoredRun;
  const losses = runs.flatMap((run) => [
    ...(run.score.expected_failure === null
      ? []
      : [{ run: run.name, reason: `expected failure (missing ${run.score.expected_failure.missing.join(', ')})` }]),
    ...('not_reached' in run.score.final ? [{ run: run.name, reason: 'final not reached' }] : []),
  ]);
  return {
    scenario: first.scenario,
    version: first.version,
    arm: first.arm,
    model: first.model,
    runs: runs.map((run) => run.name),
    n: runs.length,
    preliminary: runs.length === 1,
    losses,
    metrics: {
      m_q1: snapshots(runs.map((run) => ({ name: run.name, steps: run.score.steps, final: run.score.final }))),
      holdout: holdoutOf(runs),
      cost: costOf(runs),
      regressions: regressionsOf(runs),
      checks: checksOf(runs),
      ...continuityOf(runs),
    },
  };
}

/** M-F1, M-F2 and M-D3 of a group (task-039), each only when some run of the group was scored with it. */
function continuityOf(runs: readonly ScoredRun[]): Pick<Group['metrics'], 'm_f1' | 'm_f2' | 'm_d3'> {
  const m_f1 = mF1Of(runs);
  const m_f2 = mF2Of(runs);
  const m_d3 = mD3Of(runs);
  const m_q2 = mQ2Of(runs);
  return {
    ...(m_f1 === undefined ? {} : { m_f1 }),
    ...(m_f2 === undefined ? {} : { m_f2 }),
    ...(m_d3 === undefined ? {} : { m_d3 }),
    ...(m_q2 === undefined ? {} : { m_q2 }),
  };
}

function mQ2Of(runs: readonly ScoredRun[]): MQ2Aggregate | undefined {
  const scored = runs.flatMap((run) => (run.score.m_q2 === undefined ? [] : [{ run: run.name, m_q2: run.score.m_q2 }]));
  if (scored.length === 0) return undefined;
  const measured = scored.flatMap(({ run, m_q2 }) => ('lint' in m_q2 ? [{ run, m: m_q2 }] : []));
  const ratio = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);
  const of = <T>(pick: (m: (typeof measured)[number]['m']) => T, compare: (a: T, b: T) => number) =>
    valueOf(
      measured.map(({ run, m }) => ({ run, value: pick(m) })),
      compare,
    );
  return {
    lint: of(
      (m) => ({ findings: m.lint.findings, lines: m.lint.lines }),
      (a, b) => ratio(a.findings, a.lines) - ratio(b.findings, b.lines),
    ),
    complexity_mean: of(
      (m) => ({ sum: m.complexity.sum, functions: m.complexity.functions }),
      (a, b) => ratio(a.sum, a.functions) - ratio(b.sum, b.functions),
    ),
    complexity_max: of(
      (m) => m.complexity.max,
      (a, b) => a - b,
    ),
    duplication: of(
      (m) => ({ duplicated_lines: m.duplication.duplicated_lines, lines: m.duplication.lines }),
      (a, b) => ratio(a.duplicated_lines, a.lines) - ratio(b.duplicated_lines, b.lines),
    ),
    coverage: of(
      (m) => ({ covered: m.coverage.covered, total: m.coverage.total }),
      (a, b) => ratio(a.covered, a.total) - ratio(b.covered, b.total),
    ),
    not_reached: scored.filter(({ m_q2 }) => 'not_reached' in m_q2).map(({ run }) => run),
    not_applicable: scored.filter(({ m_q2 }) => 'not_applicable' in m_q2).map(({ run }) => run),
  };
}

function mF1Of(runs: readonly ScoredRun[]): MF1Aggregate | undefined {
  const scored = runs.flatMap((run) => (run.score.m_f1 === undefined ? [] : [{ run: run.name, m_f1: run.score.m_f1 }]));
  if (scored.length === 0) return undefined;
  // The decisions, in the order the first run that reached its final snapshot lists them.
  const ids: string[] = [];
  for (const { m_f1 } of scored) {
    if ('decisions' in m_f1) for (const d of m_f1.decisions) if (!ids.includes(d.id)) ids.push(d.id);
  }
  const outcomeOf = (m_f1: (typeof scored)[number]['m_f1'], id: string) =>
    'decisions' in m_f1 ? m_f1.decisions.find((d) => d.id === id)?.outcome : undefined;
  return {
    share: valueOf(
      scored.map(({ run, m_f1 }) => ({
        run,
        value: 'not_reached' in m_f1 ? { passed: 0, total: ids.length } : { passed: m_f1.consistent, total: m_f1.total },
      })),
      byRatio,
    ),
    decisions: ids.map((id) => {
      const outcomes = scored.map(({ m_f1 }) => outcomeOf(m_f1, id));
      return {
        id,
        consistent: valueOf(
          scored.map(({ run }, index) => {
            const outcome = outcomes[index];
            return { run, value: { passed: outcome === 'respected' || outcome === 'revised' ? 1 : 0, total: 1 } };
          }),
          byRatio,
        ),
        outcomes: {
          respected: outcomes.filter((o) => o === 'respected').length,
          revised: outcomes.filter((o) => o === 'revised').length,
          failed: outcomes.filter((o) => o === 'failed').length,
        },
      };
    }),
    not_reached: scored.filter(({ m_f1 }) => 'not_reached' in m_f1).map(({ run }) => run),
  };
}

function mF2Of(runs: readonly ScoredRun[]): MF2Aggregate | undefined {
  const scored = runs.flatMap((run) => (run.score.m_f2 === undefined ? [] : [{ run: run.name, steps: run.score.m_f2.steps }]));
  if (scored.length === 0) return undefined;
  const numbers = [...new Set(scored.flatMap((entry) => entry.steps.map((s) => s.n)))].sort((a, b) => a - b);
  return {
    steps: numbers.map((n) => {
      const cost: { run: string; value: number }[] = [];
      const quality: { run: string; value: Tally }[] = [];
      const notReached: string[] = [];
      for (const entry of scored) {
        const found = entry.steps.find((s) => s.n === n);
        if (found === undefined) continue;
        if ('not_reached' in found) notReached.push(entry.run);
        else {
          cost.push({ run: entry.run, value: found.cost_eur });
          if (found.m_q1 !== undefined) quality.push({ run: entry.run, value: tallyOf(found.m_q1) });
        }
      }
      return {
        step: n,
        cost_eur: valueOf(cost, (a, b) => a - b),
        m_q1: valueOf(quality, byRatio),
        not_reached: notReached,
      };
    }),
  };
}

function mD3Of(runs: readonly ScoredRun[]): MD3Aggregate | undefined {
  const scored = runs.flatMap((run) =>
    run.score.m_d3 === undefined ? [] : [{ run: run.name, m_d3: run.score.m_d3, seed: run.score.seed }],
  );
  if (scored.length === 0) return undefined;
  return {
    value: valueOf(
      scored.map(({ run, m_d3, seed }) => ({
        run,
        value: 'not_reached' in m_d3 ? (seed?.m_q1?.passed ?? 0) : m_d3.count,
      })),
      (a, b) => a - b,
    ),
    not_reached: scored.filter(({ m_d3 }) => 'not_reached' in m_d3).map(({ run }) => run),
  };
}

interface Snapshots {
  readonly name: string;
  readonly steps: readonly StepScore[];
  readonly final: FinalScore;
}

/** M-Q1 per step and on the final snapshot; a final not reached counts as nothing passed (a loss). */
function snapshots(runs: readonly Snapshots[]): { steps: StepAggregate[]; final: SnapshotAggregate } {
  const numbers = [...new Set(runs.flatMap((run) => run.steps.map((s) => s.n)))].sort((a, b) => a - b);
  const steps = numbers.map((n): StepAggregate => {
    const reached: { name: string; suites: readonly SuiteScore[]; m_q1?: Tally }[] = [];
    const notReached: string[] = [];
    for (const run of runs) {
      const found = run.steps.find((s) => s.n === n);
      if (found === undefined) continue;
      if ('not_reached' in found) notReached.push(run.name);
      else reached.push({ name: run.name, suites: found.suites, ...(found.m_q1 ? { m_q1: found.m_q1 } : {}) });
    }
    return { step: n, ...snapshot(reached, notReached) };
  });

  // A suite's total is its census on the seed, the same for every run of the scenario version.
  const totals = new Map<string, number>();
  for (const run of runs) {
    for (const s of run.steps) if (!('not_reached' in s)) for (const x of s.suites) totals.set(x.id, x.total);
    if (!('not_reached' in run.final)) for (const x of run.final.suites) totals.set(x.id, x.total);
  }
  const finalIds = [...totals.keys()];
  const reached = runs.map((run) => {
    if (!('not_reached' in run.final)) {
      return { name: run.name, suites: run.final.suites, ...(run.final.m_q1 ? { m_q1: run.final.m_q1 } : {}) };
    }
    const suites = finalIds.map((id) => ({ id, passed: 0, total: totals.get(id) ?? 0 }));
    return {
      name: run.name,
      suites,
      m_q1: { passed: 0, total: suites.reduce((sum, x) => sum + x.total, 0) },
    };
  });
  const notReached = runs.filter((run) => 'not_reached' in run.final).map((run) => run.name);
  return { steps, final: snapshot(reached, notReached) };
}

function snapshot(
  reached: readonly { name: string; suites: readonly SuiteScore[]; m_q1?: Tally }[],
  notReached: readonly string[],
): SnapshotAggregate {
  const ids: string[] = [];
  for (const run of reached) for (const s of run.suites) if (!ids.includes(s.id)) ids.push(s.id);
  return {
    m_q1: valueOf(
      reached.flatMap((run) => (run.m_q1 === undefined ? [] : [{ run: run.name, value: tallyOf(run.m_q1) }])),
      byRatio,
    ),
    suites: ids.map((id) => ({
      id,
      value: valueOf(
        reached.flatMap((run) => {
          const found = run.suites.find((s) => s.id === id);
          return found === undefined ? [] : [{ run: run.name, value: tallyOf(found) }];
        }),
        byRatio,
      ),
    })),
    not_reached: notReached,
  };
}

function holdoutOf(runs: readonly ScoredRun[]): HoldoutAggregate {
  const scored = runs.flatMap((run) =>
    run.score.holdout.scored ? [{ name: run.name, steps: run.score.holdout.steps, final: run.score.holdout.final }] : [],
  );
  const notScored = runs.flatMap((run) =>
    run.score.holdout.scored ? [] : [{ run: run.name, reason: run.score.holdout.reason }],
  );
  if (scored.length === 0) return { scored: false, reason: notScored[0]?.reason ?? 'not configured' };
  return { scored: true, not_scored: notScored, ...snapshots(scored) };
}

function costOf(runs: readonly ScoredRun[]): CostAggregate {
  const of = (figure: (score: Score) => number) =>
    valueOf(
      runs.map((run) => ({ run: run.name, value: figure(run.score) })),
      (a, b) => a - b,
    );
  return {
    cost_eur: of((s) => s.cost.run.cost_eur),
    cost_usd: of((s) => s.cost.run.cost_usd),
    tokens_input: of((s) => s.cost.run.tokens.input),
    tokens_output: of((s) => s.cost.run.tokens.output),
    tokens_cache_creation: of((s) => s.cost.run.tokens.cache_creation),
    tokens_cache_read: of((s) => s.cost.run.tokens.cache_read),
    wall_time_ms: of((s) => s.cost.run.wall_time_ms),
    turns: of((s) => s.cost.run.turns),
    interventions: of((s) => s.cost.run.interventions),
    bound: runs.filter((run) => !run.score.cost.run.cost_reported).map((run) => run.name),
    ...setupOf(runs),
  };
}

/** M-K3 across a group (task-040): each figure over the runs that recorded it, or nothing. */
function setupOf(runs: readonly ScoredRun[]): Pick<CostAggregate, 'setup_cost_eur' | 'setup_wall_time_ms' | 'manual_tokens'> {
  const recorded = runs.flatMap((run) => {
    const setup = run.score.cost.setup;
    return setup === undefined || 'not_recorded' in setup ? [] : [{ run: run.name, setup }];
  });
  if (recorded.length === 0) return {};
  const byNumber = (a: number, b: number) => a - b;
  const manual = recorded.flatMap(({ run, setup }) =>
    setup.manual_tokens === undefined ? [] : [{ run, value: setup.manual_tokens }],
  );
  return {
    setup_cost_eur: valueOf(recorded.map(({ run, setup }) => ({ run, value: setup.cost_eur })), byNumber),
    setup_wall_time_ms: valueOf(recorded.map(({ run, setup }) => ({ run, value: setup.wall_time_ms })), byNumber),
    ...(manual.length === 0 ? {} : { manual_tokens: valueOf(manual, byNumber) }),
  };
}

/** The arm every other is compared with (experiment design §2, REQ-FMT-01). */
const BASELINE = 'baseline';

/** A mean kept to a millionth, as money is (task-029): float noise never decides a comparison. */
function mean(values: readonly number[]): number {
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 1e6) / 1e6;
}

/** A group's inputs to M-K4, or undefined when its scores lack one of them (scored before task-029 or -040). */
function breakEvenInputs(runs: readonly ScoredRun[]) {
  const finals = runs.map((run) => {
    const m = 'not_reached' in run.score.final ? undefined : run.score.final.m_q1;
    return m === undefined || m.total === 0 ? 0 : m.passed / m.total;
  });
  const stepCosts: number[] = [];
  const setupCosts: number[] = [];
  for (const run of runs) {
    const { steps, setup } = run.score.cost;
    if (steps === undefined) return undefined;
    for (const step of steps) if (!('not_reached' in step)) stepCosts.push(step.cost_eur);
    if (setup !== undefined && !('not_recorded' in setup)) setupCosts.push(setup.cost_eur);
  }
  if (stepCosts.length === 0) return undefined;
  return {
    finalMQ1: mean(finals),
    stepCost: mean(stepCosts),
    setupCost: setupCosts.length === runs.length ? mean(setupCosts) : undefined,
    runs: runs.map((run) => run.name),
  };
}

/**
 * M-K4 (REQ-SCO-08 as amended in 1.15): each arm but the baseline against the baseline of its scenario
 * version and model — not applicable when its final M-Q1 is lower, never when its mean step cost is not
 * lower, otherwise its mean setup cost over the difference. Left out without a baseline, or when a run
 * of the arm recorded no setup cost: an unknown cost is not a zero.
 */
function breakEven(grouped: readonly ScoredRun[][]): BreakEven[] {
  const key = (run: ScoredRun) => [run.scenario, run.version, run.model].join('\u0000');
  const baselines = new Map<string, ScoredRun[]>();
  for (const runs of grouped) {
    const first = runs[0] as ScoredRun;
    if (first.arm === BASELINE) baselines.set(key(first), runs);
  }
  const entries: BreakEven[] = [];
  for (const runs of grouped) {
    const first = runs[0] as ScoredRun;
    const reference = baselines.get(key(first));
    if (first.arm === BASELINE || reference === undefined) continue;
    const base = breakEvenInputs(reference);
    const arm = breakEvenInputs(runs);
    if (base === undefined || arm === undefined || arm.setupCost === undefined) continue;
    const value =
      arm.finalMQ1 < base.finalMQ1
        ? 'not applicable'
        : arm.stepCost >= base.stepCost
          ? 'never'
          : Math.round((arm.setupCost / (base.stepCost - arm.stepCost)) * 1e6) / 1e6;
    entries.push({
      scenario: first.scenario,
      version: first.version,
      model: first.model,
      arm: first.arm,
      value,
      setup_cost_eur: { arm: arm.setupCost },
      mean_step_cost_eur: { baseline: base.stepCost, arm: arm.stepCost },
      final_m_q1: { baseline: base.finalMQ1, arm: arm.finalMQ1 },
      runs: { baseline: base.runs, arm: arm.runs },
      n: { baseline: base.runs.length, arm: arm.runs.length },
    });
  }
  const order = (e: BreakEven) => [e.scenario, e.version, e.model, e.arm].join('\u0000');
  return entries.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
}

/** For each public suite, at each step after the first it is scored at: its tests newly failing there. */
function regressionsOf(runs: readonly ScoredRun[]): Group['metrics']['regressions'] {
  const suiteSteps = new Map<string, number[]>();
  for (const run of runs) {
    for (const s of run.score.steps) {
      if ('not_reached' in s) continue;
      for (const x of s.suites) {
        const steps = suiteSteps.get(x.id) ?? [];
        if (!steps.includes(s.n)) steps.push(s.n);
        suiteSteps.set(x.id, steps);
      }
    }
  }
  const failedAt = (run: ScoredRun, n: number, id: string): readonly string[] | undefined => {
    const s = run.score.steps.find((candidate) => candidate.n === n);
    if (s === undefined || 'not_reached' in s) return undefined;
    return s.suites.find((x) => x.id === id)?.failed;
  };
  return [...suiteSteps.entries()].flatMap(([id, steps]) => {
    const sorted = [...steps].sort((a, b) => a - b);
    return sorted.slice(1).map((n, index) => {
      const previous = sorted[index] as number;
      return {
        suite: id,
        step: n,
        value: valueOf(
          runs.flatMap((run) => {
            const before = failedAt(run, previous, id);
            const now = failedAt(run, n, id);
            if (before === undefined || now === undefined) return [];
            return [{ run: run.name, value: now.filter((test) => !before.includes(test)).length }];
          }),
          (a, b) => a - b,
        ),
      };
    });
  });
}

/**
 * Each check a run of the group scored, in the order the runs first declare them, on each of its steps:
 * the runs that reached the step, each a tally of one (passed or not), and those that never did. A loss
 * keeps its checks, as it keeps M-Q1 (task-034).
 */
function checksOf(runs: readonly ScoredRun[]): CheckAggregate[] {
  const order: { id: string; kind: string }[] = [];
  for (const run of runs) {
    for (const check of run.score.checks ?? []) {
      if (!order.some((known) => known.id === check.id)) order.push({ id: check.id, kind: check.kind });
    }
  }
  return order.map(({ id, kind }) => {
    const found = runs.flatMap((run) => {
      const check = (run.score.checks ?? []).find((candidate) => candidate.id === id);
      return check === undefined ? [] : [{ run: run.name, steps: check.steps }];
    });
    const numbers = [...new Set(found.flatMap((entry) => entry.steps.map((s) => s.n)))].sort((a, b) => a - b);
    return {
      id,
      kind,
      steps: numbers.map((n) => {
        const reached: { run: string; value: Tally }[] = [];
        const violations: { run: string; value: number }[] = [];
        const notReached: string[] = [];
        for (const entry of found) {
          const s = entry.steps.find((candidate) => candidate.n === n);
          if (s === undefined) continue;
          if ('not_reached' in s) notReached.push(entry.run);
          else {
            reached.push({ run: entry.run, value: { passed: s.passed ? 1 : 0, total: 1 } });
            if (s.violations !== undefined) violations.push({ run: entry.run, value: s.violations });
          }
        }
        return {
          step: n,
          passed: valueOf(reached, byRatio),
          ...(violations.length === 0 ? {} : { violations: valueOf(violations, (a, b) => a - b) }),
          not_reached: notReached,
        };
      }),
    };
  });
}

function tallyOf(t: Tally): Tally {
  return { passed: t.passed, total: t.total };
}

/** Lower ratio first; a suite with no test counts as nothing passed. */
function byRatio(a: Tally, b: Tally): number {
  const ratio = (t: Tally) => (t.total === 0 ? 0 : t.passed / t.total);
  return ratio(a) - ratio(b);
}

/** A Value from each run's figure, in the order given; the first lowest and first highest from two runs. */
function valueOf<T>(entries: readonly { run: string; value: T }[], compare: (a: T, b: T) => number): Value<T> {
  const value = { n: entries.length, runs: entries.map((e) => e.run), values: entries.map((e) => e.value) };
  if (entries.length < 2) return value;
  let min = entries[0]?.value as T;
  let max = min;
  for (const entry of entries.slice(1)) {
    if (compare(entry.value, min) < 0) min = entry.value;
    if (compare(entry.value, max) > 0) max = entry.value;
  }
  return { ...value, min, max };
}
