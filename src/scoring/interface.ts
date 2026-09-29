import { fail, ok } from '../core/index.js';
import type { DockerPort, Result } from '../core/index.js';

import { SCORE_ROOT } from './hidden-tests.js';

/** The scoring image's public-interface extraction (docker/score-image/interface.mjs, task-042). */
const INTERFACE_SCRIPT = '/opt/score/interface.mjs';

/** Where the snapshot is copied in the container, relative to its working directory. */
const SNAPSHOT = 'snapshot';

/** The bounds of the extraction: it parses files and runs nothing of the agent's. */
const INTERFACE_TIMEOUT_S = 300;
const KILL_AFTER_S = 10;

/** Reads the public interface of a run's final snapshot, from `files`: its entries, sorted. */
export type InterfaceRunner = (request: {
  readonly snapshot: string;
  readonly files: readonly string[];
}) => Promise<Result<string[]>>;

/** Read interface.mjs's lines: one JSON string each. */
export function parseInterface(stdout: string): Result<string[]> {
  const entries: string[] = [];
  const lines = stdout.split('\n');
  for (const [index, line] of lines.entries()) {
    if (line.trim() === '') continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      entry = undefined;
    }
    if (typeof entry !== 'string') {
      return fail([{ path: 'final', message: `interface output line ${index + 1} is not an entry` }]);
    }
    entries.push(entry);
  }
  return ok(entries);
}

/**
 * The public-interface runner of scoring (REQ-SCO-01, REQ-SCO-05 as amended in 1.17; adr-004 amendment
 * 4): one scoring container, with no mount and no network, the final snapshot copied in, the image's
 * script run with the TypeScript the image pins. The container is removed whatever happens; an exit
 * other than 0 is an oracle error.
 */
export function interfaceInContainer(options: {
  readonly docker: DockerPort;
  readonly image: string;
  readonly containerPrefix: string;
}): InterfaceRunner {
  const { docker } = options;
  return async ({ snapshot, files }) => {
    const container = await docker.createScoring({
      image: options.image,
      name: `${options.containerPrefix}-interface`,
      user: 'node',
      workdir: SCORE_ROOT,
      readOnly: [],
    });
    try {
      await docker.start(container);
      await docker.copyTo(container, snapshot, `${SCORE_ROOT}/${SNAPSHOT}`);
      const result = await docker.exec(container, [
        'timeout',
        `--kill-after=${KILL_AFTER_S}`,
        String(INTERFACE_TIMEOUT_S),
        'node',
        INTERFACE_SCRIPT,
        SNAPSHOT,
        JSON.stringify(files),
      ]);
      if (result.code !== 0) {
        const said = result.stderr.trim().split('\n').slice(-5).join('\n');
        return fail([
          {
            path: 'final',
            message: `the interface extraction exited with code ${result.code}${said === '' ? '' : `: ${said}`}`,
          },
        ]);
      }
      return parseInterface(result.stdout);
    } finally {
      await docker.remove(container);
    }
  };
}
