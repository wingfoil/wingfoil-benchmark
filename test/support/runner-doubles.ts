import type { AgentPort, StepOutcome, StepRequest } from '../../src/agents/index.js';
import type {
  BuildRequest,
  CreateRequest,
  DockerPort,
  GitPort,
  ProcessResult,
} from '../../src/core/index.js';

/** Everything the doubles recorded, in order. */
export interface Recorded {
  readonly builds: string[];
  readonly buildRequests: BuildRequest[];
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
  options: {
    execResult?: ProcessResult;
    onStep?: (request: StepRequest) => void;
    /** The session the agent answers with; by default the one it was given (F2.2). */
    sessionOf?: (request: StepRequest) => string;
    /** Makes one Docker or git call fail, to exercise a run that breaks outside its steps. */
    failing?: { call: 'create' | 'start' | 'remove' | 'init'; error: string };
  } = {},
): Doubles {
  const recorded: Recorded = {
    builds: [],
    buildRequests: [],
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
      recorded.buildRequests.push(request);
      return Promise.resolve();
    },
    create: (request) => {
      recorded.creates.push(request);
      containers += 1;
      if (options.failing?.call === 'create') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve(`container-${containers}`);
    },
    start: (container) => {
      recorded.starts.push(container);
      if (options.failing?.call === 'start') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve();
    },
    exec: (container, command) => {
      recorded.execs.push({ container, command: [...command] });
      return Promise.resolve(options.execResult ?? { code: 0, stdout: '', stderr: '' });
    },
    remove: (container) => {
      recorded.removes.push(container);
      if (options.failing?.call === 'remove') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve();
    },
    // Derived from what the run actually asked for, so an assertion on it means something.
    mountsOf: (container) => {
      const index = Number(container.replace('container-', '')) - 1;
      const request = recorded.creates[index];
      return Promise.resolve(request ? [`${request.workspace}:/workspace`] : []);
    },
  };
  const git: GitPort = {
    init: (directory) => {
      recorded.gitCalls.push(`init ${directory}`);
      if (options.failing?.call === 'init') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve();
    },
    commitAll: (directory, message) => {
      recorded.gitCalls.push(`commit ${directory} ${message}`);
      return Promise.resolve();
    },
    patchOf: (directory, ref) => Promise.resolve(`patch of ${directory} at ${ref}\n`),
  };
  const agent: AgentPort = {
    runStep: (request): Promise<StepOutcome> => {
      recorded.steps.push(request);
      options.onStep?.(request);
      return Promise.resolve({ sessionId: options.sessionOf?.(request) ?? request.sessionId });
    },
  };
  return { docker, git, agent, recorded };
}
