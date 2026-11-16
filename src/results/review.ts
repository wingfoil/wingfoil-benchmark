import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { fail, findingsSchema, ok, parseWith } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';

/**
 * A run's review loop as task-149's runner records it under `review/` (REQ-FMT-06 as amended in 1.58), read for
 * REQ-SCO-16's metrics (task-150): the outcome, each round's findings, each session's cost, and each fix's lines. What
 * aggregation reads only: the transcripts are not committed and never read.
 */

/** Where a run's loop is recorded, beside its steps. */
export const REVIEW_DIR = 'review';

const LOOP_FILE = 'loop.json';

/** The outcome of a loop that closed; `not clean at <max_rounds>` is the other outcome with a meaning of its own. */
export const CLEAN = 'clean';

const loopSchema = z.object({
  reviewer: z.object({
    agent: z.object({ name: z.string(), version: z.string() }),
    model: z.string(),
    effort: z.string(),
  }),
  max_rounds: z.number().int(),
  outcome: z.string(),
  reason: z.string().optional(),
  cost_eur: z.number(),
  rounds: z.array(
    z.object({
      n: z.number().int(),
      findings: z.record(z.string(), z.number()).nullable(),
      fixed: z.boolean(),
    }),
  ),
});

const usageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  costUsd: z.number(),
  costEur: z.number(),
  turns: z.number(),
  durationMs: z.number(),
});
const reviewerUsageSchema = usageSchema.extend({ cost_bound_eur: z.number().optional() });
const fixerUsageSchema = z.object({
  usage: usageSchema,
  cost_bound_usd: z.number().optional(),
  interventions: z.number().int(),
});

/** One session's M-K1 and M-K2 (experiment design §4.2), counted at its bound when it reported no cost. */
export interface SessionFigures {
  readonly tokens: {
    readonly input: number;
    readonly output: number;
    readonly cache_creation: number;
    readonly cache_read: number;
  };
  readonly cost_usd: number;
  readonly cost_eur: number;
  /** The session reported no cost, and counts at its bound (REQ-RUN-08), as a killed step does. */
  readonly bounded: boolean;
  readonly wall_time_ms: number;
  readonly turns: number;
  readonly interventions: number;
}

/** One finding as the pages show it (REQ-RES-02 as amended in 1.58): never its `why`. */
export interface LoopFinding {
  readonly severity: 'blocker' | 'should-fix' | 'nit';
  readonly file: string;
  readonly line: number | null;
  readonly title: string;
}

/** One round of a stored loop. */
export interface StoredRound {
  readonly n: number;
  /** `null` for a round whose reviewer session ran and ended the loop. */
  readonly findings: readonly LoopFinding[] | null;
  readonly fixed: boolean;
}

/** A run's stored loop, and what each of its sessions cost. */
export interface StoredLoop {
  readonly reviewer: { readonly agent: string; readonly version: string; readonly model: string; readonly effort: string };
  readonly maxRounds: number;
  readonly outcome: string;
  readonly reason?: string;
  readonly rounds: readonly StoredRound[];
  /** Each reviewer session that recorded its usage, by round. */
  readonly reviewers: readonly SessionFigures[];
  /** Each fixer session that recorded its usage, by round. */
  readonly fixers: readonly SessionFigures[];
  /** Each round's fix's lines, by the round's number: what M-V2 reads the next round's findings against. */
  readonly fixLines: ReadonlyMap<number, ReadonlyMap<string, readonly number[]>>;
}

