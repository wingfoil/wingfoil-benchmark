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
    /** What each step records beside its snapshot (task-029); by default {@link usageOf}. */
    record?: (n: number) => StepRecord;
    /**
     * Check files added to T3 before it is loaded (task-035), by path in the version directory, each
     * listed in `oracle.checks`. Not with `into`: the scenario is the existing fixture's.
     */
    checks?: Readonly<Record<string, string>>;
    /**
     * A scenario of the repository's own `scenarios/` to store a run of, in place of the fixture T3
     * (task-039), such as `S3`: its steps are then its reference's. With `into`, the one already there,
     * or copied in when the repository has none (task-042).
     */
    scenario?: string;
    /**
     * T3 copied under another id, with its own categories (task-045): a stand-in for a scenario of
     * another category. With `decisions`, its oracle lists them. With `into`, the one already there.
     */
    variant?: { readonly id: string; readonly primary: string };
    /**
     * The decisions T3's oracle lists (task-039), as the YAML of `oracle.decisions`. Not with `into`:
     * the scenario is the existing fixture's.
     */
    decisions?: string;
    /**
     * What the setup's `usage` records in `run.json` (task-040); by default an agentless setup's zeros,
     * as every v0.1 setup is (adr-003 decision 11).
     */
    setupUsage?: StepRecord['usage'];
    /** The manual's tokens `run.json` records (REQ-RUN-12); by default 3, and `null` for none recorded. */
    manualTokens?: number | null;
    /** A run stored before steps recorded their commit messages (task-035): no `commits.json`. */
    withoutMessages?: boolean;
    /**
     * Another run in an existing fixture's repository (task-034): its root, and where the run goes — by
     * default the fixture's execution, arm, model and repetition. A `dry-runs/<n>` execution records its
     * pins as a dry run's.
     */
    into?: {
      readonly root: string;
      readonly execution?: string;
      readonly arm?: string;
      readonly model?: string;
      readonly repetition?: number;
    };
  } = { steps: [] },
): Promise<StoredRunFixture> {
  const root = options.into?.root ?? tempDir('bench-score-repo-');
  const id = options.variant?.id ?? options.scenario ?? 'T3';
  // With `into`, a scenario the repository does not hold yet is copied in beside the others (task-042).
  if (options.into === undefined || !existsSync(join(root, 'scenarios', id))) {
    const source =
      id === 'T3' || options.variant !== undefined
        ? repoPath('test/fixtures/scenarios/T3')
        : repoPath(`scenarios/${id}`);
    cpSync(source, join(root, 'scenarios', id), { recursive: true });
    if (options.variant !== undefined) renameVariant(join(root, 'scenarios', id, '1.0'), options.variant);
    addChecks(join(root, 'scenarios', id, '1.0'), options.checks ?? {});
    if (options.decisions !== undefined) addDecisions(join(root, 'scenarios', id, '1.0'), options.decisions);
  }
  const execution = options.into?.execution ?? EXECUTION;
  const arm = options.into?.arm ?? 'baseline';
  const model = options.into?.model ?? 'fake-model';
  const repetition = options.into?.repetition ?? 1;
  const loaded = loadScenario(join(root, 'scenarios'), id, '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  const scenario = loaded.value;
  const git = gitCli(systemProcess);
  const workspace = tempDir('bench-score-ws-');
  await prepareWorkspace(workspace, scenario, git);

  const executionDir = join(root, 'results', execution);
  const runDir = join(executionDir, 'runs', `${id}@1.0`, arm, model, `r${repetition}`);
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

  const steps: Record<string, unknown>[] = [];
  const recordOf = options.record ?? defaultRecord;
  let previous = setupTree;
  for (const [index, step] of options.steps.entries()) {
    const number = String(index + 1).padStart(2, '0');
    const messages: string[] = [];
    if (Array.isArray(step)) {
      for (const [commit, files] of (step as readonly Files[]).entries()) {
        write(workspace, files);
        messages.push(`agent ${number}.${commit + 1}`);
        await git.commitAll(workspace, `agent ${number}.${commit + 1}`, { allowEmpty: true });
      }
    } else write(workspace, step as Files);
    await git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
    const tree = await git.tree(workspace, 'HEAD');
    mkdirSync(join(runDir, 'steps', number), { recursive: true });
    writeFileSync(join(runDir, 'steps', number, 'diff.patch'), await git.patchOf(workspace, previous, tree));
    if (options.withoutMessages !== true) {
      writeFileSync(
        join(runDir, 'steps', number, 'commits.json'),
        `${JSON.stringify({ messages }, undefined, 2)}\n`,
      );
    }
    const record = recordOf(index + 1);
    writeFileSync(
      join(runDir, 'steps', number, 'usage.json'),
      `${JSON.stringify(record.usage, undefined, 2)}\n`,
    );
    steps.push({
      n: index + 1,
      session: `session-${index + 1}`,
      outcome: record.outcome ?? 'completed',
      interventions: record.interventions ?? 0,
      usage: record.usage,
      tree,
      ...(record.costBoundUsd === undefined
        ? {}
        : { cost_reported: false, cost_bound_usd: record.costBoundUsd }),
    });
    previous = tree;
  }
  const outcome = options.outcome ?? (steps.length === scenario.steps.length ? 'completed' : 'failed');
  // The pins the execution ran with: the rate that converts a cost bound (task-029), and, for a
  // campaign, its default model, which tells its slices apart (task-034).
  if (execution.startsWith('dry-runs/')) {
    writeFileSync(join(executionDir, 'dry-run.yaml'), 'currency:\n  usd_to_eur: 0.5\n');
  } else {
    writeFileSync(
      join(executionDir, 'campaign.yaml'),
      'models:\n  default: fake-model\ncurrency:\n  usd_to_eur: 0.5\n',
    );
  }
  writeFileSync(
    join(runDir, 'run.json'),
    `${JSON.stringify(
      {
        ...(execution.startsWith('dry-runs/') ? { dry_run: true } : { campaign: execution.split('/')[0] }),
        scenario: id,
        version: '1.0',
        scenario_hash: scenario.hash,
        arm,
        model,
        repetition,
        ...(options.manualTokens === null
          ? {}
          : {
              manual: {
                file: 'CLAUDE.md',
                sha256: 'm'.repeat(64),
                bytes: 4 * (options.manualTokens ?? 3),
                tokens: options.manualTokens ?? 3,
                method: 'bytes-div-4',
                method_version: 1,
              },
            }),
        setup: {
          duration_ms: 1,
          usage: options.setupUsage ?? NO_USAGE,
          commit: await git.head(workspace),
          tree: setupTree,
        },
        outcome,
        steps,
      },
      undefined,
      2,
    )}\n`,
  );
  return { root, executionDir, runDir, scenario, workspace };
}

/** Give the copy of T3 in the version directory `dir` its own id and primary category (task-045). */
function renameVariant(dir: string, variant: { readonly id: string; readonly primary: string }): void {
  const yaml = join(dir, 'scenario.yaml');
  writeFileSync(
    yaml,
    readFileSync(yaml, 'utf8')
      .replace(/^id: T3$/m, `id: ${variant.id}`)
      .replace(/^  primary: C$/m, `  primary: ${variant.primary}`),
  );
}

/** Write `checks` into the version directory `dir` and list them in its `oracle.checks`. */
function addChecks(dir: string, checks: Readonly<Record<string, string>>): void {
  const paths = Object.keys(checks);
  if (paths.length === 0) return;
  write(dir, checks);
  const yaml = join(dir, 'scenario.yaml');
  writeFileSync(
    yaml,
    readFileSync(yaml, 'utf8').replace('holdout: true', `  checks: [${paths.join(', ')}]\nholdout: true`),
  );
}

/** List `decisions` in the version directory `dir`'s `oracle.decisions`. */
function addDecisions(dir: string, decisions: string): void {
  const yaml = join(dir, 'scenario.yaml');
  writeFileSync(
    yaml,
    readFileSync(yaml, 'utf8').replace('holdout: true', `  decisions: ${decisions}\nholdout: true`),
  );
}

/** What a step records beside its snapshot: its usage, outcome, interventions and cost bound. */
export interface StepRecord {
  readonly usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    costUsd: number;
    costEur: number;
    turns: number;
    durationMs: number;
  };
  readonly outcome?: string;
  readonly interventions?: number;
  readonly costBoundUsd?: number;
}

