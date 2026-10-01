import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { z } from 'zod';

import { fail, ok, parseWith } from '../core/index.js';
import type { Result } from '../core/index.js';

import type { StepUsage } from './runs.js';

const RUN_FILE = 'run.json';
const SCORE_FILE = 'score.json';

const usage = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  costUsd: z.number(),
  costEur: z.number(),
  turns: z.number(),
  durationMs: z.number(),
});

/** What the run detail reads of a `run.json` (REQ-FMT-06): the record the runner writes, loosely. */
const runSchema = z.object({
  campaign: z.string().optional(),
  dry_run: z.boolean().optional(),
  scenario: z.string(),
  version: z.string(),
  scenario_hash: z.string(),
  arm: z.string(),
  model: z.string(),
  repetition: z.number().int(),
  agent: z
    .union([z.string(), z.object({ name: z.string(), version: z.string().optional() }).passthrough()])
    .optional(),
  expected_failure: z.object({ missing: z.array(z.string()) }).passthrough().optional(),
  approver_policy: z.string().optional(),
  manual: z.object({ tokens: z.number() }).passthrough().optional(),
  harness: z.object({ tool: z.string(), commit: z.string() }).passthrough().optional(),
  transcripts: z.object({ release: z.string(), asset: z.string() }).passthrough().optional(),
  setup: z.object({ duration_ms: z.number().optional(), usage: usage.optional() }).passthrough().optional(),
  outcome: z.string(),
  error: z.string().optional(),
  steps: z.array(
    z
      .object({
        n: z.number().int(),
        session: z.string().optional(),
        outcome: z.string(),
        interventions: z.number().int(),
        usage,
        cost_bound_usd: z.number().optional(),
      })
      .passthrough(),
  ),
  interventions: z
    .array(z.object({ step: z.number().int(), kind: z.string(), reply: z.string() }))
    .optional(),
});

const tally = z.object({ passed: z.number(), total: z.number() });
const suite = tally.extend({ id: z.string(), failed: z.array(z.string()).optional() });
const snapshot = z.object({
  n: z.number().int().optional(),
  step: z.number().int().optional(),
  not_reached: z.literal(true).optional(),
  suites: z.array(suite).optional(),
  m_q1: tally.optional(),
});

