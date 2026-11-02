import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { dependenciesOf, fail, linesOf, ok, satisfies, satisfiesWords } from '../core/index.js';
import type {
  AstCheck,
  AstRule,
  Check,
  ContentCheck,
  Issue,
  Region,
  Result,
  UnchangedCheck,
} from '../core/index.js';
import { readStepCommits } from '../results/index.js';

import type { AstRunner } from './ast.js';
import {
  attributionStep,
  gateStep,
  rejectionStep,
  stepCommitShas,
  verdictHookCommits,
} from './governance.js';
import type { GovernanceViolation } from './governance.js';

/** Where a content check matched: a file the step wrote, or its commit by 1-based position. */
export type CheckWhere = { readonly file: string } | { readonly commit: number };

/** Where a directive check found a violation (REQ-SCO-05, task-037): a new dependency, or a place in code. */
export type Violation =
  | { readonly dependency: string }
  | { readonly file: string; readonly line: number; readonly rule: AstRule }
  | GovernanceViolation;

/**
 * A check on one step (REQ-SCO-06 as amended in 1.12): it passed, with where a content check matched;
 * it failed, with the first region an unchanged check lost; or the run never reached the step. A
 * directive check (REQ-SCO-05, M-E1) says how many violations it found, and where; it passed with none.
 */
export type CheckStepScore =
  | { readonly n: number; readonly passed: true; readonly where?: CheckWhere }
  | { readonly n: number; readonly passed: false; readonly region?: number }
  | {
      readonly n: number;
      readonly passed: boolean;
      readonly violations: number;
      readonly found: readonly Violation[];
    }
  | { readonly n: number; readonly passed: boolean } // a governance verdict: attribution, rejection (task-118)
  | { readonly n: number; readonly not_reached: true };

/** A check across its steps, as `score.json` records it. */
export interface CheckScore {
  readonly id: string;
  readonly kind: Check['kind'];
  /** A v2 content check's matching (REQ-SCO-06 as amended in 1.49, task-128); absent for v1, as before. */
  readonly match?: 'words';
  readonly steps: readonly CheckStepScore[];
}

/**
 * What scoring a run's checks reads: its stored step files, and the snapshots rebuilt from them; and,
 * for `ast` checks, what runs them — needed only when the scenario has one.
 */
export interface CheckRequest {
  readonly checks: readonly Check[];
  readonly runDir: string;
  readonly snapshots: ReadonlyMap<number, string>;
  readonly ast?: AstRunner;
  /** Whether a public suite passed whole at a step, for the rejection checks (M-E4, task-118); absent elsewhere. */
  readonly suitePassed?: (suite: string, n: number) => boolean | undefined;
}

/**
 * Score a run's checks (task-035, task-037), in declaration order, each on its steps. The text kinds —
 * content, unchanged, dependencies — read files and run nothing of the agent's, so they run in this
 * process (REQ-SCO-01 is about running a snapshot's code). The `ast` checks need TypeScript's parser,
 * which the scoring image pins: they run through `request.ast`, once per step for all of that step's.
 * Deterministic: the same files give the same result (REQ-SCO-03).
 */
export async function scoreChecks(request: CheckRequest): Promise<Result<CheckScore[]>> {
  const found = await astFindings(request);
  if (!found.ok) return found;
  const setup = setupLines(request);
  if (!setup.ok) return setup;
  const scores: CheckScore[] = [];
  for (const check of request.checks) {
    const steps: CheckStepScore[] = [];
    for (const n of check.steps) {
      const snapshot = request.snapshots.get(n);
      if (snapshot === undefined) {
        steps.push({ n, not_reached: true });
        continue;
      }
      const step = scoreStep(check, request, snapshot, n, found.value, setup.value);
      if (!step.ok) return step;
      // A governance check leaves out a step where it does not apply (no verdict delivered there, task-118).
      if (step.value !== undefined) steps.push(step.value);
    }
    const words = check.kind === 'content' && check.match === 'words';
    scores.push({ id: check.id, kind: check.kind, ...(words ? { match: 'words' as const } : {}), steps });
  }
  return ok(scores);
}

