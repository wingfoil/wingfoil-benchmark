import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AgentPort, StepOutcome } from '../agents/index.js';
import { reasonOf, WORKSPACE } from '../core/index.js';
import type { DockerPort, GitPort, Scenario } from '../core/index.js';
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
  readonly steps: readonly StepOutcome[];
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
          await executeRun({ campaign, scenario, arm, model, repetition, execution, resultsDir }, options),
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

  const steps: StepOutcome[] = [];
  let container: string | undefined;
  try {
    await prepareWorkspace(workspace, scenario, options.git);
    container = await options.docker.create({
      image: campaign.id,
      name: `bench-${campaign.id}-${execution}-${name.replaceAll(/[@/]/g, '-')}`,
      workspace,
      user: CONTAINER_USER,
    });
    await assertOnlyWorkspaceMounted(container, workspace, options);
    await options.docker.start(container);
    for (const step of scenario.steps) {
      steps.push(
        await executeStep(
          step,
          { container, workspace, outputDir, scenario, model, remainingCostUsd: remaining(campaign, steps) },
          options,
        ),
      );
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

/** What one step needs: where it runs, where its snapshot goes, and what it is asked. */
interface StepContext {
  readonly container: string;
  readonly workspace: string;
  readonly outputDir: string;
  readonly scenario: Scenario;
  readonly model: string;
  /** What is left of the run's cost cap, in USD, for `--max-budget-usd` (REQ-RUN-04). */
  readonly remainingCostUsd: number;
}

/**
 * What a run may still spend, in USD: its cap less what its steps have already reported, converted
 * with the campaign's rate. Enforcing it is F1.3 (W5); W2 only tells the agent what it is.
 */
function remaining(campaign: CheckedCampaign['campaign'], steps: readonly StepOutcome[]): number {
  const { caps, currency } = campaign.spec;
  const spentEur = steps.reduce((total, step) => total + step.usage.costEur, 0);
  return Math.max(0, (caps.run_cost_eur - spentEur) / currency.usd_to_eur);
}

/**
 * One step (F2.2, REQ-RUN-05): a fresh session, then a snapshot. The prompt is read here, in one
 * place, so that every arm is asked the same bytes (F2.7 in W3). The session the agent reports is
 * checked against the one it was given: an agent that continues a session of its own would carry
 * state between steps, which is the one thing F2.2 forbids.
 */
async function executeStep(
  step: Scenario['steps'][number],
  context: StepContext,
  options: RunnerOptions,
): Promise<StepOutcome> {
  const { container, workspace, outputDir, scenario, model, remainingCostUsd } = context;
  const number = stepNumber(step.n);
  let prompt: string;
  try {
    prompt = readFileSync(step.promptPath, 'utf8');
  } catch (error) {
    throw new Error(`cannot read the prompt of step ${number}, ${step.promptPath}: ${reasonOf(error)}`, {
      cause: error,
    });
  }

  const sessionId = randomUUID();
  const outcome = await options.agent.runStep({
    scenarioId: scenario.id,
    step: step.n,
    prompt,
    model,
    sessionId,
    remainingCostUsd,
    run: (command) => options.docker.exec(container, command),
  });
  if (outcome.sessionId !== sessionId) {
    throw new Error(
      `step ${number} ran in session ${outcome.sessionId}, not in the one it was given (${sessionId})`,
    );
  }

  // Every step leaves a snapshot to score, including a step that changed nothing (REQ-RUN-05).
  await options.git.commitAll(workspace, `step ${number}`, { allowEmpty: true });
  const stepDir = join(outputDir, 'steps', number);
  mkdirSync(stepDir, { recursive: true });
  writeFileSync(join(stepDir, 'diff.patch'), await options.git.patchOf(workspace, 'HEAD'));
  // What the session cost, and the whole of what it said (REQ-RUN-09, REQ-FMT-06). The transcript is
  // git-ignored and scrubbed by the adapter that produced it (REQ-NFR-01, REQ-RES-06).
  writeFileSync(join(stepDir, 'usage.json'), `${JSON.stringify(outcome.usage, undefined, 2)}\n`);
  writeFileSync(join(stepDir, 'transcript.jsonl'), outcome.transcript.map((line) => `${line}\n`).join(''));
  return outcome;
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
        steps: run.steps.map((step, index) => ({
          n: index + 1,
          session: step.sessionId,
          usage: step.usage,
        })),
      },
      undefined,
      2,
    )}\n`,
  );
  return run;
}
