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
  readonly steps?: readonly { readonly usage?: { readonly costUsd?: unknown } }[];
}

/**
 * The dry run that counts for `key` (task-021 Design): the latest — highest execution — whose run is
 * marked a dry run, **completed**, and ran the version with the key's hash. A failed run did not do
 * the scenario's work, and a run of other content is not this version's cost. `undefined` when none.
 */
export function latestDryRun(resultsRoot: string, key: DryRunKey): DryRunRecord | undefined {
  const root = join(resultsRoot, DRY_RUNS);
  if (!existsSync(root)) return undefined;
  const executions = readdirSync(root)
    .filter((name) => EXECUTION.test(name))
    .map(Number)
    .sort((a, b) => b - a);
  for (const execution of executions) {
    const dir = join(root, String(execution));
    const file = join(dir, 'runs', `${key.id}@${key.version}`, key.arm, key.model, 'r1', 'run.json');
    const run = readRun(file);
    if (run === undefined) continue;
    if (run.dry_run !== true || run.outcome !== 'completed' || run.scenario_hash !== key.hash) continue;
    const stepCostsUsd = (run.steps ?? []).map((step) => numberOf(step.usage?.costUsd));
    const commit = run.harness?.commit;
    return {
      execution,
      dir,
      costUsd: stepCostsUsd.reduce((total, cost) => total + cost, 0),
      stepCostsUsd,
      agent: { name: String(run.agent?.name), version: String(run.agent?.version) },
      ...(typeof commit === 'string' ? { harnessCommit: commit } : {}),
    };
  }
  return undefined;
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
