import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';

import { CANCEL, EXECUTION, scoringDocker, storedRun } from './score-fixture.js';

/** The WingFoil commit the fixture's wingfoil runs record (REQ-RUN-14). */
export const WINGFOIL_COMMIT = '3df305ea198d0123456789abcdef0123456789ab';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('no agent')),
  resume: () => Promise.reject(new Error('no agent')),
};

/** `bench <argv>` in `root`, with the scoring double; its exit code and output. */
export async function bench(root: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker: scoringDocker().docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr };
}

/**
 * An execution of T3, scored and aggregated (task-044): the baseline arm's one run cancels orders; the
 * wingfoil arm's two runs record WingFoil at {@link WINGFOIL_COMMIT}, the first cancelling orders and the
 * second not. Its repository root and execution directory.
 */
export async function aggregatedExecution(): Promise<{ root: string; executionDir: string }> {
  const base = await storedRun({ steps: [{}, CANCEL] });
  const runs = [
    await storedRun({ steps: [{}, CANCEL], into: { root: base.root, arm: 'wingfoil', repetition: 1 } }),
    await storedRun({ steps: [{}, {}], into: { root: base.root, arm: 'wingfoil', repetition: 2 } }),
  ];
  for (const run of runs) {
    const file = join(run.runDir, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(
      file,
      JSON.stringify({ ...record, harness: { tool: 'wingfoil', commit: WINGFOIL_COMMIT } }),
    );
  }
  const scored = await bench(base.root, 'score', EXECUTION);
  if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
  return { root: base.root, executionDir: base.executionDir };
}
