import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { CATEGORIES, fail, ok } from '../core/index.js';
import type { Category, Issue, Result } from '../core/index.js';
import { AGGREGATE_FILE, AGGREGATE_VERSION } from '../results/index.js';
import type { AggregateFile, ControlComparison, ControlMetric, Group } from '../results/index.js';
import { loadScenario } from '../scenario/index.js';

import { CATEGORY_MAP, compare, readMetric, summarize } from './rules.js';
import type { Comparison, Figures, MapEntry, Summary } from './rules.js';

const BASELINE = 'baseline';

/** A scenario version of the execution, with the categories its `scenario.yaml` gives it. */
export interface ScenarioInfo {
  readonly id: string;
  readonly version: string;
  readonly primary: Category;
  readonly secondary: readonly Category[];
  /** Its content hash (REQ-FMT-09), the one every run of it recorded. */
  readonly hash: string;
}

/** What a run's `run.json` records that the method page states (task-046): its manual and its harness. */
export interface RunRecord {
  readonly run: string;
  readonly arm: string;
  readonly manual?: { readonly sha256: string; readonly tokens: number };
  readonly harness?: { readonly tool: string; readonly commit: string };
  /** What the arm declared of its harness (REQ-FMT-10), as the run recorded it. */
  readonly provides?: Readonly<Record<string, boolean>>;
  /** The arm's digest (REQ-FMT-13), as the run recorded it. */
  readonly armDigest?: string;
}

/** One arm's value of one metric: its summary and, but for the baseline, its comparison. */
export interface ArmValue {
  readonly arm: string;
  /** Undefined: the group does not measure it, or the arm has no run of the scenario. */
  readonly summary?: Summary;
  readonly comparison?: Comparison;
  /** Why there is no value or no comparison: M-E1 not comparable (the approver's choice of 2026-10-01). */
  readonly note?: string;
  /** A harness arm against its own docs control (REQ-SCO-14, task-068); absent for any other arm. */
  readonly against?: AgainstControl;
}

/**
 * A harness arm's comparison with its docs control, from the aggregate's `controls`: none recorded ("not measured"),
 * the control with no value of this metric on both sides ("not measured"), or the metric's comparison or note.
 */
export interface AgainstControl {
  readonly control?: string;
  readonly metric?: ControlMetric;
}

/** One metric of the category map on one scenario, in every arm. */
export interface MetricRow {
  readonly entry: MapEntry;
  readonly values: readonly ArmValue[];
}

/** One scenario of a category: its metrics, and each arm's group. */
export interface ScenarioRow {
  readonly scenario: ScenarioInfo;
  readonly metrics: readonly MetricRow[];
  readonly groups: readonly Group[];
}

/** One category A–G: covered when a scenario of the execution has it as its primary category. */
export interface CategoryRow {
  readonly category: Category;
  readonly scenarios: readonly ScenarioRow[];
  /** Scenarios that have it as a secondary category: listed, without covering it. */
  readonly secondary: readonly ScenarioInfo[];
}

/** What the site's pages are made from (task-045): the aggregate, the scenarios' categories, the rules. */
export interface SiteModel {
  readonly campaign: string;
  readonly execution: number;
  readonly model: string;
  /** The baseline first, then by name. */
  readonly arms: readonly string[];
  /** The runs of the campaign's model, and those of the slices, reported apart (T14). */
  readonly runs: number;
  readonly sliceRuns: number;
  readonly categories: readonly CategoryRow[];
  readonly comparisons: readonly Comparison[];
  readonly slices: readonly Group[];
  /** Every run's record, groups' then slices', in the aggregate's order. */
  readonly records: readonly RunRecord[];
}

const runRecord = z.object({
  scenario_hash: z.string(),
  manual: z.object({ sha256: z.string(), tokens: z.number() }).optional(),
  harness: z.object({ tool: z.string(), commit: z.string() }).optional(),
  provides: z.record(z.string(), z.boolean()).optional(),
  arm_digest: z.string().optional(),
});

