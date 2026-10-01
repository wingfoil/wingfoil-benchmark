import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';

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
 * Where and how the visibility probe runs git (task-047's review): in an empty directory that is also its
 * home, with no configuration file of the system, the user, the repository or the environment
 * (`GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_COUNT` and its keys), no netrc, no prompt and an askpass that
 * answers nothing. Nothing can lend it credentials or rewrite its address, so a private repository cannot
 * be read and the probe fails. The caller removes the directory.
 */
export function anonymousGit(): { cwd: string; env: Record<string, string | undefined> } {
  const cwd = mkdtempSync(join(tmpdir(), 'bench-probe-'));
  const configured = Object.keys(process.env).filter((key) => /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key));
  return {
    cwd,
    env: {
      ...Object.fromEntries(configured.map((key) => [key, undefined])),
      HOME: cwd,
      XDG_CONFIG_HOME: cwd,
      GIT_CEILING_DIRECTORIES: dirname(cwd),
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG: undefined,
      GIT_CONFIG_PARAMETERS: undefined,
      GIT_CONFIG_COUNT: undefined,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'true',
      SSH_ASKPASS: undefined,
      NETRC: undefined,
      CURL_HOME: undefined,
      GIT_DIR: undefined,
      GIT_WORK_TREE: undefined,
    },
  };
}

/** The variables that would point git at the host repository instead of `cwd`. */
const HOST_REPOSITORY = {
  // No attribute source but the tree itself: not one named by the environment, not the system's file.
  GIT_ATTR_SOURCE: undefined,
  GIT_ATTR_NOSYSTEM: '1',
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
};

/** The probe's patience: a public repository answers in seconds. */
const PROBE_MS = 30_000;

/** The publish port over the system's processes. */
export function publishCli(port: ProcessPort): PublishPort {
  return {
    async isPublic(remote) {
      const url = githubHttpsUrl(remote);
      if (url === undefined) {
        return fail([{ path: remote, message: 'is not a GitHub repository: its visibility cannot be read' }]);
      }
      const { cwd, env } = anonymousGit();
      let answer;
      try {
        answer = await port.run('git', ['-c', 'credential.helper=', 'ls-remote', '--heads', url], {
          cwd,
          env,
          timeoutMs: PROBE_MS,
        });
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
      return answer.code === 0
        ? ok(true)
        : fail([{ path: url, message: 'cannot be read anonymously: it is private, or unreachable' }]);
    },
    git: (args, cwd) => port.run('git', args, { cwd, env: HOST_REPOSITORY }),
  };
}
