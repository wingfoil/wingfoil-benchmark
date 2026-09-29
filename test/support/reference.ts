import { cpSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

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
