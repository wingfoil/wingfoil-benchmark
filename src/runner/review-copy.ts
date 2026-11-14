import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { GitPort } from '../core/index.js';
import { RESERVED_ANYWHERE, RESERVED_AT_ROOT } from '../scenario/index.js';

/**
 * The review loop's copy (REQ-RUN-21, task-149): what the reviewer reads of a run. A fresh git repository of two
 * commits, before and after what the round reviews, both stripped of every path the run's setup added and of the
 * reserved names of REQ-FMT-08, committed by a neutral identity: nothing of the run's history, setup or harness
 * reaches the reviewer, while what the agent wrote during the steps stays.
 */

/** Who the copy's commits are by: nothing of the benchmark, the run or its harness. */
const COPY_IDENTITY = { name: 'Project', email: 'project@localhost' };

/** The copy's two commit messages: what each commit is to the round, nothing of where it comes from. */
const BEFORE = 'Before the change under review';
const AFTER = 'The change under review';

/**
 * The paths the run's setup added (REQ-RUN-21): the seed tree against the setup's. A path the setup changed is not
 * among them: it is project code, kept with its final content.
 */
export async function setupAddedPaths(
  workspace: string,
  seedTree: string,
  setupTree: string,
  git: Pick<GitPort, 'changesBetween'>,
): Promise<ReadonlySet<string>> {
  const changes = await git.changesBetween(workspace, seedTree, setupTree);
  return new Set(changes.filter((change) => change.status === 'A').map((change) => change.path));
}

/**
 * Whether `path`, relative to the copy's root, is stripped: a path the setup added, or a reserved name of REQ-FMT-08,
 * anywhere or at the root.
 */
export function isStripped(path: string, added: ReadonlySet<string>): boolean {
  if (added.has(path)) return true;
  const segments = path.split('/');
  if (segments.some((segment) => RESERVED_ANYWHERE.includes(segment))) return true;
  return RESERVED_AT_ROOT.includes(segments[0] ?? '');
}

/** What one round's copy is made of: the run's workspace, where the copy goes, and the two trees it holds. */
export interface CopyRequest {
  readonly workspace: string;
  readonly copyDir: string;
  /** The tree before what the round reviews: the seed's for round 1, the tree before the latest fix after. */
  readonly before: string;
  /** The tree after it: the last step's for round 1, the latest fix's after. */
  readonly after: string;
  /** The paths the setup added ({@link setupAddedPaths}). */
  readonly stripped: ReadonlySet<string>;
}

/** The copy's two commits. */
export interface CopyCommits {
  readonly before: string;
  readonly after: string;
}

/** Every file below `dir` but the repository's own `.git`, relative to it, with `/` between segments. */
function filesOf(dir: string, prefix = ''): string[] {
  return readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (path === '.git') return [];
    return entry.isDirectory() && !entry.isSymbolicLink() ? filesOf(dir, path) : [path];
  });
}

/**
 * Removes from the copy's working tree what {@link isStripped} names, with `all` every file but `.git`, then the
 * directories left empty: a stripped `.specify/` leaves no trace of its name.
 */
function strip(copyDir: string, added: ReadonlySet<string>, all = false): void {
  for (const path of filesOf(copyDir)) {
    if (all || isStripped(path, added)) rmSync(join(copyDir, path), { force: true });
  }
  pruneEmpty(copyDir, '');
}

/** Removes the empty directories below `dir` (its `.git` aside); whether `prefix` itself is left empty. */
function pruneEmpty(dir: string, prefix: string): boolean {
  const entries = readdirSync(join(dir, prefix), { withFileTypes: true });
  let left = entries.length;
  for (const entry of entries) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (path === '.git' || !entry.isDirectory() || entry.isSymbolicLink()) continue;
    if (pruneEmpty(dir, path)) {
      rmSync(join(dir, path), { recursive: true, force: true });
      left -= 1;
    }
  }
  return prefix !== '' && left === 0;
}

/**
 * Builds one round's copy (REQ-RUN-21): `copyDir` made anew, its first commit the stripped `before` tree, its second
 * the stripped `after` tree, each tree written whole, so that a later round sees the whole project with every fix.
 */
export async function buildReviewCopy(
  request: CopyRequest,
  git: Pick<GitPort, 'init' | 'commitAll' | 'exportTree' | 'head'>,
): Promise<CopyCommits> {
  const { workspace, copyDir, stripped } = request;
  rmSync(copyDir, { recursive: true, force: true });
  mkdirSync(copyDir, { recursive: true });
  await git.exportTree(workspace, request.before, copyDir);
  strip(copyDir, stripped);
  await git.init(copyDir);
  await git.commitAll(copyDir, BEFORE, { allowEmpty: true, identity: COPY_IDENTITY });
  const before = await git.head(copyDir);
  strip(copyDir, stripped, true);
  await git.exportTree(workspace, request.after, copyDir);
  strip(copyDir, stripped);
  await git.commitAll(copyDir, AFTER, { allowEmpty: true, identity: COPY_IDENTITY });
  const after = await git.head(copyDir);
  return { before, after };
}
