import { describe, expect, it } from 'vitest';

import { agentProfile } from '../../../src/agents/index.js';
import { isConfigurationPath, MANUAL_PATHS, seedClashes } from '../../../src/arms/index.js';
import type { Arm } from '../../../src/core/index.js';

const ARM: Pick<Arm, 'name' | 'configuration' | 'state'> = {
  name: 'wingfoil',
  configuration: [
    { glob: '.wingfoil/dna.yaml', source: 'a' },
    { glob: '.wingfoil/directives/custom/**', source: 'b' },
  ],
  state: [{ glob: '.wingfoil/directives/custom/.index/**', source: 'c' }],
};

describe('configuration places (REQ-FMT-05 as amended in 1.50, task-140)', () => {
  it.each([
    ['.wingfoil/dna.yaml', true],
    ['.wingfoil/directives/custom/r1.md', true],
    // State wins inside a configuration place.
    ['.wingfoil/directives/custom/.index/a', false],
    ['src/helpers.ts', false],
    ['CLAUDE.md', false],
  ])('%s is configuration: %s', (path, expected) => {
    expect(isConfigurationPath(ARM, path)).toBe(expected);
  });

  it('has no configuration path where the arm declares no places', () => {
    expect(isConfigurationPath({ name: 'baseline' }, '.wingfoil/dna.yaml')).toBe(false);
  });

  it('names each configuration glob that matches a seed file, with the file, in order', () => {
    const arm = { ...ARM, configuration: [...ARM.configuration!, { glob: 'src/**', source: 'd' }] };

    expect(seedClashes(arm, ['README.md', 'src/index.ts', 'src/a/b.ts', 'package.json'])).toEqual([
      { glob: 'src/**', file: 'src/a/b.ts' },
      { glob: 'src/**', file: 'src/index.ts' },
    ]);
  });

  it('finds no clash for places clear of the seed, or for an arm with none', () => {
    expect(seedClashes(ARM, ['README.md', 'src/index.ts'])).toEqual([]);
    expect(seedClashes({ name: 'baseline' }, ['README.md'])).toEqual([]);
  });
});

describe('MANUAL_PATHS (REQ-RUN-12)', () => {
  it("is every agent profile's manual file", () => {
    expect([...MANUAL_PATHS].sort()).toEqual(
      [agentProfile('claude-code').manualFile, agentProfile('codex').manualFile].sort(),
    );
  });
});
