import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { gitCli, systemProcess } from '../../../src/core/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const git = gitCli(systemProcess);

describe('gitCli.messagesSince (REQ-RUN-05 as amended, task-035)', () => {
  it('returns the full messages of the commits after `from`, oldest first', async () => {
    const repository = tempDir('bench-git-');
    await git.init(repository);
    writeFileSync(join(repository, 'a.txt'), 'a\n');
    await git.commitAll(repository, 'setup');
    const from = await git.head(repository);
    writeFileSync(join(repository, 'b.txt'), 'b\n');
    await git.commitAll(repository, 'Add b\n\nBecause b was missing.\nSecond line.');
    await git.commitAll(repository, 'Record the decision', { allowEmpty: true });

    expect(await git.messagesSince(repository, from)).toEqual([
      'Add b\n\nBecause b was missing.\nSecond line.',
      'Record the decision',
    ]);
  });

  it('returns nothing when no commit was made since `from`', async () => {
    const repository = tempDir('bench-git-');
    await git.init(repository);
    await git.commitAll(repository, 'setup', { allowEmpty: true });
    expect(await git.messagesSince(repository, await git.head(repository))).toEqual([]);
  });
});
