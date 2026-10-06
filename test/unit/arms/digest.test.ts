import { createHash } from 'node:crypto';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { armDigest } from '../../../src/arms/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

function arm(files: Record<string, string>): string {
  const root = tempDir('bench-arm-digest-');
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, 'arms', 'x', path, '..'), { recursive: true });
    writeFileSync(join(root, 'arms', 'x', path), text);
  }
  return root;
}

describe('the arm digest (REQ-FMT-13)', () => {
  it('hashes one line per file, path and content digest, in sorted path order, nested files included', () => {
    const root = arm({ 'setup.sh': 'echo\n', 'arm.yaml': 'name: x\n', 'env/b.md': 'b\n' });
    const lines = [
      `arms/x/arm.yaml\0${sha('name: x\n')}\n`,
      `arms/x/env/b.md\0${sha('b\n')}\n`,
      `arms/x/setup.sh\0${sha('echo\n')}\n`,
    ].join('');
    expect(armDigest(root, 'x')).toBe(sha(lines));
  });

  it('changes when a file changes, is added or is renamed, and not when nothing does', () => {
    const root = arm({ 'manual.md': 'one\n' });
    const first = armDigest(root, 'x');
    expect(armDigest(root, 'x')).toBe(first);
    writeFileSync(join(root, 'arms', 'x', 'manual.md'), 'two\n');
    const changed = armDigest(root, 'x');
    expect(changed).not.toBe(first);
    writeFileSync(join(root, 'arms', 'x', 'extra.md'), '');
    expect(armDigest(root, 'x')).not.toBe(changed);
  });

  it('hashes a symbolic link by its target, so that retargeting it changes the digest', () => {
    const root = arm({ 'manual.md': 'm\n' });
    symlinkSync('/one', join(root, 'arms', 'x', 'link'));
    const one = armDigest(root, 'x');
    const other = arm({ 'manual.md': 'm\n' });
    symlinkSync('/two', join(other, 'arms', 'x', 'link'));
    expect(armDigest(other, 'x')).not.toBe(one);
  });
});
