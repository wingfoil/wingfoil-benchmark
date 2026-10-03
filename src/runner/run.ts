import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scrub } from '../agents/index.js';
import type { AgentPort, SessionUsage, StepOutcome } from '../agents/index.js';
import { approverPolicy, approximateTokens, reasonOf, TOKEN_METHOD, WORKSPACE } from '../core/index.js';
import type {
  ApproverPolicy,
  Arm,
  CampaignFile,
  DockerPort,
  GitPort,
  InterventionKind,
  Scenario,
} from '../core/index.js';
import { nextExecution } from '../results/index.js';
import { missingCapabilities } from '../arms/index.js';
import { prepareWorkspace } from '../scenario/index.js';

import type { CheckedCampaign } from './campaign.js';
import { campaignKeys } from './estimate.js';
import { prepareHarnesses } from './harness.js';
import { AGENT_IDENTITY } from './identity.js';
import { GENERATED_ARM, prepareProjectRules, PROJECT_RULES } from './project-rules.js';
import type { HarnessArtefact } from './harness.js';
import { copyEnvironment } from './workspace.js';

/** The ports a campaign runs against (REQ-ARC-04), and where its output goes. */
export interface RunnerOptions {
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly agent: AgentPort;
  /** One line per event, for the command line. */
  readonly log?: (line: string) => void;
  /** One line per failure; the command line sends these to its error stream. */
  readonly logError?: (line: string) => void;
  /** What every container of this campaign gets in its environment: the agent's credential. */
  readonly containerEnv?: Readonly<Record<string, string>>;
  /**
   * The values to remove from everything this run stores (REQ-NFR-01). Named explicitly rather than
   * derived from {@link containerEnv}: from W3 that environment also carries an arm's own settings,
   * and scrubbing a value like `C` or `en_US` would corrupt every patch instead of protecting it.
   */
  readonly secrets?: readonly string[];
  /**
   * The local clone of each harness tool, by the name an arm `requires` (W3 plan-phase decision 3):
   * the WingFoil under test is built from it by SHA (REQ-RUN-14).
   */
  readonly harnessSources?: Readonly<Record<string, string>>;
  /** Waits `ms` milliseconds: a rate limit's waits (task-051). Injected so that tests do not wait. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** The clock a step's time cap is read from, in milliseconds; `performance.now` unless injected (task-051). */
  readonly now?: () => number;
}

/**
 * A rate limit's waits, in seconds (REQ-RUN-13 as amended in 1.24, task-051): after each, the step's session is
 * resumed with {@link RATE_LIMIT_MESSAGE}; after the last, the step ends `quota exhausted`. About 52 minutes in all,
 * a constant of the runner (the approver's choice), each wait recorded in `run.json`.
 */
export const RATE_LIMIT_WAITS_S: readonly number[] = [120, 300, 900, 1800];

/** What a session the rate limit stopped is resumed with: no scenario's prompt, no approver's reply. */
export const RATE_LIMIT_MESSAGE = 'Continue.';

/** One wait of a rate-limited step: after which of the step's invocations, and for how long. */
export interface RateLimitWait {
  readonly afterInvocation: number;
  readonly waitedS: number;
}

/** One reply of the neutral approver (REQ-RUN-07): the step, what was asked for, and what was sent. */
export interface Intervention {
  readonly step: number;
  readonly kind: InterventionKind;
  readonly reply: string;
}

/**
 * How a step ended. `intervention cap reached`, `time cap reached` and `token cap reached` are not
 * failures: the step ends and is scored as it stands (experiment design §3.5–3.6), and the run goes
 * on. `cap reached` (the run's cost cap) and `quota exhausted` end the run there (task-024, F1.3,
 * REQ-RUN-13), with the step's snapshot kept; only `failed` fails it.
 */
export type StepOutcomeKind =
  | 'completed'
  | 'intervention cap reached'
  | 'time cap reached'
  | 'token cap reached'
  | 'cap reached'
  | 'quota exhausted'
  | 'failed';

/** How a run ended: every step done, stopped at its cost cap or at the quota, or failed. */
export type RunOutcomeKind = 'completed' | 'cap reached' | 'quota exhausted' | 'failed';

/** One step, with every invocation of the agent it took: its session and the approver's resumes. */
export interface StepResult {
  readonly n: number;
  /** The session the step ran in; every resume continued it. */
  readonly sessionId: string;
  /** The step's invocations together: their work summed, and the session's latest cost. */
  readonly usage: SessionUsage;
  /** The invocations' transcripts, in order: a resume does not replay earlier turns (decision 10). */
  readonly transcript: readonly string[];
  readonly outcome: StepOutcomeKind;
  readonly interventions: readonly Intervention[];
  /** The tree of the step's commit (task-027): what scoring checks the snapshot it rebuilds against. */
  readonly tree?: string;
  /** The step's commit, which the next step's commit messages are read from (task-035). */
  readonly commit?: string;
  readonly error?: string;
  /**
   * For a step whose last invocation was killed at `step_time_s` and reported no cost (task-024, C3):
   * the most it can have cost, in USD — its session's cost before that invocation plus the
   * `--max-budget-usd` the invocation was given. The budget counts this, never less.
   */
  readonly costBoundUsd?: number;
  /** The rate limit's waits the step went through (task-051), when there were any. */
  readonly rateLimitWaits?: readonly RateLimitWait[];
}

/**
 * The setup phase of a run (REQ-RUN-03): how long the arm's setup took and what it cost, apart from
 * the steps. A v0.1 setup runs no agent, so its usage is zero (adr-003 decision 11). `commit` is the
 * `setup` commit the first step starts from; `code` is the script's exit code when it failed.
 */
export interface SetupResult {
  readonly durationMs: number;
  readonly usage: SessionUsage;
  readonly commit?: string;
  /** The tree of the `setup` commit (task-027), beside its patch, `setup/diff.patch`. */
  readonly tree?: string;
  readonly code?: number;
}

/**
 * The arm's operating manual as the run received it (REQ-RUN-12, F2.7): its size, by the fixed
 * approximation, and the digest of the text measured.
 */
export interface ManualRecord {
  readonly sha256: string;
  readonly bytes: number;
  readonly tokens: number;
}

