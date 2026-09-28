import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, ok, reasonOf } from '../core/index.js';
import type { GitPort, Result, Scenario } from '../core/index.js';
import type { StoredRun } from '../results/index.js';
import { prepareWorkspace } from '../scenario/index.js';

/** What a rebuild needs: the scenario version the run ran, its stored record and files, and where to work. */
export interface RebuildRequest {
  readonly scenario: Scenario;
  readonly run: StoredRun;
  readonly runDir: string;
  readonly git: GitPort;
  /** A fresh directory, owned by the caller, that the rebuild may fill. */
  readonly workDir: string;
}

/**
 * Rebuild the snapshot of every step a run reached, from what it stored (task-027, W6 plan-phase
 * decision 5): the scenario version's seed, committed as the run's workspace started; the setup's
 * patch; then each step's patch, in order. After every commit its tree is compared with the one the
 * run recorded, so a snapshot is exactly the run's, or scoring stops. Each snapshot is a copy of the
 * working tree without its history, under `<workDir>/steps/<NN>`; the map is by step number, in order.
 */
export async function rebuildSnapshots(
  request: RebuildRequest,
): Promise<Result<ReadonlyMap<number, string>>> {
  const { scenario, run, runDir, git, workDir } = request;
  if (run.steps.length === 0) return ok(new Map());
  if (run.scenarioHash !== scenario.hash) {
    return fail([
      {
        path: 'run.json.scenario_hash',
        message:
          `is ${run.scenarioHash}, and ${scenario.id}@${scenario.version} now hashes to ${scenario.hash}: ` +
          'the seed is not the one the run started from',
      },
    ]);
  }
  if (run.setupTree === undefined || run.steps.some((step) => step.tree === undefined)) {
    return fail([
      {
        path: 'run.json',
        message: 'was stored before runs recorded what their snapshots are rebuilt from (task-027)',
      },
    ]);
  }

  const repository = join(workDir, 'repository');
  await prepareWorkspace(repository, scenario, git);
  const setup = await commitPatch(
    git,
    repository,
    join(runDir, 'setup', 'diff.patch'),
    'setup',
    run.setupTree,
  );
  if (setup !== undefined) return fail([{ path: 'setup', message: setup }]);

  const snapshots = new Map<number, string>();
  for (const step of run.steps) {
    const number = String(step.n).padStart(2, '0');
    const patch = join(runDir, 'steps', number, 'diff.patch');
    const problem = await commitPatch(git, repository, patch, `step ${number}`, step.tree as string);
    if (problem !== undefined) return fail([{ path: `step ${number}`, message: problem }]);
    const snapshot = join(workDir, 'steps', number);
    mkdirSync(snapshot, { recursive: true });
    cpSync(repository, snapshot, {
      recursive: true,
      filter: (source) => source !== join(repository, '.git'),
    });
    snapshots.set(step.n, snapshot);
  }
  return ok(snapshots);
}

/**
 * Apply `patchFile` and commit it; an empty patch — a setup or a step that changed nothing — commits
 * nothing new. The reason it went wrong, or `undefined` when the tree is the one expected.
 */
async function commitPatch(
  git: GitPort,
  repository: string,
  patchFile: string,
  message: string,
  expectedTree: string,
): Promise<string | undefined> {
  if (!existsSync(patchFile)) return `${patchFile} is missing`;
  try {
    if (readFileSync(patchFile, 'utf8').trim() !== '') await git.apply(repository, patchFile);
    await git.commitAll(repository, message, { allowEmpty: true });
  } catch (error) {
    return `its patch does not apply: ${reasonOf(error)}`;
  }
  const tree = await git.tree(repository, 'HEAD');
  return tree === expectedTree ? undefined : 'the rebuilt snapshot differs from the one the run recorded';
}
