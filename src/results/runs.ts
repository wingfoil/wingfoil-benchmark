import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Result } from '../core/index.js';

const RUN_FILE = 'run.json';

/**
 * The runs of one execution (REQ-FMT-06): every `runs/<scenario>@<ver>/<arm>/<model>/r<k>/` holding a
 * `run.json`, in path order — by UTF-16 code unit, whatever the locale — so that scoring them always
 * goes the same way.
 */
export function executionRuns(executionDir: string): string[] {
  const root = join(executionDir, 'runs');
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const walk = (directory: string, depth: number): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (!statSync(path).isDirectory()) continue;
      if (depth === 3) {
        if (existsSync(join(path, RUN_FILE))) found.push(path);
      } else walk(path, depth + 1);
    }
  };
  walk(root, 0);
  return found;
}

/** A step's `usage.json` (REQ-FMT-06): its invocations together, as the runner stored them (task-007). */
const stepUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  costUsd: z.number(),
  costEur: z.number(),
  turns: z.number(),
  durationMs: z.number(),
});

/** What scoring reads from a `run.json` (task-027): the rest of the record is not its business. */
const storedRunSchema = z.object({
  scenario: z.string(),
  version: z.string(),
  scenario_hash: z.string(),
  arm: z.string(),
  model: z.string(),
  repetition: z.number().int(),
  outcome: z.string(),
  setup: z
    .object({ tree: z.string().optional(), duration_ms: z.number().optional(), usage: stepUsageSchema.optional() })
    .optional(),
  manual: z.object({ tokens: z.number() }).optional(),
  harness: z.object({ commit: z.string() }).optional(),
  docs_of: z.string().optional(),
  expected_failure: z.object({ missing: z.array(z.string()) }).optional(),
  steps: z.array(
    z.object({
      n: z.number().int(),
      tree: z.string().optional(),
      outcome: z.string(),
      interventions: z.number().int(),
      cost_bound_usd: z.number().optional(),
    }),
  ),
});

/** A stored run as scoring sees it. A tree is absent in a run stored before trees were recorded. */
export interface StoredRun {
  readonly scenario: string;
  readonly version: string;
  readonly scenarioHash: string;
  readonly arm: string;
  readonly model: string;
  readonly repetition: number;
  readonly outcome: string;
  readonly setupTree?: string;
  /** The setup's duration and usage (REQ-RUN-03), for M-K3 (task-040); absent in a run stored without them. */
  readonly setup?: { readonly durationMs: number; readonly usage: StepUsage };
  /** The operating manual's tokens (REQ-RUN-12), for M-K3; absent when none was recorded. */
  readonly manualTokens?: number;
  /** The harness commit the run's arm ran (REQ-RUN-14): a pin M-R compares (task-042). */
  readonly harnessCommit?: string;
  /** A docs control's harness arm (REQ-RUN-11, task-068); absent in any other run, and in one stored before it. */
  readonly docsOf?: string;
  /** The capabilities the run's harness lacked (F3.6), when it was marked an expected failure. */
  readonly expectedFailure?: { readonly missing: readonly string[] };
  readonly steps: readonly StoredStep[];
}

/** A step as `run.json` records it: its snapshot's tree, how it ended, and what the budget counted it at. */
export interface StoredStep {
  readonly n: number;
  readonly tree?: string;
  readonly outcome: string;
  readonly interventions: number;
  /** For a step killed at its time cap that reported no cost: the most it can have cost (task-024). */
  readonly costBoundUsd?: number;
}

