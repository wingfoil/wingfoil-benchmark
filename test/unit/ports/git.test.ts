import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  it('lists every path two commits differ by, with status and new mode, a rename as two paths', async () => {
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

describe('gitCli.exportTree and gitCli.dirtyPaths (task-149, the review loop)', () => {
  it("writes a tree's files elsewhere, export-ignored ones included, the repository untouched", async () => {
    const repository = tempDir('bench-git-');
    await git.init(repository);
    mkdirSync(join(repository, 'src'));
    writeFileSync(join(repository, 'src', 'a.ts'), 'a\n');
    writeFileSync(join(repository, '.gitattributes'), 'src/a.ts export-ignore\n');
    symlinkSync('src/a.ts', join(repository, 'link'));
    await git.commitAll(repository, 'one');
    const tree = await git.tree(repository, 'HEAD');
    writeFileSync(join(repository, 'src', 'a.ts'), 'changed\n');
    const copy = join(tempDir('bench-copy-'), 'copy');

    await git.exportTree(repository, tree, copy);

    expect(readFileSync(join(copy, 'src', 'a.ts'), 'utf8')).toBe('a\n');
    expect(readlinkSync(join(copy, 'link'))).toBe('src/a.ts');
    expect(await git.dirtyPaths(repository)).toEqual(['src/a.ts']);
  });

  it('lists changed tracked files and untracked ones git does not ignore, and commits by another identity', async () => {
    const repository = tempDir('bench-git-');
    await git.init(repository);
    writeFileSync(join(repository, '.gitignore'), 'out/\n');
    writeFileSync(join(repository, 'a.txt'), 'a\n');
    await git.commitAll(repository, 'one', { identity: { name: 'Project', email: 'project@localhost' } });
    expect(await git.dirtyPaths(repository)).toEqual([]);
    mkdirSync(join(repository, 'out'));
    writeFileSync(join(repository, 'out', 'x'), 'x\n');
    mkdirSync(join(repository, 'new'));
    writeFileSync(join(repository, 'new', 'b.txt'), 'b\n');
    rmSync(join(repository, 'a.txt'));
    expect(await git.dirtyPaths(repository)).toEqual(['a.txt', 'new/b.txt']);
    const log = execFileSync('git', ['-C', repository, 'log', '--format=%an <%ae> %cn <%ce>'], { encoding: 'utf8' });
    expect(log.trim()).toBe('Project <project@localhost> Project <project@localhost>');
  });
});
