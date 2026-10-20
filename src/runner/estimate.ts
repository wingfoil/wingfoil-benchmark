import { relative } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { Issue, Result, Scenario } from '../core/index.js';
import { findDryRuns } from '../results/index.js';
import type { DryRunRecord } from '../results/index.js';

import type { CheckedCampaign } from './campaign.js';

/**
 * One key of a campaign — scenario version, arm, model — priced at its dry runs (F1.2, REQ-CLI-02 as amended in 1.26):
 * the lowest, the mean and the highest of them, per run, and those times the repetitions.
 */
export interface EstimateLine {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly repetitions: number;
  /** The lowest, the mean and the highest dry run's cost, in USD, the agent's own figures (REQ-RUN-09). */
  readonly unit: { readonly lowUsd: number; readonly meanUsd: number; readonly highUsd: number };
  /** Those times the repetitions. */
  readonly lowUsd: number;
  readonly meanUsd: number;
  readonly highUsd: number;
  /** Whether the high figure is the one dry run's plus {@link ESTIMATE_MARGIN} (task-081). */
  readonly margin: boolean;
  /** The dry runs it is priced at, newest first. */
  readonly dryRuns: readonly DryRunRecord[];
  /** Where the newest dry run ran with something other than the campaign pins (task-022 Design). */
  readonly notes: readonly string[];
}

/**
 * A campaign's cost estimate (REQ-CLI-02 as amended): its lines, their low, mean and high totals in USD, the high total
 * at the campaign's rate in EUR — the figure the budget guard reads — and the rate.
 */
export interface Estimate {
  readonly lines: readonly EstimateLine[];
  readonly lowUsd: number;
  readonly meanUsd: number;
  readonly highUsd: number;
  readonly highEur: number;
  /** The campaign's `currency.usd_to_eur`. */
  readonly rate: number;
}

/** The margin added to a key priced at a single dry run (REQ-CLI-02 as amended in 1.26, dl-012): 35 %. */
export const ESTIMATE_MARGIN = 0.35;

/** One key the campaign runs, with how many times, and where its scenario is in the campaign. */
export interface CampaignKey {
  readonly index: number;
  readonly scenario: Scenario;
  readonly arm: string;
  readonly model: string;
  readonly repetitions: number;
}

/** A key's name in a map of what is left to run: `<scenario>@<version>/<arm>/<model>`. */
export function keyName(key: { scenario: Scenario; arm: string; model: string }): string {
  return `${key.scenario.id}@${key.scenario.version}/${key.arm}/${key.model}`;
}

/**
 * The cost estimate of a checked campaign (F1.2, REQ-CLI-02 as amended in 1.26, task-022 and task-081 Designs): every
 * key the campaign file describes — the default model over every scenario × arm with the scenario's repetitions, then
 * each slice over its scenarios × arms with its own — priced at every dry run that counts for it (`findDryRuns`):
 * their lowest, mean and highest cost, and with a single dry run its cost plus {@link ESTIMATE_MARGIN} as the highest.
 * With `left`, only what is left to run, by {@link keyName}: a key with nothing left needs no dry run. Every key
 * without one is an issue, all at once. Reads files only: no image, no container, no session.
 */