/** One executed run: one scenario, in one arm, with one model, once. */
export interface RunResult {
  readonly scenario: string;
  readonly version: string;
  /** The version's content hash when it ran (REQ-FMT-09). */
  readonly scenarioHash: string;
  readonly arm: string;
  readonly model: string;
  readonly repetition: number;
  readonly workspace: string;
  /** Where this run's output goes: `steps/<NN>/…` under the execution's results (REQ-FMT-06). */
  readonly outputDir: string;
  /** The arm's setup, once it has run; absent when the run failed before it. */
  readonly setup?: SetupResult;
  /** The arm's operating manual, measured (REQ-RUN-12). */
  readonly manual?: ManualRecord;
  /** The harness the arm's setup installed, for an arm that requires one (adr-003 decision 4). */
  readonly harness?: HarnessArtefact;
  /** What the arm's harness was taken to provide (REQ-FMT-10), for an arm that requires one. */
  readonly provides?: Readonly<Record<string, boolean>>;
  /** The scenario's capabilities the harness lacks (F3.6): the run is executed and scored, and marked. */
  readonly expectedFailure?: { readonly missing: readonly string[] };
  readonly steps: readonly StepResult[];
  readonly outcome: RunOutcomeKind;
  readonly error?: string;
}

/** What a run is pinned to, whether a campaign file or a dry-run profile pins it (task-021). */
export type RunPins = Pick<CampaignFile, 'harnesses' | 'agent' | 'approver_policy' | 'caps' | 'currency'>;

/** One run to execute: one scenario, in one arm, with one model, once. */
export interface PlannedRun {
  readonly scenario: Scenario;
  readonly arm: Arm;
  readonly model: string;
  readonly repetition: number;
}

/**
 * What an execution runs (task-021 Design): a campaign's runs, or a dry run's one, through the same
 * code. `arms` are every arm loaded — those that run and those an environment is generated from — and
 * `scenarios` every scenario that runs; `runs` is what actually runs, in order.
 */
export interface RunPlan {
  /** What the execution is, in its log and in a leftover's message: `campaign` or `dry run`. */
  readonly noun: string;
  /** The image's tag and the stem of every container's name (REQ-FMT-02 for a campaign). */
  readonly id: string;
  readonly pins: RunPins;
  readonly repoRoot: string;
  readonly resultsRoot: string;
  /** The directory the executions are numbered in, under `results/` and `runs/`. */
  readonly key: string;
  /** The file the execution ran from, copied into its results under `name`. */
  readonly source: { readonly file: string; readonly name: string };
  readonly scenarios: readonly Scenario[];
  readonly arms: readonly Arm[];
  readonly runs: readonly PlannedRun[];
  /** What each `run.json` says the run belonged to (REQ-RES-01: a dry run is never a campaign's). */
  readonly origin: { readonly campaign: string } | { readonly dry_run: true };
  /** The campaign's `ceiling_eur`: no run starts once the runs so far have spent it (task-024). */
  readonly ceilingEur?: number;
}

/** What one execution of a campaign or a dry run produced. */
export interface RunSummary {
  /** The execution number `n` of `<campaign-id>/<n>` (REQ-FMT-02). */
  readonly execution: number;
  readonly resultsDir: string;
  readonly runs: readonly RunResult[];
  /**
   * How the execution ended (task-024): every planned run started, or it stopped starting them —
   * `budget exhausted` at the ceiling, `quota exhausted` at the subscription's limit (REQ-RUN-13).
   */
  readonly outcome: 'completed' | 'budget exhausted' | 'quota exhausted';
  /** Whether every planned run ran and completed. */
  readonly completed: boolean;
}

/** The Dockerfile of the run image, relative to the package root (REQ-RUN-01). */
const RUN_IMAGE_DIRECTORY = 'docker/run-image';

/** Runs execute as this unprivileged user of the image (REQ-RUN-02). */
const CONTAINER_USER = 'node';

/** Where an arm's directory is copied in the container: its user's home, outside the workspace. */
const ARM_DIR = '/home/node/arm';

/** Where the harness artefact is copied in the container, for the arm's setup to install. */
const HARNESS_ARTEFACT = '/home/node/harness.tgz';

/** Where a scenario's configuration for the arm is copied in the container (dl-005). */
const SCENARIO_DIR = '/home/node/scenario';

/** Where an arm's MCP configuration is copied in the container (adr-003 decision 12). */
const MCP_CONFIG = '/home/node/mcp.json';

/** Where the arm's operating manual goes in the workspace, where the agent reads it (REQ-RUN-12). */
const MANUAL_FILE = 'CLAUDE.md';

/** The runner's commit that ends the setup phase, always present, possibly empty (adr-003 decision 10). */
const SETUP_COMMIT = 'setup';

/** A setup's usage: it runs no agent in v0.1 (adr-003 decision 11). */
const NO_USAGE: SessionUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costUsd: 0,
  costEur: 0,
  turns: 0,
  durationMs: 0,
};

/**
 * What every container's agent gets in its environment besides the credential (bug-006, task-019):
 * Claude Code's auto-memory turned off. Without it, 2.1.280 writes notes under
 * `~/.claude/projects/<project>/memory/` that a later session reads — state carried between steps
 * outside the repository (REQ-RUN-04). task-019 saw the agent honour the variable. Not a secret.
 */
const AGENT_ENVIRONMENT: Readonly<Record<string, string>> = { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };

/**
 * Run in the container before every step's first session, whatever the agent (bug-006): its
 * auto-memory, if any, removed; the rest of `~/.claude/projects/`, which `--resume` needs within a
 * step, kept.
 */
const CLEAR_AUTO_MEMORY = ['sh', '-c', 'rm -rf "$HOME"/.claude/projects/*/memory'];

/** A step that was not started: nothing was left of the run's cost cap (task-024). */
const CAP_REACHED = 'cap reached';

/** `timeout`'s exit code when it stopped the command, and the one when it had to kill it. */
const TIMED_OUT = 124;
const KILLED = 137;

/** How long `timeout` waits after its TERM before it kills the invocation (task-024). */
const KILL_AFTER_S = 10;

/** How many lines of a failing setup's error output its run's error keeps. */
const SETUP_ERROR_LINES = 5;

