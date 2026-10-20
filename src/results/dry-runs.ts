import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readYamlFile } from '../core/index.js';

/**
 * Where dry runs are stored, under `results/` (REQ-RES-01): numbered like a campaign's executions,
 * and never a campaign's identity, which is 12 hex characters (REQ-FMT-02).
 */
export const DRY_RUNS = 'dry-runs';

/** What a dry-run cost is keyed by (W5 plan-phase decision 2): the version by its hash, the arm, the model. */
export interface DryRunKey {
  readonly id: string;
  readonly version: string;
  readonly hash: string;
  readonly arm: string;
  readonly model: string;
  /** The effort the campaign pins for the model (dl-015); absent, or `none`, matches a dry run that recorded none. */
  readonly effort?: string;
  /**
   * The arm's digest the campaign pins (12 hex, REQ-FMT-13): a dry run that recorded another ran another arm and does
   * not count (task-095); one that recorded none, stored before arm digests, still does.
   */
  readonly armDigest?: string;
  /**
   * The harness the key's arm runs on, as the campaign pins it (an arm that requires one, or the docs control generated
   * from it): a dry run whose stored profile pinned another version of it does not count (task-095 review round 2).
   */
  readonly harness?: { readonly tool: string; readonly pin: HarnessPin };
}

/** A stored dry run: where it is, what it cost per step and in total (USD), and what it ran with. */
export interface DryRunRecord {
  readonly execution: number;
  /** `results/dry-runs/<n>`, the execution's directory. */
  readonly dir: string;
  readonly costUsd: number;
  readonly stepCostsUsd: readonly number[];
  readonly agent: { readonly name: string; readonly version: string };
  /** The harness commit the arm ran, for an arm that requires one. */
  readonly harnessCommit?: string;
}

const EXECUTION = /^[1-9]\d*$/;

/** The part of a dry run's `run.json` its cost is read from. */
interface StoredRun {
  readonly dry_run?: unknown;
  readonly scenario_hash?: unknown;
  readonly outcome?: unknown;
  readonly agent?: { readonly name?: unknown; readonly version?: unknown };
  readonly harness?: { readonly commit?: unknown };
  readonly effort?: unknown;
  readonly arm_digest?: unknown;
  readonly steps?: readonly {
    readonly usage?: { readonly costUsd?: unknown };
    readonly models?: Readonly<Record<string, { readonly costBasis?: unknown }>>;
  }[];
}

/** What {@link findDryRun} found for a key: the dry run that counts, or why the latest candidate did not. */
export interface DryRunLookup {
  readonly record?: DryRunRecord;
  /** For the latest completed dry run of the version that was skipped: `dry run <n> …`, why. */
  readonly skipped?: string;
}

/**
 * The dry run that counts for `key` (task-021 Design): the latest — highest execution — whose run is
 * marked a dry run, **completed**, and ran the version with the key's hash. A failed run did not do
 * the scenario's work, and a run of other content is not this version's cost. `undefined` when none.
 */
export function latestDryRun(resultsRoot: string, key: DryRunKey): DryRunRecord | undefined {
  return findDryRun(resultsRoot, key).record;
}

/**
 * {@link latestDryRun}, with why the latest candidate did not count when none does. A candidate also has to have run
 * at the key's effort (dl-015) and have a cost the agent could price (bug-016): another effort is another measure, and
 * an unpriced cost is not one (task-069).
 */
export function findDryRun(resultsRoot: string, key: DryRunKey): DryRunLookup {
  const { records, skipped } = findDryRuns(resultsRoot, key);
  const [record] = records;
  if (record !== undefined) return { record };
  return skipped === undefined ? {} : { skipped };
}

/** Every dry run that counts for a key (task-081), newest first, and why the newest candidate did not, if it did not. */
export interface DryRunsLookup {
  readonly records: readonly DryRunRecord[];
  /** For the newest completed dry run of the version that was skipped: `dry run <n> …`, why. */
  readonly skipped?: string;
}

/**
 * Every dry run that counts for `key` (REQ-CLI-02 as amended in 1.26, task-081), newest first, by
 * {@link findDryRun}'s rules: marked a dry run, completed, the key's hash, its effort and a priced cost. The model is
 * part of a dry run's path, so a key is never priced from another model's.
 */
