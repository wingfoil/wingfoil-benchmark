import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadArm } from '../../../src/arms/index.js';
import { COMPLETE_ARM_FILES, completeArmYaml, plainArmYaml, writeArmAt } from '../../support/arm-fixture.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

function issuesOf(root: string, name = 'wingfoil') {
  const result = loadArm(root, name);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

describe('loadArm (REQ-FMT-05)', () => {
  it.each([
    ['baseline', undefined],
    ['baseline-docs', undefined],
    ['wingfoil', 'wingfoil'],
  ])("loads the benchmark's own %s arm", (name, requires) => {
    const result = loadArm(repoPath('arms'), name);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.requires).toBe(requires);
  });

  it('loads a complete arm with absolute paths', () => {
    const root = tempDir('bench-arm-');
    const dir = writeArmAt(root, 'wingfoil', completeArmYaml(), COMPLETE_ARM_FILES);

    const result = loadArm(relative(process.cwd(), root), 'wingfoil');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      name: 'wingfoil',
      dir,
      setup: 'setup.sh',
      setupPath: join(dir, 'setup.sh'),
      manualPath: join(dir, 'manual.md'),
      environmentDir: join(dir, 'environment'),
      mcpPath: join(dir, 'mcp.json'),
      requires: 'wingfoil',
    });
    expect(isAbsolute(result.value.dir)).toBe(true);
  });

  it('loads a plain-agent arm: no environment, no MCP, no harness', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'baseline', plainArmYaml(), ['setup.sh', 'manual.md']);

    const result = loadArm(root, 'baseline');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.environmentDir).toBeUndefined();
    expect(result.value.mcpPath).toBeUndefined();
    expect(result.value.requires).toBeUndefined();
  });

  it('reports a missing definition against arm.yaml', () => {
    expect(issuesOf(tempDir('bench-arm-'), 'baseline')).toEqual([
      { path: 'arm.yaml', message: expect.stringMatching(/^not found in .*baseline$/) },
    ]);
  });

  it('reports missing required fields and unknown ones', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'wingfoil', { name: 'wingfoil', extra: 1 }, []);

    expect(issuesOf(root)).toEqual([
      { path: 'setup', message: 'is required' },
      { path: 'manual', message: 'is required' },
      { path: 'extra', message: 'is not a known field' },
    ]);
  });

  it('requires the name to match its directory', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'wingfoil', completeArmYaml('baseline'), COMPLETE_ARM_FILES);

    expect(issuesOf(root)).toEqual([
      { path: 'name', message: "'baseline' differs from its directory 'wingfoil'" },
    ]);
  });

  it.each([
    ['an absolute path', '/etc/passwd'],
    ['a path that climbs out', '../other/setup.sh'],
  ])('refuses %s', (_, value) => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'wingfoil', { ...completeArmYaml(), setup: value }, COMPLETE_ARM_FILES);

    expect(issuesOf(root)).toEqual([
      { path: 'setup', message: 'must be a relative path inside the arm directory' },
    ]);
  });

  it('reports every declared path that does not exist, with its kind', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'wingfoil', completeArmYaml(), []);

    expect(issuesOf(root)).toEqual([
      { path: 'setup', message: "file 'setup.sh' does not exist" },
      { path: 'manual', message: "file 'manual.md' does not exist" },
      { path: 'environment', message: "directory 'environment' does not exist" },
      { path: 'mcp', message: "file 'mcp.json' does not exist" },
    ]);
  });

  it('refuses a declared path that is a symbolic link, even one that stays inside', () => {
    const root = tempDir('bench-arm-');
    const dir = writeArmAt(root, 'wingfoil', { ...completeArmYaml(), manual: 'link.md' }, COMPLETE_ARM_FILES);
    symlinkSync(join(dir, 'manual.md'), join(dir, 'link.md'));

    expect(issuesOf(root)).toEqual([{ path: 'manual', message: "'link.md' is a symbolic link" }]);
  });

  it('refuses an environment that holds a symbolic link, since it is copied into the workspace', () => {
    const root = tempDir('bench-arm-');
    const dir = writeArmAt(root, 'wingfoil', completeArmYaml(), COMPLETE_ARM_FILES);
    mkdirSync(join(dir, 'environment', 'deep'), { recursive: true });
    symlinkSync('/etc/hostname', join(dir, 'environment', 'deep', 'escape'));

    expect(issuesOf(root)).toEqual([
      { path: 'environment', message: "'environment/deep/escape' is a symbolic link" },
    ]);
  });

  it('accepts an environment with nested directories and no link, searching them all', () => {
    const root = tempDir('bench-arm-');
    const dir = writeArmAt(root, 'wingfoil', completeArmYaml(), COMPLETE_ARM_FILES);
    mkdirSync(join(dir, 'environment', 'a', 'b'), { recursive: true });
    writeFileSync(join(dir, 'environment', 'a', 'b', 'deep.md'), 'deep\n');
    mkdirSync(join(dir, 'environment', 'z'));
    symlinkSync('/etc/hostname', join(dir, 'environment', 'z', 'late'));

    expect(issuesOf(root)).toEqual([
      { path: 'environment', message: "'environment/z/late' is a symbolic link" },
    ]);
  });

  it('requires the harness tool to be a plain name', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'wingfoil', { ...completeArmYaml(), requires: 'Wing Foil' }, COMPLETE_ARM_FILES);

    expect(issuesOf(root)).toEqual([{ path: 'requires', message: 'must be a lower-case tool name' }]);
  });

  it('refuses an MCP configuration that is not JSON, before any session is paid for', () => {
    const root = tempDir('bench-arm-');
    const dir = writeArmAt(root, 'wingfoil', completeArmYaml(), COMPLETE_ARM_FILES);
    writeFileSync(join(dir, 'mcp.json'), 'not json');

    expect(issuesOf(root)).toEqual([
      { path: 'mcp', message: expect.stringMatching(/^'mcp.json' is not valid JSON: /) },
    ]);
  });
});