/** An agentless setup's usage: every figure zero. */
const NO_USAGE: StepRecord['usage'] = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costUsd: 0,
  costEur: 0,
  turns: 0,
  durationMs: 0,
};

/** Step `n`'s usage by default: every figure a multiple of `n`, at the fixture's rate of 0.5 EUR/USD. */
export function usageOf(n: number): StepRecord['usage'] {
  return {
    inputTokens: 10 * n,
    outputTokens: 100 * n,
    cacheCreationInputTokens: 1000 * n,
    cacheReadInputTokens: 10000 * n,
    costUsd: 0.1 * n,
    costEur: 0.05 * n,
    turns: 3 * n,
    durationMs: 1000 * n,
  };
}

function defaultRecord(n: number): StepRecord {
  return { usage: usageOf(n), interventions: n - 1 };
}

/** A step that implements T3's cancellation, which its one hidden test checks. */
export const CANCEL: Files = {
  'src/orders.ts':
    "export type OrderStatus = 'pending' | 'shipped' | 'cancelled';\n\n" +
    'export interface Order {\n  readonly id: string;\n  readonly status: OrderStatus;\n}\n\n' +
    "export function cancel(order: Order): Order {\n  return { ...order, status: 'cancelled' };\n}\n",
};

/** What the image's quality.mjs says of any snapshot, in the scoring double (task-041). */
export const QUALITY = {
  lint: { findings: 1, lines: 10 },
  complexity: { functions: 1, sum: 1, max: 1 },
  duplication: { duplicated_lines: 0, lines: 10 },
  coverage: { covered: 0, total: 6, tests: 'none' },
};

