import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { gitCli, systemProcess } from '../../src/core/index.js';
import type { DockerPort, ProcessResult, Scenario, ScoringContainerRequest } from '../../src/core/index.js';
import { loadScenario, prepareWorkspace } from '../../src/scenario/index.js';

import { repoPath } from './paths.js';
import { tempDir } from './scenario-fixture.js';

/** The campaign id and execution every stored-run fixture lives under. */
export const EXECUTION = 'abcdef012345/1';

/** Where the fixture's one run lives under its execution (REQ-FMT-06). */
export const RUN_PATH = join('runs', 'T3@1.0', 'baseline', 'fake-model', 'r1');

/** What a step writes: a file's content, or `null` to delete it. */
export type Files = Readonly<Record<string, string | Buffer | null>>;

export interface StoredRunFixture {
  /** The repository: `scenarios/T3` and `results/`. */
  readonly root: string;
  readonly executionDir: string;
  readonly runDir: string;
  readonly scenario: Scenario;
  /** The run's own workspace, as the runner left it: what each rebuilt snapshot must equal. */
  readonly workspace: string;
}

function write(directory: string, files: Files): void {
  for (const [path, content] of Object.entries(files)) {
    const target = join(directory, path);
    if (content === null) rmSync(target, { force: true });
    else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  }
}

/**
 * A run of T3 stored as the runner stores one since task-027, made with the real git: the seed commit,
 * the setup (`setup` files, and `setupCommits` the harness makes first) and one commit per step, each
 * with its binary-safe patch from the previous snapshot and its tree in `run.json`. A step is what it
 * wrote, or a list of what the agent committed itself before the runner's step commit (bug-007).
 * Fewer steps than T3's two is a run that stopped early.
 */
