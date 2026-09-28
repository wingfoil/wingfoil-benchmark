import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AgentPort,
  ResumeRequest,
  SessionUsage,
  StepOutcome,
  StepRequest,
} from '../../src/agents/index.js';
import type {
  BuildRequest,
  CreateRequest,
  DockerPort,
  GitPort,
  ProcessResult,
  RunOnceRequest,
  ScoringContainerRequest,
} from '../../src/core/index.js';

/** A step that reports no usage, which is what a double does unless a test says otherwise. */
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
 * A one-off container as the real ones leave their mount: a harness build, the npm tarball and the
 * installed artefact in `out/`; a snapshot of the wingfoil configuration, a small `.wingfoil/`.
 */
export function fakeBuild(request: RunOnceRequest): void {
  // The snapshot of a wingfoil configuration runs the arm's setup instead (task-015).
  if (request.command.join(' ').includes('/build/arm/')) {
    const config = join(request.mount.source, 'workspace', '.wingfoil');
    mkdirSync(join(config, 'directives', 'custom'), { recursive: true });
    writeFileSync(join(config, 'dna.yaml'), 'project:\n  name: Fake\n  description: A fake project.\n');
    writeFileSync(join(config, 'roles.yaml'), 'assignments:\n  developer: [fake-rule]\n');
    writeFileSync(
      join(config, 'directives', 'custom', 'fake-rule.md'),
      '---\nid: fake-rule\ntitle: Fake rule\n---\nBe fake.\n',
    );
    return;
  }
  mkdirSync(join(request.mount.source, 'out'), { recursive: true });
  writeFileSync(join(request.mount.source, 'out', 'wingfoil-0.1.0.tgz'), 'tarball');
  writeFileSync(join(request.mount.source, 'out', 'installed.tgz'), 'installed');
}

/** Everything the doubles recorded, in order. */
export interface Recorded {
  readonly builds: string[];
  readonly buildRequests: BuildRequest[];
  readonly creates: CreateRequest[];
  /** Every scoring container (task-027): its image, its read-only mounts. */
  readonly scoringCreates: ScoringContainerRequest[];
  readonly starts: string[];
  readonly execs: { container: string; command: string[] }[];
  readonly removes: string[];
  readonly gitCalls: string[];
  readonly steps: StepRequest[];
  /** Every resume the approver asked for, in order (REQ-RUN-07). */
  readonly resumes: ResumeRequest[];
  /** Every prefix the runner asked Docker to list containers by (bug-003). */
  readonly listed: string[];
  /** Every copy into a container, as `source -> container:target` (REQ-RUN-03). */
  readonly copies: string[];
  /** Every one-off container, such as a harness build (adr-003 decision 1). */
  readonly runOnce: RunOnceRequest[];
}

/** One invocation of the agent: a step's session, or a resume of it. */
export type AgentRequest = StepRequest | ResumeRequest;