export function findDryRuns(resultsRoot: string, key: DryRunKey): DryRunsLookup {
  const root = join(resultsRoot, DRY_RUNS);
  if (!existsSync(root)) return { records: [] };
  const executions = readdirSync(root)
    .filter((name) => EXECUTION.test(name))
    .map(Number)
    .sort((a, b) => b - a);
  const records: DryRunRecord[] = [];
  let skipped: string | undefined;
  for (const execution of executions) {
    const dir = join(root, String(execution));
    const file = join(dir, 'runs', `${key.id}@${key.version}`, key.arm, key.model, 'r1', 'run.json');
    const run = readRun(file);
    if (run === undefined) continue;
    if (run.dry_run !== true || run.outcome !== 'completed' || run.scenario_hash !== key.hash) continue;
    const ran = typeof run.effort === 'string' ? run.effort : 'none';
    if (ran !== (key.effort ?? 'none')) {
      if (records.length === 0) skipped ??= `dry run ${execution} ran at effort ${ran}`;
      continue;
    }
    if (key.armDigest !== undefined && typeof run.arm_digest === 'string' && !run.arm_digest.startsWith(key.armDigest)) {
      if (records.length === 0) {
        skipped ??= `dry run ${execution} ran arm ${key.arm} at digest ${run.arm_digest.slice(0, 12)}, the campaign pins ${key.armDigest}`;
      }
      continue;
    }
    const ranOn = key.harness === undefined ? undefined : profileHarnessPin(dir, key.harness.tool);
    if (key.harness !== undefined && ranOn !== undefined && !samePin(ranOn, key.harness.pin)) {
      if (records.length === 0) {
        skipped ??= `dry run ${execution} ran ${key.harness.tool} ${pinText(ranOn)}, the campaign pins ${pinText(key.harness.pin)}`;
      }
      continue;
    }
    const unpriced = unpricedModels(run);
    if (unpriced.length > 0) {
      if (records.length === 0)
        skipped ??= `dry run ${execution}: its cost was not priced by the agent, ${unpriced.join(', ')}`;
      continue;
    }
    const stepCostsUsd = (run.steps ?? []).map((step) => numberOf(step.usage?.costUsd));
    const commit = run.harness?.commit;
    records.push({
      execution,
      dir,
      costUsd: stepCostsUsd.reduce((total, cost) => total + cost, 0),
      stepCostsUsd,
      agent: { name: String(run.agent?.name), version: String(run.agent?.version) },
      ...(typeof commit === 'string' ? { harnessCommit: commit } : {}),
    });
  }
  return { records, ...(records.length === 0 && skipped !== undefined ? { skipped } : {}) };
}

/** A harness as a campaign or a profile pins it: a version (a release, or a commit), and optionally its full commit. */
export interface HarnessPin {
  readonly version: string;
  readonly commit?: string;
}

/** A pin that names a commit (REQ-FMT-03): 7 to 40 hex characters. */
const COMMIT_PIN = /^[0-9a-f]{7,40}$/;

/**
 * Whether two pins name the same harness (task-095 review round 3): the same version; or commits, of either side's
 * `commit` or of a version that is a commit, one a prefix of the other. A release name and a commit with no shared
 * field are not compared: the pins differ.
 */
function samePin(a: HarnessPin, b: HarnessPin): boolean {
  if (a.version === b.version) return true;
  const commits = (pin: HarnessPin) =>
    [pin.commit, COMMIT_PIN.test(pin.version) ? pin.version : undefined].filter((c): c is string => c !== undefined);
  return commits(a).some((x) => commits(b).some((y) => x.startsWith(y) || y.startsWith(x)));
}

function pinText(pin: HarnessPin): string {
  return pin.commit === undefined ? pin.version : `${pin.version} (${pin.commit.slice(0, 12)})`;
}

/**
 * The harness `tool` as the profile a dry run ran with pinned it (its stored copy, `dry-run.yaml`); undefined when it
 * stored none or pinned no such tool, as a dry run made before profiles were stored, which then counts.
 */
function profileHarnessPin(dir: string, tool: string): HarnessPin | undefined {
  const file = join(dir, 'dry-run.yaml');
  if (!existsSync(file)) return undefined;
  const profile = readYamlFile(file);
  if (!profile.ok || profile.value === null || typeof profile.value !== 'object') return undefined;
  const harnesses = (profile.value as { harnesses?: unknown }).harnesses;
  if (harnesses === null || typeof harnesses !== 'object') return undefined;
  for (const entry of Object.values(harnesses as Record<string, unknown>)) {
    const harness = entry as { tool?: unknown; version?: unknown; commit?: unknown };
    if (harness.tool !== tool || typeof harness.version !== 'string') continue;
    return { version: harness.version, ...(typeof harness.commit === 'string' ? { commit: harness.commit } : {}) };
  }
  return undefined;
}

/** The basis of a cost the benchmark priced itself (Codex, task-094). */
const PRICE_TABLE = 'price-table';

/**
 * `<model> (<basis>)` for each model of any step priced at a basis other than `list` (bug-016), sorted. `price-table`
 * is the benchmark's own pricing from a pinned list-price table (REQ-RUN-09 as amended in 1.32): flagged in the
 * results, but a price, so it does not keep a dry run out of the estimate.
 */
function unpricedModels(run: StoredRun): string[] {
  const found = new Set<string>();
  for (const step of run.steps ?? []) {
    for (const [model, usage] of Object.entries(step.models ?? {})) {
      const basis = usage.costBasis;
      if (typeof basis === 'string' && basis !== 'list' && basis !== PRICE_TABLE) found.add(`${model} (${basis})`);
    }
  }
  return [...found].sort();
}

function readRun(file: string): StoredRun | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as StoredRun;
  } catch {
    return undefined;
  }
}

function numberOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