/** What the run detail reads of a `score.json`: every key it shows, each optional but the snapshots. */
const scoreSchema = z
  .object({
    scenario_hash: z.string().optional(),
    steps: z.array(snapshot),
    final: snapshot,
    holdout: z
      .object({ scored: z.boolean(), reason: z.string().optional(), final: snapshot.optional() })
      .optional(),
    checks: z
      .array(
        z.object({
          id: z.string(),
          kind: z.string(),
          steps: z.array(
            z.object({
              n: z.number().int(),
              not_reached: z.literal(true).optional(),
              passed: z.boolean().optional(),
              violations: z.number().optional(),
            }),
          ),
        }),
      )
      .optional(),
    cost: z
      .object({
        steps: z
          .array(z.object({ n: z.number().int(), not_reached: z.literal(true).optional(), cost_eur: z.number().optional() }))
          .optional(),
        run: z.object({ cost_eur: z.number() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
    m_f1: z.object({ consistent: z.number(), total: z.number() }).partial().passthrough().optional(),
    m_d3: z.object({ count: z.number() }).partial().passthrough().optional(),
    m_q2: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/** A stored `score.json` as the run detail shows it. */
export type ScoreView = z.infer<typeof scoreSchema>;

/** One step of a stored run: its record, and the files beside it. */
export interface StepDetail {
  readonly n: number;
  readonly session?: string;
  readonly outcome: string;
  readonly interventions: number;
  readonly usage: StepUsage;
  /** For a step killed at its time cap that reported no cost: the most it can have cost (task-024). */
  readonly costBoundUsd?: number;
  /** `diff.patch`, when stored. */
  readonly patch?: string;
  /** `commits.json`'s messages, when stored (task-035); `unreadable` when it is not their form. */
  readonly messages?: readonly string[] | 'unreadable';
  /** `transcript.jsonl`'s lines; absent when not on disk (git-ignored, REQ-RES-06). */
  readonly transcript?: readonly string[];
}

/** Everything stored about one run (F5.3, task-043): its record, each step's files, its score if any. */
export interface RunDetail {
  readonly dir: string;
  /** Its name as `aggregate.json` writes it, from its layout (REQ-FMT-06); its directory otherwise. */
  readonly name: string;
  readonly origin: { readonly campaign?: string; readonly dryRun?: true; readonly execution?: string };
  readonly scenario: string;
  readonly version: string;
  readonly scenarioHash: string;
  readonly arm: string;
  readonly model: string;
  readonly repetition: number;
  readonly outcome: string;
  readonly error?: string;
  /** The agent's name and version, as the campaign pinned them. */
  readonly agent?: string;
  /** The capabilities the run's harness lacked (F3.6), when it was marked an expected failure. */
  readonly expectedFailure?: readonly string[];
  readonly approverPolicy?: string;
  readonly harness?: { readonly tool: string; readonly commit: string };
  /** The release asset that holds its transcripts (REQ-RES-06 as amended in 1.22), once packed. */
  readonly transcriptsAsset?: { readonly release: string; readonly asset: string };
  readonly manualTokens?: number;
  readonly setup?: { readonly durationMs?: number; readonly costUsd?: number };
  readonly steps: readonly StepDetail[];
  readonly interventions: readonly { readonly step: number; readonly kind: string; readonly reply: string }[];
  readonly score?: ScoreView;
  /** Why a stored `score.json` is not shown: it cannot be read, or scores another version. */
  readonly scoreIssue?: string;
}

/** The results directory of the repository at `root`. */
function resultsOf(root: string): string {
  return join(root, 'results');
}

/**
 * The directory of the run `argument` names (REQ-CLI-08 as amended in 1.18): a directory holding a
 * `run.json`, or a run's name under `results/`, as `aggregate.json` writes it; or why it is none.
 */
export function resolveRun(root: string, argument: string): Result<string> {
  const candidates = [isAbsolute(argument) ? argument : resolve(root, argument), join(resultsOf(root), argument)];
  const found = candidates.find((dir) => existsSync(join(dir, RUN_FILE)) && statSync(dir).isDirectory());
  return found === undefined ? fail([{ path: argument, message: 'is not a stored run' }]) : ok(found);
}

function readJson(file: string, label: string): Result<unknown> {
  try {
    return ok(JSON.parse(readFileSync(file, 'utf8')));
  } catch (error) {
    return fail([{ path: label, message: `cannot be read: ${(error as Error).message}` }]);
  }
}

function linesOf(file: string): string[] | undefined {
  if (!existsSync(file)) return undefined;
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line !== '');
}

const commitsSchema = z.object({ messages: z.array(z.string()) });

/** A step's commit messages; `undefined` when not stored, `unreadable` when not in their form. */
function commitsOf(file: string): readonly string[] | 'unreadable' | undefined {
  if (!existsSync(file)) return undefined;
  const read = readJson(file, 'commits.json');
  const parsed = read.ok ? commitsSchema.safeParse(read.value) : undefined;
  return parsed?.success === true ? parsed.data.messages : 'unreadable';
}

/**
 * A run's name as `aggregate.json` writes it, from where the run lies (REQ-FMT-06):
 * `<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>`, or `dry-runs/<n>/runs/…` — whatever the
 * working directory. A directory not laid out so is named by itself.
 */
function nameOf(runDir: string): { name: string; origin: RunDetail['origin'] } {
  const parts = resolve(runDir).split(sep);
  const runs = parts.length - 5;
  const laidOut =
    runs >= 2 &&
    parts[runs] === 'runs' &&
    /^[1-9]\d*$/.test(parts[runs - 1] as string) &&
    /^r[1-9]\d*$/.test(parts[parts.length - 1] as string);
  if (!laidOut) return { name: runDir, origin: {} };
  const [owner, execution] = [parts[runs - 2] as string, parts[runs - 1] as string];
  const tail = parts.slice(runs - 2).join('/');
  return owner === 'dry-runs'
    ? { name: tail, origin: { dryRun: true, execution } }
    : { name: tail, origin: { campaign: owner, execution } };
}

/** Read everything stored about the run in `runDir` (F5.3, task-043). */
export function readRunDetail(runDir: string): Result<RunDetail> {
  const data = readJson(join(runDir, RUN_FILE), RUN_FILE);
  if (!data.ok) return data;
  const parsed = parseWith(runSchema, data.value, RUN_FILE);
  if (!parsed.ok) return fail(parsed.issues.map((issue) => ({ ...issue, path: `${RUN_FILE}.${issue.path}` })));
  const run = parsed.value;
  let score: ScoreView | undefined;
  let scoreIssue: string | undefined;
  if (existsSync(join(runDir, SCORE_FILE))) {
    // A score that cannot be shown leaves the run to be shown, and says why (the run is what was asked).
    const read = readJson(join(runDir, SCORE_FILE), SCORE_FILE);
    const scored = read.ok ? parseWith(scoreSchema, read.value, SCORE_FILE) : read;
    if (!scored.ok) {
      scoreIssue = scored.issues
        .map((issue) => `${issue.path === SCORE_FILE ? SCORE_FILE : `${SCORE_FILE} ${issue.path}`}: ${issue.message}`)
        .join('; ');
    } else if (scored.value.scenario_hash !== undefined && scored.value.scenario_hash !== run.scenario_hash) {
      scoreIssue = `${SCORE_FILE} scores another version of the scenario than the run ran`;
    } else score = scored.value;
  }
  const { name, origin } = nameOf(runDir);
  const steps = run.steps.map((step): StepDetail => {
    const dir = join(runDir, 'steps', String(step.n).padStart(2, '0'));
    const patch = join(dir, 'diff.patch');
    const messages = commitsOf(join(dir, 'commits.json'));
    const transcript = linesOf(join(dir, 'transcript.jsonl'));
    return {
      n: step.n,
      ...(step.session === undefined ? {} : { session: step.session }),
      outcome: step.outcome,
      interventions: step.interventions,
      usage: step.usage,
      ...(step.cost_bound_usd === undefined ? {} : { costBoundUsd: step.cost_bound_usd }),
      ...(existsSync(patch) ? { patch: readFileSync(patch, 'utf8') } : {}),
      ...(messages === undefined ? {} : { messages }),
      ...(transcript === undefined ? {} : { transcript }),
    };
  });
  const agent =
    typeof run.agent === 'string' || run.agent === undefined
      ? run.agent
      : [run.agent.name, run.agent.version].filter((part) => part !== undefined).join(' ');
  return ok({
    dir: runDir,
    name,
    origin,
    scenario: run.scenario,
    version: run.version,
    scenarioHash: run.scenario_hash,
    arm: run.arm,
    model: run.model,
    repetition: run.repetition,
    outcome: run.outcome,
    ...(run.error === undefined ? {} : { error: run.error }),
    ...(agent === undefined ? {} : { agent }),
    ...(run.expected_failure === undefined ? {} : { expectedFailure: run.expected_failure.missing }),
    ...(run.approver_policy === undefined ? {} : { approverPolicy: run.approver_policy }),
    ...(run.harness === undefined ? {} : { harness: { tool: run.harness.tool, commit: run.harness.commit } }),
    ...(run.transcripts === undefined
      ? {}
      : { transcriptsAsset: { release: run.transcripts.release, asset: run.transcripts.asset } }),
    ...(run.manual === undefined ? {} : { manualTokens: run.manual.tokens }),
    ...(run.setup === undefined
      ? {}
      : {
          setup: {
            ...(run.setup.duration_ms === undefined ? {} : { durationMs: run.setup.duration_ms }),
            ...(run.setup.usage === undefined ? {} : { costUsd: run.setup.usage.costUsd }),
          },
        }),
    steps,
    interventions: run.interventions ?? [],
    ...(score === undefined ? {} : { score }),
    ...(scoreIssue === undefined ? {} : { scoreIssue }),
  });
}