/** A `Value` (REQ-FMT-07) whose runs' figures are `figure`s. */
const valueOf = <T extends z.ZodType>(figure: T) =>
  z.object({ n: z.number(), runs: z.array(z.string()), values: z.array(figure) });
const tally = valueOf(z.object({ passed: z.number(), total: z.number() }));
const number = valueOf(z.number());

/**
 * A group as far as the site reads it (task-045's second review): every path `readMetric` and the pages
 * read, so that an aggregate of another shape is refused rather than thrown on.
 */
const groupShape = z.object({
  scenario: z.string(),
  version: z.string(),
  arm: z.string(),
  model: z.string(),
  runs: z.array(z.string()),
  n: z.number(),
  losses: z.array(z.object({ run: z.string(), reason: z.string() })),
  metrics: z.object({
    m_q1: z.object({
      final: z.object({ m_q1: tally, suites: z.array(z.object({ id: z.string(), value: tally })) }),
    }),
    holdout: z.union([
      z.object({ scored: z.literal(false) }),
      z.object({ scored: z.literal(true), final: z.object({ m_q1: tally }) }),
    ]),
    cost: z.object({ cost_eur: number }),
    // Absent from an aggregate written before task-035: M-E1 then reads "not measured".
    checks: z
      .array(
        z.object({
          kind: z.string(),
          steps: z.array(
            z.object({ step: z.number(), not_reached: z.array(z.string()), violations: number.optional() }),
          ),
        }),
      )
      .optional(),
    m_d3: z.object({ value: number }).optional(),
    m_f1: z.object({ share: tally }).optional(),
  }),
});

/** One side of a control comparison (task-068): every figure the page prints. */
const side = z.object({ n: z.number(), mean: z.number(), min: z.number(), max: z.number() });

/** What the site needs an aggregate to be before it reads it: its shape, not every value (task-045's review). */
const aggregateShape = z.object({
  aggregate_version: z.number().int(),
  campaign: z.string(),
  execution: z.number().int(),
  model: z.string(),
  groups: z.array(groupShape),
  slices: z.array(groupShape),
  // Absent before task-068: then each harness against its docs control reads "not measured".
  controls: z
    .array(
      z.object({
        scenario: z.string(),
        version: z.string(),
        harness: z.string(),
        control: z.string(),
        metrics: z.array(
          z.union([
            z.object({ metric: z.string(), note: z.string() }),
            z.object({
              metric: z.string(),
              outcome: z.enum(['better', 'worse', 'same']),
              delta: z.number(),
              certainty: z.enum(['beyond variance', 'within variance', 'preliminary']),
              harness: side,
              control: side,
            }),
          ]),
        ),
      }),
    )
    .optional(),
});

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The arms in the site's order: the baseline first, then by name (REQ-NFR-05). */
function armOrder(a: string, b: string): number {
  if (a === b) return 0;
  if (a === BASELINE) return -1;
  if (b === BASELINE) return 1;
  return byCodeUnit(a, b);
}

/**
 * The site's model of the aggregated execution `results/<execution>` in `root` (REQ-CLI-09 as amended in
 * 1.20): it reads `aggregate.json`, each run's `run.json` (its scenario hash, manual, harness and
 * capabilities) and each scenario's `scenario.yaml` under `scenarios/` for its categories; the method page
 * reads the rest (task-046). A scenario missing, or changed since its runs,
 * is refused. It reads nothing else: no oracle file, no hold-out, no transcript. Pure reading.
 */
