import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scrub } from '../agents/index.js';
import type { AgentPort, SessionUsage, StepOutcome } from '../agents/index.js';
import { approverPolicy, approximateTokens, reasonOf, TOKEN_METHOD, WORKSPACE } from '../core/index.js';
import type { ApproverPolicy, Arm, DockerPort, GitPort, InterventionKind, Scenario } from '../core/index.js';
import { nextExecution } from '../results/index.js';

import type { CheckedCampaign } from './campaign.js';
import { prepareHarnesses } from './harness.js';
import type { HarnessArtefact } from './harness.js';
import { copyEnvironment, prepareWorkspace } from './workspace.js';

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
}

/** One reply of the neutral approver (REQ-RUN-07): the step, what was asked for, and what was sent. */
export interface Intervention {
  readonly step: number;
  readonly kind: InterventionKind;
  readonly reply: string;
}

/**
 * How a step ended. `intervention cap reached` is not a failure: the step ends and is scored as it
 * stands (experiment design §3.5–3.6), and the run goes on. Only `failed` stops the run.
 */
export type StepOutcomeKind = 'completed' | 'intervention cap reached' | 'failed';

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
  readonly error?: string;
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
  readonly steps: readonly StepResult[];
  readonly outcome: 'completed' | 'failed';
  readonly error?: string;
}

/** What one execution of a campaign produced. */
export interface RunSummary {
  /** The execution number `n` of `<campaign-id>/<n>` (REQ-FMT-02). */
  readonly execution: number;
  readonly resultsDir: string;
  readonly runs: readonly RunResult[];
  /** Whether every run completed. */
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

/**
 * The identity the agent commits with, the same in every arm (adr-003 decisions 6, 7): in the
 * wingfoil arm it is the declared member with the `approver` role (REQ-RUN-17); elsewhere it only
 * lets the agent commit, as it can in the wingfoil arm.
 */
const AGENT_IDENTITY = { name: 'Benchmark Approver', email: 'approver@benchmark.localhost' };

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
  const { campaign, scenarios, arms } = checked;
  const execution = nextExecution(campaign.resultsRoot, campaign.id);
  const resultsDir = join(campaign.resultsRoot, campaign.id, String(execution));
  mkdirSync(resultsDir, { recursive: true });
  options.log?.(`campaign ${campaign.id}, execution ${execution}`);
  copyFileSync(campaign.file, join(resultsDir, 'campaign.yaml'));

  // Before anything is built: what earlier, interrupted runs of this campaign left behind (bug-003).
  const leftovers = await leftBehind(campaign.id, execution, options);

  await options.docker.build({
    dockerfile: join(packageRoot(), RUN_IMAGE_DIRECTORY, 'Dockerfile'),
    context: join(packageRoot(), RUN_IMAGE_DIRECTORY),
    tag: campaign.id,
    buildArgs: { AGENT_NAME: campaign.spec.agent.name, AGENT_VERSION: campaign.spec.agent.version },
  });
  // Every harness before any run: an arm never runs without the one it requires (REQ-RUN-14).
  const harnesses = await prepareHarnesses(checked, options);

  const model = campaign.spec.models.default;
  const runs: RunResult[] = [];
  for (const scenario of scenarios) {
    // The campaign schema gives every scenario a repetition count; the fallback only keeps the type honest.
    const repetitions = campaign.spec.repetitions[scenario.id] ?? 1;
    for (const arm of arms) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        runs.push(
          await executeRun(
            {
              campaign,
              scenario,
              arm,
              model,
              repetition,
              execution,
              resultsDir,
              leftovers,
              ...(arm.requires === undefined ? {} : { harness: harnesses.get(arm.requires) }),
            },
            options,
          ),
        );
      }
    }
  }
  return { execution, resultsDir, runs, completed: runs.every((run) => run.outcome === 'completed') };
}

interface RunContext {
  readonly campaign: CheckedCampaign['campaign'];
  readonly scenario: Scenario;
  readonly arm: Arm;
  readonly model: string;
  readonly repetition: number;
  readonly execution: number;
  readonly resultsDir: string;
  /** Containers of this campaign that already exist, by name, with their execution and state. */
  readonly leftovers: ReadonlyMap<string, Leftover>;
  /** The harness the arm requires, built for this campaign. */
  readonly harness?: HarnessArtefact | undefined;
}

