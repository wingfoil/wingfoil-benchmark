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
  };
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
  cost: z.object({ run: costFigures }),
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
  const groups = groupRuns(runs).map(aggregateGroup);
  return ok({
    aggregate_version: AGGREGATE_VERSION,
    campaign,
    execution,
    model,
    groups: groups.filter((group) => group.model === model),
    slices: groups.filter((group) => group.model !== model),
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
    },
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
  };
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
