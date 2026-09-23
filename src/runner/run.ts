import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AgentPort, StepOutcome } from '../agents/index.js';
import { WORKSPACE } from '../core/index.js';
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
        runs.push(await executeRun({ campaign, scenario, arm, model, repetition, execution }, options));
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
}

/** One run: its own workspace, its own container, removed whatever happens. */
async function executeRun(context: RunContext, options: RunnerOptions): Promise<RunResult> {
  const { campaign, scenario, arm, model, repetition, execution } = context;
  const name = `${scenario.id}@${scenario.version}/${arm}/${model}/r${repetition}`;
  const workspace = join(
    campaign.repoRoot,
    'runs',
    campaign.id,
    String(execution),
    ...name.split('/'),
    'workspace',
  );
  const identity = { scenario: scenario.id, version: scenario.version, arm, model, repetition, workspace };
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
        await options.agent.runStep({
          scenarioId: scenario.id,
          step: step.n,
          run: (command) => options.docker.exec(container as string, command),
        }),
      );
    }
    return { ...identity, steps, outcome: 'completed' };
  } catch (error) {
    const message = (error as Error).message;
    options.logError?.(`run ${name} failed: ${message}`);
    return { ...identity, steps, outcome: 'failed', error: message };
  } finally {
    if (container !== undefined) await remove(container, options);
  }
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
    options.logError?.(`could not remove ${container}: ${(error as Error).message}`);
  }
}

/** The package root, from this file's location in `dist/runner/` or `src/runner/`. */
function packageRoot(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}
