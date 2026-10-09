import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { armDigest, armDigestOf } from '../../../src/arms/index.js';
import { historyCli, systemProcess } from '../../../src/core/index.js';
import { recordedArm, recordedManual } from '../../../src/site/recorded.js';
import { tempDir } from '../../support/scenario-fixture.js';

const sha256 = (text: string) =>
  execFileSync('sha256sum', { input: text, encoding: 'utf8' }).split(' ')[0] ?? '';
const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    encoding: 'utf8',
  });

/** A repository whose wingfoil arm was committed twice: `first`, then `second`, the working tree at the second. */
function repository() {
  const root = tempDir('bench-recorded-');
  git(root, 'init', '-q', '-b', 'main');
  const arm = join(root, 'arms', 'wingfoil');
  mkdirSync(arm, { recursive: true });
  const write = (setup: string, manual: string) => {
    writeFileSync(join(arm, 'arm.yaml'), 'name: wingfoil\nsetup: setup.sh\nmanual: manual.md\n');
    writeFileSync(join(arm, 'setup.sh'), setup);
    writeFileSync(join(arm, 'manual.md'), manual);
  };
  write('#!/bin/sh\necho first\n', '# First manual\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'first');
  const first = armDigest(root, 'wingfoil');
  const firstCommit = git(root, 'rev-parse', 'HEAD').trim();
  write('#!/bin/sh\necho second\n', '# Second manual\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'second');
  return { root, first, firstCommit, second: armDigest(root, 'wingfoil') };
}

const history = historyCli(systemProcess);

describe('armDigestOf (REQ-FMT-13, task-073)', () => {
  it('is armDigest over the same files, given as path and content', () => {
    const { root } = repository();
    symlinkSync('setup.sh', join(root, 'arms', 'wingfoil', 'link.sh'));
    const files = new Map<string, Buffer | string>([
      ['arms/wingfoil/arm.yaml', readFileSync(join(root, 'arms', 'wingfoil', 'arm.yaml'))],
      ['arms/wingfoil/setup.sh', readFileSync(join(root, 'arms', 'wingfoil', 'setup.sh'))],
      ['arms/wingfoil/manual.md', readFileSync(join(root, 'arms', 'wingfoil', 'manual.md'))],
      ['arms/wingfoil/link.sh', 'link:setup.sh'],
    ]);
    expect(armDigestOf(files)).toBe(armDigest(root, 'wingfoil'));
  });
});

describe('the arm as it ran (REQ-RES-10, REQ-RES-02, task-073)', () => {
  it('is the working tree when its digest is the recorded one', async () => {
    const { root, second } = repository();
    const found = await recordedArm(root, 'wingfoil', second, history);
    expect(found).toMatchObject({ source: 'tree' });
  });

  it('is read from the newest commit of the history whose arm has the recorded digest', async () => {
    const { root, first, firstCommit } = repository();
    const found = await recordedArm(root, 'wingfoil', first, history);
    expect(found).toMatchObject({ source: 'history', commit: firstCommit });
    if (found?.source !== 'history') return;
    expect(readFileSync(join(found.dir, 'setup.sh'), 'utf8')).toBe('#!/bin/sh\necho first\n');
  });

  it('is nowhere when no commit holds it, or outside a git repository', async () => {
    const { root } = repository();
    expect(await recordedArm(root, 'wingfoil', 'f'.repeat(64), history)).toBeUndefined();
    const plain = tempDir('bench-no-git-');
    mkdirSync(join(plain, 'arms', 'wingfoil'), { recursive: true });
    writeFileSync(join(plain, 'arms', 'wingfoil', 'setup.sh'), 'x\n');
    expect(await recordedArm(plain, 'wingfoil', 'f'.repeat(64), history)).toBeUndefined();
  });

  it('finds a manual by the sha256 its runs recorded, in the working tree or the history', async () => {
    const { root } = repository();
    expect(await recordedManual(root, 'wingfoil', sha256('# Second manual\n'), history)).toBe(
      '# Second manual\n',
    );
    expect(await recordedManual(root, 'wingfoil', sha256('# First manual\n'), history)).toBe(
      '# First manual\n',
    );
    expect(await recordedManual(root, 'wingfoil', 'f'.repeat(64), history)).toBeUndefined();
  });
});
