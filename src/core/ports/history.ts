import type { ProcessPort } from './process.js';

/**
 * Read-only access to a repository's history (task-073): what a site build needs to read an arm as it ran, when the
 * working tree no longer holds it (REQ-RES-10, REQ-RES-02). Every failure — a directory that is not a repository, a
 * path never committed — reads as nothing found, never as an error: the caller then refuses, naming what it looked for.
 */
export interface HistoryPort {
  /** The commits that touched `path` (a repository path), newest first; none outside a repository. */
  commitsTouching(repo: string, path: string): Promise<string[]>;
  /**
   * Every file under `path` at `commit`, by repository path: a file's bytes as text, a symbolic link as `link:<target>`
   * and anything else (a submodule) as `special`, as `armDigest` reads the working tree.
   */
  filesAt(repo: string, commit: string, path: string): Promise<Map<string, string>>;
}

/** No global or system configuration, and no variable pointing git at another repository. */
const READ_ENVIRONMENT = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_DIR: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
};

/** The history port that runs the system's git. */
export function historyCli(process: ProcessPort): HistoryPort {
  const git = async (repo: string, args: readonly string[]): Promise<string | undefined> => {
    const result = await process.run('git', ['-C', repo, ...args], { env: READ_ENVIRONMENT });
    return result.code === 0 ? result.stdout : undefined;
  };
  return {
    async commitsTouching(repo, path) {
      const out = await git(repo, ['log', '--format=%H', '--', path]);
      return out === undefined ? [] : out.split('\n').filter((line) => /^[0-9a-f]{40,64}$/.test(line));
    },
    async filesAt(repo, commit, path) {
      const files = new Map<string, string>();
      const listing = await git(repo, ['ls-tree', '-r', '-z', commit, '--', path]);
      for (const entry of (listing ?? '').split('\0').filter(Boolean)) {
        const tab = entry.indexOf('\t');
        const [mode = '', , object = ''] = entry.slice(0, tab).split(' ');
        const file = entry.slice(tab + 1);
        if (mode === '160000') {
          files.set(file, 'special');
          continue;
        }
        const content = (await git(repo, ['cat-file', 'blob', object])) ?? '';
        files.set(file, mode === '120000' ? `link:${content}` : content);
      }
      return files;
    },
  };
}
