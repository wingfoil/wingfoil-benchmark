import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { fail, ok, readYamlFile } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';

import { AGGREGATE_FILE } from './aggregate.js';
import type { AggregateFile, Group } from './aggregate.js';
import { CATEGORY_MAP, certaintyOf, readMetric, summarize } from './compare.js';
import type { Certainty, MappedCategory, MetricId } from './compare.js';
import { DRY_RUNS } from './dry-runs.js';
import { readExecutionRecord } from './execution.js';

/** The version of the comparison file's shape (REQ-CLI-12). */
export const COMPARISON_VERSION = 1;

/** Where comparisons are written, under `results/` (REQ-CLI-12). */
export const COMPARISONS = 'comparisons';

/** One side of a compared group: an execution's own value of a metric. */
export interface ComparedValue {
  readonly n: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
}

/** One side of a compared row: the arm's and its baseline's values, the arm's delta and its certainty (REQ-RES-03). */
export interface ComparedSide {
  readonly arm: ComparedValue;
  readonly baseline: ComparedValue;
  readonly delta: number;
  readonly certainty: Certainty;
}

/** One row (REQ-SCO-13): a scenario version, an arm and a model, on one metric of its category's map, in both. */
export type ComparisonRow = {
  readonly scenario: string;
  readonly version: string;
  readonly category: string;
  readonly arm: string;
  readonly model: string;
  readonly metric: MetricId;
  /** The default groups of two executions on different default models (T14); never a slice. */
  readonly cross_model: boolean;
} & (
  | { readonly earlier: ComparedSide; readonly newer: ComparedSide; readonly change: number }
  | { readonly note: string }
);

/** A group present in both executions that is not compared, and why. */
export interface NotCompared {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly reason: string;
}

/** A default group present in one execution only. */
export interface OnlyIn {
  readonly execution: string;
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
}

/** A pin whose value differs between the two executions, as their campaign files state it. */
export interface PinDiffers {
  readonly pin: string;
  readonly earlier: string;
  readonly newer: string;
}

/** One execution as the comparison names it. */
export interface ComparedExecution {
  readonly campaign: string;
  readonly execution: number;
  readonly model: string;
  /** When it ended, from its `execution.json` (REQ-FMT-06 as amended); absent for v0.1's. */
  readonly ended?: string;
}

/** Two aggregated executions compared (REQ-SCO-13, REQ-CLI-12): what `results/comparisons/…json` holds. */
export interface CampaignComparison {
  readonly comparison_version: number;
  readonly earlier: ComparedExecution;
  readonly newer: ComparedExecution;
  /** Which came first is the maintainer's order (REQ-CLI-12), recorded as such. */
  readonly order: 'maintainer';
  readonly pins_differ: readonly PinDiffers[];
  readonly rows: readonly ComparisonRow[];
  readonly not_compared: readonly NotCompared[];
  readonly only_in: readonly OnlyIn[];
}

/** A scenario version's primary category, from the repository's scenarios; undefined when it cannot be read. */
export type PrimaryCategory = (id: string, version: string) => string | undefined;

const TARGET = /^([0-9a-f]{12})\/([1-9]\d*)$/;

/** A difference this small is rounding, not a change. */
const EPSILON = 1e-12;

interface Side {
  readonly target: string;
  readonly dir: string;
  readonly aggregate: AggregateFile;
  readonly pins: Record<string, unknown>;
  readonly ended?: string;
}

/**
 * Compare the aggregated campaign executions `earlier` and `newer`, `<campaign-id>/<n>` each, in the maintainer's order
 * (REQ-SCO-13, REQ-CLI-12, task-083): group by group — a scenario version and an arm in both — the default model's
 * groups with each other and each slice with the other side's slice of its model; on each metric of the scenario's
 * primary category's map, each side's arm against its own baseline, and the change of that delta (T7). Groups of a
 * scenario whose hash differs are not compared; pins that differ are listed; default rows on two default models are
 * cross-model (T14). Reads the executions' committed files under `root/results/`, and nothing else.
 */
