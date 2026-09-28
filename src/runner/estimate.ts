import { relative } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { Issue, Result, Scenario } from '../core/index.js';
import { latestDryRun } from '../results/index.js';
import type { DryRunRecord } from '../results/index.js';

import type { CheckedCampaign } from './campaign.js';

/** One key of a campaign — scenario version, arm, model — priced at its dry run (F1.2). */
export interface EstimateLine {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly repetitions: number;
  /** The dry run's cost, in USD, the agent's own figure (REQ-RUN-09). */
  readonly unitUsd: number;
  /** `unitUsd` times the repetitions. */
  readonly costUsd: number;
  readonly dryRun: DryRunRecord;
  /** Where the dry run ran with something other than the campaign pins (task-022 Design). */
  readonly notes: readonly string[];
}

/** A campaign's cost estimate: its lines, and their total in USD and at the campaign's rate in EUR. */
export interface Estimate {
  readonly lines: readonly EstimateLine[];
  readonly totalUsd: number;
  readonly totalEur: number;
  /** The campaign's `currency.usd_to_eur`. */
  readonly rate: number;
}

/** One key the campaign runs, with how many times, and where its scenario is in the campaign. */
export interface CampaignKey {
  readonly index: number;
  readonly scenario: Scenario;
  readonly arm: string;
  readonly model: string;
  readonly repetitions: number;
}

/**
 * The cost estimate of a checked campaign (F1.2, REQ-CLI-02, task-022 Design): every key the campaign
 * file describes — the default model over every scenario × arm with the scenario's repetitions, then
 * each slice over its scenarios × arms with its own — priced at the dry run that counts for it
 * (`latestDryRun`), converted at the campaign's rate. Every key without one is an issue, all at once.
 * Reads files only: no image, no container, no session.
 */
export function estimateCampaign(checked: CheckedCampaign): Result<Estimate> {
  const { campaign } = checked;
  const lines: EstimateLine[] = [];
  const issues: Issue[] = [];
  for (const key of campaignKeys(checked)) {
    const { scenario, arm, model, repetitions } = key;
    const dryRun = latestDryRun(campaign.resultsRoot, {
      id: scenario.id,
      version: scenario.version,
      hash: scenario.hash,
      arm,
      model,
    });
    const name = `${scenario.id}@${scenario.version}`;
    if (dryRun === undefined) {
      issues.push({
        path: `scenarios[${key.index}]`,
        message:
          `${name} has no completed dry run in arm ${arm} on model ${model}: run bench scenario dry-run ` +
          `${name} --arm ${arm} --model ${model} first`,
      });
      continue;
    }
    lines.push({
      scenario: scenario.id,
      version: scenario.version,
      arm,
      model,
      repetitions,
      unitUsd: dryRun.costUsd,
      costUsd: dryRun.costUsd * repetitions,
      dryRun,
      notes: provenance(checked, arm, dryRun),
    });
  }
  if (issues.length > 0) return fail(issues);
  const rate = campaign.spec.currency.usd_to_eur;
  const totalUsd = lines.reduce((total, line) => total + line.costUsd, 0);
  return ok({ lines, totalUsd, totalEur: totalUsd * rate, rate });
}

/** Every key the campaign file describes, in its order: the default model, then each slice. */
export function campaignKeys({ campaign, scenarios }: CheckedCampaign): CampaignKey[] {
  const { spec } = campaign;
  const indexOf = (id: string) => spec.scenarios.findIndex((ref) => ref.id === id);
  const keys: CampaignKey[] = [];
  for (const scenario of scenarios) {
    for (const arm of spec.arms) {
      const repetitions = spec.repetitions[scenario.id] ?? 1;
      keys.push({ index: indexOf(scenario.id), scenario, arm, model: spec.models.default, repetitions });
    }
  }
  for (const slice of spec.models.slices ?? []) {
    for (const scenario of scenarios.filter((loaded) => slice.scenarios.includes(loaded.id))) {
      for (const arm of spec.arms.filter((name) => slice.arms.includes(name))) {
        keys.push({
          index: indexOf(scenario.id),
          scenario,
          arm,
          model: slice.model,
          repetitions: slice.repetitions,
        });
      }
    }
  }
  return keys;
}

/**
 * What the dry run ran with that the campaign does not pin: another agent version, or a harness commit
 * the campaign's commit pin does not name. A harness pinned by a released version cannot be compared
 * with a commit, and is not flagged.
 */
function provenance({ campaign }: CheckedCampaign, arm: string, dryRun: DryRunRecord): string[] {
  const notes: string[] = [];
  const { agent, harnesses } = campaign.spec;
  if (dryRun.agent.name !== agent.name || dryRun.agent.version !== agent.version) {
    const pinned = dryRun.agent.name === agent.name ? agent.version : `${agent.name} ${agent.version}`;
    notes.push(`agent ${dryRun.agent.name} ${dryRun.agent.version}, the campaign pins ${pinned}`);
  }
  const harness = harnesses[arm];
  const pin = harness?.commit ?? harness?.version;
  if (harness !== undefined && pin !== undefined && dryRun.harnessCommit !== undefined && COMMIT.test(pin)) {
    if (!dryRun.harnessCommit.startsWith(pin)) {
      notes.push(`${harness.tool} ${dryRun.harnessCommit.slice(0, 7)}, the campaign pins ${pin}`);
    }
  }
  return notes;
}

/** A pin that names a commit (REQ-FMT-03): 7 to 40 hex characters. */
const COMMIT = /^[0-9a-f]{7,40}$/;

/** A cost in USD as the estimate prints it. */
function usd(value: number): string {
  return `${value.toFixed(4)} USD`;
}

/**
 * The estimate as the commands print it: one line per key, naming its dry run relative to `root` and
 * any difference from the campaign's pins, then the total, in euro, as an API-equivalent cost.
 */
export function formatEstimate(estimate: Estimate, root: string): string[] {
  return [
    ...estimate.lines.map((line) => {
      const source = [relative(root, line.dryRun.dir), ...line.notes].join('; ');
      return (
        `${line.scenario}@${line.version} ${line.arm} ${line.model}: ${usd(line.unitUsd)} × ` +
        `${line.repetitions} = ${usd(line.costUsd)} (${source})`
      );
    }),
    totalLine(estimate.totalUsd, estimate.rate, 'estimate'),
  ];
}

/** `<label>: <USD> USD, <EUR> EUR at <rate> EUR/USD, API-equivalent`, for an estimate or a cost. */
export function totalLine(totalUsd: number, rate: number, label: string): string {
  return `${label}: ${usd(totalUsd)}, ${(totalUsd * rate).toFixed(4)} EUR at ${rate} EUR/USD, API-equivalent`;
}
