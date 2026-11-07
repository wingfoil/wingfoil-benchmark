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
    ['speckit', 'speckit'],
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
      provides: {},
      telemetryOff: [],
    });
    expect(isAbsolute(result.value.dir)).toBe(true);
  });

  it("loads the harness capabilities an arm provides, and the benchmark's wingfoil arm's (REQ-FMT-10)", () => {
    const root = tempDir('bench-arm-');
    writeArmAt(
      root,
      'wingfoil',
      { ...completeArmYaml(), provides: { 'workflow-engine': false, 'directive-delivery': true } },
      COMPLETE_ARM_FILES,
    );
    const result = loadArm(root, 'wingfoil');
    expect(result.ok && result.value.provides).toEqual({
      'workflow-engine': false,
      'directive-delivery': true,
    });

    // v0.3.0's capabilities (task-095): directives and the memory life cycle, now a workflow engine that records and
    // routes steps (v0.2.2 and 3df305e had none, task-049), still no MCP Tools.
    const own = loadArm(repoPath('arms'), 'wingfoil');
    expect(own.ok && own.value.provides).toEqual({
      'directive-delivery': true,
      'memory-lifecycle': true,
      'workflow-engine': true,
      'mcp-tools': false,
    });
  });

  it.each([
    [{ 'Workflow Engine': true }, 'provides.Workflow Engine'],
    [{ 'workflow-engine': 'no' }, 'provides.workflow-engine'],
    [['workflow-engine'], 'provides'],
  ])('refuses provides %j', (provides, path) => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'wingfoil', { ...completeArmYaml(), provides }, COMPLETE_ARM_FILES);
    const result = loadArm(root, 'wingfoil');
    expect(result.ok || result.issues.map((issue) => issue.path)).toEqual([path]);
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

  it("loads a docs control's choice of directives, every role's (dl-021 step A), and the benchmark's baseline-docs'", () => {
    const root = tempDir('bench-arm-');
    writeArmAt(
      root,
      'baseline-docs',
      { ...plainArmYaml('baseline-docs'), docs_of: 'wingfoil', docs_directives: 'every-role' },
      ['setup.sh', 'manual.md'],
    );

    const result = loadArm(relative(process.cwd(), root), 'baseline-docs');

    expect(result.ok && result.value.docsDirectives).toBe('every-role');
    const own = loadArm(repoPath('arms'), 'baseline-docs');
    expect(own.ok && own.value.docsDirectives).toBe('every-role');
  });

  it('refuses another choice of directives, and one on an arm that is not a docs control', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(
      root,
      'baseline-docs',
      { ...plainArmYaml('baseline-docs'), docs_of: 'wingfoil', docs_directives: 'all' },
      ['setup.sh', 'manual.md'],
    );
    writeArmAt(root, 'baseline', { ...plainArmYaml('baseline'), docs_directives: 'every-role' }, [
      'setup.sh',
      'manual.md',
    ]);

    expect(issuesOf(root, 'baseline-docs')).toEqual([
      { path: 'docs_directives', message: expect.stringContaining('every-role') },
    ]);
    expect(issuesOf(root, 'baseline')).toEqual([
      { path: 'docs_directives', message: 'only a docs control (docs_of) chooses the directives it renders' },
    ]);
  });

  it('refuses the choice on a docs control not generated from wingfoil, whose generator has none', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(
      root,
      'speckit-docs',
      { ...plainArmYaml('speckit-docs'), docs_of: 'speckit', docs_directives: 'every-role' },
      ['setup.sh', 'manual.md'],
    );

    expect(issuesOf(root, 'speckit-docs')).toEqual([
      { path: 'docs_directives', message: 'only a docs control of the wingfoil arm chooses its directives' },
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

  it('refuses a symbolic link anywhere under the arm, declared or not, naming each (task-139, bug-034)', () => {
    const root = tempDir('bench-arm-');
    const dir = writeArmAt(root, 'wingfoil', completeArmYaml(), COMPLETE_ARM_FILES);
    mkdirSync(join(dir, 'notes'));
    symlinkSync('../manual.md', join(dir, 'notes', 'copy.md'));
    symlinkSync('manual.md', join(dir, 'README.md'));

    expect(issuesOf(root)).toEqual([
      { path: 'README.md', message: "'README.md' is a symbolic link" },
      { path: 'notes/copy.md', message: "'notes/copy.md' is a symbolic link" },
    ]);
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

describe('loadArm: configuration and state places (REQ-FMT-05 as amended in 1.50, task-140)', () => {
  const RULES = { glob: '.wingfoil/directives/custom/**', source: 'docs/directives.md' };
  const STATE = { glob: '.wingfoil/memory/**', source: 'docs/memory.md' };

  function withPlaces(extra: Record<string, unknown>, name = 'wingfoil') {
    const root = tempDir('bench-arm-');
    writeArmAt(root, name, { ...completeArmYaml(name), ...extra }, COMPLETE_ARM_FILES);
    return root;
  }

  it('loads the places, each glob with its source', () => {
    const root = withPlaces({ configuration: [RULES], state: [STATE] });

    const result = loadArm(root, 'wingfoil');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.configuration).toEqual([RULES]);
    expect(result.value.state).toEqual([STATE]);
  });

  it('accepts an empty state stated so, where the tool keeps none', () => {
    const result = loadArm(withPlaces({ configuration: [RULES], state: [] }), 'wingfoil');

    expect(result.ok && result.value.state).toEqual([]);
  });

  it('leaves an arm with neither field as it was: no places', () => {
    const result = loadArm(withPlaces({}), 'wingfoil');

    expect(result.ok && 'configuration' in result.value).toBe(false);
  });

  it('refuses configuration without state, and state without configuration', () => {
    expect(issuesOf(withPlaces({ configuration: [RULES] }))).toEqual([
      {
        path: 'state',
        message: 'is required beside configuration: an empty list where the tool keeps no state',
      },
    ]);
    expect(issuesOf(withPlaces({ state: [STATE] }))).toEqual([
      { path: 'state', message: 'is declared only beside configuration' },
    ]);
  });

  it('refuses places on an arm with no harness tool', () => {
    const root = tempDir('bench-arm-');
    writeArmAt(root, 'baseline', { ...plainArmYaml(), configuration: [RULES], state: [] }, [
      'setup.sh',
      'manual.md',
    ]);

    expect(issuesOf(root, 'baseline')).toEqual([
      { path: 'configuration', message: 'only a harness arm (requires) declares configuration places' },
    ]);
  });

  it('refuses a place with no source, or with an unknown field', () => {
    const issues = issuesOf(
      withPlaces({ configuration: [{ glob: RULES.glob }, { ...RULES, why: 'x' }], state: [] }),
    );

    expect(issues.map((issue) => issue.path)).toEqual(['configuration[0].source', 'configuration[1].why']);
  });

  it('refuses a glob it cannot match, naming it', () => {
    expect(
      issuesOf(withPlaces({ configuration: [RULES], state: [{ glob: '../x/**', source: 'a' }] })),
    ).toEqual([{ path: 'state[0].glob', message: "'../x/**' must not hold '..'" }]);
  });

  it.each([['*.md'], ['**'], ['CLAUDE.md'], ['AGENTS.md'], ['**/*.md']])(
    "refuses a configuration glob '%s' that matches the manual's path",
    (glob) => {
      const issues = issuesOf(withPlaces({ configuration: [RULES, { glob, source: 'a' }], state: [] }));

      expect(issues).toEqual([
        {
          path: 'configuration[1].glob',
          message: expect.stringMatching(
            new RegExp(`^'.+' matches the manual's path '(CLAUDE|AGENTS)\\.md'$`),
          ),
        },
      ]);
    },
  );

  it.each([
    ['wingfoil', '.wingfoil/dna.yaml', "'.wingfoil/directives/custom/'"],
    ['speckit', '.specify/templates/**', "'.specify/memory/constitution.md'"],
    ['openspec', 'openspec/specs/**', "'openspec/config.yaml'"],
  ])("refuses %s's places when they leave out its project rules' place", (tool, glob, place) => {
    const root = withPlaces({ requires: tool, configuration: [{ glob, source: 'a' }], state: [] });

    expect(issuesOf(root)).toEqual([
      { path: 'configuration', message: `does not include the place of the project rules, ${place}` },
    ]);
  });

  it("refuses the rules' place when a state glob makes it state", () => {
    const root = withPlaces({
      requires: 'speckit',
      configuration: [{ glob: '.specify/**', source: 'a' }],
      state: [{ glob: '.specify/memory/**', source: 'b' }],
    });

    expect(issuesOf(root)).toEqual([
      {
        path: 'configuration',
        message: "does not include the place of the project rules, '.specify/memory/constitution.md'",
      },
    ]);
  });

  it.each([
    ['speckit', '.specify/memory/constitution.md'],
    ['openspec', 'openspec/config.yaml'],
  ])("accepts %s's places when they hold its project rules' place", (tool, glob) => {
    const result = loadArm(
      withPlaces({ requires: tool, configuration: [{ glob, source: 'a' }], state: [] }),
      'wingfoil',
    );

    expect(result.ok).toBe(true);
  });
});