export function compareExecutions(
  root: string,
  earlier: string,
  newer: string,
  primaryOf: PrimaryCategory,
): Result<CampaignComparison> {
  const issues: Issue[] = [];
  const sides = [earlier, newer].map((target) => {
    const read = readSide(root, target);
    if (!read.ok) issues.push(...read.issues);
    return read.ok ? read.value : undefined;
  });
  if (earlier === newer && TARGET.test(earlier)) issues.push({ path: earlier, message: 'is the same execution twice' });
  const [before, after] = sides;
  if (issues.length > 0 || before === undefined || after === undefined) return fail(issues);

  const rows: ComparisonRow[] = [];
  const notCompared: NotCompared[] = [];
  const onlyIn: OnlyIn[] = [];
  const crossModel = before.aggregate.model !== after.aggregate.model;
  compareGroups(root, before, after, before.aggregate.groups, after.aggregate.groups, crossModel, primaryOf, {
    rows,
    notCompared,
    onlyIn,
  });
  // Each slice against the other side's slice of its model (REQ-SCO-13), or said not to be compared.
  const models = (groups: readonly Group[]) => new Set(groups.map((group) => group.model));
  const beforeModels = models(before.aggregate.slices);
  const afterModels = models(after.aggregate.slices);
  for (const model of [...new Set([...beforeModels, ...afterModels])].sort()) {
    const mine = (side: Side) => side.aggregate.slices.filter((group) => group.model === model);
    if (beforeModels.has(model) && afterModels.has(model)) {
      compareGroups(root, before, after, mine(before), mine(after), false, primaryOf, {
        rows,
        notCompared,
        onlyIn: [],
      });
      continue;
    }
    const [present, absent] = beforeModels.has(model) ? [before, after] : [after, before];
    for (const group of mine(present)) {
      notCompared.push({
        scenario: group.scenario,
        version: group.version,
        arm: group.arm,
        model,
        reason: `not compared: no slice of model ${model} in ${absent.target}`,
      });
    }
  }

  return ok({
    comparison_version: COMPARISON_VERSION,
    earlier: named(before),
    newer: named(after),
    order: 'maintainer',
    pins_differ: pinsDiffer(before.pins, after.pins),
    rows,
    not_compared: notCompared,
    only_in: onlyIn,
  });
}

