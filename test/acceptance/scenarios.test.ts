import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadScenario } from '../../src/scenario/index.js';
import { writeScenario } from '../support/scenario-fixture.js';

describe('scenarios.feature', () => {
  it('@F3.1 A scenario declares everything the runner and the scorer need', () => {
    const root = writeScenario();
    const dir = join(root, 'S9', '1.0');

    const result = loadScenario(root, 'S9', '1.0');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scenario = result.value;
    expect(scenario.id).toBe('S9');
    expect(scenario.version).toBe('1.0');
    expect(scenario.seedDir).toBe(join(dir, 'seed'));
    expect(scenario.steps).toEqual([
      { n: 1, promptPath: join(dir, 'prompts/01.md') },
      { n: 2, promptPath: join(dir, 'prompts/02.md') },
    ]);
    expect(scenario.oracle.publicTestsDir).toBe(join(dir, 'oracle/public'));
    expect(scenario.categories).toEqual({ primary: 'C', secondary: ['D'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'team-developer']);
    expect(scenario.gqm).toEqual(['Q-C1', 'G-X1']);
    expect(scenario.capabilities).toEqual(['workflow-engine']);
  });
});
