import { processFailure } from './process.js';
import type { ProcessPort } from './process.js';

/**
 * What keeps the host's git out of a run (REQ-NFR-02): a fixed identity, no global or system
 * configuration, no commit template, no hooks and no signing. Without this, `.git/` — which is inside
 * the run's bind mount — would carry the host's hooks and template files into the container, and a
 * host that signs commits would fail every seed commit.
 */
const NAME = 'WingFoil Benchmark';
const EMAIL = 'benchmark@localhost';

const ISOLATION = [
  '-c',
  `user.name=${NAME}`,
  '-c',
  `user.email=${EMAIL}`,
  '-c',
  'init.templateDir=',
  '-c',
  'core.hooksPath=',
  '-c',
  'commit.gpgsign=false',
];

/**
 * The environment git runs in. Variables beat `-c` settings, so the host's `GIT_*` must be answered
 * here: `GIT_TEMPLATE_DIR` would copy host files and hooks into `.git/` — inside the run's bind
 * mount — `GIT_AUTHOR_*`/`GIT_COMMITTER_*` would replace the fixed identity, and `GIT_DIR` and its
 * siblings would point the commands at the host's own repository. Those last ones are **removed**:
 * git refuses an empty `GIT_DIR` rather than ignoring it.
 */
const ISOLATED_ENVIRONMENT = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_TEMPLATE_DIR: '',
  GIT_DIR: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
  GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined,
  GIT_AUTHOR_NAME: NAME,
  GIT_AUTHOR_EMAIL: EMAIL,
  GIT_COMMITTER_NAME: NAME,
  GIT_COMMITTER_EMAIL: EMAIL,
};

/** REQ-ARC-04: git behind one interface. */
export interface GitPort {
  init(directory: string): Promise<void>;
  /**
   * Stages everything and commits it. `allowEmpty` is what a step commit needs (REQ-RUN-05): a step
   * that changed nothing is still a snapshot, and without it `git commit` fails and the step
   * numbering skips exactly where an agent did nothing.
   */
  commitAll(directory: string, message: string, options?: { allowEmpty?: boolean }): Promise<void>;
  /**
   * The patch from tree `from` to tree `to`, for `setup/diff.patch` and `steps/<NN>/diff.patch`
   * (REQ-RUN-05): everything between two snapshots, whatever commits the harness or the agent made in
   * between (bug-007), binary files included and full object ids, so that `apply` rebuilds the later
   * snapshot from the earlier one (task-027).
   */
  patchOf(directory: string, from: string, to: string): Promise<string>;
  /** The id of the tree of commit `ref`: its content alone, what a rebuilt snapshot is checked against. */
  tree(directory: string, ref: string): Promise<string>;
  /** Applies a patch file to the working tree and the index, as the next commit's content (task-027). */
  apply(directory: string, patchFile: string): Promise<void>;
  /**
   * Writes `user.name` and `user.email` into the repository's own configuration: the identity the
   * agent commits with in the container (adr-003 decisions 6, 7). The runner's own commits keep the
   * fixed identity its `-c` settings give them, which take precedence over the repository's.
   */
  configureIdentity(directory: string, name: string, email: string): Promise<void>;
  /** The full SHA of the commit the repository is at. */
  head(directory: string): Promise<string>;
  /**
   * The full SHA of the commit `rev` names in `repository`, or `undefined` when it names none: how a
   * harness pin is checked against its clone (REQ-RUN-14).
   */
  resolveCommit(repository: string, rev: string): Promise<string | undefined>;
  /** Writes commit `sha` of `repository` as a tar file `file`: its tree only, from the object store. */
  archive(repository: string, sha: string, file: string): Promise<void>;
}

/** The git port that calls the `git` command line. */
export function gitCli(process: ProcessPort): GitPort {
  async function git(directory: string, args: readonly string[]): Promise<string> {
    const full = [...ISOLATION, '-C', directory, ...args];
    const result = await process.run('git', full, { env: ISOLATED_ENVIRONMENT });
    if (result.code !== 0) throw processFailure('git', full, result);
    return result.stdout;
  }

  return {
    init: async (directory) => {
      await git(directory, ['init', '--quiet', '--initial-branch=main']);
    },
    commitAll: async (directory, message, options) => {
      await git(directory, ['add', '--all']);
      const empty = options?.allowEmpty === true ? ['--allow-empty'] : [];
      await git(directory, ['commit', '--quiet', ...empty, '--message', message]);
    },
    patchOf: (directory, from, to) => git(directory, ['diff', '--binary', '--full-index', from, to]),
    tree: async (directory, ref) => (await git(directory, ['rev-parse', `${ref}^{tree}`])).trim(),
    apply: async (directory, patchFile) => {
      await git(directory, ['apply', '--index', patchFile]);
    },
    configureIdentity: async (directory, name, email) => {
      await git(directory, ['config', 'user.name', name]);
      await git(directory, ['config', 'user.email', email]);
    },
    head: async (directory) => (await git(directory, ['rev-parse', 'HEAD'])).trim(),
    resolveCommit: async (repository, rev) => {
      const args = [...ISOLATION, '-C', repository, 'rev-parse', '--verify', '--quiet', `${rev}^{commit}`];
      const result = await process.run('git', args, { env: ISOLATED_ENVIRONMENT });
      return result.code === 0 ? result.stdout.trim() : undefined;
    },
    archive: async (repository, sha, file) => {
      await git(repository, ['archive', '--format=tar', `--output=${file}`, sha]);
    },
  };
}
