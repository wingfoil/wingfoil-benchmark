import type { AgentPort, StepOutcome, StepRequest } from '../../src/agents/index.js';
import type { CreateRequest, DockerPort, GitPort, ProcessResult } from '../../src/core/index.js';

/** Everything the doubles recorded, in order. */
export interface Recorded {
  readonly builds: string[];
  readonly creates: CreateRequest[];
  readonly starts: string[];
  readonly execs: { container: string; command: string[] }[];
  readonly removes: string[];
  readonly gitCalls: string[];
  readonly steps: StepRequest[];
}

export interface Doubles {
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly agent: AgentPort;
  readonly recorded: Recorded;
}

/**
 * Doubles for the run's ports (acceptance decision 1). `execResult` answers every command in the
 * container; `onStep` may throw, to exercise a failing run.
 */
export function doubles(
  options: { execResult?: ProcessResult; onStep?: (request: StepRequest) => void } = {},
): Doubles {
  const recorded: Recorded = {
    builds: [],
    creates: [],
    starts: [],
    execs: [],
    removes: [],
    gitCalls: [],
    steps: [],
  };
  let containers = 0;
  const docker: DockerPort = {
    build: (request) => {
      recorded.builds.push(request.tag);
      return Promise.resolve();
    },
    create: (request) => {
      recorded.creates.push(request);
      containers += 1;
      return Promise.resolve(`container-${containers}`);
    },
    start: (container) => {
      recorded.starts.push(container);
      return Promise.resolve();
    },
    exec: (container, command) => {
      recorded.execs.push({ container, command: [...command] });
      return Promise.resolve(options.execResult ?? { code: 0, stdout: '', stderr: '' });
    },
    remove: (container) => {
      recorded.removes.push(container);
      return Promise.resolve();
    },
    mountsOf: (container) => Promise.resolve([`${container}:/workspace`]),
  };
  const git: GitPort = {
    init: (directory) => {
      recorded.gitCalls.push(`init ${directory}`);
      return Promise.resolve();
    },
    commitAll: (directory, message) => {
      recorded.gitCalls.push(`commit ${directory} ${message}`);
      return Promise.resolve();
    },
  };
  const agent: AgentPort = {
    runStep: (request): Promise<StepOutcome> => {
      recorded.steps.push(request);
      options.onStep?.(request);
      return Promise.resolve({ commands: [`step ${request.step}`] });
    },
  };
  return { docker, git, agent, recorded };
}
