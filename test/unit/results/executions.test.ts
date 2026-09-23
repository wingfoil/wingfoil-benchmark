import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { nextExecution } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

describe('nextExecution', () => {
  it('is 1 when the results root or the campaign has no execution yet', () => {
    const root = tempDir('bench-results-');
    expect(nextExecution(join(root, 'missing'), 'abc')).toBe(1);
    expect(nextExecution(root, 'abc')).toBe(1);
  });

  it('follows the highest execution number, ignoring gaps and other entries', () => {
    const root = tempDir('bench-results-');
    for (const name of ['1', '3', '10', 'dry-run', '0', '02']) mkdirSync(join(root, 'abc', name), { recursive: true });
    writeFileSync(join(root, 'abc', '11'), '');
    expect(nextExecution(root, 'abc')).toBe(11);
  });

  it('counts a symbolic link to an execution directory', () => {
    const root = tempDir('bench-results-');
    mkdirSync(join(root, 'abc', '1'), { recursive: true });
    mkdirSync(join(root, 'elsewhere'), { recursive: true });
    symlinkSync(join(root, 'elsewhere'), join(root, 'abc', '5'));
    expect(nextExecution(root, 'abc')).toBe(6);
  });

  it('ignores numbers no integer can hold exactly', () => {
    const root = tempDir('bench-results-');
    mkdirSync(join(root, 'abc', '9007199254740993'), { recursive: true });
    mkdirSync(join(root, 'abc', '2'), { recursive: true });
    expect(nextExecution(root, 'abc')).toBe(3);
  });

  it('explains what it could not read when the campaign directory is a file', () => {
    const root = tempDir('bench-results-');
    mkdirSync(join(root, 'x'), { recursive: true });
    writeFileSync(join(root, 'abc'), '');
    expect(() => nextExecution(root, 'abc')).toThrow(/results directory .*abc/);
  });
});