export function siteModel(root: string, execution: string): Result<SiteModel> {
  const executionDir = join(root, 'results', execution);
  const where = `results/${execution}`;
  if (!existsSync(executionDir)) return fail([{ path: where, message: 'does not exist' }]);
  const file = join(executionDir, AGGREGATE_FILE);
  if (!existsSync(file)) {
    return fail([{ path: where, message: `has no ${AGGREGATE_FILE}: score it first (bench score)` }]);
  }
  const at = `${where}/${AGGREGATE_FILE}`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([{ path: at, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const shape = aggregateShape.safeParse(parsed);
  if (!shape.success) {
    const first = shape.error.issues[0];
    const detail = first === undefined ? '' : `: ${first.path.join('.')} ${first.message}`;
    return fail([{ path: at, message: `is not an aggregate this site reads${detail}` }]);
  }
  if (shape.data.aggregate_version !== AGGREGATE_VERSION) {
    const version = shape.data.aggregate_version;
    return fail([
      { path: at, message: `has aggregate_version ${version}; this site reads version ${AGGREGATE_VERSION}` },
    ]);
  }
  const aggregate = parsed as AggregateFile;

  const all = [...aggregate.groups, ...aggregate.slices];
  const versions = [...new Set(all.map((group) => `${group.scenario}@${group.version}`))].sort(byCodeUnit);
  const scenarios = new Map<string, ScenarioInfo>();
  const records = new Map<string, RunRecord>();
  const issues: Issue[] = [];
  for (const key of versions) {
    const [id, version] = key.split('@') as [string, string];
    const loaded = loadScenario(join(root, 'scenarios'), id, version);
    if (!loaded.ok) {
      const reason = loaded.issues.map((issue) => issue.message).join('; ');
      issues.push({ path: key, message: `cannot be read from scenarios/${id}/${version}: ${reason}` });
      continue;
    }
    const recorded = new Set<string>();
    for (const group of all.filter((candidate) => `${candidate.scenario}@${candidate.version}` === key)) {
      for (const run of group.runs) {
        const record = readRecord(executionDir, run);
        if (!record.ok) return record;
        recorded.add(record.value.scenario_hash);
        records.set(run, {
          run,
          arm: group.arm,
          ...(record.value.manual === undefined ? {} : { manual: record.value.manual }),
          ...(record.value.harness === undefined ? {} : { harness: record.value.harness }),
          ...(record.value.provides === undefined ? {} : { provides: record.value.provides }),
          ...(record.value.arm_digest === undefined ? {} : { armDigest: record.value.arm_digest }),
        });
      }
    }
    const other = [...recorded].filter((hash) => hash !== loaded.value.hash).sort(byCodeUnit);
    if (other.length > 0) {
      issues.push({
        path: key,
        message:
          `scenarios/${id}/${version} (${loaded.value.hash}) differs from the hash its runs recorded ` +
          `(${other.join(', ')}): it changed since they ran`,
      });
      continue;
    }
    scenarios.set(key, {
      id,
      version,
      primary: loaded.value.categories.primary,
      secondary: loaded.value.categories.secondary,
      hash: loaded.value.hash,
    });
  }
  if (issues.length > 0) return fail(issues);

  const groups = aggregate.groups;
  const arms = [...new Set(groups.map((group) => group.arm))].sort(armOrder);
  // A harness arm is one whose runs recorded a harness (REQ-RUN-14): the arms a docs control can be generated from.
  const harnessArms = new Set(
    [...records.values()].flatMap((record) => (record.harness === undefined ? [] : [record.arm])),
  );
  const infos = [...scenarios.values()];
  const comparisons: Comparison[] = [];
  const categories = CATEGORIES.map((category): CategoryRow => {
    const primary = infos.filter((info) => info.primary === category && groups.some((g) => isOf(g, info)));
    const rows = primary.map((info): ScenarioRow => {
      const own = groups.filter((group) => isOf(group, info)).sort((a, b) => armOrder(a.arm, b.arm));
      const map = (CATEGORY_MAP as Partial<Record<Category, readonly MapEntry[]>>)[category] ?? [];
      const metrics = map.map((entry) => {
        const made = metricRow(category, entry, own, arms);
        comparisons.push(...made.comparisons);
        const values = made.row.values.map((value) =>
          harnessArms.has(value.arm) && own.some((group) => group.arm === value.arm)
            ? { ...value, against: againstControl(aggregate.controls, info, value.arm, entry) }
            : value,
        );
        return { ...made.row, values };
      });
      return { scenario: info, metrics, groups: own };
    });
    const secondary = infos.filter((info) => info.secondary.includes(category));
    return { category, scenarios: rows, secondary };
  });

  const count = (list: readonly Group[]) => list.reduce((sum, group) => sum + group.runs.length, 0);
  return ok({
    campaign: aggregate.campaign,
    execution: aggregate.execution,
    model: aggregate.model,
    arms,
    runs: count(groups),
    sliceRuns: count(aggregate.slices),
    categories,
    comparisons,
    slices: aggregate.slices,
    records: all.flatMap((group) => group.runs.flatMap((run) => records.get(run) ?? [])),
  });
}

/** `r2 did not reach step 3; …`: the runs that make M-E1 not comparable. */
function unreachedText(unreached: Figures['unreached']): string {
  return (unreached ?? [])
    .map((entry) => {
      const run = entry.run.split('/').at(-1) ?? entry.run;
      return entry.step === undefined
        ? `${run} was not scored with the directive checks`
        : `${run} did not reach step ${entry.step}`;
    })
    .join('; ');
}

/**
 * One metric of a category's map on one scenario's groups, in every arm, and the comparisons it makes:
 * each arm but the baseline against the baseline. A metric a side lacks is no comparison; one a side
 * cannot compare (M-E1 with a run that did not reach a directive check's step) is none either, and the
 * page says why.
 */
export function metricRow(
  category: Category,
  entry: MapEntry,
  groups: readonly Group[],
  arms: readonly string[],
): { row: MetricRow; comparisons: Comparison[] } {
  const comparisons: Comparison[] = [];
  const base = groups.find((group) => group.arm === BASELINE);
  const baseFigures = base === undefined ? undefined : readMetric(entry.id, base);
  const baseLost = (baseFigures?.unreached ?? []).length > 0;
  const values = arms.map((arm): ArmValue => {
    const group = groups.find((candidate) => candidate.arm === arm);
    const figures = group === undefined ? undefined : readMetric(entry.id, group);
    if (figures === undefined) return { arm };
    if ((figures.unreached ?? []).length > 0) {
      return { arm, note: `not comparable: ${unreachedText(figures.unreached)}` };
    }
    if (figures.values.length === 0) return { arm };
    const summary = summarize(figures);
    if (arm === BASELINE) return { arm, summary };
    if (baseLost) return { arm, summary, note: 'no comparison: the baseline is not comparable' };
    if (baseFigures === undefined || baseFigures.values.length === 0) return { arm, summary };
    const result = compare(entry.better, baseFigures, figures);
    const comparison: Comparison = { category, metric: entry.id, arm, ...result };
    comparisons.push(comparison);
    return { arm, summary: result.other, comparison };
  });
  return { row: { entry, values }, comparisons };
}

function isOf(group: Group, info: ScenarioInfo): boolean {
  return group.scenario === info.id && group.version === info.version;
}

/** What a run recorded in its `run.json`; the run is named by its aggregate name. */
function readRecord(executionDir: string, run: string): Result<z.output<typeof runRecord>> {
  const file = join(executionDir, ...run.split('/').slice(2), 'run.json');
  try {
    const parsed = runRecord.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (parsed.success) return ok(parsed.data);
    return fail([{ path: `${run}/run.json`, message: 'records no scenario_hash' }]);
  } catch (error) {
    return fail([{ path: `${run}/run.json`, message: `cannot be read: ${(error as Error).message}` }]);
  }
}

/** The comparison of `harness` with its docs control on `entry`, for the scenario version `info` (task-068). */
export function againstControl(
  controls: readonly ControlComparison[] | undefined,
  info: { readonly id: string; readonly version: string },
  harness: string,
  entry: MapEntry,
): AgainstControl {
  const found = controls?.find(
    (candidate) =>
      candidate.scenario === info.id && candidate.version === info.version && candidate.harness === harness,
  );
  if (found === undefined) return {};
  const metric = found.metrics.find((candidate) => candidate.metric === entry.id);
  return metric === undefined ? { control: found.control } : { control: found.control, metric };
}