/**
 * A step's number as it appears in a commit message and in a path (REQ-RUN-05, REQ-FMT-06), so that
 * both name a step the same way.
 */
function stepNumber(step: number): string {
  return String(step).padStart(2, '0');
}

/**
 * Run every scenario × arm × repetition of `checked` (REQ-RUN-01, REQ-RUN-02): one image per
 * campaign, one container per run, whose only bind mount is that run's workspace. A failed run does
 * not stop the campaign (REQ-NFR-03).
 */
export async function runCampaign(checked: CheckedCampaign, options: RunnerOptions): Promise<RunSummary> {
  return runPlan(campaignPlan(checked), options);
}

/**
 * A campaign's plan: every key the campaign file describes — the default model over every scenario ×
 * arm, then each model slice over its scenarios × arms (task-025) — in its repetitions. The keys are
 * the estimate's own (`campaignKeys`), so that what is priced is what runs.
 */
function campaignPlan(checked: CheckedCampaign): RunPlan {
  const { campaign, scenarios, arms } = checked;
  const runs = campaignKeys(checked).flatMap(({ scenario, arm: name, model, repetitions }) => {
    // Every key names one of the campaign's arms, all of them loaded by the campaign check.
    const arm = arms.find((loaded) => loaded.name === name) as Arm;
    return Array.from({ length: repetitions }, (_, index) => ({
      scenario,
      arm,
      model,
      repetition: index + 1,
    }));
  });
  return {
    noun: 'campaign',
    id: campaign.id,
    pins: campaign.spec,
    repoRoot: campaign.repoRoot,
    resultsRoot: campaign.resultsRoot,
    key: campaign.id,
    source: { file: campaign.file, name: 'campaign.yaml' },
    scenarios,
    arms,
    runs,
    origin: { campaign: campaign.id },
    ceilingEur: campaign.spec.budget.ceiling_eur,
  };
}

/**
 * Execute `plan` (REQ-RUN-01, REQ-RUN-02): one image, every harness and generated environment before
 * any run, then one container per run, whose only bind mount is that run's workspace. A failed run
 * does not stop the others (REQ-NFR-03).
 */
export async function runPlan(plan: RunPlan, options: RunnerOptions): Promise<RunSummary> {
  const execution = nextExecution(plan.resultsRoot, plan.key);
  const resultsDir = join(plan.resultsRoot, plan.key, String(execution));
  mkdirSync(resultsDir, { recursive: true });
  options.log?.(`${plan.noun} ${plan.id}, execution ${execution}`);
  copyFileSync(plan.source.file, join(resultsDir, plan.source.name));

  // Before anything is built: what earlier, interrupted runs of this plan left behind (bug-003).
  const leftovers = await leftBehind(plan, execution, options);

  await options.docker.build({
    dockerfile: join(packageRoot(), RUN_IMAGE_DIRECTORY, 'Dockerfile'),
    context: join(packageRoot(), RUN_IMAGE_DIRECTORY),
    tag: plan.id,
    buildArgs: { AGENT_NAME: plan.pins.agent.name, AGENT_VERSION: plan.pins.agent.version },
  });
  // Every harness before any run: an arm never runs without the one it requires (REQ-RUN-14).
  const harnesses = await prepareHarnesses(
    { id: plan.id, repoRoot: plan.repoRoot, arms: plan.arms, harnesses: plan.pins.harnesses },
    options,
  );
  // The baseline-docs environment of every scenario, from the wingfoil configuration (REQ-RUN-11).
  const projectRules = await prepareProjectRules(plan, harnesses, resultsDir, options);

  const runs: RunResult[] = [];
  let outcome: RunSummary['outcome'] = 'completed';
  let spent = 0;
  for (const { scenario, arm, model, repetition } of plan.runs) {
    // The campaign's ceiling, while it runs (REQ-RUN-08): no run starts once the runs so far spent it.
    if (plan.ceilingEur !== undefined && spent >= plan.ceilingEur) {
      outcome = 'budget exhausted';
      options.log?.(`${plan.noun} ${plan.id}: budget exhausted, ${spent} of ${plan.ceilingEur} EUR spent`);
      break;
    }
    const run = await executeRun(
      {
        plan,
        scenario,
        arm,
        model,
        repetition,
        execution,
        resultsDir,
        leftovers,
        ...(arm.requires === undefined ? {} : { harness: harnesses.get(arm.requires) }),
        ...(arm.name === GENERATED_ARM
          ? { projectRules: projectRules.get(`${scenario.id}@${scenario.version}`) }
          : {}),
      },
      options,
    );
    runs.push(run);
    spent += spentEur(run.steps, plan.pins);
    // The subscription's quota ends the campaign's runs, not only this one (REQ-RUN-13).
    if (run.outcome === 'quota exhausted') {
      outcome = 'quota exhausted';
      break;
    }
  }
  const completed = outcome === 'completed' && runs.length === plan.runs.length;
  return {
    execution,
    resultsDir,
    runs,
    outcome,
    completed: completed && runs.every((run) => run.outcome === 'completed'),
  };
}

interface RunContext {
  readonly plan: RunPlan;
  readonly scenario: Scenario;
  readonly arm: Arm;
  readonly model: string;
  readonly repetition: number;
  readonly execution: number;
  readonly resultsDir: string;
  /** Containers of this plan that already exist, by name, with their execution and state. */
  readonly leftovers: ReadonlyMap<string, Leftover>;
  /** The harness the arm requires, built for this execution. */
  readonly harness?: HarnessArtefact | undefined;
  /** The generated `PROJECT_RULES.md` of the scenario, for the baseline-docs arm (REQ-RUN-11). */
  readonly projectRules?: string | undefined;
}

