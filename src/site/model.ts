import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { CATEGORIES, fail, ok } from '../core/index.js';
import type { Category, Issue, Result } from '../core/index.js';
import { AGGREGATE_FILE } from '../results/index.js';
import type { AggregateFile, Group } from '../results/index.js';
import { loadScenario } from '../scenario/index.js';

import { CATEGORY_MAP, compare, readMetric, summarize } from './rules.js';
import type { Comparison, MapEntry, Summary } from './rules.js';

const BASELINE = 'baseline';

/** A scenario version of the execution, with the categories its `scenario.yaml` gives it. */
export interface ScenarioInfo {
  readonly id: string;
  readonly version: string;
  readonly primary: Category;
  readonly secondary: readonly Category[];
}

/** One arm's value of one metric: its summary and, but for the baseline, its comparison. */
export interface ArmValue {
  readonly arm: string;
  /** Undefined: the group does not measure it, or the arm has no run of the scenario. */
  readonly summary?: Summary;
  readonly comparison?: Comparison;
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
  readonly runs: number;
  readonly categories: readonly CategoryRow[];
  readonly comparisons: readonly Comparison[];
  readonly slices: readonly Group[];
}

const runRecord = z.object({ scenario_hash: z.string() });

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
 * 1.20): it reads `aggregate.json`, each run's `run.json` for its scenario hash, and each scenario's
 * `scenario.yaml` under `scenarios/` for its categories. A scenario missing, or changed since its runs,
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
  let aggregate: AggregateFile;
  try {
    aggregate = JSON.parse(readFileSync(file, 'utf8')) as AggregateFile;
  } catch (error) {
    return fail([
      { path: `${where}/${AGGREGATE_FILE}`, message: `cannot be read: ${(error as Error).message}` },
    ]);
  }

  const all = [...aggregate.groups, ...aggregate.slices];
  const versions = [...new Set(all.map((group) => `${group.scenario}@${group.version}`))].sort(byCodeUnit);
  const scenarios = new Map<string, ScenarioInfo>();
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
    for (const run of all
      .filter((group) => `${group.scenario}@${group.version}` === key)
      .flatMap((g) => g.runs)) {
      const hash = recordedHash(executionDir, run);
      if (!hash.ok) return hash;
      recorded.add(hash.value);
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
    });
  }
  if (issues.length > 0) return fail(issues);

  const groups = aggregate.groups;
  const arms = [...new Set(groups.map((group) => group.arm))].sort(armOrder);
  const infos = [...scenarios.values()];
  const comparisons: Comparison[] = [];
  const categories = CATEGORIES.map((category): CategoryRow => {
    const primary = infos.filter((info) => info.primary === category && groups.some((g) => isOf(g, info)));
    const rows = primary.map((info): ScenarioRow => {
      const own = groups.filter((group) => isOf(group, info)).sort((a, b) => armOrder(a.arm, b.arm));
      const map = (CATEGORY_MAP as Partial<Record<Category, readonly MapEntry[]>>)[category] ?? [];
      const metrics = map.map((entry): MetricRow => {
        const base = own.find((group) => group.arm === BASELINE);
        const baseFigures = base === undefined ? undefined : readMetric(entry.id, base);
        const values = arms.map((arm): ArmValue => {
          const group = own.find((candidate) => candidate.arm === arm);
          const figures = group === undefined ? undefined : readMetric(entry.id, group);
          if (figures === undefined || figures.values.length === 0) return { arm };
          if (arm === BASELINE || baseFigures === undefined || baseFigures.values.length === 0) {
            return { arm, summary: summarize(figures) };
          }
          const result = compare(entry.better, baseFigures, figures);
          const comparison: Comparison = { category, metric: entry.id, arm, ...result };
          comparisons.push(comparison);
          return { arm, summary: result.other, comparison };
        });
        return { entry, values };
      });
      return { scenario: info, metrics, groups: own };
    });
    const secondary = infos.filter((info) => info.secondary.includes(category));
    return { category, scenarios: rows, secondary };
  });

  return ok({
    campaign: aggregate.campaign,
    execution: aggregate.execution,
    model: aggregate.model,
    arms,
    runs: all.reduce((sum, group) => sum + group.runs.length, 0),
    categories,
    comparisons,
    slices: aggregate.slices,
  });
}

function isOf(group: Group, info: ScenarioInfo): boolean {
  return group.scenario === info.id && group.version === info.version;
}

/** The scenario hash a run recorded in its `run.json`; the run is named by its aggregate name. */
function recordedHash(executionDir: string, run: string): Result<string> {
  const file = join(executionDir, ...run.split('/').slice(2), 'run.json');
  try {
    const parsed = runRecord.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (parsed.success) return ok(parsed.data.scenario_hash);
    return fail([{ path: `${run}/run.json`, message: 'records no scenario_hash' }]);
  } catch (error) {
    return fail([{ path: `${run}/run.json`, message: `cannot be read: ${(error as Error).message}` }]);
  }
}