/** What the image's interface.mjs says of any snapshot, in the scoring double (task-042). */
export const INTERFACE = ['src/orders.ts: export function cancel(order: Order): Order;'];

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
      // The image's static-quality measure (task-041) says the same of every snapshot here.
      if (command.some((argument) => argument.includes('quality.mjs'))) {
        return Promise.resolve({ code: 0, stdout: `${JSON.stringify(QUALITY)}\n`, stderr: '' });
      }
      // And its public-interface extraction (task-042).
      if (command.some((argument) => argument.includes('interface.mjs'))) {
        const stdout = INTERFACE.map((entry) => `${JSON.stringify(entry)}\n`).join('');
        return Promise.resolve({ code: 0, stdout, stderr: '' });
      }
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

/** What a T3 hold-out holds (task-028): two tests whose names and content must never be printed. */
export const HOLDOUT_SECRET = 'HOLDOUT-SECRET-5e1f';

/** A hold-out checkout with T3's additions under its suite `orders`, in a temporary directory. */
export function t3Holdout(): string {
  const root = tempDir('bench-holdout-');
  const dir = join(root, 'scenarios', 'T3', '1.0', 'orders');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'refund.test.ts'), `// ${HOLDOUT_SECRET}\n`);
  return root;
}

/** The two hold-out tests as the reporter names them, from the hold-out's mount beside the suite. */
export const HOLDOUT_TESTS = [
  { file: 'oracle/public.holdout/refund.test.ts', path: [`${HOLDOUT_SECRET} refunds a cancelled order`] },
  { file: 'oracle/public.holdout/refund.test.ts', path: [`${HOLDOUT_SECRET} keeps the shipping fee`] },
];

/**
 * T3's hidden tests as the scoring image would judge them on `snapshot`: the public one, or — when the
 * command runs the hold-out's files — the two hold-out ones: the first passes where the public one
 * does, the second never.
 */
export function judgeT3(snapshot: string, command: readonly string[] = []): ProcessResult {
  if (command.some((argument) => argument.includes('.holdout/'))) {
    const file = join(snapshot, 'src', 'orders.ts');
    const cancels = existsSync(file) && readFileSync(file, 'utf8').includes("status: 'cancelled'");
    const [first, second] = HOLDOUT_TESTS as [(typeof HOLDOUT_TESTS)[0], (typeof HOLDOUT_TESTS)[0]];
    return {
      code: 1,
      stdout: reporterLine(first, cancels ? 'pass' : 'fail') + reporterLine(second, 'fail'),
      stderr: `AssertionError: ${HOLDOUT_SECRET}\n`,
    };
  }
  return judgePublic(snapshot);
}

function judgePublic(snapshot: string): ProcessResult {
  const file = join(snapshot, 'src', 'orders.ts');
  const passes = existsSync(file) && readFileSync(file, 'utf8').includes("status: 'cancelled'");
  return { code: passes ? 0 : 1, stdout: reporterLine(T3_TEST, passes ? 'pass' : 'fail'), stderr: '' };
}