/** One run: its own workspace, its own container, removed whatever happens. */
async function executeRun(context: RunContext, options: RunnerOptions): Promise<RunResult> {
  const { plan, scenario, arm, model, repetition, execution, resultsDir } = context;
  const name = `${scenario.id}@${scenario.version}/${arm.name}/${model}/r${repetition}`;
  const workspace = join(plan.repoRoot, 'runs', plan.key, String(execution), ...name.split('/'), 'workspace');
  // The workspace is debris to look at (git-ignored); the output is the run's record (REQ-FMT-06).
  const outputDir = join(resultsDir, 'runs', ...name.split('/'));
  const { harness } = context;
  // Decided before anything runs, from the scenario and the arm alone (F3.6, task-030).
  const missing = missingCapabilities(scenario, arm);
  const identity = {
    ...(harness === undefined ? {} : { harness }),
    ...(arm.requires === undefined ? {} : { provides: arm.provides }),
    ...(missing.length === 0 ? {} : { expectedFailure: { missing } }),
    manual: measure(readFileSync(arm.manualPath, 'utf8')),
    scenario: scenario.id,
    version: scenario.version,
    scenarioHash: scenario.hash,
    arm: arm.name,
    model,
    repetition,
    workspace,
    outputDir,
  };
  options.log?.(
    missing.length === 0 ? `run ${name}` : `run ${name}: expected failure (missing ${missing.join(', ')})`,
  );

  const steps: StepResult[] = [];
  let container: string | undefined;
  let setup: SetupResult | undefined;
  try {
    // The campaign's validation refuses a version this runner does not implement; this is the type's
    // proof of it, and the guard if a campaign ever reached a run by another path.
    const policy = approverPolicy(plan.pins.approver_policy);
    if (policy === undefined) {
      throw new Error(`the approver policy ${plan.pins.approver_policy} is not implemented`);
    }
    const containerName = `${containerPrefix(plan.id)}${execution}-${name.replaceAll(/[@/]/g, '-')}`;
    const stale = context.leftovers.get(containerName);
    // Reported, never removed: the runner does not destroy what this run did not create (bug-003,
    // approver's choice). The campaign goes on to its next run (REQ-NFR-03).
    if (stale !== undefined) {
      throw new Error(
        stale.running
          ? `container ${containerName} already exists and is running: another invocation of this ` +
              `${plan.noun} may be using it. If none is, remove it with: docker rm --force ${containerName}`
          : `container ${containerName} already exists: an interrupted run of execution ` +
              `${stale.execution} of this ${plan.noun} left it behind (bug-003). Remove it with: ` +
              `docker rm --force ${containerName}`,
      );
    }
    await prepareWorkspace(workspace, scenario, options.git);
    // Every stored patch runs from one snapshot's tree to the next (task-027, bug-007).
    const seedTree = await options.git.tree(workspace, 'HEAD');
    container = await options.docker.create({
      image: plan.id,
      name: containerName,
      workspace,
      user: CONTAINER_USER,
      env: { ...AGENT_ENVIRONMENT, ...options.containerEnv },
    });
    await assertOnlyWorkspaceMounted(container, workspace, options);
    await options.docker.start(container);
    setup = await executeSetup(
      arm,
      {
        container,
        workspace,
        outputDir,
        seedTree,
        ...(harness === undefined ? {} : { harness: harness.installed }),
        ...(scenario.armDirs[arm.name] === undefined ? {} : { scenarioDir: scenario.armDirs[arm.name] }),
        ...(context.projectRules === undefined ? {} : { projectRules: context.projectRules }),
      },
      options,
    );
    if (setup.code !== undefined) throw new Error(setupFailure(arm, setup.code, outputDir));
    const mcpConfig = arm.mcpPath === undefined ? undefined : MCP_CONFIG;
    let previousTree = setup.tree as string;
    let previousCommit = setup.commit as string;
    for (const step of scenario.steps) {
      const result = await executeStep(
        step,
        {
          container,
          workspace,
          outputDir,
          scenario,
          model,
          policy,
          spent: spentEur(steps, plan.pins),
          pins: plan.pins,
          previousTree,
          previousCommit,
          ...(mcpConfig === undefined ? {} : { mcpConfig }),
        },
        options,
      );
      if (result !== CAP_REACHED && result.tree !== undefined) previousTree = result.tree;
      if (result !== CAP_REACHED && result.commit !== undefined) previousCommit = result.commit;
      // Nothing was left of the run's cost cap to start the step with (task-024).
      if (result === CAP_REACHED) return record({ ...identity, setup, steps, outcome: 'cap reached' }, plan);
      // Recorded first, then failed: what the step spent and said is stored either way. A step that
      // reached the intervention, time or token cap is not a failure: the run goes on to the next one.
      steps.push(result);
      if (result.error !== undefined) {
        throw new Error(`step ${stepNumber(step.n)} of ${scenario.id} failed: ${result.error}`);
      }
      // The run's cost cap and the quota end the run at this step, its snapshot kept (task-024).
      if (result.outcome === 'cap reached' || result.outcome === 'quota exhausted') {
        return record({ ...identity, setup, steps, outcome: result.outcome }, plan);
      }
    }
    return record({ ...identity, setup, steps, outcome: 'completed' }, plan);
  } catch (error) {
    const message = reasonOf(error);
    options.logError?.(`run ${name} failed: ${message}`);
    return record(
      { ...identity, ...(setup === undefined ? {} : { setup }), steps, outcome: 'failed', error: message },
      plan,
    );
  } finally {
    if (container !== undefined) await remove(container, options);
  }
}

/** Where a run's setup happens: its container, its workspace, and where its output goes. */
interface SetupContext {
  readonly container: string;
  readonly workspace: string;
  readonly outputDir: string;
  /** The tree of the `seed` commit, which the setup's patch starts from (task-027). */
  readonly seedTree: string;
  /** The installed harness artefact on the host, for an arm that requires one. */
  readonly harness?: string;
  /** The scenario's configuration for this arm, if it has one (dl-005). */
  readonly scenarioDir?: string | undefined;
  /** The generated rules of the scenario, for the baseline-docs arm (REQ-RUN-11). */
  readonly projectRules?: string;
}

/**
 * The setup phase (REQ-RUN-03, adr-003 decisions 6, 7, 10–12), between the container's start and
 * step 1: the agent's identity in the workspace's own git configuration; the arm's environment over
 * the seed; the arm's directory, its MCP configuration, its harness and the scenario's configuration
 * for it, if any, in the container outside the workspace; the arm's script, timed, with its output kept; then the `setup` commit, so that step 1's
 * patch holds only what the agent did. A failing script is reported by its exit code, and nothing is
 * committed after it.
 */
