import { processFailure } from './process.js';
import type { ProcessPort } from './process.js';

/**
 * What keeps the host's git out of a run (REQ-NFR-02): a fixed identity, no global or system
 * configuration, no commit template, no hooks and no signing. Without this, `.git/` — which is inside
 * the run's bind mount — would carry the host's hooks and template files into the container, and a
 * host that signs commits would fail every seed commit.
 */
const ISOLATION = [
  '-c',
  'user.name=WingFoil Benchmark',
  '-c',
  'user.email=benchmark@localhost',
  '-c',
  'init.templateDir=',
  '-c',
  'core.hooksPath=',
  '-c',
  'commit.gpgsign=false',
];

const ISOLATED_ENVIRONMENT = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };

/** REQ-ARC-04: git behind one interface. */
export interface GitPort {
  init(directory: string): Promise<void>;
  /** Stages everything and commits it. */
  commitAll(directory: string, message: string): Promise<void>;
}

/** The git port that calls the `git` command line. */
export function gitCli(process: ProcessPort): GitPort {
  async function git(directory: string, args: readonly string[]): Promise<void> {
    const full = [...ISOLATION, '-C', directory, ...args];
    const result = await process.run('git', full, { env: ISOLATED_ENVIRONMENT });
    if (result.code !== 0) throw processFailure('git', full, result);
  }

  return {
    init: (directory) => git(directory, ['init', '--quiet', '--initial-branch=main']),
    commitAll: async (directory, message) => {
      await git(directory, ['add', '--all']);
      await git(directory, ['commit', '--quiet', '--message', message]);
    },
  };
}