function scoreStep(
  check: Check,
  request: CheckRequest,
  snapshot: string,
  n: number,
  found: ReadonlyMap<string, Violation[]>,
  setup: ReadonlySet<string>,
): Result<CheckStepScore | undefined> {
  const { runDir } = request;
  switch (check.kind) {
    case 'content':
      return check.match === 'words' ? wordsStep(check, runDir, n, setup) : contentStep(check, runDir, n);
    case 'unchanged':
      return ok(unchangedStep(check, snapshot, n));
    case 'dependencies': {
      // A new name is a new dependency; a seed dependency at another version is not (R1).
      const seed = new Set(check.seedDependencies);
      const added = dependenciesOf(snapshot)
        .filter((name) => !seed.has(name))
        .map((dependency) => ({ dependency }));
      return ok(directive(n, added));
    }
    case 'ast':
      return ok(directive(n, found.get(`${n}#${check.id}`) ?? []));
    case 'gate':
      return gateStep(check, runDir, request.snapshots, n);
    case 'attribution':
      return attributionStep(check, runDir, n);
    case 'rejection':
      return rejectionStep(check, runDir, n, request.suitePassed);
  }
}

function directive(n: number, found: readonly Violation[]): CheckStepScore {
  return { n, passed: found.length === 0, violations: found.length, found };
}

/** The `ast` checks' violations, by step and check (`<n>#<id>`), each step's checks run together. */
async function astFindings(request: CheckRequest): Promise<Result<Map<string, Violation[]>>> {
  const byStep = new Map<number, AstCheck[]>();
  for (const check of request.checks) {
    if (check.kind !== 'ast') continue;
    for (const n of check.steps)
      if (request.snapshots.has(n)) byStep.set(n, [...(byStep.get(n) ?? []), check]);
  }
  const found = new Map<string, Violation[]>();
  if (byStep.size === 0) return ok(found);
  if (request.ast === undefined) {
    return fail([{ path: 'oracle.checks', message: 'has ast checks, and nothing was given to run them' }]);
  }
  for (const [n, checks] of [...byStep].sort(([a], [b]) => a - b)) {
    const result = await request.ast({ n, snapshot: request.snapshots.get(n) as string, checks });
    if (!result.ok) return result;
    for (const { id, file, line, rule } of result.value) {
      const key = `${n}#${id}`;
      found.set(key, [...(found.get(key) ?? []), { file, line, rule }]);
    }
  }
  return ok(found);
}

/**
 * A content check on step `n`: every group matched in one candidate — the lines the step added to one
 * text file, in the patch's order, then each of its commit messages. Added lines only, so that what a
 * file already said before the step is not taken for a record made at it.
 */
function contentStep(check: ContentCheck, runDir: string, n: number): Result<CheckStepScore> {
  const number = String(n).padStart(2, '0');
  const messages = readStepCommits(runDir, n);
  if (!messages.ok) return messages;
  if (messages.value === undefined) {
    return fail([
      {
        path: `steps/${number}/commits.json`,
        message: 'is missing: the run was stored before steps recorded their commit messages (task-035)',
      },
    ]);
  }
  const patchFile = join(runDir, 'steps', number, 'diff.patch');
  if (!existsSync(patchFile)) return fail([missing(`steps/${number}/diff.patch`)]);
  for (const [file, added] of addedText(readFileSync(patchFile, 'utf8'))) {
    if (satisfies(added, check.patterns)) return ok({ n, passed: true, where: { file } });
  }
  const commit = messages.value.findIndex((message) => satisfies(message, check.patterns));
  return ok(commit === -1 ? { n, passed: false } : { n, passed: true, where: { commit: commit + 1 } });
}

/**
 * The lines the arm's setup added (`setup/diff.patch`, every file), trimmed, blank ones left out: template text, which a
 * v2 content check does not count as the agent's (REQ-SCO-06 as amended in 1.49, task-128). Read only when a v2 check
 * is scored; empty otherwise.
 */
function setupLines(request: CheckRequest): Result<ReadonlySet<string>> {
  const v2 = request.checks.some((check) => check.kind === 'content' && check.match === 'words');
  if (!v2) return ok(new Set());
  const patch = join(request.runDir, 'setup', 'diff.patch');
  if (!existsSync(patch)) return fail([missing('setup/diff.patch')]);
  const lines = [...addedLines(readFileSync(patch, 'utf8')).values()].flat().map((line) => line.trim());
  return ok(new Set(lines.filter((line) => line !== '')));
}

/**
 * A v2 content check on step `n` (REQ-SCO-06 as amended in 1.49, task-128): every group matched as whole words in one
 * candidate of the agent's own text — the lines the step added to one file, in the patch's order, less the setup's
 * lines; then each of its commit messages, less those the verdict hook made (the ledger's, under a separate approver).
 */
