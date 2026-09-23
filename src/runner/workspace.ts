import { cpSync, lstatSync, mkdirSync, rmSync } from 'node:fs';

import type { GitPort, Scenario } from '../core/index.js';

/** The first commit of every run's repository (REQ-RUN-02). */
const SEED_COMMIT = 'seed';

/**
 * Prepare a run's workspace: a **fresh** directory holding a copy of the scenario's seed, then the
 * arm's environment (W3), made a git repository with one commit. Anything left by an earlier run at
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
function keepInsideSeed(source: string): boolean {
  return !lstatSync(source).isSymbolicLink();
}
