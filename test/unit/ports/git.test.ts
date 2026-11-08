import { mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

describe('gitCli.changesBetween (REQ-RUN-20, task-141)', () => {
  it('lists every path two commits differ by, with its status and its new mode, renames as a deletion and an addition', async () => {
    const repository = tempDir('bench-git-');
    await git.init(repository);
    writeFileSync(join(repository, 'kept.txt'), 'kept\n');
    writeFileSync(join(repository, 'changed.txt'), 'a\n');
    writeFileSync(join(repository, 'gone.txt'), 'gone\n');
    writeFileSync(join(repository, 'moved.txt'), 'moved, long enough to be seen as a rename\n');
    await git.commitAll(repository, 'setup');
    const from = await git.head(repository);
    writeFileSync(join(repository, 'changed.txt'), 'b\n');
    rmSync(join(repository, 'gone.txt'));
    renameSync(join(repository, 'moved.txt'), join(repository, 'renamed.txt'));
    mkdirSync(join(repository, 'dir with space'));
    writeFileSync(join(repository, 'dir with space', 'new.txt'), 'new\n');
    symlinkSync('kept.txt', join(repository, 'link'));
    await git.commitAll(repository, 'session');

    expect(await git.changesBetween(repository, from, 'HEAD')).toEqual([
      { status: 'M', path: 'changed.txt', mode: '100644' },
      { status: 'A', path: 'dir with space/new.txt', mode: '100644' },
      { status: 'D', path: 'gone.txt', mode: '000000' },
      { status: 'A', path: 'link', mode: '120000' },
      { status: 'D', path: 'moved.txt', mode: '000000' },
      { status: 'A', path: 'renamed.txt', mode: '100644' },
    ]);
  });

  it('lists nothing between a commit and itself', async () => {
    const repository = tempDir('bench-git-');
    await git.init(repository);
    await git.commitAll(repository, 'setup', { allowEmpty: true });
    expect(await git.changesBetween(repository, 'HEAD', 'HEAD')).toEqual([]);
  });
});
