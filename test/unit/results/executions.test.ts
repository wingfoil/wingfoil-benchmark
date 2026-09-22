import { mkdirSync, writeFileSync } from 'node:fs';
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
});
