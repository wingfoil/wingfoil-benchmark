import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

import { canonicalJson, fail, ok, readYamlFile } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';

import { AGGREGATE_FILE, mRAcross, scoredRunsOf } from './aggregate.js';
import type { AggregateFile, Group, MRAcross, MRRun } from './aggregate.js';
import { CATEGORY_MAP, compare, readMetric, summarize } from './compare.js';
import type { Certainty, MappedCategory, MetricId } from './compare.js';
import { DRY_RUNS } from './dry-runs.js';
import { readExecutionRecord } from './execution.js';

/** The version of the comparison file's shape (REQ-CLI-12). */
/** 2 from task-094: `m_r_across` (REQ-SCO-13 as amended in 1.32). */
export const COMPARISON_VERSION = 2;

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
export interface ComparisonRow {
  readonly scenario: string;
  readonly version: string;
  readonly category: string;
  readonly arm: string;
  /** The groups' model; `<earlier> → <newer>` for a cross-model default row. */
  readonly model: string;
  readonly metric: MetricId;
  /** The default groups of two executions on different default models (T14); never a slice. */
  readonly cross_model: boolean;
  readonly earlier: ComparedSide | NotedSide;
  readonly newer: ComparedSide | NotedSide;
  /** The newer delta less the earlier (T7): only when both sides have a delta. */
  readonly change?: number;
}

/**
 * A side without a delta, and why — `no baseline`, `not measured`, or M-E1's `not comparable: …` and `no comparison:
 * the baseline is not comparable`, in the site's words — with the arm's own value when it has one.
 */
export interface NotedSide {
  readonly note: string;
  readonly arm?: ComparedValue;
}

/**
 * A group that is not compared, and why: a scenario version in both whose hash differs, whose category has no map or
 * cannot be read; or a slice whose model the other execution has no slice of.
 */
export interface NotCompared {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly reason: string;
}

/** A group present in one execution only, of the default model or of a slice. */
export interface OnlyIn {
  readonly execution: string;
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
}

/** A group compared, the baseline's included: its model, or `<earlier> → <newer>` for a cross-model default group. */
export interface ComparedGroup {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
}

/**
 * M-R1–M-R3 across the two executions for one matched group (REQ-SCO-07 and REQ-SCO-13 as amended in 1.32): its model,
 * or `<earlier> → <newer>` for a cross-model default group.
 */
export interface AcrossGroup extends Partial<MRAcross> {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  /** Why there is no value: a side whose runs' scores cannot be read (the rows need only the aggregates). */
  readonly note?: string;
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
  /** Every group compared, the baselines' included: what `rows` compares each arm against. */
  readonly compared: readonly ComparedGroup[];
  readonly rows: readonly ComparisonRow[];
  /** Each matched group's M-R across the two executions (1.32): the agent may be the pin that varies. */
  readonly m_r_across: readonly AcrossGroup[];
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
  /** The scored runs, or why they cannot be read: the rows read the aggregate only, the across-agent M-R these. */
  readonly runs: readonly MRRun[] | { readonly unreadable: string };
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
  // What a target is, before anything is read; then one execution twice, said once.
  const invalid = [earlier, newer].map(targetIssue).filter((issue) => issue !== undefined);
  if (invalid.length > 0) return fail(invalid);
  if (earlier === newer) return fail([{ path: earlier, message: 'is the same execution twice' }]);
  const issues: Issue[] = [];
  const sides = [earlier, newer].map((target) => {
    const read = readSide(root, target);
    if (!read.ok) issues.push(...read.issues);
    return read.ok ? read.value : undefined;
  });
  const [before, after] = sides;
  if (issues.length > 0 || before === undefined || after === undefined) return fail(issues);