/** Which invocation of its step a request is: 0 for the session, then 1, 2, 3 for its resumes. */
export function invocationOf(request: AgentRequest): number {
  return 'intervention' in request ? request.intervention : 0;
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
    onStep?: (request: AgentRequest) => void;
    /** The session the agent answers with; by default the one it was given (F2.2). */
    sessionOf?: (request: AgentRequest) => string;
    /** What the invocation reports having cost (REQ-RUN-09); by default nothing. */
    usageOf?: (request: AgentRequest) => SessionUsage;
    /** The invocation's recorded stream; by default one line naming the step and the invocation. */
    transcriptOf?: (request: AgentRequest) => readonly string[];
    /** Why the invocation's session failed, if it did: the agent reports it rather than throwing. */
    errorOf?: (request: AgentRequest) => string | undefined;
    /** How the agent says the session stopped short (task-024): its cost cap, or the quota. */
    stopOf?: (request: AgentRequest) => 'cap reached' | 'quota exhausted' | undefined;
    /** The session's final assistant message, which the approver classifies; by default none. */
    messageOf?: (request: AgentRequest) => string | undefined;
    /** What a step's patch holds; by default a line naming the directory and the ref. */
    patchOf?: (directory: string, ref: string) => string;
    /** Makes one Docker or git call fail: `create`, `start`, `remove` and `init` break a run
     * outside its steps, `commit` and `patch` break it inside one. */
    failing?: {
      call: 'create' | 'start' | 'remove' | 'init' | 'commit' | 'patch' | 'list';
      error: string;
    };
    /** What a one-off container answers; by default success. */
    runOnceResult?: ProcessResult;
    /** What a one-off container does to its mount before answering: a build writes its artefacts. */
    onRunOnce?: (request: RunOnceRequest) => void;
    /** What a command in the container answers, by command; falls back to {@link execResult}. */
    execResultOf?: (command: readonly string[]) => ProcessResult | undefined;
    /** The commits a harness clone knows, by the revision that names them (REQ-RUN-14). */
    commits?: Readonly<Record<string, string>>;
    /** What archiving a commit writes, given the file it writes to; by default nothing. */
    archive?: (file: string) => void;
    /** Containers that already exist, as Docker names them: what an interrupted run left behind. */
    leftovers?: readonly string[];
    /** Which of {@link leftovers} are running, as another invocation's would be. */
    running?: readonly string[];
  } = {},
): Doubles {
  const recorded: Recorded = {
    builds: [],
    buildRequests: [],
    creates: [],
    scoringCreates: [],
    starts: [],
    execs: [],
    removes: [],
    gitCalls: [],
    steps: [],
    resumes: [],
    listed: [],
    copies: [],
    runOnce: [],
  };
  let containers = 0;
  let patches = 0;
  let trees = 0;
  let lastCommit = '';
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
    createScoring: (request) => {
      recorded.scoringCreates.push(request);
      containers += 1;
      return Promise.resolve(`container-${containers}`);
    },
    start: (container) => {
      recorded.starts.push(container);
      if (options.failing?.call === 'start') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve();
    },
    exec: (container, command) => {
      recorded.execs.push({ container, command: [...command] });
      return Promise.resolve(
        options.execResultOf?.(command) ?? options.execResult ?? { code: 0, stdout: '', stderr: '' },
      );
    },
    runOnce: (request) => {
      recorded.runOnce.push(request);
      (options.onRunOnce ?? fakeBuild)(request);
      return Promise.resolve(options.runOnceResult ?? { code: 0, stdout: '', stderr: '' });
    },
    copyTo: (container, source, target) => {
      recorded.copies.push(`${source} -> ${container}:${target}`);
      return Promise.resolve();
    },
    remove: (container) => {
      recorded.removes.push(container);
      if (options.failing?.call === 'remove') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve();
    },
    // Filtered by the prefix the runner asked for, as the real port does: a runner asking too broadly
    // would get back containers that are not its campaign's, and a test can see it.
    containersNamed: (prefix) => {
      recorded.listed.push(prefix);
      if (options.failing?.call === 'list') return Promise.reject(new Error(options.failing.error));
      return Promise.resolve(
        (options.leftovers ?? [])
          .filter((name) => name.startsWith(prefix))
          .map((name) => ({ name, running: options.running?.includes(name) ?? false })),
      );
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
    // The options are part of the call: without them nothing could see whether the runner asked for
    // --allow-empty, which is what keeps a step that changed nothing from failing its run.
    commitAll: (directory, message, commit) => {
      const empty = commit?.allowEmpty === true ? ' --allow-empty' : '';
      recorded.gitCalls.push(`commit ${directory} ${message}${empty}`);
      lastCommit = message;
      // Only a step commit: the seed commit happens in prepareWorkspace, before a container exists,
      // and failing it would exercise a different moment of the run (covered by `init`).
      if (options.failing?.call === 'commit' && message.startsWith('step ')) {
        return Promise.reject(new Error(options.failing.error));
      }
      return Promise.resolve();
    },
    // In the same transcript as the commits: the identity must be written before the setup runs.
    configureIdentity: (directory, name, email) => {
      recorded.gitCalls.push(`identity ${directory} ${name} <${email}>`);
      return Promise.resolve();
    },
    resolveCommit: (repository, rev) => {
      recorded.gitCalls.push(`resolve ${repository} ${rev}`);
      // By default every revision is a commit, spelled out to 40 characters; `commits` narrows that.
      return Promise.resolve(options.commits === undefined ? rev.padEnd(40, '0') : options.commits[rev]);
    },
    archive: (repository, sha, file) => {
      recorded.gitCalls.push(`archive ${repository} ${sha}`);
      return Promise.resolve(options.archive?.(file));
    },
    head: (directory) => {
      recorded.gitCalls.push(`head ${directory}`);
      return Promise.resolve('5e7a9c0ffee5e7a9c0ffee5e7a9c0ffee5e7a9c0');
    },
    // Recorded in the same transcript as the commits, so their order is pinned: a patch read before
    // its commit would hold the previous step's snapshot, and every scored step would slip by one.
    // Every answer is different, so a test can tell which call's patch was written where. Without
    // the counter all five answers are the same string, and a snapshot filed under another step's
    // number reads as correct — the directory would be pinned by nothing at all.
    patchOf: (directory, ref) => {
      patches += 1;
      recorded.gitCalls.push(`patch ${directory} ${ref}`);
      // A step's patch only, as for `commit`: the setup's patch (task-027) failing is a setup failure.
      if (options.failing?.call === 'patch' && lastCommit.startsWith('step ')) {
        return Promise.reject(new Error(options.failing.error));
      }
      return Promise.resolve(
        options.patchOf?.(directory, ref) ?? `patch of ${directory} at ${ref} #${patches}\n`,
      );
    },
    // Each tree different and in call order, so a test can tell which commit's tree was recorded where.
    tree: (directory, ref) => {
      trees += 1;
      recorded.gitCalls.push(`tree ${directory} ${ref}`);
      return Promise.resolve(`tree-${trees}`.padEnd(40, '0'));
    },
    apply: (directory, patchFile) => {
      recorded.gitCalls.push(`apply ${directory} ${patchFile}`);
      return Promise.resolve();
    },
  };
  const answer = (request: AgentRequest): Promise<StepOutcome> => {
    options.onStep?.(request);
    const error = options.errorOf?.(request);
    const message = options.messageOf?.(request);
    const stop = options.stopOf?.(request);
    return Promise.resolve({
      sessionId: options.sessionOf?.(request) ?? request.sessionId,
      usage: options.usageOf?.(request) ?? NO_USAGE,
      transcript: options.transcriptOf?.(request) ?? [
        `{"type":"result","step":${request.step},"invocation":${invocationOf(request)}}`,
      ],
      ...(error === undefined ? {} : { error }),
      ...(stop === undefined ? {} : { stop }),
      ...(message === undefined ? {} : { finalMessage: message }),
    });
  };
  const agent: AgentPort = {
    runStep: (request) => {
      recorded.steps.push(request);
      return answer(request);
    },
    resume: (request) => {
      recorded.resumes.push(request);
      return answer(request);
    },
  };
  return { docker, git, agent, recorded };
}
