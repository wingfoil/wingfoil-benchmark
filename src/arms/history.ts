import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

import { armDigest, armDigestOf, configuredOfIn } from './digest.js';

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

/** `git -C repo args`'s output, read with no global configuration; `undefined` when git fails. */
export function gitRead(repo: string, args: readonly string[]): Buffer | undefined {
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
  // A configured arm's digest covers its base arm's files too (REQ-FMT-13 as amended in 1.50): the commits touching
  // either are read, its base named by the working tree's arm.yaml when it has one, else by each commit's.
  const treeYaml = join(repoRoot, path, 'arm.yaml');
  const treeBase = existsSync(treeYaml) ? configuredOfIn(readFileSync(treeYaml, 'utf8')) : undefined;
  const logged = [path, ...(treeBase === undefined ? [] : [posix.join('arms', treeBase)])];
  const log = gitRead(repoRoot, ['log', '--format=%H', '--', ...logged]);
  const commits = (log?.toString('utf8') ?? '').split('\n').filter((line) => /^[0-9a-f]{40,64}$/.test(line));
  for (const commit of commits) {
    const files = new Map<string, Buffer | string>();
    const written: [string, Buffer][] = [];
    const read = (directory: string) => {
      const listing =
        gitRead(repoRoot, ['ls-tree', '-r', '-z', commit, '--', directory])?.toString('utf8') ?? '';
      for (const entry of listing.split('\0').filter(Boolean)) {
        const tab = entry.indexOf('\t');
        const [mode = '', , object = ''] = entry.slice(0, tab).split(' ');
        const file = entry.slice(tab + 1);
        if (mode === '160000') {
          files.set(file, 'special');
          continue;
        }
        const content = gitRead(repoRoot, ['cat-file', 'blob', object]) ?? Buffer.alloc(0);
        if (mode === '120000') files.set(file, `link:${content.toString('utf8')}`);
        else {
          files.set(file, content);
          written.push([file, content]);
        }
      }
    };
    read(path);
    const yaml = files.get(posix.join(path, 'arm.yaml'));
    const base = yaml === undefined ? undefined : configuredOfIn(yaml.toString());
    if (base !== undefined && base !== arm) read(posix.join('arms', base));
    if (files.size === 0 || armDigestOf(files).slice(0, digest.length) !== digest) continue;
    // An arm already written for this commit is reused as it is; otherwise it is written aside, then moved into place
    // whole (task-095 review rounds 1 and 2): a stale copy is replaced, and a reader never sees a half-written arm.
    const root = join(repoRoot, '.cache', 'arms', commit);
    const target = join(root, path);
    const cached = () => existsSync(target) && armDigest(root, arm).slice(0, digest.length) === digest;
    if (cached()) return { commit, root };
    // A configured arm's base is written beside it, from the same commit: one already there is the same commit's.
    const dirs = [path, ...(base === undefined || base === arm ? [] : [posix.join('arms', base)])];
    const staging = join(root, `.staging.${arm}.${process.pid}.${Date.now()}.tmp`);
    try {
      for (const [file, content] of written) {
        const at = join(staging, file);
        mkdirSync(dirname(at), { recursive: true });
        writeFileSync(at, content);
      }
      for (const directory of dirs) {
        const into = join(root, directory);
        if (directory !== path && existsSync(into)) continue;
        rmSync(into, { recursive: true, force: true });
        mkdirSync(dirname(into), { recursive: true });
        try {
          renameSync(join(staging, directory), into);
        } catch (error) {
          // Another process put the same arm in place meanwhile: it is the same commit's, so it is used.
          if (directory !== path || !cached()) throw error;
        }
      }
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
    return { commit, root };
  }
  return undefined;
}
