import { fail, ok } from '../result.js';
import type { Result } from '../result.js';

import type { ProcessPort, ProcessResult } from './process.js';

/**
 * What publishing the site needs of the outside world (REQ-RES-04 as amended in 1.22, task-047): whether
 * anyone can read the repository, and git in the maintainer's own environment, whose credentials push.
 */
export interface PublishPort {
  /** Whether the repository at `remote` (as `git remote get-url` gives it) can be read by anyone. */
  isPublic(remote: string): Promise<Result<true>>;
  /** git with `args` in `cwd`, in the maintainer's environment, the host repository's variables removed. */
  git(args: readonly string[], cwd: string): Promise<ProcessResult>;
}

/** A GitHub remote's anonymous https address, or undefined for any other remote. */
export function githubHttpsUrl(remote: string): string | undefined {
  const match =
    /^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(remote) ??
    /^ssh:\/\/git@github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(remote) ??
    /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(remote);
  return match === null ? undefined : `https://github.com/${match[1] as string}/${match[2] as string}.git`;
}

/**
 * The environment of the visibility probe: no configuration file (so no credential helper and no
 * `url.<base>.insteadOf` turning https back into ssh with the maintainer's keys), no prompt, and an askpass
 * that answers nothing. A private repository then cannot be read, and the probe fails.
 */
const ANONYMOUS = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: 'true',
  SSH_ASKPASS: undefined,
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
};

/** The variables that would point git at the host repository instead of `cwd`. */
const HOST_REPOSITORY = {
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
};

/** The probe's patience: a public repository answers in seconds. */
const PROBE_MS = 30_000;

/** The publish port over the system's processes. */
export function publishCli(process: ProcessPort): PublishPort {
  return {
    async isPublic(remote) {
      const url = githubHttpsUrl(remote);
      if (url === undefined) {
        return fail([{ path: remote, message: 'is not a GitHub repository: its visibility cannot be read' }]);
      }
      const answer = await process.run('git', ['ls-remote', '--heads', url], {
        env: ANONYMOUS,
        timeoutMs: PROBE_MS,
      });
      return answer.code === 0
        ? ok(true)
        : fail([{ path: url, message: 'cannot be read anonymously: it is private, or unreachable' }]);
    },
    git: (args, cwd) => process.run('git', args, { cwd, env: HOST_REPOSITORY }),
  };
}
