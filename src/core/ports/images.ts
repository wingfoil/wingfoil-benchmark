import { processFailure } from './process.js';
import type { ProcessPort, ProcessResult } from './process.js';

/** A tagged image on the host: its reference (`repository:tag`), its id and its size as Docker prints it. */
export interface ImageInfo {
  readonly reference: string;
  readonly id: string;
  readonly size: string;
}

/** A container, in any state: its name, the id of its image, and whether it is running. */
export interface ContainerInfo {
  readonly name: string;
  readonly imageId: string;
  readonly running: boolean;
}

/**
 * The host's images, for the benchmark's housekeeping (bug-015, task-061). Separate from the Docker port the runs
 * use, so that their doubles need not grow.
 */
export interface ImagePort {
  /** Every tagged image; untagged (`<none>`) ones are left out. */
  list(): Promise<ImageInfo[]>;
  /** Every container, running or not, with its image's id: `docker ps` alone names a re-tagged image by id. */
  containers(): Promise<ContainerInfo[]>;
  /** Removes an image by reference, never with `--force`: Docker's own refusal stays the last guard. */
  remove(reference: string): Promise<void>;
}

const IMAGE_FORMAT = '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}';
const CONTAINER_FORMAT = '{{.Name}}\t{{.Image}}\t{{.State.Running}}';

function lines(stdout: string): string[] {
  return stdout.split('\n').filter((line) => line.trim() !== '');
}

/** The image port that calls the `docker` command line. */
export function dockerImagesCli(process: ProcessPort): ImagePort {
  async function docker(args: readonly string[]): Promise<ProcessResult> {
    const result = await process.run('docker', args);
    if (result.code !== 0) throw processFailure('docker', args, result);
    return result;
  }

  return {
    async list() {
      const { stdout } = await docker(['images', '--no-trunc', '--format', IMAGE_FORMAT]);
      return lines(stdout)
        .map((line) => line.split('\t'))
        .filter(([reference = '']) => !reference.includes('<none>'))
        .map(([reference = '', id = '', size = '']) => ({ reference, id, size }));
    },
    async containers() {
      const ids = lines((await docker(['ps', '--all', '--quiet', '--no-trunc'])).stdout);
      if (ids.length === 0) return [];
      const { stdout } = await docker(['inspect', '--format', CONTAINER_FORMAT, ...ids]);
      return lines(stdout)
        .map((line) => line.split('\t'))
        .map(([name = '', imageId = '', running = '']) => ({
          name: name.replace(/^\//, ''),
          imageId,
          running: running === 'true',
        }));
    },
    async remove(reference) {
      await docker(['image', 'rm', reference]);
    },
  };
}