/** Read the `run.json` of the run in `runDir`; every issue is named against the file. */
export function readStoredRun(runDir: string): Result<StoredRun> {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(runDir, RUN_FILE), 'utf8'));
  } catch (error) {
    return fail([{ path: RUN_FILE, message: `is not JSON: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(storedRunSchema, data, RUN_FILE);
  if (!parsed.ok) {
    return fail(parsed.issues.map((issue) => ({ ...issue, path: `${RUN_FILE}.${issue.path}` })));
  }
  const run = parsed.value;
  return {
    ok: true,
    value: {
      scenario: run.scenario,
      version: run.version,
      scenarioHash: run.scenario_hash,
      arm: run.arm,
      model: run.model,
      repetition: run.repetition,
      outcome: run.outcome,
      ...(run.setup?.tree === undefined ? {} : { setupTree: run.setup.tree }),
      ...(run.setup?.duration_ms === undefined || run.setup.usage === undefined
        ? {}
        : { setup: { durationMs: run.setup.duration_ms, usage: run.setup.usage } }),
      ...(run.manual === undefined ? {} : { manualTokens: run.manual.tokens }),
      ...(run.harness === undefined ? {} : { harnessCommit: run.harness.commit }),
      ...(run.docs_of === undefined ? {} : { docsOf: run.docs_of }),
      ...(run.expected_failure === undefined ? {} : { expectedFailure: run.expected_failure }),
      steps: run.steps.map((step) => ({
        n: step.n,
        ...(step.tree === undefined ? {} : { tree: step.tree }),
        outcome: step.outcome,
        interventions: step.interventions,
        ...(step.cost_bound_usd === undefined ? {} : { costBoundUsd: step.cost_bound_usd }),
      })),
    },
  };
}

/** What a step's `usage.json` holds. */
export type StepUsage = z.infer<typeof stepUsageSchema>;

/** Read step `n`'s `usage.json` in the run in `runDir`; issues name the file, relative to the run. */
export function readStepUsage(runDir: string, n: number): Result<StepUsage> {
  const file = `steps/${String(n).padStart(2, '0')}/usage.json`;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(runDir, file), 'utf8'));
  } catch (error) {
    return fail([{ path: file, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(stepUsageSchema, data, file);
  return parsed.ok
    ? ok(parsed.value)
    : fail(parsed.issues.map((issue) => ({ ...issue, path: issue.path === file ? file : `${file}.${issue.path}` })));
}

const stepCommitsSchema = z.object({ messages: z.array(z.string()) });

/**
 * Step `n`'s commit messages, from its `commits.json` (task-035): what the agent and its harness
 * committed during the step, oldest first; `undefined` when the run was stored before steps recorded
 * them. Issues name the file, relative to the run.
 */
export function readStepCommits(runDir: string, n: number): Result<readonly string[] | undefined> {
  const file = `steps/${String(n).padStart(2, '0')}/commits.json`;
  if (!existsSync(join(runDir, file))) return ok(undefined);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(runDir, file), 'utf8'));
  } catch (error) {
    return fail([{ path: file, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(stepCommitsSchema, data, file);
  return parsed.ok
    ? ok(parsed.value.messages)
    : fail(parsed.issues.map((issue) => ({ ...issue, path: issue.path === file ? file : `${file}.${issue.path}` })));
}

/** The files an execution's pins are copied to, beside its runs: a campaign's, or a dry run's (task-021). */
const PINS_FILES = ['campaign.yaml', 'dry-run.yaml'] as const;

const rateSchema = z.object({ currency: z.object({ usd_to_eur: z.number().positive() }) });

/** The rate the execution in `executionDir` converted USD to EUR with (REQ-RUN-09). */
export function executionRate(executionDir: string): Result<number> {
  const name = PINS_FILES.find((file) => existsSync(join(executionDir, file)));
  if (name === undefined) {
    return fail([{ path: executionDir, message: 'holds neither campaign.yaml nor dry-run.yaml' }]);
  }
  const read = readYamlFile(join(executionDir, name));
  if (!read.ok) return read;
  const parsed = parseWith(rateSchema, read.value, name);
  return parsed.ok
    ? ok(parsed.value.currency.usd_to_eur)
    : fail(parsed.issues.map((issue) => ({ ...issue, path: `${name}.${issue.path}` })));
}
