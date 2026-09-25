import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkHoldoutRoot, loadHoldoutAdditions } from '../../../src/scenario/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A hold-out checkout in a temporary directory: `scenarios/<id>/<version>/` and the given files. */
function holdout(files: Record<string, string> = {}, id = 'S9', version = '1.0'): string {
  const root = tempDir('bench-holdout-');
  mkdirSync(join(root, 'scenarios', id, version), { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, 'scenarios', id, version, path, '..'), { recursive: true });
    writeFileSync(join(root, 'scenarios', id, version, path), content);
  }
  return root;
}

describe('checkHoldoutRoot (REQ-CLI-10, REQ-ARC-03)', () => {
  it('accepts a directory that mirrors the layout of scenarios/', () => {
    const root = holdout();
    expect(checkHoldoutRoot(root)).toEqual({ ok: true, value: root });
  });

  it.each([
    ['does not exist', (root: string) => join(root, 'nowhere')],
    [
      'is not a directory',
      (root: string) => {
        writeFileSync(join(root, 'file'), 'x');
        return join(root, 'file');
      },
    ],
    ['has no scenarios/ directory', (root: string) => root],
  ])('refuses a path that %s, naming it', (reason, pathOf) => {
    const path = pathOf(tempDir('bench-holdout-'));
    const result = checkHoldoutRoot(path);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toEqual([{ path, message: reason }]);
  });
});

describe('loadHoldoutAdditions (REQ-ARC-03)', () => {
  it("lists a version's additions by name, sorted, at any depth", () => {
    const root = holdout({ 'z.test.ts': 'z', 'hidden/a.test.ts': 'a', 'checks/b.yaml': 'b' });
    const result = loadHoldoutAdditions(root, 'S9', '1.0');
    expect(result).toEqual({
      ok: true,
      value: {
        dir: join(root, 'scenarios', 'S9', '1.0'),
        files: ['checks/b.yaml', 'hidden/a.test.ts', 'z.test.ts'],
      },
    });
  });

  it('has none for a version the hold-out does not mention', () => {
    const result = loadHoldoutAdditions(holdout(), 'S1', '2.0');
    expect(result.ok && result.value.files).toEqual([]);
  });

  it('refuses a symbolic link by its relative path, without following it', () => {
    const root = holdout({ 'a.test.ts': 'a' });
    symlinkSync('/etc/hostname', join(root, 'scenarios', 'S9', '1.0', 'escape'));
    expect(loadHoldoutAdditions(root, 'S9', '1.0')).toEqual({
      ok: false,
      issues: [{ path: 'holdout', message: "'escape' is a symbolic link" }],
    });
  });
});
