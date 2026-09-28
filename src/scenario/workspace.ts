import { cpSync, lstatSync, mkdirSync, rmSync } from 'node:fs';

import type { GitPort, Scenario } from '../core/index.js';

/** The first commit of every run's repository (REQ-RUN-02). */
const SEED_COMMIT = 'seed';

/**
 * Prepare a run's workspace — or, in scoring, the repository a run's snapshots are rebuilt in (task-027),
 * which must start exactly as the run's did: a **fresh** directory holding a copy of the scenario's seed, made a git
 * repository with one commit. The `seed` commit is the same in every arm: the arm's environment comes
 * after it, in the setup phase (adr-003 decision 10). Anything left by an earlier run at
 * the same path is removed first, so a run never sees another's files. Symbolic links are not copied,
 * so nothing in a workspace can point outside it.
 */
export async function prepareWorkspace(directory: string, scenario: Scenario, git: GitPort): Promise<void> {
  if (lstatSync(scenario.seedDir).isSymbolicLink()) {
    throw new Error(
      `the seed of ${scenario.id}@${scenario.version} is a symbolic link: copy it, do not link it`,
    );
  }
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  cpSync(scenario.seedDir, directory, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    filter: keepInsideSeed,
  });
  await git.init(directory);
  await git.commitAll(directory, SEED_COMMIT);
}

/** Symbolic links are not copied at all: nothing in a workspace may point outside it. */
export function keepInsideSeed(source: string): boolean {
  return !lstatSync(source).isSymbolicLink();
}
