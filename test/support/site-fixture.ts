import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgentPort } from '../../src/agents/index.js';
import { armDigest } from '../../src/arms/index.js';
import { main } from '../../src/cli/index.js';
import { fail, gitCli, ok, publishCli, systemProcess } from '../../src/core/index.js';
import type { ProcessResult, PublishPort } from '../../src/core/index.js';

import { repoPath } from './paths.js';
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
  completeExecution(root, first.executionDir);
  const holdout = standInHoldout();
  const scored = await benchSite(root, 'score', EXECUTION, '--holdout', holdout);
  if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
  return { root, executionDir: first.executionDir, holdout };
}

/** The campaign file an execution of `ids` is said to have run (task-046): every pin and the budget. */
export function siteCampaign(ids: readonly string[]): string {
  return `# The site fixture's campaign (task-046).
harnesses:
  wingfoil:
    tool: wingfoil
    version: 3df305e
scenarios:
${ids.map((id) => `  - { id: ${id}, version: '1.0' }\n`).join('')}arms: [baseline, wingfoil]
agent:
  name: fake
  version: 1.0.0
models:
  default: fake-model
repetitions: { ${ids.map((id) => `${id}: 1`).join(', ')} }
approver_policy: v1
caps:
  step_time_s: 600
  step_tokens: 1000000
  run_cost_eur: 5
budget:
  warn_eur: 10
  ceiling_eur: 20
currency:
  usd_to_eur: 0.5
`;
}

/** The SHA-256 of a file, as `run.json` records a manual's (REQ-RUN-12). */
export function sha256Of(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/**
 * Make the stored execution of `ids` under `root` what a campaign leaves (task-046): the repository's
 * `arms/` and `site-content/`, each run's manual recorded with the SHA-256 of its arm's `manual.md`, and
 * the full campaign file.
 */
export function completeExecution(
  root: string,
  executionDir: string,
  ids: readonly string[] = STAND_INS.map((standIn) => standIn.id),
): void {
  cpSync(repoPath('arms'), join(root, 'arms'), { recursive: true });
  cpSync(repoPath('site-content'), join(root, 'site-content'), { recursive: true });
  cpSync(repoPath('eligibility'), join(root, 'eligibility'), { recursive: true });
  writeFileSync(join(executionDir, 'campaign.yaml'), siteCampaign(ids));
  for (const id of ids) {
    for (const arm of ['baseline', 'wingfoil']) {
      const file = join(executionDir, 'runs', `${id}@1.0`, arm, 'fake-model', 'r1', 'run.json');
      if (!existsSync(file)) continue;
      const run = JSON.parse(readFileSync(file, 'utf8')) as { manual: Record<string, unknown> };
      run.manual = { ...run.manual, sha256: sha256Of(join(root, 'arms', arm, 'manual.md')) };
      // The arm the run recorded (REQ-FMT-13): the repository's, which the setup page is published from.
      (run as Record<string, unknown>).arm_digest = armDigest(root, arm);
      writeFileSync(file, `${JSON.stringify(run, undefined, 2)}\n`);
    }
  }
}

/** A visibility probe for tests: public, or private (task-047). No test reaches GitHub. */
export function probeSaying(isPublic: boolean): PublishPort['isPublic'] {
  return () =>
    Promise.resolve(
      isPublic ? ok(true as const) : fail([{ path: 'origin', message: 'the probe says private' }]),
    );
}

/** `bench <argv>` in `root`, with the publish port's git real and its visibility probe `isPublic`. */
export async function benchPublish(root: string, isPublic: PublishPort['isPublic'], ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    {
      docker: scoringDocker(judge).docker,
      git: gitCli(systemProcess),
      agent: NO_AGENT,
      publish: { ...publishCli(systemProcess), isPublic },
    },
    root,
  );
  return { code, stdout, stderr };
}

/** git in `cwd`, failing loudly; for the fixture's own setup. */
export function gitIn(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/**
 * A built site in a repository whose `origin` is a local bare repository (task-047): the stored
 * execution of {@link siteExecution}, built, and the root made a git repository with one commit.
 */
export async function publishableSite(): Promise<{ root: string; bare: string; executionDir: string }> {
  const { root, executionDir } = await siteExecution();
  const built = await benchSite(root, 'site', 'build', EXECUTION);
  if (built.code !== 0) throw new Error(built.stderr);
  const bare = tempDir('bench-pages-remote-');
  gitIn(bare, 'init', '--bare', '--quiet');
  gitIn(root, 'init', '--quiet');
  gitIn(root, 'config', 'user.name', 'Fixture Maintainer');
  gitIn(root, 'config', 'user.email', 'maintainer@example.test');
  writeFileSync(join(root, '.gitignore'), '/site/\n/releases/\n');
  gitIn(root, 'add', '-A');
  gitIn(root, 'commit', '--quiet', '-m', 'results');
  gitIn(root, 'remote', 'add', 'origin', bare);
  return { root, bare, executionDir };
}
