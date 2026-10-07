import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  const root = join(resultsRoot, DRY_RUNS);
  if (!existsSync(root)) return {};
  const executions = readdirSync(root)
    .filter((name) => EXECUTION.test(name))
    .map(Number)
    .sort((a, b) => b - a);
  let skipped: string | undefined;
  for (const execution of executions) {
    const dir = join(root, String(execution));
    const file = join(dir, 'runs', `${key.id}@${key.version}`, key.arm, key.model, 'r1', 'run.json');
    const run = readRun(file);
    if (run === undefined) continue;
    if (run.dry_run !== true || run.outcome !== 'completed' || run.scenario_hash !== key.hash) continue;
    const ran = typeof run.effort === 'string' ? run.effort : 'none';
    if (ran !== (key.effort ?? 'none')) {
      skipped ??= `dry run ${execution} ran at effort ${ran}`;
      continue;
    }
    const unpriced = unpricedModels(run);
    if (unpriced.length > 0) {
      skipped ??= `dry run ${execution}: its cost was not priced by the agent, ${unpriced.join(', ')}`;
      continue;
    }
    const stepCostsUsd = (run.steps ?? []).map((step) => numberOf(step.usage?.costUsd));
    const commit = run.harness?.commit;
    return {
      record: {
        execution,
        dir,
        costUsd: stepCostsUsd.reduce((total, cost) => total + cost, 0),
        stepCostsUsd,
        agent: { name: String(run.agent?.name), version: String(run.agent?.version) },
        ...(typeof commit === 'string' ? { harnessCommit: commit } : {}),
      },
    };
  }
  return skipped === undefined ? {} : { skipped };
}

/** `<model> (<basis>)` for each model of any step priced at a basis other than `list` (bug-016), sorted. */
function unpricedModels(run: StoredRun): string[] {
  const found = new Set<string>();
  for (const step of run.steps ?? []) {
    for (const [model, usage] of Object.entries(step.models ?? {})) {
      const basis = usage.costBasis;
      if (typeof basis === 'string' && basis !== 'list') found.add(`${model} (${basis})`);
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