async function executeSetup(arm: Arm, context: SetupContext, options: RunnerOptions): Promise<SetupResult> {
  const { container, workspace, outputDir, seedTree, harness, scenarioDir, projectRules } = context;
  await options.git.configureIdentity(workspace, AGENT_IDENTITY.name, AGENT_IDENTITY.email);
  if (arm.environmentDir !== undefined) copyEnvironment(workspace, arm.environmentDir);
  // The generated part of the arm's environment, like any other environment file (REQ-RUN-11).
  if (projectRules !== undefined) copyFileSync(projectRules, join(workspace, PROJECT_RULES));
  // The manual after the environment, before the script: in the `setup` commit, never in a step's
  // patch. A CLAUDE.md already there was meant for the agent by someone; it is not overwritten.
  const manual = join(workspace, MANUAL_FILE);
  if (existsSync(manual)) {
    throw new Error(
      `the workspace already holds a ${MANUAL_FILE}, from the seed or the arm's environment: the manual ` +
        `of arm ${arm.name} would replace it`,
    );
  }
  copyFileSync(arm.manualPath, manual);
  await options.docker.copyTo(container, arm.dir, ARM_DIR);
  if (arm.mcpPath !== undefined) await options.docker.copyTo(container, arm.mcpPath, MCP_CONFIG);
  if (harness !== undefined) await options.docker.copyTo(container, harness, HARNESS_ARTEFACT);
  if (scenarioDir !== undefined) await options.docker.copyTo(container, scenarioDir, SCENARIO_DIR);

  const started = performance.now();
  const result = await options.docker.exec(container, ['bash', `${ARM_DIR}/${arm.setup}`]);
  const durationMs = Math.round(performance.now() - started);
  const setupDir = join(outputDir, 'setup');
  mkdirSync(setupDir, { recursive: true });
  // Scrubbed like a patch: a setup may print what it was given.
  writeFileSync(join(setupDir, 'log.txt'), scrub(`${result.stdout}${result.stderr}`, options.secrets ?? []));
  if (result.code !== 0) return { durationMs, usage: NO_USAGE, code: result.code };

  await options.git.commitAll(workspace, SETUP_COMMIT, { allowEmpty: true });
  const commit = await options.git.head(workspace);
  const tree = await options.git.tree(workspace, 'HEAD');
  // What the setup changed since the seed — the harness's own commits included (adr-003 decision 10)
  // — so that scoring can rebuild step 1's snapshot from the seed (task-027).
  writeFileSync(
    join(setupDir, 'diff.patch'),
    scrub(await options.git.patchOf(workspace, seedTree, tree), options.secrets ?? []),
  );
  return { durationMs, usage: NO_USAGE, commit, tree };
}

/** A manual's size by the fixed approximation, and the digest of the text it was taken from. */
function measure(text: string): ManualRecord {
  return {
    sha256: createHash('sha256').update(text).digest('hex'),
    bytes: Buffer.byteLength(text, 'utf8'),
    tokens: approximateTokens(text),
  };
}

/** Why a run failed in its setup: the exit code, and the last lines the script wrote to its log. */
function setupFailure(arm: Arm, code: number, outputDir: string): string {
  const log = readFileSync(join(outputDir, 'setup', 'log.txt'), 'utf8')
    .trimEnd()
    .split('\n');
  const tail = log.slice(-SETUP_ERROR_LINES).join('\n');
  return `the setup of arm ${arm.name} failed with code ${code}${tail === '' ? '' : `: ${tail}`}`;
}

/** What one step needs: where it runs, where its snapshot goes, what it is asked, and by what policy. */
interface StepContext {
  readonly container: string;
  readonly workspace: string;
  readonly outputDir: string;
  readonly scenario: Scenario;
  readonly model: string;
  readonly policy: ApproverPolicy;
  /** What the run's finished steps have spent, in EUR. */
  readonly spent: number;
  readonly pins: RunPins;
  /** The tree of the snapshot before this step — the setup's, or the previous step's — its patch starts from. */
  readonly previousTree: string;
  /** The commit of that snapshot: the step's own commits are those made after it (task-035). */
  readonly previousCommit: string;
  /** The arm's MCP configuration in the container, on every invocation of the step. */
  readonly mcpConfig?: string;
}

/**
 * What a set of steps has spent, in EUR, as the budget counts it: what each reported, or, for a step
 * killed before it could report (task-024), the most it can have cost.
 */
function spentEur(steps: readonly Pick<StepResult, 'usage' | 'costBoundUsd'>[], pins: RunPins): number {
  return steps.reduce(
    (total, step) =>
      total + Math.max(step.usage.costEur, (step.costBoundUsd ?? 0) * pins.currency.usd_to_eur),
    0,
  );
}

/**
 * What a run may still spend, in USD: its cap less what it has already spent — its finished steps
 * **and** the current step's invocations so far, or a resume would be offered the whole cap again —
 * converted with the campaign's rate. Enforcing it is F1.3 (W5); W2 only tells the agent what it is.
 */
function remaining(pins: RunPins, spent: number): number {
  const { caps, currency } = pins;
  return Math.max(0, (caps.run_cost_eur - spent) / currency.usd_to_eur);
}

/**
 * A step's usage from its invocations (adr-002 decision 8 as corrected by task-007): the work of each
 * is its own and is summed, while the cost each reports is the session's running total, so the step's
 * cost is the largest seen. Summing it would count the step's first session again at every resume;
 * taking the last would lose it when a resume ends with no result and reports nothing.
 */
function combine(a: SessionUsage, b: SessionUsage): SessionUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
    costUsd: Math.max(a.costUsd, b.costUsd),
    costEur: Math.max(a.costEur, b.costEur),
    turns: a.turns + b.turns,
    durationMs: a.durationMs + b.durationMs,
  };
}

/** Every token a usage counts, of every kind: what `step_tokens` caps (task-024). */
function tokensOf(usage: SessionUsage): number {
  return usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
}

/** The usage of a step's invocations so far. */
function stepUsage(invocations: readonly StepOutcome[]): SessionUsage {
  return invocations.map((invocation) => invocation.usage).reduce(combine, NO_USAGE);
}