export async function storedRun(
  options: {
    steps: readonly (Files | readonly Files[])[];
    setup?: Files;
    setupCommits?: readonly Files[];
    outcome?: string;
  } = { steps: [] },
): Promise<StoredRunFixture> {
  const root = tempDir('bench-score-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  const loaded = loadScenario(join(root, 'scenarios'), 'T3', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  const scenario = loaded.value;
  const git = gitCli(systemProcess);
  const workspace = tempDir('bench-score-ws-');
  await prepareWorkspace(workspace, scenario, git);

  const executionDir = join(root, 'results', EXECUTION);
  const runDir = join(executionDir, RUN_PATH);
  mkdirSync(join(runDir, 'setup'), { recursive: true });
  const seedTree = await git.tree(workspace, 'HEAD');
  for (const [index, files] of (options.setupCommits ?? []).entries()) {
    write(workspace, files);
    await git.commitAll(workspace, `harness ${index + 1}`, { allowEmpty: true });
  }
  write(workspace, options.setup ?? { 'CLAUDE.md': 'The manual.\n' });
  await git.commitAll(workspace, 'setup', { allowEmpty: true });
  const setupTree = await git.tree(workspace, 'HEAD');
  writeFileSync(join(runDir, 'setup', 'diff.patch'), await git.patchOf(workspace, seedTree, setupTree));

  const steps: { n: number; outcome: string; tree: string }[] = [];
  let previous = setupTree;
  for (const [index, step] of options.steps.entries()) {
    const number = String(index + 1).padStart(2, '0');
    if (Array.isArray(step)) {
      for (const [commit, files] of (step as readonly Files[]).entries()) {
        write(workspace, files);
        await git.commitAll(workspace, `agent ${number}.${commit + 1}`, { allowEmpty: true });
      }
    } else write(workspace, step as Files);
    await git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
    const tree = await git.tree(workspace, 'HEAD');
    mkdirSync(join(runDir, 'steps', number), { recursive: true });
    writeFileSync(join(runDir, 'steps', number, 'diff.patch'), await git.patchOf(workspace, previous, tree));
    steps.push({ n: index + 1, outcome: 'completed', tree });
    previous = tree;
  }
  const outcome = options.outcome ?? (steps.length === scenario.steps.length ? 'completed' : 'failed');
  writeFileSync(
    join(runDir, 'run.json'),
    `${JSON.stringify(
      {
        campaign: 'abcdef012345',
        scenario: 'T3',
        version: '1.0',
        scenario_hash: scenario.hash,
        arm: 'baseline',
        model: 'fake-model',
        repetition: 1,
        setup: { duration_ms: 1, commit: await git.head(workspace), tree: setupTree },
        outcome,
        steps,
      },
      undefined,
      2,
    )}\n`,
  );
  return { root, executionDir, runDir, scenario, workspace };
}

/** A step that implements T3's cancellation, which its one hidden test checks. */
export const CANCEL: Files = {
  'src/orders.ts':
    "export type OrderStatus = 'pending' | 'shipped' | 'cancelled';\n\n" +
    'export interface Order {\n  readonly id: string;\n  readonly status: OrderStatus;\n}\n\n' +
    "export function cancel(order: Order): Order {\n  return { ...order, status: 'cancelled' };\n}\n",
};

/** T3's one hidden test, as the reporter names it. */
export const T3_TEST = {
  file: 'oracle/public/cancel.test.ts',
  path: ['cancelling an order', 'marks a pending order as cancelled'],
};

/** A reporter line (docker/score-image/reporter.mjs). */
export function reporterLine(
  test: { file: string; path: readonly string[] },
  status: 'pass' | 'fail' | 'skip' | 'todo',
): string {
  return `${JSON.stringify({ kind: 'test', file: test.file, path: test.path, status })}\n`;
}

/** Everything the scoring double saw, in order. */
export interface ScoringRecorded {
  readonly builds: string[];
  readonly creates: ScoringContainerRequest[];
  /** `source -> container:target`, one per copy. */
  readonly copies: string[];
  readonly execs: { container: string; command: string[] }[];
  readonly removes: string[];
}

/**
 * A Docker double for scoring (acceptance decision 1): `judge` answers a command in a scoring
 * container from the snapshot copied into it, as the scoring image would; by default T3's hidden test
 * passes when the snapshot's `src/orders.ts` cancels an order.
 */
export function scoringDocker(
  judge: (snapshot: string, command: readonly string[]) => ProcessResult = judgeT3,
): { docker: DockerPort; recorded: ScoringRecorded } {
  const recorded: ScoringRecorded = { builds: [], creates: [], copies: [], execs: [], removes: [] };
  const snapshots = new Map<string, string>();
  const unused = (): never => {
    throw new Error('not a scoring call');
  };
  const docker: DockerPort = {
    build: (request) => {
      recorded.builds.push(request.tag);
      return Promise.resolve();
    },
    createScoring: (request) => {
      recorded.creates.push(request);
      return Promise.resolve(`score-${recorded.creates.length}`);
    },
    start: () => Promise.resolve(),
    copyTo: (container, source, target) => {
      recorded.copies.push(`${source} -> ${container}:${target}`);
      snapshots.set(container, source);
      return Promise.resolve();
    },
    exec: (container, command) => {
      recorded.execs.push({ container, command: [...command] });
      return Promise.resolve(judge(snapshots.get(container) ?? '', command));
    },
    remove: (container) => {
      recorded.removes.push(container);
      return Promise.resolve();
    },
    create: unused,
    runOnce: unused,
    mountsOf: unused,
    containersNamed: unused,
  };
  return { docker, recorded };
}

/** T3's hidden test as the scoring image would judge it on `snapshot`. */
export function judgeT3(snapshot: string): ProcessResult {
  const file = join(snapshot, 'src', 'orders.ts');
  const passes = existsSync(file) && readFileSync(file, 'utf8').includes("status: 'cancelled'");
  return { code: passes ? 0 : 1, stdout: reporterLine(T3_TEST, passes ? 'pass' : 'fail'), stderr: '' };
}
