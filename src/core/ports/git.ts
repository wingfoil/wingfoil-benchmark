import { processFailure } from './process.js';
import type { ProcessPort } from './process.js';

/**
 * The identity every run's repository is created with, passed per command so that the host's git
 * configuration never reaches a run (REQ-NFR-02).
 */
const IDENTITY = ['-c', 'user.name=WingFoil Benchmark', '-c', 'user.email=benchmark@localhost'];

/** REQ-ARC-04: git behind one interface. */
export interface GitPort {
  init(directory: string): Promise<void>;
  /** Stages everything and commits it. */
  commitAll(directory: string, message: string): Promise<void>;
}

/** The git port that calls the `git` command line. */
export function gitCli(process: ProcessPort): GitPort {
  async function git(directory: string, args: readonly string[]): Promise<void> {
    const full = [...IDENTITY, '-C', directory, ...args];
    const result = await process.run('git', full);
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
