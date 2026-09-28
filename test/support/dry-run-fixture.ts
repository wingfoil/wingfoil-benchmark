import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

import { nextExecution } from '../../src/results/index.js';
import { campaignKeys, checkCampaign } from '../../src/runner/index.js';

/** A dry-run profile (task-021) for the fake agent, with a currency rate that shows in the output. */
export function dryRunProfileYaml(): Record<string, unknown> {
  return {
    harnesses: { wingfoil: { tool: 'wingfoil', version: '3df305e' } },
    agent: { name: 'fake', version: '1.0.0' },
    models: { default: 'fake-model' },
    approver_policy: 'v1',
    caps: { step_time_s: 60, step_tokens: 1000, run_cost_eur: 1 },
    currency: { usd_to_eur: 0.5 },
  };
}

/** Write `scenarios/dry-run.yaml` under `root` (a string verbatim). */
export function writeDryRunProfile(
  root: string,
  yaml: Record<string, unknown> | string = dryRunProfileYaml(),
): string {
  const file = join(root, 'scenarios', 'dry-run.yaml');
  writeFileSync(file, typeof yaml === 'string' ? yaml : stringify(yaml));
  return file;
}

/** What a stored dry run holds, for a test that needs one without running it. */
export interface StoredDryRun {
  readonly id?: string;
  readonly version?: string;
  readonly hash: string;
  readonly arm: string;
  readonly model?: string;
  readonly stepCostsUsd: readonly number[];
  readonly outcome?: string;
  readonly agent?: { readonly name: string; readonly version: string };
  readonly harnessCommit?: string;
}

/**
 * Write the `run.json` a dry run stores (task-021) at `results/dry-runs/<execution>/runs/…/r1/` under
 * `root`, and return the execution's directory.
 */
export function writeStoredDryRun(root: string, execution: number, run: StoredDryRun): string {
  const id = run.id ?? 'T3';
  const version = run.version ?? '1.0';
  const model = run.model ?? 'fake-model';
  const executionDir = join(root, 'results', 'dry-runs', String(execution));
  const dir = join(executionDir, 'runs', `${id}@${version}`, run.arm, model, 'r1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'run.json'),
    JSON.stringify({
      dry_run: true,
      scenario: id,
      version,
      scenario_hash: run.hash,
      arm: run.arm,
      model,
      repetition: 1,
      agent: run.agent ?? { name: 'fake', version: '1.0.0' },
      ...(run.harnessCommit === undefined
        ? {}
        : { harness: { tool: 'wingfoil', commit: run.harnessCommit } }),
      outcome: run.outcome ?? 'completed',
      steps: run.stepCostsUsd.map((costUsd, index) => ({ n: index + 1, usage: { costUsd } })),
    }),
  );
  return executionDir;
}

/**
 * Store a completed dry run, at `usd` per run, for every key the campaign in `file` runs — its default
 * model and its slices (task-022's keys) — so that `campaign run` can estimate it (task-023). A campaign
 * that does not check is left alone: the test is about that.
 */
export function priceCampaign(file: string, usd = 0): void {
  const checked = checkCampaign(file);
  if (!checked.ok) return;
  const { repoRoot, resultsRoot, spec } = checked.value.campaign;
  let execution = nextExecution(resultsRoot, 'dry-runs');
  for (const { scenario, arm, model } of campaignKeys(checked.value)) {
    writeStoredDryRun(repoRoot, execution, {
      id: scenario.id,
      version: scenario.version,
      hash: scenario.hash,
      arm,
      model,
      stepCostsUsd: [usd],
      agent: spec.agent,
    });
    execution += 1;
  }
}