export function estimateCampaign(
  checked: CheckedCampaign,
  left?: ReadonlyMap<string, number>,
): Result<Estimate> {
  const { campaign } = checked;
  const lines: EstimateLine[] = [];
  const issues: Issue[] = [];
  for (const key of campaignKeys(checked)) {
    const { scenario, arm, model } = key;
    const repetitions = left === undefined ? key.repetitions : (left.get(keyName(key)) ?? 0);
    if (repetitions === 0) continue;
    const effort = campaign.spec.agent.effort?.[model];
    const lookup = findDryRuns(campaign.resultsRoot, {
      id: scenario.id,
      version: scenario.version,
      hash: scenario.hash,
      arm,
      model,
      ...(effort === undefined ? {} : { effort }),
      // A dry run of another version of the arm prices nothing here (task-095: the bridge's arm and the reference's).
      ...(campaign.spec.arm_digests?.[arm] === undefined
        ? {}
        : { armDigest: campaign.spec.arm_digests[arm] }),
    });
    const [newest] = lookup.records;
    const name = `${scenario.id}@${scenario.version}`;
    if (newest === undefined) {
      issues.push({
        path: `scenarios[${key.index}]`,
        message:
          `${name} has no completed dry run in arm ${arm} on model ${model}` +
          `${effort === undefined ? '' : ` at effort ${effort}`}: run bench scenario dry-run ` +
          `${name} --arm ${arm} --model ${model} first` +
          (lookup.skipped === undefined ? '' : ` (${lookup.skipped})`),
      });
      continue;
    }
    const costs = lookup.records.map((record) => record.costUsd);
    const margin = costs.length === 1;
    const lowUsd = Math.min(...costs);
    const meanUsd = costs.reduce((total, cost) => total + cost, 0) / costs.length;
    const highUsd = margin ? newest.costUsd * (1 + ESTIMATE_MARGIN) : Math.max(...costs);
    lines.push({
      scenario: scenario.id,
      version: scenario.version,
      arm,
      model,
      repetitions,
      unit: { lowUsd, meanUsd, highUsd },
      lowUsd: lowUsd * repetitions,
      meanUsd: meanUsd * repetitions,
      highUsd: highUsd * repetitions,
      margin,
      dryRuns: lookup.records,
      notes: provenance(checked, arm, newest),
    });
  }
  if (issues.length > 0) return fail(issues);
  const rate = campaign.spec.currency.usd_to_eur;
  const sum = (pick: (line: EstimateLine) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const highUsd = sum((line) => line.highUsd);
  return ok({
    lines,
    lowUsd: sum((line) => line.lowUsd),
    meanUsd: sum((line) => line.meanUsd),
    highUsd,
    highEur: highUsd * rate,
    rate,
  });
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
 * The estimate as the commands print it (REQ-CLI-02 as amended): one line per key — its range, or its one dry run and
 * the margin, times the repetitions — naming its dry runs relative to `root` and any difference from the campaign's
 * pins, then the totals, the high one in euro, as an API-equivalent cost.
 */
export function formatEstimate(estimate: Estimate, root: string): string[] {
  return [
    ...estimate.lines.map((line) => {
      const { unit } = line;
      const runs = line.dryRuns.length;
      const source = [
        `${runs} dry run${runs === 1 ? '' : 's'}: ${line.dryRuns.map((run) => relative(root, run.dir)).join(', ')}`,
        ...line.notes,
      ].join('; ');
      const priced = line.margin
        ? `${usd(unit.lowUsd)} + ${ESTIMATE_MARGIN * 100} % margin = ${usd(unit.highUsd)}`
        : `low ${unit.lowUsd.toFixed(4)}, mean ${unit.meanUsd.toFixed(4)}, high ${usd(unit.highUsd)}`;
      return (
        `${line.scenario}@${line.version} ${line.arm} ${line.model}: ${priced} × ${line.repetitions} = ` +
        `${usd(line.highUsd)} (${source})`
      );
    }),
    `estimate: low ${estimate.lowUsd.toFixed(4)}, mean ${estimate.meanUsd.toFixed(4)}, high ${usd(estimate.highUsd)}; ` +
      `high ${estimate.highEur.toFixed(4)} EUR at ${estimate.rate} EUR/USD, API-equivalent`,
  ];
}

/**
 * The budget guard's figure (REQ-CLI-02 and REQ-CLI-03 as amended): what every execution of the campaign spent plus
 * the high estimate of what is left, in EUR.
 */
export function guardFigure(
  spentEur: number,
  estimate: Estimate,
): { readonly text: string; readonly eur: number } {
  const eur = spentEur + estimate.highEur;
  return { text: `${spentEur.toFixed(4)} + ${estimate.highEur.toFixed(4)} = ${eur.toFixed(4)} EUR`, eur };
}

/** `<label>: <USD> USD, <EUR> EUR at <rate> EUR/USD, API-equivalent`, for an estimate or a cost. */
export function totalLine(totalUsd: number, rate: number, label: string): string {
  return `${label}: ${usd(totalUsd)}, ${(totalUsd * rate).toFixed(4)} EUR at ${rate} EUR/USD, API-equivalent`;
}
