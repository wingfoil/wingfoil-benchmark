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
}

const MOUNT_FORMAT = '{{range .Mounts}}{{.Source}}:{{.Destination}}\n{{end}}';

/** The Docker port that calls the `docker` command line. */
export function dockerCli(process: ProcessPort): DockerPort {
  async function docker(args: readonly string[]): Promise<ProcessResult> {
    const result = await process.run('docker', args);
    if (result.code !== 0) throw processFailure('docker', args, result);
    return result;
  }

  return {
    async build({ dockerfile, context, tag, buildArgs }) {
      const args = ['build', '--file', dockerfile, '--tag', tag];
      for (const [name, value] of Object.entries(buildArgs)) args.push('--build-arg', `${name}=${value}`);
      await docker([...args, context]);
    },
    async create({ image, name, workspace, user }) {
      const result = await docker([
        'create',
        '--name',
        name,
        '--user',
        user,
        '--workdir',
        WORKSPACE,
        '--mount',
        `type=bind,source=${workspace},target=${WORKSPACE}`,
        image,
        'sleep',
        'infinity',
      ]);
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
    async mountsOf(container) {
      const result = await docker(['inspect', '--format', MOUNT_FORMAT, container]);
      return result.stdout.split('\n').filter((line) => line.trim() !== '');
    },
  };
}