/** A money figure kept to a millionth (task-029): float noise never decides a comparison. */
function money(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Read `file` (relative to `runDir`) as JSON through `schema`; every issue is named against the file. */
function readJson<T extends z.ZodType>(runDir: string, file: string, schema: T): Result<z.output<T>> {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(runDir, file), 'utf8'));
  } catch (error) {
    return fail([{ path: file, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(schema, data, file);
  return parsed.ok
    ? parsed
    : fail(
        parsed.issues.map((issue) => ({
          path: file,
          message: issue.path === file ? issue.message : `${issue.path} ${issue.message}`,
        })),
      );
}

/**
 * The loop of the run in `runDir`, or undefined when the run has no `review/loop.json` (a campaign without a loop, or
 * one recorded before task-149). `rate` converts a fixer's bound, in USD, as a step's is (REQ-RUN-09); it is read only
 * when a session counts at its bound. Issues name the file, relative to the run.
 */
export function readLoop(runDir: string, rate: () => Result<number>): Result<StoredLoop | undefined> {
  const loopFile = `${REVIEW_DIR}/${LOOP_FILE}`;
  if (!existsSync(join(runDir, loopFile))) return ok(undefined);
  const loop = readJson(runDir, loopFile, loopSchema);
  if (!loop.ok) return loop;
  const issues: Issue[] = [];
  const rounds: StoredRound[] = [];
  for (const round of loop.value.rounds) {
    if (round.findings === null) {
      rounds.push({ n: round.n, findings: null, fixed: round.fixed });
      continue;
    }
    const read = readJson(runDir, `${REVIEW_DIR}/${round.n}/findings.json`, findingsSchema);
    if (!read.ok) {
      issues.push(...read.issues);
      continue;
    }
    rounds.push({
      n: round.n,
      findings: read.value.findings.map(({ severity, file, line, title }) => ({ severity, file, line, title })),
      fixed: round.fixed,
    });
  }
  // Every round directory, whether or not `loop.json` lists it: a session that ran and ended the loop still spent.
  const reviewers: SessionFigures[] = [];
  const fixers: SessionFigures[] = [];
  const fixLinesOf = new Map<number, ReadonlyMap<string, readonly number[]>>();
  for (const n of roundNumbers(join(runDir, REVIEW_DIR))) {
    const reviewerFile = `${REVIEW_DIR}/${n}/reviewer-usage.json`;
    if (existsSync(join(runDir, reviewerFile))) {
      const usage = readJson(runDir, reviewerFile, reviewerUsageSchema);
      if (!usage.ok) issues.push(...usage.issues);
      else {
        const u = usage.value;
        const bound = u.cost_bound_eur;
        const bounded = bound !== undefined;
        let usd = u.costUsd;
        if (bounded && bound > u.costEur) {
          const r = rate();
          if (!r.ok) return r;
          usd = bound / r.value;
        }
        reviewers.push(figures(u, bounded && bound > u.costEur ? bound : u.costEur, usd, bounded, 0));
      }
    }
    const fixerFile = `${REVIEW_DIR}/${n}/fixer-usage.json`;
    if (existsSync(join(runDir, fixerFile))) {
      const usage = readJson(runDir, fixerFile, fixerUsageSchema);
      if (!usage.ok) issues.push(...usage.issues);
      else {
        const { usage: u, cost_bound_usd: bound, interventions } = usage.value;
        const over = bound !== undefined && bound > u.costUsd;
        let eur = u.costEur;
        if (over) {
          const r = rate();
          if (!r.ok) return r;
          eur = bound * r.value;
        }
        fixers.push(figures(u, eur, over ? bound : u.costUsd, bound !== undefined, interventions));
      }
    }
    const patch = join(runDir, REVIEW_DIR, String(n), 'fix.patch');
    if (existsSync(patch)) fixLinesOf.set(n, fixLines(readFileSync(patch, 'utf8')));
  }
  if (issues.length > 0) return fail(issues);
  const { reviewer, max_rounds, outcome, reason } = loop.value;
  return ok({
    reviewer: { agent: reviewer.agent.name, version: reviewer.agent.version, model: reviewer.model, effort: reviewer.effort },
    maxRounds: max_rounds,
    outcome,
    ...(reason === undefined ? {} : { reason }),
    rounds,
    reviewers,
    fixers,
    fixLines: fixLinesOf,
  });
}

function figures(
  u: z.output<typeof usageSchema>,
  eur: number,
  usd: number,
  bounded: boolean,
  interventions: number,
): SessionFigures {
  return {
    tokens: {
      input: u.inputTokens,
      output: u.outputTokens,
      cache_creation: u.cacheCreationInputTokens,
      cache_read: u.cacheReadInputTokens,
    },
    cost_usd: money(usd),
    cost_eur: money(eur),
    bounded,
    wall_time_ms: u.durationMs,
    turns: u.turns,
    interventions,
  };
}

/** The numbered round directories under `reviewDir`, in order. */
function roundNumbers(reviewDir: string): number[] {
  return readdirSync(reviewDir)
    .filter((name) => /^[1-9][0-9]*$/.test(name) && statSync(join(reviewDir, name)).isDirectory())
    .map(Number)
    .sort((a, b) => a - b);
}

/** A path of a patch's header, unquoted as git quotes one with special characters; `null` for `/dev/null`. */
function headerPath(text: string): string | null {
  const raw = text.replace(/\t.*$/, '');
  if (raw === '/dev/null') return null;
  const path = raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"') ? unquoteC(raw.slice(1, -1)) : raw;
  return path.startsWith('b/') ? path.slice(2) : path;
}

const C_ESCAPES: Readonly<Record<string, number>> = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };

/**
 * A path git quoted C-style (`core.quotePath`, task-150's review): its escapes and octal bytes read back, the bytes
 * decoded as UTF-8, so that `"b/caf\303\251.ts"` is `b/café.ts`.
 */
function unquoteC(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string;
    if (char !== '\\') {
      bytes.push(...Buffer.from(char, 'utf8'));
      continue;
    }
    const octal = /^[0-7]{3}/.exec(text.slice(i + 1));
    if (octal !== null) {
      bytes.push(parseInt(octal[0], 8));
      i += 3;
      continue;
    }
    const next = text[i + 1] ?? '';
    bytes.push(C_ESCAPES[next] ?? next.charCodeAt(0));
    i += 1;
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * The lines a fix added or changed, by file, on the new side of `patch` (REQ-SCO-16's M-V2): each `+` line of each
 * hunk, numbered from the hunk's new-side start; a renamed file under its new path. A hunk that only deleted, a deleted
 * file and a binary file add no line. Lines in ascending order; a file with none is left out.
 */
export function fixLines(patch: string): Map<string, number[]> {
  const lines = new Map<string, number[]>();
  let file: string | null = null;
  let inHunk = false;
  let next = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      file = null;
      inHunk = false;
      continue;
    }
    if (!inHunk && line.startsWith('+++ ')) {
      file = headerPath(line.slice(4));
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk !== null) {
      inHunk = true;
      next = Number(hunk[1]);
      continue;
    }
    if (!inHunk) continue;
    if (line.startsWith('+')) {
      if (file !== null) lines.set(file, [...(lines.get(file) ?? []), next]);
      next += 1;
    } else if (line.startsWith(' ')) next += 1;
  }
  return lines;
}

/** M-V1 to M-V3 of one run's loop (REQ-SCO-16). */
export interface RunReviewMetrics {
  /** M-V1: the round that closed the loop `clean`; absent for any other outcome. */
  readonly roundsToClean?: number;
  /** M-V2: of the findings of rounds 2 and later, those on a line the previous round's fix added or changed. */
  readonly fixInduced?: { readonly fix_induced: number; readonly findings: number };
  /** M-V3: the reviewer's and the fixer's sessions summed apart; absent for `no loop`, which ran none. */
  readonly cost?: { readonly reviewer: SessionFigures; readonly fixer: SessionFigures };
}

const ZERO: SessionFigures = {
  tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0 },
  cost_usd: 0,
  cost_eur: 0,
  bounded: false,
  wall_time_ms: 0,
  turns: 0,
  interventions: 0,
};

/** Two sessions' figures added. */
export function addFigures(a: SessionFigures, b: SessionFigures): SessionFigures {
  return {
    tokens: {
      input: a.tokens.input + b.tokens.input,
      output: a.tokens.output + b.tokens.output,
      cache_creation: a.tokens.cache_creation + b.tokens.cache_creation,
      cache_read: a.tokens.cache_read + b.tokens.cache_read,
    },
    cost_usd: money(a.cost_usd + b.cost_usd),
    cost_eur: money(a.cost_eur + b.cost_eur),
    bounded: a.bounded || b.bounded,
    wall_time_ms: a.wall_time_ms + b.wall_time_ms,
    turns: a.turns + b.turns,
    interventions: a.interventions + b.interventions,
  };
}

/** M-V1 to M-V3 of `loop` (REQ-SCO-16). */
export function runReviewMetrics(loop: StoredLoop): RunReviewMetrics {
  const last = loop.rounds.at(-1);
  const roundsToClean = loop.outcome === CLEAN && last !== undefined ? last.n : undefined;
  let induced = 0;
  let findings = 0;
  for (const round of loop.rounds) {
    if (round.n < 2 || round.findings === null) continue;
    const previous = loop.fixLines.get(round.n - 1);
    for (const finding of round.findings) {
      findings += 1;
      if (finding.line !== null && (previous?.get(finding.file) ?? []).includes(finding.line)) induced += 1;
    }
  }
  return {
    ...(roundsToClean === undefined ? {} : { roundsToClean }),
    ...(findings === 0 ? {} : { fixInduced: { fix_induced: induced, findings } }),
    ...(loop.outcome === 'no loop'
      ? {}
      : { cost: { reviewer: loop.reviewers.reduce(addFigures, ZERO), fixer: loop.fixers.reduce(addFigures, ZERO) } }),
  };
}
