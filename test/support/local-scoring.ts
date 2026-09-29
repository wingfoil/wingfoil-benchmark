import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';

import type { DockerPort } from '../../src/core/index.js';
import { SCORE_ROOT } from '../../src/scoring/index.js';

import { repoPath } from './paths.js';

/** What the scoring image holds under `/opt/score`, and where the same files are on this machine. */
const IMAGE_FILES: Readonly<Record<string, string>> = {
  '/opt/score/node_modules/tsx/dist/loader.mjs': repoPath('node_modules/tsx/dist/loader.mjs'),
  '/opt/score/reporter.mjs': repoPath('docker/score-image/reporter.mjs'),
  '/opt/score/ast-checks.mjs': repoPath('docker/score-image/ast-checks.mjs'),
  '/opt/score/quality.mjs': repoPath('docker/score-image/quality.mjs'),
};

/**
 * A Docker double for scoring that really runs the hidden tests (task-032): each scoring container is
 * a temporary directory standing for `/score`, its read-only mounts and the snapshot are **copied**
 * where the container would have them — copied, not linked, since Node resolves a test's relative
 * import from the real path — and `exec` runs the command with this machine's Node and the devDependency
 * tsx, pinned to the scoring image's version, with the image's reporter. The command's `timeout` prefix
 * is dropped. What differs from the image is the host's Node 22 minor; `npm run test:docker` runs the
 * real one.
 */
export function localScoringDocker(): DockerPort {
  const roots = new Map<string, string>();
  let containers = 0;
  const rootOf = (container: string): string => {
    const root = roots.get(container);
    if (root === undefined) throw new Error(`no scoring container ${container}`);
    return root;
  };
  const place = (root: string, source: string, target: string): void => {
    const inside = join(root, posix.relative(SCORE_ROOT, target));
    mkdirSync(dirname(inside), { recursive: true });
    cpSync(source, inside, { recursive: true });
  };
  const unused = (): never => {
    throw new Error('not a scoring call');
  };
  return {
    build: () => Promise.resolve(),
    createScoring: (request) => {
      containers += 1;
      const name = `${request.name}-${containers}`;
      const root = mkdtempSync(join(tmpdir(), 'bench-local-score-'));
      roots.set(name, root);
      for (const mount of request.readOnly) place(root, mount.source, mount.target);
      return Promise.resolve(name);
    },
    start: () => Promise.resolve(),
    copyTo: (container, source, target) => {
      place(rootOf(container), source, target);
      return Promise.resolve();
    },
    exec: (container, command) => {
      const node = command.indexOf('node');
      const args = command
        .slice(node + 1)
        .map((argument) =>
          Object.entries(IMAGE_FILES).reduce(
            (text, [inImage, here]) => text.replace(inImage, here),
            argument,
          ),
        );
      const result = spawnSync(process.execPath, args, {
        cwd: rootOf(container),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      return Promise.resolve({ code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr });
    },
    remove: (container) => {
      const root = roots.get(container);
      if (root !== undefined) rmSync(root, { recursive: true, force: true });
      roots.delete(container);
      return Promise.resolve();
    },
    create: unused,
    runOnce: unused,
    mountsOf: unused,
    containersNamed: unused,
  };
}
