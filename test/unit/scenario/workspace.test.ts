import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gitCli, systemProcess } from '../../../src/core/index.js';
import type { GitPort, Scenario } from '../../../src/core/index.js';
import { prepareWorkspace } from '../../../src/scenario/workspace.js';
import { tempDir } from '../../support/scenario-fixture.js';

const scenario = (seedDir: string) => ({ id: 'S9', version: '1.0', seedDir }) as Scenario;

function seed(files: Record<string, string>): string {
  const dir = join(tempDir('bench-seed-'), 'seed');
  mkdirSync(dir);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

describe('prepareWorkspace (bug-033, item 1)', () => {
  const git = gitCli(systemProcess);

  it("says in the benchmark's words that git records none of the seed's files, with the real git", async () => {
    const directory = join(tempDir('bench-workspace-'), 'w');
    await expect(
      prepareWorkspace(directory, scenario(seed({ '.gitignore': '*\n', 'a.txt': 'ignored\n' })), git),
    ).rejects.toThrow(
      'the seed of S9@1.0 gives its first commit nothing: git records none of the files it holds',
    );
  });

  it('commits a seed with a file git records, beside one it ignores', async () => {
    const directory = join(tempDir('bench-workspace-'), 'w');
    await prepareWorkspace(directory, scenario(seed({ '.gitignore': '*.log\n', 'a.txt': 'kept\n' })), git);
    const subject = execFileSync('git', ['-C', directory, 'log', '-1', '--format=%s'], { encoding: 'utf8' });
    expect(subject.trim()).toBe('seed');
  });

  it("leaves any other git failure in git's words", async () => {
    const directory = join(tempDir('bench-workspace-'), 'w');
    const failing = {
      init: async () => undefined,
      commitAll: async () => {
        throw new Error('git commit: no identity');
      },
    } as unknown as GitPort;
    await expect(prepareWorkspace(directory, scenario(seed({ 'a.txt': 'x\n' })), failing)).rejects.toThrow(
      'git commit: no identity',
    );
  });
});
