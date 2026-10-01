import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import type { ProcessResult } from '../../src/core/index.js';

import { tempDir } from './scenario-fixture.js';
import {
  CANCEL,
  EXECUTION,
  HOLDOUT_SECRET,
  judgeT3,
  reporterLine,
  scoringDocker,
  storedRun,
  T3_TEST,
} from './score-fixture.js';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('no agent')),
  resume: () => Promise.reject(new Error('no agent')),
};

/** The three stand-ins of the site's execution: T3 copied under each id, with its primary category. */
export const STAND_INS = [
  { id: 'TC', primary: 'C' },
  { id: 'TD', primary: 'D' },
  { id: 'TF', primary: 'F' },
] as const;

/**
 * T3's one hidden test under a name that makes it decision D1's (REQ-SCO-12): its last path element
 * starts with `D1:`. Every stand-in reports it, and only TF lists the decision.
 */
const D1_TEST = {
  file: T3_TEST.file,
  path: ['cancelling an order', 'D1: marks a pending order as cancelled'],
};

/** T3's judge, with the public test named as {@link D1_TEST}; the hold-out's answers are T3's. */
function judge(snapshot: string, command: readonly string[] = []): ProcessResult {
  const answer = judgeT3(snapshot, command);
  if (command.some((argument) => argument.includes('.holdout/'))) return answer;
  return { ...answer, stdout: reporterLine(D1_TEST, answer.code === 0 ? 'pass' : 'fail') };
}

/** `bench <argv>` in `root`, with the scoring double answering as {@link judge}. */
export async function benchSite(root: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker: scoringDocker(judge).docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr };
}

/** A hold-out checkout with T3's additions under each stand-in's suite `orders`. */
export function standInHoldout(): string {
  const root = tempDir('bench-site-holdout-');
  for (const { id } of STAND_INS) {
    const dir = join(root, 'scenarios', id, '1.0', 'orders');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'refund.test.ts'), `// ${HOLDOUT_SECRET}\n`);
  }
  return root;
}

/**
 * An execution scored with the hold-out and aggregated (task-045), one run per arm and stand-in, so
 * every value is n = 1:
 * - **TC (C):** both arms cancel orders: the same;
 * - **TD (D):** the baseline cancels and wingfoil does not: wingfoil loses on M-Q1;
 * - **TF (F):** wingfoil cancels and the baseline does not, so decision D1 holds in wingfoil only:
 *   wingfoil wins on M-F1.
 *
 * Its repository root, execution directory and hold-out checkout.
 */
export async function siteExecution(): Promise<{ root: string; executionDir: string; holdout: string }> {
  const first = await storedRun({ variant: STAND_INS[0], steps: [{}, CANCEL] });
  const root = first.root;
  await storedRun({ variant: STAND_INS[0], steps: [{}, CANCEL], into: { root, arm: 'wingfoil' } });
  await storedRun({ variant: STAND_INS[1], steps: [{}, CANCEL], into: { root } });
  await storedRun({ variant: STAND_INS[1], steps: [{}, {}], into: { root, arm: 'wingfoil' } });
  await storedRun({ variant: STAND_INS[2], decisions: '[{ id: D1 }]', steps: [{}, {}], into: { root } });
  await storedRun({ variant: STAND_INS[2], steps: [{}, CANCEL], into: { root, arm: 'wingfoil' } });
  const holdout = standInHoldout();
  const scored = await benchSite(root, 'score', EXECUTION, '--holdout', holdout);
  if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
  return { root, executionDir: first.executionDir, holdout };
}
