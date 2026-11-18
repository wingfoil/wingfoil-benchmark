import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { GitPort, Scenario } from '../../../src/core/index.js';
import { prepareWorkspace } from '../../../src/scenario/workspace.js';
import { tempDir } from '../../support/scenario-fixture.js';

const scenario = (seedDir: string) => ({ id: 'S9', version: '1.0', seedDir }) as Scenario;
const git = (message: string) =>
  ({
    init: async () => undefined,
    commitAll: async () => {
      throw new Error(message);
    },
  }) as unknown as GitPort;

describe('prepareWorkspace (bug-033, item 1)', () => {
  function seed(): string {
    const dir = join(tempDir('bench-seed-'), 'seed');
    mkdirSync(dir);
    writeFileSync(join(dir, '.gitignore'), '*\n');
    return dir;
  }

  it("says in the benchmark's words that git has nothing to commit from the seed", async () => {
    const directory = join(tempDir('bench-workspace-'), 'w');
    await expect(
      prepareWorkspace(directory, scenario(seed()), git('git commit: nothing to commit, working tree clean')),
    ).rejects.toThrow('the seed of S9@1.0 gives its first commit nothing: git ignores every file it holds');
  });

  it("leaves any other git failure in git's words", async () => {
    const directory = join(tempDir('bench-workspace-'), 'w');
    await expect(
      prepareWorkspace(directory, scenario(seed()), git('git commit: no identity')),
    ).rejects.toThrow('git commit: no identity');
  });
});