  const out: Collected = { rows: [], notCompared: [], onlyIn: [], compared: [], across: [] };
  const crossModel = before.aggregate.model !== after.aggregate.model;
  const differ = pinsDiffer(before.pins, after.pins);
  const acrossNote = acrossNoteOf(before.pins, after.pins, differ);
  const context = { root, before, after, primaryOf, out, ...(acrossNote === undefined ? {} : { acrossNote }) };
  compareGroups(context, before.aggregate.groups, after.aggregate.groups, crossModel);
  // Each slice against the other side's slice of its model (REQ-SCO-13), or said not to be compared.
  const models = (groups: readonly Group[]) => new Set(groups.map((group) => group.model));
  const beforeModels = models(before.aggregate.slices);
  const afterModels = models(after.aggregate.slices);
  for (const model of [...new Set([...beforeModels, ...afterModels])].sort()) {
    const mine = (side: Side) => side.aggregate.slices.filter((group) => group.model === model);
    if (beforeModels.has(model) && afterModels.has(model)) {
      compareGroups(context, mine(before), mine(after), false);
      continue;
    }
    const [present, absent] = beforeModels.has(model) ? [before, after] : [after, before];
    for (const group of mine(present)) {
      out.notCompared.push({
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
    pins_differ: differ,
    compared: out.compared,
    rows: out.rows,
    m_r_across: out.across,
    not_compared: out.notCompared,
    only_in: out.onlyIn,
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

/** Why `target` names no execution of a campaign, if it does not: a dry run, or not `<campaign-id>/<n>`. */
function targetIssue(target: string): Issue | undefined {
  if (target.startsWith(`${DRY_RUNS}/`)) return { path: target, message: 'a dry run is never compared' };
  if (!TARGET.test(target)) return { path: target, message: 'is not an execution of a campaign: <campaign-id>/<n>' };
  return undefined;
}

/** What a comparison reads of an aggregate: anything else in it is not its business. */
const aggregateShape = z
  .object({
    campaign: z.string(),
    execution: z.number(),
    model: z.string(),
    groups: z.array(z.object({}).loose()),
    slices: z.array(z.object({}).loose()),
  })
  .loose();

/** One execution, read: its aggregate, its campaign file and when it ended; or why it cannot be compared. */
function readSide(root: string, target: string): Result<Side> {
  const dir = join(root, 'results', target);
  const where = `results/${target}`;
  if (!existsSync(dir)) return fail([{ path: where, message: 'does not exist' }]);
  const file = join(dir, AGGREGATE_FILE);
  if (!existsSync(file)) return fail([{ path: where, message: 'is not aggregated: score it first' }]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([{ path: `${where}/${AGGREGATE_FILE}`, message: `cannot be read: ${(error as Error).message}` }]);
  }
  if (!aggregateShape.safeParse(parsed).success) {
    return fail([{ path: `${where}/${AGGREGATE_FILE}`, message: 'is not an aggregate this comparison reads' }]);
  }
  // The pins that differ are listed from it (REQ-SCO-13): a campaign file that cannot be read is refused, never empty.
  const pins = readYamlFile(join(dir, 'campaign.yaml'));
  if (!pins.ok || pins.value === null || typeof pins.value !== 'object') {
    const why = pins.ok ? 'it holds no pins' : pins.issues.map((issue) => issue.message).join('; ');
    return fail([{ path: `${where}/campaign.yaml`, message: `cannot be read: ${why}` }]);
  }
  const record = readExecutionRecord(dir);
  if (!record.ok) return record;
  const ended = record.value?.ended;
  // The scored runs the across-agent M-R reads (1.32): what aggregation read, from the same committed files.
  const scored = scoredRunsOf(dir);
  const runs = scored.ok
    ? scored.value
    : { unreadable: scored.issues.map((issue) => `${where}/${issue.path} ${issue.message}`)[0] ?? where };
  return ok({
    target,
    dir,
    runs,
    aggregate: parsed as AggregateFile,
    pins: pins.value as Record<string, unknown>,
    ...(ended === undefined ? {} : { ended }),
  });
}

interface Collected {
  readonly across: AcrossGroup[];
  readonly rows: ComparisonRow[];
  readonly notCompared: NotCompared[];
  readonly onlyIn: OnlyIn[];
  readonly compared: ComparedGroup[];
}

interface Context {
  /** Why M-R across is not measured for any group of this comparison, if it is not (1.4 §4.5). */
  readonly acrossNote?: string;
  readonly root: string;
  readonly before: Side;
  readonly after: Side;
  readonly primaryOf: PrimaryCategory;
  readonly out: Collected;
}

/**
 * Compare the groups of one model on each side: those in both, by scenario version and arm; the rest listed. A scenario
 * version is compared only when every run of it recorded one hash on each side, the same; and when its primary
 * category has a map of metrics.
 */
function compareGroups(
  context: Context,
  earlierGroups: readonly Group[],
  newerGroups: readonly Group[],
  crossModel: boolean,
): void {
  const { root, before, after, primaryOf, out } = context;
  const key = (group: Group) => `${group.scenario}@${group.version}/${group.arm}`;
  const newerBy = new Map(newerGroups.map((group) => [key(group), group]));
  const earlierBy = new Map(earlierGroups.map((group) => [key(group), group]));
  for (const [side, groups, other] of [
    [before, earlierGroups, newerBy],
    [after, newerGroups, earlierBy],
  ] as const) {
    for (const group of groups) {
      if (!other.has(key(group))) {
        out.onlyIn.push({
          execution: side.target,
          scenario: group.scenario,
          version: group.version,
          arm: group.arm,
          model: group.model,
        });
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
    const notCompared = (reason: string) => {
      for (const group of inBoth) out.notCompared.push({ scenario, version, arm: group.arm, model: group.model, reason });
    };
    const of = (groups: readonly Group[]) =>
      groups.filter((group) => group.scenario === scenario && group.version === version);
    const earlierHashes = hashesOf(root, of(earlierGroups));
    const newerHashes = hashesOf(root, of(newerGroups));
    // One known hash a side, the same: an unknown hash is no evidence that the content is unchanged.
    if (
      earlierHashes.length !== 1 ||
      newerHashes.length !== 1 ||
      earlierHashes[0] !== newerHashes[0] ||
      earlierHashes[0] === 'unknown'
    ) {
      notCompared(
        `not compared: scenario hash ${earlierHashes.join(', ')} in ${before.target}, ` +
          `${newerHashes.join(', ')} in ${after.target}`,
      );
      continue;
    }
    const category = primaryOf(scenario, version);
    if (category === undefined) {
      notCompared(`not compared: scenario ${name} cannot be read from scenarios/`);
      continue;
    }
    const entries = CATEGORY_MAP[category as MappedCategory];
    if (entries === undefined) {
      notCompared(`not compared: category ${category} has no map of metrics`);
      continue;
    }
    for (const group of inBoth) {
      const counterpart = newerBy.get(key(group)) as Group;
      const model = crossModel ? `${group.model} → ${counterpart.model}` : group.model;
      out.compared.push({ scenario, version, arm: group.arm, model });
      const earlierRuns = runsOf(before, group);
      const newerRuns = runsOf(after, counterpart);
      out.across.push({
        scenario,
        version,
        arm: group.arm,
        model,
        ...(context.acrossNote !== undefined
          ? { note: context.acrossNote }
          : 'unreadable' in earlierRuns
          ? { note: `not measured: ${earlierRuns.unreadable}` }
          : 'unreadable' in newerRuns
            ? { note: `not measured: ${newerRuns.unreadable}` }
            : mRAcross(earlierRuns, newerRuns)),
      });
    }
    const earlierBaseline = earlierBy.get(`${name}/baseline`);
    const newerBaseline = newerBy.get(`${name}/baseline`);
    for (const group of inBoth.filter((candidate) => candidate.arm !== 'baseline')) {
      const counterpart = newerBy.get(key(group)) as Group;
      for (const entry of entries) {
        // T7: a delta is taken against the execution's own baseline, or not at all; each side on its own.
        const earlierSide = sideOf(entry.id, entry.better, group, earlierBaseline);
        const newerSide = sideOf(entry.id, entry.better, counterpart, newerBaseline);
        const raw =
          'delta' in earlierSide && 'delta' in newerSide ? newerSide.delta - earlierSide.delta : undefined;
        out.rows.push({
          scenario,
          version,
          category,
          arm: group.arm,
          model: crossModel ? `${group.model} → ${counterpart.model}` : group.model,
          metric: entry.id,
          cross_model: crossModel,
          earlier: earlierSide,
          newer: newerSide,
          ...(raw === undefined ? {} : { change: Math.abs(raw) < EPSILON ? 0 : raw }),
        });
      }
    }
  }
}

/** The scored runs of `group` on `side`, by the names the aggregate lists. */
function runsOf(side: Side, group: Group): MRRun[] | { readonly unreadable: string } {
  if (!Array.isArray(side.runs)) return side.runs as { readonly unreadable: string };
  const names = new Set(group.runs);
  return (side.runs as readonly MRRun[]).filter((run) => names.has(run.name));
}

/**
 * One side of a row: `group` against its own execution's `baseline` on `metric`, by `compare` (REQ-RES-03 as amended);
 * or why there is none, in the site's words — `no baseline`, `not measured`, M-E1's `not comparable: …` when a run
 * did not reach a directive check's step and `no comparison: the baseline is not comparable` when the baseline's did
 * not — with the arm's own value when it has one.
 */
function sideOf(
  metric: MetricId,
  better: 'higher' | 'lower',
  group: Group,
  baseline: Group | undefined,
): ComparedSide | NotedSide {
  const value = ({ n, mean, min, max }: ComparedValue): ComparedValue => ({ n, mean, min, max });
  const armFigures = readMetric(metric, group);
  if (armFigures !== undefined && armFigures.unreached !== undefined && armFigures.unreached.length > 0) {
    const why = armFigures.unreached
      .map((entry) => {
        const run = entry.run.split('/').at(-1) ?? entry.run;
        return entry.step === undefined
          ? `${run} was not scored with the directive checks`
          : `${run} did not reach step ${entry.step}`;
      })
      .join('; ');
    return { note: `not comparable: ${why}` };
  }
  const arm = armFigures === undefined || armFigures.values.length === 0 ? undefined : summarize(armFigures);
  const noted = (note: string): NotedSide => (arm === undefined ? { note } : { note, arm: value(arm) });
  if (baseline === undefined) return noted('no baseline');
  // Once there is a baseline, the arm's own figures first, as the site reads them: an arm not measured is that,
  // whatever its baseline's figures.
  if (arm === undefined) return noted('not measured');
  const baseFigures = readMetric(metric, baseline);
  if (baseFigures !== undefined && baseFigures.unreached !== undefined && baseFigures.unreached.length > 0) {
    return noted('no comparison: the baseline is not comparable');
  }
  if (armFigures === undefined || baseFigures === undefined) return noted('not measured');
  if (armFigures.values.length === 0 || baseFigures.values.length === 0) return noted('not measured');
  const result = compare(better, baseFigures, armFigures);
  return {
    arm: value(result.other),
    baseline: value(result.baseline),
    delta: result.delta,
    certainty: result.certainty,
  };
}

/**
 * Every scenario hash the runs of `groups` recorded (REQ-FMT-09), sorted, once each; `unknown` for a run whose record
 * cannot be read or names none.
 */
function hashesOf(root: string, groups: readonly Group[]): string[] {
  const hashes = new Set<string>();
  for (const run of groups.flatMap((group) => group.runs)) {
    let hash: string | undefined;
    try {
      const record = JSON.parse(readFileSync(join(root, 'results', run, 'run.json'), 'utf8')) as {
        scenario_hash?: unknown;
      };
      hash = typeof record.scenario_hash === 'string' ? record.scenario_hash : undefined;
    } catch {
      hash = undefined;
    }
    hashes.add(hash ?? 'unknown');
  }
  return [...hashes].sort();
}

/** A value of a campaign file at `path`, as a string a person reads; `none` when absent. */
function pinAt(pins: Record<string, unknown>, path: readonly string[]): string {
  let node: unknown = pins;
  for (const key of path) node = node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined;
  if (node === undefined || node === null) return 'none';
  // The slices' models, in the file's order.
  if (Array.isArray(node)) {
    return node.map((slice) => String((slice as { model?: unknown }).model ?? '')).join(', ') || 'none';
  }
  if (typeof node === 'object') {
    const { tool, version, commit } = node as { tool?: unknown; version?: unknown; commit?: unknown };
    return [tool, version, commit].filter((part) => part !== undefined).map(String).join(' ');
  }
  return String(node);
}

/** The pins that differ (REQ-SCO-13): the default model, the agent, each model's effort and each arm's harness. */
/**
 * Why M-R across is not measured, if it is not (experiment design 1.4 §4.5): it is across two agents, so the agent's
 * name must differ; the agent's pins and the models it runs may differ, and so may the scenarios a campaign lists and
 * their repetitions, which only select the groups; the harnesses, the arms' digests, the caps and the approver
 * policy, which shape a run, may not.
 */
function acrossNoteOf(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  differ: readonly PinDiffers[],
): string | undefined {
  const agentName = (pins: Record<string, unknown>) => pinAt(pins, ['agent', 'name']);
  if (agentName(before) === agentName(after)) return `not measured: the same agent, ${agentName(after)}, on both sides`;
  const others = [
    ...differ.map((d) => d.pin).filter((pin) => !pin.startsWith('agent.') && !pin.startsWith('models.')),
    ...['caps', 'approver_policy'].filter((key) => canonicalJson(before[key] ?? null) !== canonicalJson(after[key] ?? null)),
  ];
  return others.length === 0 ? undefined : `not measured: pins other than the agent's differ: ${others.join(', ')}`;
}

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
    ['models', 'slices'],
    ['agent', 'name'],
    ['agent', 'version'],
    ...union(effortModels(before), effortModels(after)).map((model) => ['agent', 'effort', model]),
    ...union(keysOf(before, 'harnesses'), keysOf(after, 'harnesses')).map((arm) => ['harnesses', arm]),
    // An arm's files (REQ-FMT-13): a docs control or the baseline has no harness, and changes through its digest.
    ...union(keysOf(before, 'arm_digests'), keysOf(after, 'arm_digests')).map((arm) => ['arm_digests', arm]),
  ];
  return paths.flatMap((path) => {
    const [earlier, newer] = [pinAt(before, path), pinAt(after, path)];
    return earlier === newer ? [] : [{ pin: path.join('.'), earlier, newer }];
  });
}
