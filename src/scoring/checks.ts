import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, linesOf, ok, satisfies } from '../core/index.js';
import type { Check, ContentCheck, Issue, Region, Result, UnchangedCheck } from '../core/index.js';
import { readStepCommits } from '../results/index.js';

/** Where a content check matched: a file the step wrote, or its commit by 1-based position. */
export type CheckWhere = { readonly file: string } | { readonly commit: number };

/**
 * A check on one step (REQ-SCO-06 as amended in 1.12): it passed, with where a content check matched;
 * it failed, with the first region an unchanged check lost; or the run never reached the step.
 */
export type CheckStepScore =
  | { readonly n: number; readonly passed: true; readonly where?: CheckWhere }
  | { readonly n: number; readonly passed: false; readonly region?: number }
  | { readonly n: number; readonly not_reached: true };

/** A check across its steps, as `score.json` records it. */
export interface CheckScore {
  readonly id: string;
  readonly kind: Check['kind'];
  readonly steps: readonly CheckStepScore[];
}

/** What scoring a run's checks reads: its stored step files, and the snapshots rebuilt from them. */
export interface CheckRequest {
  readonly checks: readonly Check[];
  readonly runDir: string;
  readonly snapshots: ReadonlyMap<number, string>;
}

/**
 * Score a run's checks (task-035), in declaration order, each on its steps. Both kinds read text and
 * run nothing of the agent's, so they run in this process, not in a scoring container (REQ-SCO-01 is
 * about running a snapshot's code). Deterministic: the same files give the same result (REQ-SCO-03).
 */
export function scoreChecks(request: CheckRequest): Result<CheckScore[]> {
  const scores: CheckScore[] = [];
  for (const check of request.checks) {
    const steps: CheckStepScore[] = [];
    for (const n of check.steps) {
      const snapshot = request.snapshots.get(n);
      if (snapshot === undefined) {
        steps.push({ n, not_reached: true });
        continue;
      }
      const step =
        check.kind === 'content'
          ? contentStep(check, request.runDir, n)
          : ok(unchangedStep(check, snapshot, n));
      if (!step.ok) return step;
      steps.push(step.value);
    }
    scores.push({ id: check.id, kind: check.kind, steps });
  }
  return ok(scores);
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

function missing(path: string): Issue {
  return { path, message: 'is missing' };
}

/**
 * The lines a patch adds, joined, by the file they are added to, in the patch's order. A binary file
 * and a deleted one add no text.
 */
export function addedText(patch: string): Map<string, string> {
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
  return new Map([...added].map(([path, lines]) => [path, lines.join('\n')]));
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
