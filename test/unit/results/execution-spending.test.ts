import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { executionSpendingEur } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

describe('executionSpendingEur (bug-033)', () => {
  it.each(['null', '[]', '[{"steps":[]}]'])('refuses a run.json holding %s as no run record', (text) => {
    const execution = join(tempDir('bench-spending-'), 'abcdef012345', '1');
    const run = join(execution, 'runs', 'S1@1.0', 'baseline', 'model', 'r1');
    mkdirSync(run, { recursive: true });
    writeFileSync(join(run, 'run.json'), text);
    expect(() => executionSpendingEur(execution, 0.9)).toThrow('it is not a run record');
  });
});