function wordsStep(
  check: ContentCheck,
  runDir: string,
  n: number,
  setup: ReadonlySet<string>,
): Result<CheckStepScore> {
  const number = String(n).padStart(2, '0');
  const messages = readStepCommits(runDir, n);
  if (!messages.ok) return messages;
  if (messages.value === undefined) return fail([missing(`steps/${number}/commits.json`)]);
  const patchFile = join(runDir, 'steps', number, 'diff.patch');
  if (!existsSync(patchFile)) return fail([missing(`steps/${number}/diff.patch`)]);
  for (const [file, added] of addedLines(readFileSync(patchFile, 'utf8'))) {
    const own = added.filter((line) => !setup.has(line.trim()));
    if (satisfiesWords(own, check.patterns)) return ok({ n, passed: true, where: { file } });
  }
  let hook: ReadonlySet<string> = new Set();
  let shas: readonly string[] = [];
  if (check.ledger === true) {
    const listed = verdictHookCommits(runDir, n);
    if (!listed.ok) return listed;
    const made = stepCommitShas(runDir, n);
    if (!made.ok) return made;
    if (made.value.length !== messages.value.length) {
      return fail([
        {
          path: `steps/${number}/commits.json`,
          message: `holds ${messages.value.length} messages and ${made.value.length} commits: they must align`,
        },
      ]);
    }
    hook = listed.value;
    shas = made.value;
  }
  const commit = messages.value.findIndex(
    (message, index) => !hook.has(shas[index] ?? '') && satisfiesWords(linesOf(message), check.patterns),
  );
  return ok(commit === -1 ? { n, passed: false } : { n, passed: true, where: { commit: commit + 1 } });
}

function missing(path: string): Issue {
  return { path, message: 'is missing' };
}

/**
 * The lines a patch adds, joined, by the file they are added to, in the patch's order. A binary file
 * and a deleted one add no text.
 */
export function addedText(patch: string): Map<string, string> {
  return new Map([...addedLines(patch)].map(([path, lines]) => [path, lines.join('\n')]));
}

/** The lines a patch adds, by the file they are added to, in the patch's order (as {@link addedText}). */
function addedLines(patch: string): Map<string, string[]> {
  const added = new Map<string, string[]>();
  let file: string | undefined;
  let inHunk = false;
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      file = undefined;
      inHunk = false;
    } else if (!inHunk && line.startsWith('+++ ')) {
      const target = line.slice(4);
      file = target === '/dev/null' ? undefined : unquoted(target).replace(/^b\//, '');
    } else if (!inHunk && (line.startsWith('GIT binary patch') || line.startsWith('Binary files '))) {
      file = undefined;
    } else if (line.startsWith('@@')) {
      inHunk = true;
    } else if (inHunk && file !== undefined && line.startsWith('+')) {
      const lines = added.get(file) ?? [];
      lines.push(line.slice(1));
      added.set(file, lines);
    }
  }
  return added;
}

/** A path as git writes it: quoted, with C escapes, when it holds unusual characters. */
function unquoted(path: string): string {
  if (!path.startsWith('"') || !path.endsWith('"')) return path;
  const bytes: number[] = [];
  const body = path.slice(1, -1);
  const simple: Record<string, number> = { n: 10, t: 9, '"': 34, '\\': 92, a: 7, b: 8, f: 12, r: 13, v: 11 };
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] as string;
    if (char !== '\\') {
      bytes.push(...Buffer.from(char, 'utf8'));
      continue;
    }
    const next = body[index + 1] ?? '';
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(body.slice(index + 1, index + 4), 8));
      index += 3;
    } else {
      bytes.push(simple[next] ?? next.charCodeAt(0));
      index += 1;
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * An unchanged check on the snapshot of step `n`: each region's seed lines still stand, one after the
 * other, somewhere in the same file — lines the step moved are kept, lines it edited or reformatted
 * are not. It fails on the first region that does not hold.
 */
function unchangedStep(check: UnchangedCheck, snapshot: string, n: number): CheckStepScore {
  const lost = check.regions.findIndex((region) => !stands(region, snapshot));
  return lost === -1 ? { n, passed: true } : { n, passed: false, region: lost };
}

function stands(region: Region, snapshot: string): boolean {
  const file = join(snapshot, region.path);
  if (!existsSync(file)) return false;
  const lines = linesOf(readFileSync(file, 'utf8'));
  const wanted = region.lines;
  for (let start = 0; start + wanted.length <= lines.length; start += 1) {
    if (wanted.every((line, offset) => lines[start + offset] === line)) return true;
  }
  return false;
}
