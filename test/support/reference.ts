import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { gitCli, systemProcess } from '../../src/core/index.js';

import { tempDir } from './scenario-fixture.js';

/**
 * A scenario's reference solution (task-032, W7 decision 4): one directory per step, `01/`, `02/`…,
 * each holding the files that step writes, at their paths in the workspace. S1's is public, in
 * `test/fixtures/reference/S1/`; S2's is the answer key, in the hold-out (decision 5).
 */
export function referenceSteps(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => /^\d{2}$/.test(name))
    .sort()
    .map((name) => join(dir, name));
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

/** A path as a single-quoted shell word. */
function quoted(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

/**
 * The fake agent's script (`BENCH_FAKE_SCRIPT`) that replays the reference of scenario `id`: step `n`
 * writes the files of the reference's `n`-th directory, each as base64 decoded in the container, so
 * that no byte is quoted by hand. Written to a temporary file, whose path is returned.
 */
export function referenceScript(id: string, dir: string): string {
  const steps = Object.fromEntries(
    referenceSteps(dir).map((stepDir, index) => [
      String(index + 1),
      {
        commands: filesUnder(stepDir).map((file) => {
          const path = relative(stepDir, file).split('\\').join('/');
          const base64 = readFileSync(file).toString('base64');
          return `mkdir -p "$(dirname ${quoted(path)})" && printf '%s' ${quoted(base64)} | base64 -d > ${quoted(path)}`;
        }),
      },
    ]),
  );
  const file = join(tempDir('bench-reference-'), 'script.json');
  writeFileSync(file, `${JSON.stringify({ [id]: steps }, undefined, 2)}\n`);
  return file;
}

/** The workspace after step `upTo` of the reference, laid over a copy of `seedDir`: a snapshot to score. */
export function referenceSnapshot(seedDir: string, dir: string, upTo: number): string {
  const snapshot = tempDir('bench-snapshot-');
  cpSync(seedDir, snapshot, { recursive: true });
  // Step 0 is the seed itself, whether or not the reference is at hand.
  const steps = upTo === 0 ? [] : referenceSteps(dir).slice(0, upTo);
  for (const stepDir of steps) cpSync(stepDir, snapshot, { recursive: true });
  return snapshot;
}

/**
 * A run of the reference stored as the runner stores one (task-035): the seed committed, then each
 * step's files laid over it — and `edit`, which may change the workspace to make a variant — committed,
 * with its patch from the previous snapshot and its `commits.json`, and its snapshot as a directory.
 * What scoring's checks read, without a container or a fake agent.
 */
export async function referenceRun(
  seedDir: string,
  dir: string,
  edit: (n: number, workspace: string) => void = () => undefined,
): Promise<{ runDir: string; snapshots: ReadonlyMap<number, string> }> {
  const git = gitCli(systemProcess);
  const workspace = tempDir('bench-reference-ws-');
  const runDir = tempDir('bench-reference-run-');
  cpSync(seedDir, workspace, { recursive: true });
  await git.init(workspace);
  await git.commitAll(workspace, 'seed');
  let previous = await git.tree(workspace, 'HEAD');
  const snapshots = new Map<number, string>();
  for (const [index, stepDir] of referenceSteps(dir).entries()) {
    const number = String(index + 1).padStart(2, '0');
    cpSync(stepDir, workspace, { recursive: true });
    edit(index + 1, workspace);
    await git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
    const tree = await git.tree(workspace, 'HEAD');
    const stepOut = join(runDir, 'steps', number);
    mkdirSync(stepOut, { recursive: true });
    writeFileSync(join(stepOut, 'diff.patch'), await git.patchOf(workspace, previous, tree));
    writeFileSync(join(stepOut, 'commits.json'), '{\n  "messages": []\n}\n');
    const snapshot = tempDir('bench-reference-snap-');
    cpSync(workspace, snapshot, { recursive: true, filter: (source) => source !== join(workspace, '.git') });
    snapshots.set(index + 1, snapshot);
    previous = tree;
  }
  return { runDir, snapshots };
}