/** How the policy names a kind in the log. */
const KIND_LABEL: Readonly<Record<InterventionKind, string>> = {
  approval: 'approval request',
  question: 'question',
};

/**
 * The failure of one invocation, if it failed. **The order is the point.** The agent's own failure
 * comes first: a session that ended before naming itself reports no session at all, and testing the
 * id first would blame a mismatch for what was a truncated stream and bury the reason it stopped. The
 * id guard is what remains for an invocation that did run — an agent continuing a session of its own
 * is what F2.2 forbids, and a resume answered from another session is not the step's.
 */
function invocationError(outcome: StepOutcome, expected: string, name: string): string | undefined {
  return (
    outcome.error ??
    (outcome.sessionId === expected
      ? undefined
      : `${name} ran in session ${outcome.sessionId}, not in the one it was given (${expected})`)
  );
}

/**
 * One step (F2.2, F2.4, REQ-RUN-05): a fresh session, the neutral approver's replies while it waits,
 * then one snapshot. The prompt is read here, in one place, so that every arm is asked the same bytes
 * (F2.7 in W3); the replies come from the policy alone, so every arm is answered the same way.
 */
async function executeStep(
  step: Scenario['steps'][number],
  context: StepContext,
  options: RunnerOptions,
): Promise<StepResult | typeof CAP_REACHED> {
  const {
    container,
    workspace,
    outputDir,
    scenario,
    model,
    policy,
    spent,
    pins,
    previousTree,
    previousCommit,
    mcpConfig,
  } = context;
  const mcp = mcpConfig === undefined ? {} : { mcpConfig };
  const number = stepNumber(step.n);
  let prompt: string;
  try {
    prompt = readFileSync(step.promptPath, 'utf8');
  } catch (error) {
    throw new Error(`cannot read the prompt of step ${number}, ${step.promptPath}: ${reasonOf(error)}`, {
      cause: error,
    });
  }

  // `--max-budget-usd 0` is a value the spike never measured: it may refuse at once, or mean no
  // limit at all. With nothing left of the run's cost cap the step is not started, and the run ends
  // at its cap (task-024, REQ-RUN-08).
  const remainingCostUsd = remaining(pins, spent);
  if (remainingCostUsd <= 0) return CAP_REACHED;

  // Nothing an earlier step's session left in the agent's own memory reaches this one (bug-006).
  const cleared = await options.docker.exec(container, CLEAR_AUTO_MEMORY);
  if (cleared.code !== 0) {
    throw new Error(
      `could not clear the agent's auto-memory before step ${number}: ${cleared.stderr.trim()}`,
    );
  }

  // step_time_s (REQ-RUN-08, task-024): every command of every invocation runs under `timeout`, with
  // what is left of the step's time. A killed session reports nothing (C3), so the kill is read here,
  // from the exit code, whatever the agent then says.
  const now = options.now ?? (() => performance.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  // A rate limit's waits move the deadline by as long: the cap bounds the agent's working time (task-051).
  let deadline = now() + pins.caps.step_time_s * 1000;
  let killed = false;
  const run = async (command: readonly string[]) => {
    const seconds = Math.ceil((deadline - now()) / 1000);
    if (seconds <= 0) {
      killed = true;
      return { code: TIMED_OUT, stdout: '', stderr: `step ${number}: time cap reached` };
    }
    const result = await options.docker.exec(container, [
      'timeout',
      '-k',
      String(KILL_AFTER_S),
      String(seconds),
      ...command,
    ]);
    if (result.code === TIMED_OUT || result.code === KILLED) killed = true;
    return result;
  };
  /** One invocation; a throw is the agent's failure unless the invocation was killed at the time cap. */
  const invoke = async (call: () => Promise<StepOutcome>): Promise<StepOutcome | string> => {
    killed = false;
    try {
      return await call();
    } catch (failure) {
      // What a killed invocation reported is nothing: its cost is counted at its bound (settle).
      if (killed) return { sessionId, usage: NO_USAGE, transcript: [] };
      return reasonOf(failure);
    }
  };

  const sessionId = randomUUID();
  const invocations: StepOutcome[] = [];
  const interventions: Intervention[] = [];
  const rateLimitWaits: RateLimitWait[] = [];
  let error: string | undefined;
  let outcome: StepOutcomeKind = 'completed';
  let costBoundUsd: number | undefined;
  /** What an invocation that ended reports: its stop, its kill, or its failure. */
  const settle = (result: StepOutcome | string, name: string, bound: number): boolean => {
    if (typeof result === 'string') {
      if (invocations.length === 0) throw new Error(result);
      error = result;
      return false;
    }
    invocations.push(result);
    if (killed) {
      outcome = 'time cap reached';
      costBoundUsd = bound;
      options.log?.(`step ${number}: time cap reached (${pins.caps.step_time_s} s)`);
      return false;
    }
    error = invocationError(result, sessionId, name);
    if (error === undefined && result.stop !== undefined) {
      // `waitOut` resumes a rate-limited invocation before it reaches here; one that does was not waited out.
      outcome = result.stop === 'rate limited' ? 'quota exhausted' : result.stop;
      options.log?.(`step ${number}: ${outcome}`);
      return false;
    }
    return error === undefined;
  };

  /**
   * An invocation the rate limit stopped (task-051): waited out and resumed, up to the last wait, after which the
   * step ends `quota exhausted`. Whatever the last invocation reports is then settled as any other.
   */
  const waitOut = async (first: StepOutcome | string, name: string, bound: number): Promise<boolean> => {
    let result = first;
    let label = name;
    let cap = bound;
    while (
      typeof result !== 'string' &&
      !killed &&
      result.error === undefined &&
      result.stop === 'rate limited'
    ) {
      invocations.push(result);
      const waitS = RATE_LIMIT_WAITS_S[rateLimitWaits.length];
      if (waitS === undefined) {
        outcome = 'quota exhausted';
        options.log?.(`step ${number}: rate limit after ${rateLimitWaits.length} waits: quota exhausted`);
        return false;
      }
      options.log?.(`step ${number}: rate limited, waiting ${waitS} s before resuming`);
      rateLimitWaits.push({ afterInvocation: invocations.length, waitedS: waitS });
      await sleep(waitS * 1000);
      deadline += waitS * 1000;
      const left = remaining(pins, spent + stepUsage(invocations).costEur);
      if (left <= 0) {
        outcome = 'cap reached';
        options.log?.(`step ${number}: cap reached before resuming from the rate limit`);
        return false;
      }
      cap = stepUsage(invocations).costUsd + left;
      label = `rate-limit resume ${rateLimitWaits.length} of step ${number}`;
      result = await invoke(() =>
        options.agent.resume({
          scenarioId: scenario.id,
          step: step.n,
          intervention: invocations.length,
          sessionId,
          reply: RATE_LIMIT_MESSAGE,
          remainingCostUsd: left,
          ...mcp,
          run,
        }),
      );
    }
    return settle(result, label, cap);
  };

  let going = await waitOut(
    await invoke(() =>
      options.agent.runStep({
        scenarioId: scenario.id,
        step: step.n,
        prompt,
        model,
        sessionId,
        remainingCostUsd,
        ...mcp,
        run,
      }),
    ),
    `step ${number}`,
    remainingCostUsd,
  );

  // The neutral approver (F2.4). A failed or stopped session is never classified.
  while (going) {
    const last = invocations[invocations.length - 1];
    const kind = last?.finalMessage === undefined ? undefined : policy.classify(last.finalMessage);
    if (kind === undefined) break;
    if (interventions.length >= policy.maxInterventions) {
      outcome = 'intervention cap reached';
      options.log?.(`step ${number}: intervention cap reached (${policy.maxInterventions})`);
      break;
    }
    // step_tokens (REQ-RUN-08, task-024): checked between invocations, the only place the tokens are
    // final; within one, the cost cap bounds it.
    if (tokensOf(stepUsage(invocations)) > pins.caps.step_tokens) {
      outcome = 'token cap reached';
      options.log?.(`step ${number}: token cap reached (${pins.caps.step_tokens})`);
      break;
    }
    const sessionCostUsd = stepUsage(invocations).costUsd;
    const left = remaining(pins, spent + stepUsage(invocations).costEur);
    if (left <= 0) {
      outcome = 'cap reached';
      options.log?.(`step ${number}: cap reached before resume ${interventions.length + 1}`);
      break;
    }
    const reply = policy.replies[kind];
    const intervention = interventions.length + 1;
    // Recorded before the reply is sent: once sent, it was an intervention, whatever comes of it.
    interventions.push({ step: step.n, kind, reply });
    options.log?.(
      `step ${number}: ${KIND_LABEL[kind]}, intervention ${intervention} of ${policy.maxInterventions}: ${reply}`,
    );
    const resumed = await invoke(() =>
      options.agent.resume({
        scenarioId: scenario.id,
        step: step.n,
        intervention,
        sessionId,
        reply,
        remainingCostUsd: left,
        ...mcp,
        run,
      }),
    );
    // A resume reports the session's running total, so it never goes down. If it ever does — a
    // different agent version, a stream that is not a resume — the larger figure is kept and the
    // broken premise is said out loud rather than absorbed (adr-002 amendment 1).
    if (
      typeof resumed !== 'string' &&
      !killed &&
      resumed.error === undefined &&
      resumed.usage.costUsd < sessionCostUsd
    ) {
      options.logError?.(
        `step ${number}: resume ${intervention} reported a session cost of ${resumed.usage.costUsd} USD, ` +
          `below the ${sessionCostUsd} USD already reported; kept the larger`,
      );
    }
    going = await waitOut(resumed, `resume ${intervention} of step ${number}`, sessionCostUsd + left);
  }

  // What the agent and its harness committed during the step, read before the step commit so that the
  // runner's own is never among them (task-035): a content check reads commit messages (REQ-SCO-06).
  const messages = await options.git.messagesSince(workspace, previousCommit);
  // Every step leaves a snapshot to score, including a step that changed nothing (REQ-RUN-05), and
  // only one, however many interventions it took.
  await options.git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
  const commit = await options.git.head(workspace);
  const stepDir = join(outputDir, 'steps', number);
  mkdirSync(stepDir, { recursive: true });
  // Scrubbed like the patch: a message can quote what the agent's environment holds.
  writeFileSync(
    join(stepDir, 'commits.json'),
    `${JSON.stringify({ messages: messages.map((message) => scrub(message, options.secrets ?? [])) }, undefined, 2)}\n`,
  );
  // From the previous snapshot, not the last commit: an agent that commits during its step (the
  // wingfoil arm's does) would otherwise leave its own commits out of the patch (bug-007).
  const tree = await options.git.tree(workspace, 'HEAD');
  // Scrubbed like the transcript: the agent runs with the credential in its own environment and
  // `bypassPermissions`, so one `env > notes.txt` would otherwise commit the token in a patch.
  const patch = await options.git.patchOf(workspace, previousTree, tree);
  writeFileSync(join(stepDir, 'diff.patch'), scrub(patch, options.secrets ?? []));
  // What the step cost across its invocations, and the whole of what they said (REQ-RUN-09,
  // REQ-FMT-06). The transcript is git-ignored and scrubbed by the adapter (REQ-NFR-01, REQ-RES-06).
  const usage = stepUsage(invocations);
  const transcript = invocations.flatMap((invocation) => invocation.transcript);
  writeFileSync(join(stepDir, 'usage.json'), `${JSON.stringify(usage, undefined, 2)}\n`);
  writeFileSync(join(stepDir, 'transcript.jsonl'), transcript.map((line) => `${line}\n`).join(''));
  const result = {
    n: step.n,
    sessionId: invocations[0]?.sessionId ?? sessionId,
    usage,
    transcript,
    interventions,
    tree,
    commit,
    ...(costBoundUsd === undefined ? {} : { costBoundUsd }),
    ...(rateLimitWaits.length === 0 ? {} : { rateLimitWaits }),
  };
  return error === undefined ? { ...result, outcome } : { ...result, outcome: 'failed', error };
}

/**
 * The container must hold the run's workspace and nothing else (REQ-RUN-02): the oracle and the
 * hold-out never reach a run. Checked against Docker itself, not against what we asked for.
 */
async function assertOnlyWorkspaceMounted(
  container: string,
  workspace: string,
  options: RunnerOptions,
): Promise<void> {
  const mounts = await options.docker.mountsOf(container);
  const expected = `${workspace}:${WORKSPACE}`;
  if (mounts.length !== 1 || mounts[0] !== expected) {
    throw new Error(`the container has mounts other than its workspace: ${mounts.join(', ') || 'none'}`);
  }
}

/** Every container of a plan starts with this: the plan's identity, then the execution. */
function containerPrefix(id: string): string {
  return `bench-${id}-`;
}

/** A container of this plan that already exists: the execution its name carries, and its state. */
interface Leftover {
  readonly execution: number;
  readonly running: boolean;
}

/**
 * The containers of this plan that already exist (bug-003), by name. One the current execution
 * will need is reported by that run; one of another execution is warned about once, here, with the
 * command that clears it. A **stopped** one was left by an interrupted run. A **running** one may be
 * another invocation of the same campaign — the id is a digest of the file, so another checkout or a
 * second test suite shares it — and is not called interrupted: the runner cannot tell, and says so.
 */
async function leftBehind(
  plan: RunPlan,
  execution: number,
  options: RunnerOptions,
): Promise<ReadonlyMap<string, Leftover>> {
  const prefix = containerPrefix(plan.id);
  const leftovers = new Map<string, Leftover>();
  for (const { name, running } of await options.docker.containersNamed(prefix)) {
    const found = /^(\d+)-/.exec(name.slice(prefix.length))?.[1];
    if (found === undefined) continue;
    leftovers.set(name, { execution: Number(found), running });
    if (Number(found) === execution) continue;
    options.logError?.(
      running
        ? `container ${name} of execution ${found} is running: another invocation of this ${plan.noun} may ` +
            `be using it. If none is, remove it with: docker rm --force ${name}`
        : `container ${name} was left behind by an interrupted run of execution ${found} of this ` +
            `${plan.noun} (bug-003). Remove it with: docker rm --force ${name}`,
    );
  }
  return leftovers;
}

/** Removing a container must not lose the run's result, nor stop the campaign. */
async function remove(container: string, options: RunnerOptions): Promise<void> {
  try {
    await options.docker.remove(container);
  } catch (error) {
    options.logError?.(`could not remove ${container}: ${reasonOf(error)}`);
  }
}

/** The package root, from this file's location in `dist/runner/` or `src/runner/`. */
function packageRoot(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

/**
 * Write the run's own record (adr-002 decision 11, a minimal `run.json`; F5.1 completes it in W7).
 * It holds what a later reading of the usage needs and cannot recover: which scenario, arm, model and
 * repetition this was, and which agent, model and approver policy the campaign pinned for it.
 */
function record(run: RunResult, plan: RunPlan): RunResult {
  mkdirSync(run.outputDir, { recursive: true });
  const { agent, approver_policy } = plan.pins;
  writeFileSync(
    join(run.outputDir, 'run.json'),
    `${JSON.stringify(
      {
        // The campaign the run belonged to, or `dry_run: true`: a dry run is never a campaign's (REQ-RES-01).
        ...plan.origin,
        scenario: run.scenario,
        version: run.version,
        // What the version's content was when it ran (REQ-FMT-09): a later change is refused, not mixed in.
        scenario_hash: run.scenarioHash,
        arm: run.arm,
        model: run.model,
        repetition: run.repetition,
        agent,
        approver_policy,
        // The manual the arm ran with, and its size: a confound reported for every arm (REQ-RUN-12).
        ...(run.manual === undefined
          ? {}
          : {
              manual: {
                file: MANUAL_FILE,
                sha256: run.manual.sha256,
                bytes: run.manual.bytes,
                tokens: run.manual.tokens,
                method: TOKEN_METHOD.name,
                method_version: TOKEN_METHOD.version,
              },
            }),
        // The harness the arm ran with (REQ-RUN-14, adr-003 decision 4).
        ...(run.harness === undefined
          ? {}
          : {
              harness: {
                tool: run.harness.tool,
                commit: run.harness.commit,
                tarball_sha256: run.harness.tarballSha256,
                installed_sha256: run.harness.installedSha256,
              },
            }),
        // What the harness was taken to provide, and what the scenario needed that it lacks (F3.6): the
        // run is executed and scored as any other, and marked, never skipped.
        ...(run.provides === undefined ? {} : { provides: run.provides }),
        ...(run.expectedFailure === undefined ? {} : { expected_failure: run.expectedFailure }),
        // The setup, apart from the steps (REQ-RUN-03): what M-K3 sets against their cost in W9.
        ...(run.setup === undefined
          ? {}
          : {
              setup: {
                duration_ms: run.setup.durationMs,
                usage: run.setup.usage,
                ...(run.setup.commit === undefined ? {} : { commit: run.setup.commit }),
                ...(run.setup.tree === undefined ? {} : { tree: run.setup.tree }),
                ...(run.setup.code === undefined ? {} : { code: run.setup.code }),
              },
            }),
        outcome: run.outcome,
        ...(run.error === undefined ? {} : { error: run.error }),
        steps: run.steps.map((step) => ({
          n: step.n,
          session: step.sessionId,
          outcome: step.outcome,
          interventions: step.interventions.length,
          usage: step.usage,
          ...(step.tree === undefined ? {} : { tree: step.tree }),
          // A step killed at its time cap reported no cost: what it can have cost at most (task-024).
          ...(step.costBoundUsd === undefined
            ? {}
            : { cost_reported: false, cost_bound_usd: step.costBoundUsd }),
          // A rate limit's waits (task-051), apart from the approver's interventions below.
          ...(step.rateLimitWaits === undefined
            ? {}
            : {
                rate_limit_waits: step.rateLimitWaits.map((wait) => ({
                  after_invocation: wait.afterInvocation,
                  waited_s: wait.waitedS,
                })),
              }),
        })),
        // Every reply of the neutral approver, with its step, kind and text (REQ-RUN-07): what M-K2
        // counts in W6, under the policy version named above.
        interventions: run.steps.flatMap((step) => step.interventions),
      },
      undefined,
      2,
    )}\n`,
  );
  return run;
}
