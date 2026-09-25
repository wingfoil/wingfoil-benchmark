import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scrub } from '../agents/index.js';
import type { AgentPort, SessionUsage, StepOutcome } from '../agents/index.js';
import { approverPolicy, reasonOf, WORKSPACE } from '../core/index.js';
import type { ApproverPolicy, DockerPort, GitPort, InterventionKind, Scenario } from '../core/index.js';
import { nextExecution } from '../results/index.js';

import type { CheckedCampaign } from './campaign.js';
import { prepareWorkspace } from './workspace.js';

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
  const { campaign, scenarios } = checked;
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

  const model = campaign.spec.models.default;
  const runs: RunResult[] = [];
  for (const scenario of scenarios) {
    // The campaign schema gives every scenario a repetition count; the fallback only keeps the type honest.
    const repetitions = campaign.spec.repetitions[scenario.id] ?? 1;
    for (const arm of campaign.spec.arms) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        runs.push(
          await executeRun(
            { campaign, scenario, arm, model, repetition, execution, resultsDir, leftovers },
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
  readonly arm: string;
  readonly model: string;
  readonly repetition: number;
  readonly execution: number;
  readonly resultsDir: string;
  /** Containers of this campaign that already exist, by name, with their execution and state. */
  readonly leftovers: ReadonlyMap<string, Leftover>;
}

/** One run: its own workspace, its own container, removed whatever happens. */
async function executeRun(context: RunContext, options: RunnerOptions): Promise<RunResult> {
  const { campaign, scenario, arm, model, repetition, execution, resultsDir } = context;
  const name = `${scenario.id}@${scenario.version}/${arm}/${model}/r${repetition}`;
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
  const identity = {
    scenario: scenario.id,
    version: scenario.version,
    arm,
    model,
    repetition,
    workspace,
    outputDir,
  };
  options.log?.(`run ${name}`);

  const steps: StepResult[] = [];
  let container: string | undefined;
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
    for (const step of scenario.steps) {
      const result = await executeStep(
        step,
        { container, workspace, outputDir, scenario, model, policy, spent: spentEur(steps), campaign },
        options,
      );
      // Recorded first, then failed: what the step spent and said is stored either way. A step that
      // reached the intervention cap is not a failure: the run goes on to the next one.
      steps.push(result);
      if (result.error !== undefined) {
        throw new Error(`step ${stepNumber(step.n)} of ${scenario.id} failed: ${result.error}`);
      }
    }
    return record({ ...identity, steps, outcome: 'completed' }, campaign);
  } catch (error) {
    const message = reasonOf(error);
    options.logError?.(`run ${name} failed: ${message}`);
    return record({ ...identity, steps, outcome: 'failed', error: message }, campaign);
  } finally {
    if (container !== undefined) await remove(container, options);
  }
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
  const { container, workspace, outputDir, scenario, model, policy, spent, campaign } = context;
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
