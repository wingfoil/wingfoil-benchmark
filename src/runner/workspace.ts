import { cpSync, lstatSync, mkdirSync } from 'node:fs';
import type { GitPort, Scenario } from '../core/index.js';

/** The first commit of every run's repository (REQ-RUN-02). */
const SEED_COMMIT = 'seed';

/**
 * Prepare a run's workspace: a copy of the scenario's seed, then the arm's environment (W3), made a
 * git repository with one commit. Symbolic links are copied as links are never followed, so a link
 * inside the seed cannot pull host files into the container.
 */
export async function prepareWorkspace(directory: string, scenario: Scenario, git: GitPort): Promise<string> {
  mkdirSync(directory, { recursive: true });
  cpSync(scenario.seedDir, directory, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    filter: keepInsideSeed,
  });
  await git.init(directory);
  await git.commitAll(directory, SEED_COMMIT);
  return directory;
}

/** Symbolic links are not copied at all: nothing in a workspace may point outside it. */
function keepInsideSeed(source: string): boolean {
  return !lstatSync(source).isSymbolicLink();
}
