import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { z } from 'zod';

import { fail, ok } from '../core/index.js';
import type { Result } from '../core/index.js';

/** An execution's record, beside its `campaign.yaml` (REQ-FMT-06 as amended, task-079). */
export const EXECUTION_FILE = 'execution.json';

/** The aggregate's file name, as `aggregate.ts` writes it: an execution that has one is aggregated. */
const AGGREGATE = 'aggregate.json';

/** Why an execution stopped starting runs (REQ-RUN-19). `error`: the execution itself could not go on. */
export type StopReason = 'interrupt' | 'quota' | 'ceiling' | 'fail_fast' | 'error';

/**
 * An execution's record (REQ-FMT-06 as amended, task-079, task-080), in the order it is written: its state, why it
 * stopped, when it started, each resume, when it ended, and whether the maintainer declared it final (REQ-CLI-06).
 */
export interface ExecutionRecord {
  readonly state: 'running' | 'stopped' | 'completed';
  readonly reason?: StopReason;
  readonly detail?: string;
  readonly started: string;
  readonly resumed?: readonly string[];
  readonly ended?: string;
  readonly final?: true;
}

const recordSchema = z.object({
  state: z.enum(['running', 'stopped', 'completed']),
  reason: z.enum(['interrupt', 'quota', 'ceiling', 'fail_fast', 'error']).optional(),
  detail: z.string().optional(),
  started: z.string(),
  resumed: z.array(z.string()).optional(),
  ended: z.string().optional(),
  final: z.literal(true).optional(),
});

/** The record of the execution in `executionDir`; undefined when it has none, as v0.1's executions. */
export function readExecutionRecord(executionDir: string): Result<ExecutionRecord | undefined> {
  const file = join(executionDir, EXECUTION_FILE);
  if (!existsSync(file)) return ok(undefined);
  try {
    const parsed = recordSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (parsed.success) return ok(parsed.data as ExecutionRecord);
    return fail([{ path: labelOf(executionDir), message: `has an ${EXECUTION_FILE} that cannot be read` }]);
  } catch (error) {
    return fail([{ path: labelOf(executionDir), message: `${EXECUTION_FILE}: ${(error as Error).message}` }]);
  }
}

/** Write `record` as the execution's own, its fields in their order. */
export function writeExecutionRecord(executionDir: string, record: ExecutionRecord): void {
  const { state, reason, detail, started, resumed, ended, final } = record;
  const ordered = {
    state,
    ...(reason === undefined ? {} : { reason }),
    ...(detail === undefined ? {} : { detail }),
    started,
    ...(resumed === undefined ? {} : { resumed }),
    ...(ended === undefined ? {} : { ended }),
    ...(final === undefined ? {} : { final }),
  };
  writeFileSync(join(executionDir, EXECUTION_FILE), `${JSON.stringify(ordered, undefined, 2)}\n`);
}

/**
 * Whether the execution in `executionDir` can be resumed (REQ-RUN-19, task-080): it exists, records its state, and is
 * not aggregated — no `aggregate.json`, and not declared final.
 */
export function executionResumable(executionDir: string): Result<ExecutionRecord> {
  const label = labelOf(executionDir);
  if (!existsSync(executionDir)) return fail([{ path: label, message: 'does not exist: there is nothing to resume' }]);
  const record = readExecutionRecord(executionDir);
  if (!record.ok) return record;
  if (record.value === undefined) {
    return fail([
      {
        path: label,
        message: `has no ${EXECUTION_FILE}: an execution from before v0.2 records no state, and cannot be resumed`,
      },
    ]);
  }
  if (existsSync(join(executionDir, AGGREGATE)) || record.value.final === true) {
    return fail([
      { path: label, message: 'is already aggregated: a resume would change results already published' },
    ]);
  }
  return ok(record.value);
}

/** `results/<campaign-id>/<n>`, from the execution's directory. */
function labelOf(executionDir: string): string {
  return `results/${basename(dirname(executionDir))}/${basename(executionDir)}`;
}

