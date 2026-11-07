import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { agentProfile } from '../../../src/agents/index.js';
import { isConfigurationPath, loadArm, MANUAL_PATHS, seedClashes } from '../../../src/arms/index.js';
import { loadScenario } from '../../../src/scenario/index.js';
import type { Arm } from '../../../src/core/index.js';
import { repoPath } from '../../support/paths.js';

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

describe("the benchmark's harness arms' places (task-140, criterion 2)", () => {
  function own(name: string) {
    const result = loadArm(repoPath('arms'), name);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    return result.value;
  }

  function seedFiles(dir: string, prefix = ''): string[] {
    return readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      return entry.isDirectory() ? seedFiles(dir, path) : [path];
    });
  }

  it.each([
    [
      'wingfoil',
      ['.wingfoil/dna.yaml', '.wingfoil/roles.yaml', '.wingfoil/directives/custom/r1.md'],
      ['docs/memory/plan/a/b.md'],
    ],
    [
      'speckit',
      ['.specify/memory/constitution.md', '.claude/skills/speckit-plan/SKILL.md'],
      ['specs/001-x/spec.md', '.specify/workflows/runs/1/state.json'],
    ],
    [
      'openspec',
      ['openspec/config.yaml', '.claude/commands/opsx/apply.md'],
      ['openspec/changes/add-x/proposal.md', 'openspec/specs/a/spec.md'],
    ],
  ])('%s declares configuration and state places, each with its source', (name, configuration, state) => {
    const arm = own(name);

    expect(arm.configuration?.every((place) => place.source.length > 0)).toBe(true);
    expect(arm.state?.every((place) => place.source.length > 0)).toBe(true);
    for (const path of configuration) expect(isConfigurationPath(arm, path), path).toBe(true);
    for (const path of state) expect(isConfigurationPath(arm, path), path).toBe(false);
    for (const path of ['CLAUDE.md', 'AGENTS.md', 'README.md', 'src/index.ts', 'package.json', '.mcp.json']) {
      expect(isConfigurationPath(arm, path), path).toBe(false);
    }
  });

  it.each(['S1', 'S2', 'S3', 'S8'])('clashes with no seed file of %s 1.1', (id) => {
    const scenario = loadScenario(repoPath('scenarios'), id, '1.1');
    if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
    const files = seedFiles(scenario.value.seedDir);

    for (const name of ['wingfoil', 'speckit', 'openspec']) expect(seedClashes(own(name), files)).toEqual([]);
  });
});