/** Write `comparison` as `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json` (REQ-CLI-12); returns the file. */
export function writeComparison(root: string, comparison: CampaignComparison): string {
  const { earlier, newer } = comparison;
  const file = join(
    root,
    'results',
    COMPARISONS,
    `${newer.campaign}-${newer.execution}`,
    `${earlier.campaign}-${earlier.execution}.json`,
  );
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(comparison, undefined, 2)}\n`);
  return file;
}

function named(side: Side): ComparedExecution {
  return {
    campaign: side.aggregate.campaign,
    execution: side.aggregate.execution,
    model: side.aggregate.model,
    ...(side.ended === undefined ? {} : { ended: side.ended }),
  };
}

/** One execution, read: its aggregate, its campaign file and when it ended; or why it cannot be compared. */
function readSide(root: string, target: string): Result<Side> {
  if (target.startsWith(`${DRY_RUNS}/`)) return fail([{ path: target, message: 'a dry run is never compared' }]);
  if (!TARGET.test(target)) {
    return fail([{ path: target, message: 'is not an execution of a campaign: <campaign-id>/<n>' }]);
  }
  const dir = join(root, 'results', target);
  const where = `results/${target}`;
  if (!existsSync(dir)) return fail([{ path: where, message: 'does not exist' }]);
  const file = join(dir, AGGREGATE_FILE);
  if (!existsSync(file)) return fail([{ path: where, message: 'is not aggregated: score it first' }]);
  let aggregate: AggregateFile;
  try {
    aggregate = JSON.parse(readFileSync(file, 'utf8')) as AggregateFile;
  } catch (error) {
    return fail([{ path: `${where}/${AGGREGATE_FILE}`, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const pins = readYamlFile(join(dir, 'campaign.yaml'));
  const record = readExecutionRecord(dir);
  const ended = record.ok ? record.value?.ended : undefined;
  return ok({
    target,
    dir,
    aggregate,
    pins: pins.ok && typeof pins.value === 'object' && pins.value !== null ? (pins.value as Record<string, unknown>) : {},
    ...(ended === undefined ? {} : { ended }),
  });
}

interface Collected {
  readonly rows: ComparisonRow[];
  readonly notCompared: NotCompared[];
  readonly onlyIn: OnlyIn[];
}

/** Compare the groups of one model on each side: those in both, by scenario version and arm; the rest listed. */
function compareGroups(
  root: string,
  before: Side,
  after: Side,
  earlierGroups: readonly Group[],
  newerGroups: readonly Group[],
  crossModel: boolean,
  primaryOf: PrimaryCategory,
  out: Collected,
): void {
  const key = (group: Group) => `${group.scenario}@${group.version}/${group.arm}`;
  const newerBy = new Map(newerGroups.map((group) => [key(group), group]));
  const earlierBy = new Map(earlierGroups.map((group) => [key(group), group]));
  for (const [side, groups, other] of [
    [before, earlierGroups, newerBy],
    [after, newerGroups, earlierBy],
  ] as const) {
    for (const group of groups) {
      if (!other.has(key(group))) {
        out.onlyIn.push({ execution: side.target, scenario: group.scenario, version: group.version, arm: group.arm });
      }
    }
  }
  const versions = [...new Set(earlierGroups.map((group) => `${group.scenario}@${group.version}`))];
  for (const name of versions) {
    const [scenario, version] = name.split('@') as [string, string];
    const inBoth = earlierGroups.filter(
      (group) => group.scenario === scenario && group.version === version && newerBy.has(key(group)),
    );
    if (inBoth.length === 0) continue;
    const earlierHash = hashOf(root, inBoth[0] as Group);
    const newerHash = hashOf(root, newerBy.get(key(inBoth[0] as Group)) as Group);
    if (earlierHash !== newerHash) {
      for (const group of inBoth) {
        out.notCompared.push({
          scenario,
          version,
          arm: group.arm,
          model: group.model,
          reason:
            `not compared: scenario hash ${earlierHash ?? 'unknown'} in ${before.target}, ` +
            `${newerHash ?? 'unknown'} in ${after.target}`,
        });
      }
      continue;
    }
    const category = primaryOf(scenario, version) ?? '';
    const entries = CATEGORY_MAP[category as MappedCategory] ?? [];
    const baseline = (groups: ReadonlyMap<string, Group>) => groups.get(`${name}/baseline`);
    const earlierBaseline = baseline(earlierBy);
    const newerBaseline = baseline(newerBy);
    for (const group of inBoth.filter((candidate) => candidate.arm !== 'baseline')) {
      const counterpart = newerBy.get(key(group)) as Group;
      for (const entry of entries) {
        const common = {
          scenario,
          version,
          category,
          arm: group.arm,
          model: group.model,
          metric: entry.id,
          cross_model: crossModel,
        };
        const earlierSide = sideOf(entry.id, entry.better, group, earlierBaseline);
        const newerSide = sideOf(entry.id, entry.better, counterpart, newerBaseline);
        if (earlierSide === undefined || newerSide === undefined) {
          out.rows.push({ ...common, note: 'not measured' });
          continue;
        }
        const raw = newerSide.delta - earlierSide.delta;
        out.rows.push({
          ...common,
          earlier: earlierSide,
          newer: newerSide,
          change: Math.abs(raw) < EPSILON ? 0 : raw,
        });
      }
    }
  }
}

/** One side of a row: `group` against its own execution's `baseline` on `metric`; undefined when not measured. */
function sideOf(
  metric: MetricId,
  better: 'higher' | 'lower',
  group: Group,
  baseline: Group | undefined,
): ComparedSide | undefined {
  if (baseline === undefined) return undefined;
  const armFigures = readMetric(metric, group);
  const baseFigures = readMetric(metric, baseline);
  if (armFigures === undefined || baseFigures === undefined) return undefined;
  if (armFigures.values.length === 0 || baseFigures.values.length === 0) return undefined;
  const arm = summarize(armFigures);
  const base = summarize(baseFigures);
  const raw = arm.mean - base.mean;
  const delta = Math.abs(raw) < EPSILON ? 0 : raw;
  const outcome = delta === 0 ? 'same' : delta > 0 === (better === 'higher') ? 'better' : 'worse';
  const value = ({ n, mean, min, max }: ComparedValue): ComparedValue => ({ n, mean, min, max });
  return { arm: value(arm), baseline: value(base), delta, certainty: certaintyOf(base, arm, outcome) };
}

/** The scenario hash a group's first run recorded (REQ-FMT-09); undefined when it cannot be read. */
function hashOf(root: string, group: Group): string | undefined {
  const [run] = group.runs;
  if (run === undefined) return undefined;
  try {
    const record = JSON.parse(readFileSync(join(root, 'results', run, 'run.json'), 'utf8')) as {
      scenario_hash?: unknown;
    };
    return typeof record.scenario_hash === 'string' ? record.scenario_hash : undefined;
  } catch {
    return undefined;
  }
}

/** A value of a campaign file at `path`, as a string a person reads; `none` when absent. */
function pinAt(pins: Record<string, unknown>, path: readonly string[]): string {
  let node: unknown = pins;
  for (const key of path) node = node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined;
  if (node === undefined || node === null) return 'none';
  if (typeof node === 'object') {
    const { tool, version, commit } = node as { tool?: unknown; version?: unknown; commit?: unknown };
    return [tool, version, commit].filter((part) => part !== undefined).map(String).join(' ');
  }
  return String(node);
}

/** The pins that differ (REQ-SCO-13): the default model, the agent, each model's effort and each arm's harness. */
function pinsDiffer(before: Record<string, unknown>, after: Record<string, unknown>): PinDiffers[] {
  const keysOf = (pins: Record<string, unknown>, at: string) => {
    const node = pins[at];
    return node !== null && typeof node === 'object' ? Object.keys(node) : [];
  };
  const effortModels = (pins: Record<string, unknown>) => {
    const agent = pins.agent;
    const effort = agent !== null && typeof agent === 'object' ? (agent as { effort?: unknown }).effort : undefined;
    return effort !== null && typeof effort === 'object' ? Object.keys(effort) : [];
  };
  const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])].sort();
  const paths: string[][] = [
    ['models', 'default'],
    ['agent', 'name'],
    ['agent', 'version'],
    ...union(effortModels(before), effortModels(after)).map((model) => ['agent', 'effort', model]),
    ...union(keysOf(before, 'harnesses'), keysOf(after, 'harnesses')).map((arm) => ['harnesses', arm]),
  ];
  return paths.flatMap((path) => {
    const [earlier, newer] = [pinAt(before, path), pinAt(after, path)];
    return earlier === newer ? [] : [{ pin: path.join('.'), earlier, newer }];
  });
}
