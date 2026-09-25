import { processFailure } from './process.js';
import type { ProcessPort, ProcessResult } from './process.js';

/** Where a run's workspace is mounted inside its container (REQ-RUN-02). */
export const WORKSPACE = '/workspace';

/** What building a campaign's image needs (REQ-RUN-01). */
export interface BuildRequest {
  readonly dockerfile: string;
  readonly context: string;
  readonly tag: string;
  readonly buildArgs: Readonly<Record<string, string>>;
}

/** What creating a run's container needs: its image, its name and its one bind mount. */
export interface CreateRequest {
  readonly image: string;
  readonly name: string;
  readonly workspace: string;
  readonly user: string;
  /**
   * The container's environment: how the agent's credential reaches it (REQ-RUN-15, requirements
   * 1.3). Only the variable **names** go on Docker's command line; the values are handed to the
   * `docker` process in its own environment, so they cannot reach `ps`, an error message built from
   * the command line, a log or a stored result (REQ-NFR-01).
   */
  readonly env?: Readonly<Record<string, string>>;
}

/** REQ-ARC-04: Docker behind one interface, so acceptance tests run without Docker. */
export interface DockerPort {
  build(request: BuildRequest): Promise<void>;
  /** Creates the container and returns its id. */
  create(request: CreateRequest): Promise<string>;
  start(container: string): Promise<void>;
  /**
   * Runs `command` in the container. The result carries the command's own exit code; a Docker failure
   * (no such container, daemon down) arrives as a non-zero code with Docker's message on stderr, so
   * the caller sees the text either way.
   */
  exec(container: string, command: readonly string[]): Promise<ProcessResult>;
  remove(container: string): Promise<void>;
  /** The container's mounts, as `source:target`. */
  mountsOf(container: string): Promise<string[]>;
  /**
   * Every container, running or not, whose name starts with `prefix` (bug-003). Bounded in time: a
   * daemon that cannot list its containers says so rather than hanging the campaign.
   */
  containersNamed(prefix: string): Promise<string[]>;
}

/** How long listing containers may take before the campaign stops waiting for Docker. */
const LIST_TIMEOUT_MS = 30_000;

const MOUNT_FORMAT = '{{range .Mounts}}{{.Source}}:{{.Destination}}\n{{end}}';

/** The Docker port that calls the `docker` command line. */
export function dockerCli(process: ProcessPort): DockerPort {
  /**
   * `env` reaches the `docker` process itself, never its arguments: `processFailure` renders the
   * command line into the message it throws, and that message is logged and stored with the run.
   */
  async function docker(
    args: readonly string[],
    env?: Readonly<Record<string, string>>,
  ): Promise<ProcessResult> {
    const result = await process.run('docker', args, env === undefined ? undefined : { env });
    if (result.code !== 0) throw processFailure('docker', args, result);
    return result;
  }

  return {
    async build({ dockerfile, context, tag, buildArgs }) {
      const args = ['build', '--file', dockerfile, '--tag', tag];
      for (const [name, value] of Object.entries(buildArgs)) args.push('--build-arg', `${name}=${value}`);
      await docker([...args, context]);
    },
    async create({ image, name, workspace, user, env }) {
      // `--mount` takes comma-separated `key=value` pairs, so a path holding either would be read as
      // more options. Refusing is safer than quoting: such a checkout cannot run the benchmark.
      if (workspace.includes(',') || workspace.includes('=')) {
        throw new Error(`the workspace path cannot hold a comma or an equals sign: ${workspace}`);
      }
      const result = await docker(
        [
          'create',
          '--name',
          name,
          '--user',
          user,
          '--workdir',
          WORKSPACE,
          '--mount',
          `type=bind,source=${workspace},target=${WORKSPACE}`,
          // The name alone: `--env NAME` tells Docker to take NAME from this process's environment.
          ...Object.keys(env ?? {}).flatMap((variable) => ['--env', variable]),
          image,
          'sleep',
          'infinity',
        ],
        env,
      );
      return result.stdout.trim();
    },
    async start(container) {
      await docker(['start', container]);
    },
    exec(container, command) {
      return process.run('docker', ['exec', container, ...command]);
    },
    async remove(container) {
      await docker(['rm', '--force', container]);
    },
    async containersNamed(prefix) {
      const args = ['ps', '--all', '--filter', `name=${prefix}`, '--format', '{{.Names}}'];
      const result = await process.run('docker', args, { timeoutMs: LIST_TIMEOUT_MS });
      if (result.timedOut === true) {
        throw new Error(
          `docker ps did not answer within ${LIST_TIMEOUT_MS / 1000} s while looking for containers ` +
            'left by earlier runs of this campaign',
        );
      }
      if (result.code !== 0) throw processFailure('docker', args, result);
      // Docker's name filter matches anywhere in a name; only a true prefix is this campaign's.
      return result.stdout.split('\n').filter((name) => name.startsWith(prefix));
    },
    async mountsOf(container) {
      const result = await docker(['inspect', '--format', MOUNT_FORMAT, container]);
      return result.stdout.split('\n').filter((line) => line.trim() !== '');
    },
  };
}
