import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

import { armDigestOf } from './digest.js';

/** No global or system configuration, and no variable pointing git at another repository (as `historyCli`). */
const READ_ENVIRONMENT: NodeJS.ProcessEnv = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) =>
        !['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY'].includes(
          name,
        ),
    ),
  ),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

function git(repo: string, args: readonly string[]): Buffer | undefined {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      env: READ_ENVIRONMENT,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }
}

/** An arm read from a commit of the history: the commit, and the root it was written under. */
export interface ArmFromHistory {
  readonly commit: string;
  /** A repository-shaped root holding `arms/<arm>/` as the commit has it: `.cache/arms/<commit>/`. */
  readonly root: string;
}

/**
 * The newest commit of `repoRoot`'s history whose `arms/<arm>/` digests to `digest` (12 hex, as a campaign file pins
 * it), written under `<repoRoot>/.cache/arms/<commit>/` (REQ-FMT-13 as amended in 1.33, task-095); undefined when no
 * commit does, or outside a repository. Each file's bytes are read as the working tree's digest reads them; a
 * symbolic link is hashed by its target and not written (the arm loader refuses one anyway).
 */
export function armFromHistory(repoRoot: string, arm: string, digest: string): ArmFromHistory | undefined {
  const path = posix.join('arms', arm);
  const log = git(repoRoot, ['log', '--format=%H', '--', path]);
  const commits = (log?.toString('utf8') ?? '').split('\n').filter((line) => /^[0-9a-f]{40,64}$/.test(line));
  for (const commit of commits) {
    const files = new Map<string, Buffer | string>();
    const written: [string, Buffer][] = [];
    const listing = git(repoRoot, ['ls-tree', '-r', '-z', commit, '--', path])?.toString('utf8') ?? '';
    for (const entry of listing.split('\0').filter(Boolean)) {
      const tab = entry.indexOf('\t');
      const [mode = '', , object = ''] = entry.slice(0, tab).split(' ');
      const file = entry.slice(tab + 1);
      if (mode === '160000') {
        files.set(file, 'special');
        continue;
      }
      const content = git(repoRoot, ['cat-file', 'blob', object]) ?? Buffer.alloc(0);
      if (mode === '120000') files.set(file, `link:${content.toString('utf8')}`);
      else {
        files.set(file, content);
        written.push([file, content]);
      }
    }
    if (files.size === 0 || armDigestOf(files).slice(0, digest.length) !== digest) continue;
    // Written aside, then moved into place whole (task-095 review round 1): a stale copy with extra files is replaced,
    // and a reader never sees a half-written arm.
    const root = join(repoRoot, '.cache', 'arms', commit);
    const target = join(root, path);
    const staging = `${target}.${process.pid}.${Date.now()}.tmp`;
    for (const [file, content] of written) {
      const at = join(staging, posix.relative(path, file));
      mkdirSync(dirname(at), { recursive: true });
      writeFileSync(at, content);
    }
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    renameSync(staging, target);
    return { commit, root };
  }
  return undefined;
}