/** What `plannedRuns` reads of a campaign file: the fields that say which runs it plans. */
const planSchema = z.object({
  scenarios: z.array(z.object({ id: z.string(), version: z.coerce.string() })),
  arms: z.array(z.string()),
  repetitions: z.record(z.string(), z.number()),
  models: z.object({
    default: z.string(),
    slices: z
      .array(
        z.object({
          model: z.string(),
          scenarios: z.array(z.string()),
          arms: z.array(z.string()),
          repetitions: z.number(),
        }),
      )
      .optional(),
  }),
});

/**
 * Every run a campaign file plans, by name — `<scenario>@<version>/<arm>/<model>/r<k>` — as the runner plans them
 * (task-025): the default model over every scenario × arm in its repetitions, then each slice over its own. Undefined
 * for a file that does not say which runs it plans.
 */
export function plannedRuns(campaign: unknown): string[] | undefined {
  const parsed = planSchema.safeParse(campaign);
  if (!parsed.success) return undefined;
  const { scenarios, arms, repetitions, models } = parsed.data;
  const names: string[] = [];
  const add = (scenario: { id: string; version: string }, arm: string, model: string, times: number) => {
    for (let k = 1; k <= times; k += 1) names.push(`${scenario.id}@${scenario.version}/${arm}/${model}/r${k}`);
  };
  for (const scenario of scenarios) {
    for (const arm of arms) add(scenario, arm, models.default, repetitions[scenario.id] ?? 1);
  }
  for (const slice of models.slices ?? []) {
    for (const scenario of scenarios.filter((candidate) => slice.scenarios.includes(candidate.id))) {
      for (const arm of arms.filter((candidate) => slice.arms.includes(candidate))) {
        add(scenario, arm, slice.model, slice.repetitions);
      }
    }
  }
  return names;
}

/**
 * What every execution of campaign `campaignId` spent, in EUR at `usdToEur` (REQ-CLI-02 as amended in 1.26, task-081):
 * the sum of {@link executionSpendingEur} over `results/<campaign-id>/<n>/`.
 */
export function campaignSpendingEur(resultsRoot: string, campaignId: string, usdToEur: number): number {
  const root = join(resultsRoot, campaignId);
  if (!existsSync(root)) return 0;
  return readdirSync(root)
    .filter((name) => /^[1-9]\d*$/.test(name))
    .reduce((total, name) => total + executionSpendingEur(join(root, name), usdToEur), 0);
}

/**
 * What the runs recorded in the execution `executionDir` spent, in EUR, every earlier attempt included (task-080,
 * task-081): each step at what it reported, or at its bound when it was killed before reporting, as the runner counts
 * it (task-024). A `run.json` that cannot be read is an error naming it.
 */
export function executionSpendingEur(executionDir: string, usdToEur: number): number {
  const runsDir = join(executionDir, 'runs');
  if (!existsSync(runsDir)) return 0;
  let total = 0;
  for (const entry of readdirSync(runsDir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || entry.name !== 'run.json') continue;
    const file = join(entry.parentPath, entry.name);
    let run: { steps?: { usage?: { costEur?: unknown }; cost_bound_usd?: unknown }[] };
    const unreadable = (reason: string, cause?: unknown) =>
      new Error(`${relative(dirname(dirname(executionDir)), file)} cannot be read: ${reason}`, { cause });
    try {
      run = JSON.parse(readFileSync(file, 'utf8')) as typeof run;
    } catch (error) {
      throw unreadable((error as Error).message, error);
    }
    // A record that parses to anything but an object is no record either (task-081's review).
    if (run === null || typeof run !== 'object') throw unreadable('it is not a run record');
    for (const step of run.steps ?? []) {
      const reported = typeof step.usage?.costEur === 'number' ? step.usage.costEur : 0;
      const bound = typeof step.cost_bound_usd === 'number' ? step.cost_bound_usd * usdToEur : 0;
      total += Math.max(reported, bound);
    }
  }
  return total;
}