/** One run: its own workspace, its own container, removed whatever happens. */
async function executeRun(context: RunContext, options: RunnerOptions): Promise<RunResult> {
  const { campaign, scenario, arm, model, repetition, execution, resultsDir } = context;
  const name = `${scenario.id}@${scenario.version}/${arm.name}/${model}/r${repetition}`;
  const workspace = join(
    campaign.repoRoot,
    'runs',
    campaign.id,
    String(execution),
    ...name.split('/'),
    'workspace',
  );
  // The workspace is debris to look at (git-ignored); the output is the run's record (REQ-FMT-06).
  const outputDir = join(resultsDir, 'runs', ...name.split('/'));
  const { harness } = context;
  const identity = {
    ...(harness === undefined ? {} : { harness }),
    manual: measure(readFileSync(arm.manualPath, 'utf8')),
    scenario: scenario.id,
    version: scenario.version,
    arm: arm.name,
    model,
    repetition,
    workspace,
    outputDir,
  };
  options.log?.(`run ${name}`);

  const steps: StepResult[] = [];
  let container: string | undefined;
  let setup: SetupResult | undefined;
  try {
    // The campaign's validation refuses a version this runner does not implement; this is the type's
    // proof of it, and the guard if a campaign ever reached a run by another path.
    const policy = approverPolicy(campaign.spec.approver_policy);
    if (policy === undefined) {
      throw new Error(`the approver policy ${campaign.spec.approver_policy} is not implemented`);
    }
    const containerName = `${containerPrefix(campaign.id)}${execution}-${name.replaceAll(/[@/]/g, '-')}`;
    const stale = context.leftovers.get(containerName);
    // Reported, never removed: the runner does not destroy what this run did not create (bug-003,
    // approver's choice). The campaign goes on to its next run (REQ-NFR-03).
    if (stale !== undefined) {
      throw new Error(
        stale.running
          ? `container ${containerName} already exists and is running: another invocation of this ` +
              `campaign may be using it. If none is, remove it with: docker rm --force ${containerName}`
          : `container ${containerName} already exists: an interrupted run of execution ` +
              `${stale.execution} of this campaign left it behind (bug-003). Remove it with: ` +
              `docker rm --force ${containerName}`,
      );
    }
    await prepareWorkspace(workspace, scenario, options.git);
    container = await options.docker.create({
      image: campaign.id,
      name: containerName,
      workspace,
      user: CONTAINER_USER,
      ...(options.containerEnv === undefined ? {} : { env: options.containerEnv }),
    });
    await assertOnlyWorkspaceMounted(container, workspace, options);
    await options.docker.start(container);
    setup = await executeSetup(
      arm,
      {
        container,
        workspace,
        outputDir,
        ...(harness === undefined ? {} : { harness: harness.installed }),
        ...(scenario.armDirs[arm.name] === undefined ? {} : { scenarioDir: scenario.armDirs[arm.name] }),
      },
      options,
    );
    if (setup.code !== undefined) throw new Error(setupFailure(arm, setup.code, outputDir));
    const mcpConfig = arm.mcpPath === undefined ? undefined : MCP_CONFIG;
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
          spent: spentEur(steps),
          campaign,
          ...(mcpConfig === undefined ? {} : { mcpConfig }),
        },
        options,
      );
      // Recorded first, then failed: what the step spent and said is stored either way. A step that
      // reached the intervention cap is not a failure: the run goes on to the next one.
      steps.push(result);
      if (result.error !== undefined) {
        throw new Error(`step ${stepNumber(step.n)} of ${scenario.id} failed: ${result.error}`);
      }
    }
    return record({ ...identity, setup, steps, outcome: 'completed' }, campaign);
  } catch (error) {
    const message = reasonOf(error);
    options.logError?.(`run ${name} failed: ${message}`);
    return record(
      { ...identity, ...(setup === undefined ? {} : { setup }), steps, outcome: 'failed', error: message },
      campaign,
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
  /** The installed harness artefact on the host, for an arm that requires one. */
  readonly harness?: string;
  /** The scenario's configuration for this arm, if it has one (dl-005). */
  readonly scenarioDir?: string | undefined;
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
  const { container, workspace, outputDir, harness, scenarioDir } = context;
  await options.git.configureIdentity(workspace, AGENT_IDENTITY.name, AGENT_IDENTITY.email);
  if (arm.environmentDir !== undefined) copyEnvironment(workspace, arm.environmentDir);
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
  return { durationMs, usage: NO_USAGE, commit: await options.git.head(workspace) };
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
  readonly campaign: CheckedCampaign['campaign'];
  /** The arm's MCP configuration in the container, on every invocation of the step. */
  readonly mcpConfig?: string;
}

/** What a set of steps or invocations has spent, in EUR. */
function spentEur(spent: readonly { readonly usage: SessionUsage }[]): number {
  return spent.reduce((total, item) => total + item.usage.costEur, 0);
}

/**
 * What a run may still spend, in USD: its cap less what it has already spent — its finished steps
 * **and** the current step's invocations so far, or a resume would be offered the whole cap again —
 * converted with the campaign's rate. Enforcing it is F1.3 (W5); W2 only tells the agent what it is.
 */
function remaining(campaign: CheckedCampaign['campaign'], spent: number): number {
  const { caps, currency } = campaign.spec;
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

/** The usage of a step's invocations so far. */
function stepUsage(invocations: readonly StepOutcome[]): SessionUsage {
  return invocations.map((invocation) => invocation.usage).reduce(combine);
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
): Promise<StepResult> {
  const { container, workspace, outputDir, scenario, model, policy, spent, campaign, mcpConfig } = context;
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
  // limit at all. Neither is a thing to say by accident, so the step is not started. This is not the
  // budget guard — enforcing the cap across a run and a campaign is F1.3 (REQ-RUN-08, W5).
  const remainingCostUsd = remaining(campaign, spent);
  if (remainingCostUsd <= 0) {
    throw new Error(`step ${number} not started: the run's cost cap is exhausted`);
  }

  const sessionId = randomUUID();
  const run = (command: readonly string[]) => options.docker.exec(container, command);
  const first = await options.agent.runStep({
    scenarioId: scenario.id,
    step: step.n,
    prompt,
    model,
    sessionId,
    remainingCostUsd,
    ...mcp,
    run,
  });
  const invocations: StepOutcome[] = [first];
  const interventions: Intervention[] = [];
  let error = invocationError(first, sessionId, `step ${number}`);
  let outcome: StepOutcomeKind = 'completed';

  // The neutral approver (F2.4). A failed session is never classified: it is a failure, not a wait.
  for (let last = first; error === undefined;) {
    const kind = last.finalMessage === undefined ? undefined : policy.classify(last.finalMessage);
    if (kind === undefined) break;
    if (interventions.length >= policy.maxInterventions) {
      outcome = 'intervention cap reached';
      options.log?.(`step ${number}: intervention cap reached (${policy.maxInterventions})`);
      break;
    }
    const left = remaining(campaign, spent + stepUsage(invocations).costEur);
    if (left <= 0) {
      error = `step ${number} not resumed: the run's cost cap is exhausted`;
      break;
    }
    const reply = policy.replies[kind];
    const intervention = interventions.length + 1;
    // Recorded before the reply is sent: once sent, it was an intervention, whatever comes of it.
    interventions.push({ step: step.n, kind, reply });
    options.log?.(
      `step ${number}: ${KIND_LABEL[kind]}, intervention ${intervention} of ${policy.maxInterventions}: ${reply}`,
    );
    try {
      last = await options.agent.resume({
        scenarioId: scenario.id,
        step: step.n,
        intervention,
        sessionId,
        reply,
        remainingCostUsd: left,
        ...mcp,
        run,
      });
    } catch (failure) {
      // What the step's earlier invocations spent and said is real, so it is stored before failing.
      error = reasonOf(failure);
      break;
    }
    // A resume reports the session's running total, so it never goes down. If it ever does — a
    // different agent version, a stream that is not a resume — the larger figure is kept and the
    // broken premise is said out loud rather than absorbed (adr-002 amendment 1).
    const before = stepUsage(invocations).costUsd;
    if (last.error === undefined && last.usage.costUsd < before) {
      options.logError?.(
        `step ${number}: resume ${intervention} reported a session cost of ${last.usage.costUsd} USD, ` +
          `below the ${before} USD already reported; kept the larger`,
      );
    }
    invocations.push(last);
    error = invocationError(last, sessionId, `resume ${intervention} of step ${number}`);
  }

  // Every step leaves a snapshot to score, including a step that changed nothing (REQ-RUN-05), and
  // only one, however many interventions it took.
  await options.git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
  const stepDir = join(outputDir, 'steps', number);
  mkdirSync(stepDir, { recursive: true });
  // Scrubbed like the transcript: the agent runs with the credential in its own environment and
  // `bypassPermissions`, so one `env > notes.txt` would otherwise commit the token in a patch.
  const patch = await options.git.patchOf(workspace, 'HEAD');
  writeFileSync(join(stepDir, 'diff.patch'), scrub(patch, options.secrets ?? []));
  // What the step cost across its invocations, and the whole of what they said (REQ-RUN-09,
  // REQ-FMT-06). The transcript is git-ignored and scrubbed by the adapter (REQ-NFR-01, REQ-RES-06).
  const usage = stepUsage(invocations);
  const transcript = invocations.flatMap((invocation) => invocation.transcript);
  writeFileSync(join(stepDir, 'usage.json'), `${JSON.stringify(usage, undefined, 2)}\n`);
  writeFileSync(join(stepDir, 'transcript.jsonl'), transcript.map((line) => `${line}\n`).join(''));
  const result = { n: step.n, sessionId: first.sessionId, usage, transcript, interventions };
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

/** Every container of a campaign starts with this: the campaign's identity, then the execution. */
function containerPrefix(campaignId: string): string {
  return `bench-${campaignId}-`;
}

/** A container of this campaign that already exists: the execution its name carries, and its state. */
interface Leftover {
  readonly execution: number;
  readonly running: boolean;
}

/**
 * The containers of this campaign that already exist (bug-003), by name. One the current execution
 * will need is reported by that run; one of another execution is warned about once, here, with the
 * command that clears it. A **stopped** one was left by an interrupted run. A **running** one may be
 * another invocation of the same campaign — the id is a digest of the file, so another checkout or a
 * second test suite shares it — and is not called interrupted: the runner cannot tell, and says so.
 */
async function leftBehind(
  campaignId: string,
  execution: number,
  options: RunnerOptions,
): Promise<ReadonlyMap<string, Leftover>> {
  const prefix = containerPrefix(campaignId);
  const leftovers = new Map<string, Leftover>();
  for (const { name, running } of await options.docker.containersNamed(prefix)) {
    const found = /^(\d+)-/.exec(name.slice(prefix.length))?.[1];
    if (found === undefined) continue;
    leftovers.set(name, { execution: Number(found), running });
    if (Number(found) === execution) continue;
    options.logError?.(
      running
        ? `container ${name} of execution ${found} is running: another invocation of this campaign may ` +
            `be using it. If none is, remove it with: docker rm --force ${name}`
        : `container ${name} was left behind by an interrupted run of execution ${found} of this ` +
            `campaign (bug-003). Remove it with: docker rm --force ${name}`,
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
function record(run: RunResult, campaign: CheckedCampaign['campaign']): RunResult {
  mkdirSync(run.outputDir, { recursive: true });
  const { agent, approver_policy } = campaign.spec;
  writeFileSync(
    join(run.outputDir, 'run.json'),
    `${JSON.stringify(
      {
        campaign: campaign.id,
        scenario: run.scenario,
        version: run.version,
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
        // The setup, apart from the steps (REQ-RUN-03): what M-K3 sets against their cost in W9.
        ...(run.setup === undefined
          ? {}
          : {
              setup: {
                duration_ms: run.setup.durationMs,
                usage: run.setup.usage,
                ...(run.setup.commit === undefined ? {} : { commit: run.setup.commit }),
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
