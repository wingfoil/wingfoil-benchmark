import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';

import { loadScenario } from '../../../src/scenario/index.js';
import { repoPath } from '../../support/paths.js';
import {
  COMPLETE_FILES,
  completeScenarioYaml,
  tempDir,
  writeScenario,
} from '../../support/scenario-fixture.js';

function issuesOf(root: string, id = 'S9', version = '1.0') {
  const result = loadScenario(root, id, version);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function paths(root: string, id = 'S9', version = '1.0'): string[] {
  return issuesOf(root, id, version).map((issue) => issue.path);
}

/** A complete scenario whose first third-party entry has `field` set to `value`. */
function withThirdParty(field: 'url' | 'license', value: string): Record<string, unknown> {
  const yaml = completeScenarioYaml();
  const oracle = yaml.oracle as { third_party: Record<string, unknown>[] };
  oracle.third_party = [{ ...oracle.third_party[0], [field]: value }];
  return yaml;
}

function withField(path: string[], value: unknown): Record<string, unknown> {
  const yaml = completeScenarioYaml();
  let node: Record<string, unknown> = yaml;
  for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
  const last = path[path.length - 1] as string;
  if (value === undefined) Reflect.deleteProperty(node, last);
  else node[last] = value;
  return yaml;
}

describe('loadScenario', () => {
  it('loads the trivial fixture scenario T0', () => {
    const result = loadScenario(repoPath('test/fixtures/scenarios'), 'T0', '1.0');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.steps).toHaveLength(1);
  });

  it('returns absolute paths when the scenarios root is relative', () => {
    const root = writeScenario();
    const result = loadScenario(relative(process.cwd(), root), 'S9', '1.0');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { dir, seedDir, steps, oracle } = result.value;
    const all = [
      dir,
      seedDir,
      ...oracle.suites.map((suite) => suite.dir),
      ...oracle.checks,
      ...steps.map((s) => s.promptPath),
    ];
    expect(all.filter((path) => !isAbsolute(path))).toEqual([]);
    expect(dir).toBe(join(root, 'S9', '1.0'));
  });

  it('resolves oracle checks and keeps third-party pins and the hold-out flag', () => {
    const root = writeScenario();
    const result = loadScenario(root, 'S9', '1.0');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.oracle.checks).toEqual([join(root, 'S9', '1.0', 'oracle/checks/decision.yaml')]);
    expect(result.value.oracle.thirdParty[0]?.license).toBe('Apache-2.0');
    expect(result.value.holdout).toBe(true);
    expect(result.value.dir).toBe(join(root, 'S9', '1.0'));
  });

  it('defaults oracle checks and third-party pins to empty lists', () => {
    const yaml = completeScenarioYaml();
    yaml.oracle = { suites: [] };
    const result = loadScenario(writeScenario(yaml), 'S9', '1.0');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.oracle).toMatchObject({ checks: [], thirdParty: [] });
  });

  it('reports a missing scenario directory', () => {
    expect(paths(writeScenario(), 'S9', '2.0')).toEqual(['scenario.yaml']);
  });

  it('reports YAML that does not parse', () => {
    expect(paths(writeScenario('id: [unclosed'))).toEqual(['scenario.yaml']);
  });

  it('reports an empty scenario.yaml against the file, not an empty path', () => {
    expect(paths(writeScenario(''))).toEqual(['scenario.yaml']);
  });

  it('reports a scenario.yaml that is not a mapping against the file', () => {
    expect(issuesOf(writeScenario('- a\n- b\n'))).toEqual([
      { path: 'scenario.yaml', message: expect.stringMatching(/expected object/) },
    ]);
  });

  it('tells a file that cannot be read apart from YAML that does not parse', () => {
    const root = writeScenario();
    const file = join(root, 'S9', '1.0', 'scenario.yaml');
    rmSync(file);
    mkdirSync(file);
    expect(issuesOf(root)).toEqual([
      { path: 'scenario.yaml', message: expect.stringMatching(/^cannot be read/) },
    ]);
  });

  it.each([
    'id',
    'version',
    'categories',
    'profiles',
    'gqm',
    'capabilities',
    'seed',
    'steps',
    'oracle',
    'holdout',
  ])('names the missing required field %s', (field) => {
    const issues = issuesOf(writeScenario(withField([field], undefined)));
    expect(issues).toEqual([{ path: field, message: 'is required' }]);
  });

  it('rejects unknown keys at their own path, so that a typo never drops a field', () => {
    const yaml = { ...completeScenarioYaml(), holdut: false, extra: 1 };
    expect(issuesOf(writeScenario(yaml))).toEqual([
      { path: 'holdut', message: 'is not a known field' },
      { path: 'extra', message: 'is not a known field' },
    ]);
  });

  it('rejects unknown nested keys at their own path', () => {
    const yaml = completeScenarioYaml();
    (yaml.oracle as Record<string, unknown>).extra = 1;
    expect(issuesOf(writeScenario(yaml))).toEqual([
      { path: 'oracle.extra', message: 'is not a known field' },
    ]);
  });

  it.each([
    [['id'], 's9', 'id'],
    [['version'], '1', 'version'],
    [['categories', 'primary'], 'H', 'categories.primary'],
    [['categories', 'secondary'], ['C'], 'categories.secondary'],
    [['categories', 'secondary'], ['D', 'D'], 'categories.secondary'],
    [['profiles'], [], 'profiles'],
    [['profiles'], ['manager'], 'profiles[0]'],
    [['gqm'], ['C1'], 'gqm[0]'],
    [['capabilities'], ['Workflow Engine'], 'capabilities[0]'],
    [['steps'], [], 'steps'],
    [['steps'], [{ n: 2, prompt_file: 'prompts/01.md' }], 'steps[0].n'],
    [
      ['oracle', 'third_party'],
      [{ name: 'x', url: 'https://x.org', commit: 'main', license: 'MIT' }],
      'oracle.third_party[0].commit',
    ],
    [
      ['oracle', 'third_party'],
      [{ name: 'x', url: 'not a url', commit: 'a'.repeat(40), license: 'MIT' }],
      'oracle.third_party[0].url',
    ],
    [
      ['oracle', 'third_party'],
      [{ name: 'x', url: 'https://x.org', commit: 'a'.repeat(40), license: 'whatever I like' }],
      'oracle.third_party[0].license',
    ],
    [['profiles'], ['architect', 'architect'], 'profiles'],
    [['gqm'], ['Q-C1', 'Q-C1'], 'gqm'],
    [['capabilities'], ['a', 'a'], 'capabilities'],
    [
      ['steps'],
      [
        { n: 1, prompt_file: 'prompts/01.md' },
        { n: 2, prompt_file: 'prompts/01.md' },
      ],
      'steps',
    ],
    [['holdout'], 'yes', 'holdout'],
  ])('rejects a malformed %j', (field, value, path) => {
    expect(paths(writeScenario(withField(field as string[], value)))).toEqual([path]);
  });

  it('refuses more steps than a two-digit step number can name (REQ-RUN-05, REQ-FMT-06)', () => {
    const steps = Array.from({ length: 100 }, (_, index) => ({
      n: index + 1,
      prompt_file: `prompts/${String(index + 1).padStart(2, '0')}.md`,
    }));
    // The prompt files exist, so the only thing left to complain about is the count itself.
    const files = [
      ...COMPLETE_FILES.filter((file) => !file.startsWith('prompts/')),
      ...steps.map((s) => s.prompt_file),
    ];
    const issues = issuesOf(writeScenario(withField(['steps'], steps), files));
    expect(issues.map((issue) => issue.path)).toEqual(['steps']);
    // `steps/100` sorts before `steps/99` in any listing, and `step 100` breaks the message shape.
    expect(issues[0]?.message).toMatch(/two digits/);
  });

  it('rejects an id or version that differs from its directory', () => {
    const yaml = completeScenarioYaml('S8', '1.1');
    expect(paths(writeScenario(yaml))).toEqual(['id', 'version']);
  });

  it.each([
    ['seed', '../outside'],
    ['seed', '/etc'],
    ['seed', 'seed/../../outside'],
  ])('rejects %s paths that leave the scenario directory (%s)', (field, value) => {
    expect(paths(writeScenario(withField([field], value)))).toEqual([field]);
  });

  it('names every file or directory that does not exist, in declaration order', () => {
    const root = writeScenario(completeScenarioYaml(), ['prompts/01.md']);
    expect(issuesOf(root)).toEqual([
      { path: 'seed', message: "directory 'seed' does not exist" },
      { path: 'steps[1].prompt_file', message: "file 'prompts/02.md' does not exist" },
      { path: 'oracle.suites[0].dir', message: "directory 'oracle/first' does not exist" },
      { path: 'oracle.suites[1].dir', message: "directory 'oracle/all' does not exist" },
      { path: 'oracle.checks[0]', message: "file 'oracle/checks/decision.yaml' does not exist" },
    ]);
  });

  it('rejects a file where a directory is expected', () => {
    const yaml = withField(['seed'], 'prompts/01.md');
    expect(issuesOf(writeScenario(yaml))).toEqual([
      { path: 'seed', message: "directory 'prompts/01.md' does not exist" },
    ]);
  });

  it('rejects a declared path that is a symbolic link leading outside the scenario directory', () => {
    const files = COMPLETE_FILES.filter((file) => !file.startsWith('seed/'));
    const root = writeScenario(completeScenarioYaml(), files);
    symlinkSync(tempDir('bench-outside-'), join(root, 'S9', '1.0', 'seed'));
    expect(issuesOf(root)).toEqual([
      { path: 'seed', message: "'seed' leads outside the scenario directory" },
    ]);
  });

  it('explains that an unquoted version is read as a number', () => {
    const yaml = completeScenarioYaml();
    yaml.version = 1.0;
    expect(issuesOf(writeScenario(yaml))).toEqual([
      {
        path: 'version',
        message: "must be a quoted string such as '1.0' (unquoted, YAML reads it as a number)",
      },
    ]);
  });

  it("finds a scenario's per-arm configuration by name, with no field in scenario.yaml (dl-005)", () => {
    const root = writeScenario();
    const dir = join(root, 'S9', '1.0');
    mkdirSync(join(dir, 'arms', 'wingfoil', '.wingfoil'), { recursive: true });
    mkdirSync(join(dir, 'arms', 'baseline-docs'));

    const result = loadScenario(root, 'S9', '1.0');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.armDirs).toEqual({
      'baseline-docs': join(dir, 'arms', 'baseline-docs'),
      wingfoil: join(dir, 'arms', 'wingfoil'),
    });
  });

  it('has no per-arm configuration when the scenario has no arms/ directory', () => {
    const result = loadScenario(writeScenario(), 'S9', '1.0');
    expect(result.ok && result.value.armDirs).toEqual({});
  });

  it.each([
    [
      'a file',
      (dir: string) => writeFileSync(join(dir, 'arms', 'notes.md'), 'x'),
      "'arms/notes.md' is not a directory",
    ],
    [
      'a name no arm can have',
      (dir: string) => mkdirSync(join(dir, 'arms', 'Wing Foil')),
      "'arms/Wing Foil' is not an arm name",
    ],
    [
      'a symbolic link',
      (dir: string) => symlinkSync(join(dir, 'oracle'), join(dir, 'arms', 'wingfoil')),
      "'arms/wingfoil' is a symbolic link",
    ],
  ])('refuses an entry of arms/ that is %s', (_, make, message) => {
    const root = writeScenario();
    const dir = join(root, 'S9', '1.0');
    mkdirSync(join(dir, 'arms'));
    make(dir);
    expect(issuesOf(root)).toEqual([{ path: 'arms', message }]);
  });

  it("keeps the seed and the prompts apart from an arm's configuration: the baseline must not see a rule", () => {
    const yaml = completeScenarioYaml();
    yaml.steps = [
      { n: 1, prompt_file: 'prompts/01.md' },
      { n: 2, prompt_file: 'arms/wingfoil/rule.md' },
    ];
    const root = writeScenario(yaml, [...COMPLETE_FILES, 'arms/wingfoil/rule.md', 'seed/arms/x/y.md']);
    const dir = join(root, 'S9', '1.0');
    rmSync(join(dir, 'arms'), { recursive: true });
    mkdirSync(join(dir, 'arms', 'wingfoil'), { recursive: true });
    writeFileSync(join(dir, 'arms', 'wingfoil', 'rule.md'), 'rule\n');
    expect(issuesOf(root)).toEqual([
      { path: 'steps[1].prompt_file', message: "'steps[1].prompt_file' overlaps arms.wingfoil" },
    ]);

    const inside = writeScenario(withField(['seed'], '.'));
    mkdirSync(join(inside, 'S9', '1.0', 'arms', 'wingfoil'), { recursive: true });
    expect(issuesOf(inside)).toContainEqual({ path: 'seed', message: "'seed' overlaps arms.wingfoil" });
  });

  it('reports every overlap of the seed, in declaration order', () => {
    expect(issuesOf(writeScenario(withField(['seed'], '.')))).toEqual([
      { path: 'seed', message: "'seed' overlaps scenario.yaml" },
      { path: 'seed', message: "'seed' overlaps steps[0].prompt_file" },
      { path: 'seed', message: "'seed' overlaps steps[1].prompt_file" },
      { path: 'seed', message: "'seed' overlaps oracle.suites[0].dir" },
      { path: 'seed', message: "'seed' overlaps oracle.suites[1].dir" },
      { path: 'seed', message: "'seed' overlaps oracle.checks[0]" },
    ]);
  });

  it.each([
    [['seed'], 'oracle', "'seed' overlaps oracle.suites[0].dir"],
    [['oracle', 'suites'], [{ id: 'x', dir: 'seed', after_steps: [1] }], "'seed' overlaps oracle.suites[0].dir"],
  ])('keeps the seed apart from the oracle (%j = %s)', (field, value, message) => {
    const root = writeScenario(withField(field as string[], value));
    expect(issuesOf(root)[0]).toEqual({ path: 'seed', message });
  });

  it('keeps step prompts out of the seed', () => {
    const yaml = completeScenarioYaml();
    yaml.steps = [
      { n: 1, prompt_file: 'prompts/01.md' },
      { n: 2, prompt_file: 'seed/README.md' },
    ];
    expect(issuesOf(writeScenario(yaml))).toEqual([
      { path: 'seed', message: "'seed' overlaps steps[1].prompt_file" },
    ]);
  });

  it('keeps the seed apart from the oracle when the seed is a symbolic link to it', () => {
    const files = COMPLETE_FILES.filter((file) => !file.startsWith('seed/'));
    const root = writeScenario(completeScenarioYaml(), files);
    symlinkSync(join(root, 'S9', '1.0', 'oracle'), join(root, 'S9', '1.0', 'seed'));
    expect(issuesOf(root)).toEqual([
      { path: 'seed', message: "'seed' overlaps oracle.suites[0].dir" },
      { path: 'seed', message: "'seed' overlaps oracle.suites[1].dir" },
      { path: 'seed', message: "'seed' overlaps oracle.checks[0]" },
    ]);
  });

  it.each([
    ['oracle/first/a.test.ts', "'steps[1].prompt_file' overlaps oracle.suites[0].dir"],
    ['oracle/all/b.test.ts', "'steps[1].prompt_file' overlaps oracle.suites[1].dir"],
    ['oracle/checks/decision.yaml', "'steps[1].prompt_file' overlaps oracle.checks[0]"],
    ['scenario.yaml', "'steps[1].prompt_file' overlaps scenario.yaml"],
  ])('keeps a step prompt apart from the oracle and scenario.yaml (%s)', (prompt, message) => {
    const yaml = completeScenarioYaml();
    yaml.steps = [
      { n: 1, prompt_file: 'prompts/01.md' },
      { n: 2, prompt_file: prompt },
    ];
    expect(issuesOf(writeScenario(yaml))[0]).toEqual({ path: 'steps[1].prompt_file', message });
  });

  it.each([['javascript:alert(1)'], ['file:///etc/passwd'], ['mailto:a@b.org'], ['data:text/plain,x']])(
    'accepts only http(s), git and ssh URLs for third-party material (%s)',
    (url) => {
      expect(paths(writeScenario(withThirdParty('url', url)))).toEqual(['oracle.third_party[0].url']);
    },
  );

  it.each([
    ['(MIT OR Apache-2.0)'],
    ['MIT AND (BSD-2-Clause OR Apache-2.0)'],
    ['GPL-2.0-only WITH Classpath-exception-2.0'],
  ])('accepts SPDX expressions with parentheses (%s)', (license) => {
    expect(loadScenario(writeScenario(withThirdParty('license', license)), 'S9', '1.0').ok).toBe(true);
  });

  it('rejects a license nested too deeply instead of throwing', () => {
    const license = '('.repeat(10_000) + 'MIT' + ')'.repeat(10_000);
    expect(paths(writeScenario(withThirdParty('license', license)))).toEqual([
      'oracle.third_party[0].license',
    ]);
  });

  it.each([['(MIT OR'], ['MIT OR)'], ['MIT OR OR Apache-2.0'], ['AND MIT'], ['MIT WITH'], ['()'], ['']])(
    'rejects malformed SPDX expressions (%j)',
    (license) => {
      expect(paths(writeScenario(withThirdParty('license', license)))).toEqual([
        'oracle.third_party[0].license',
      ]);
    },
  );

  it('treats spellings of the same path as one file', () => {
    const yaml = completeScenarioYaml();
    yaml.steps = [
      { n: 1, prompt_file: 'prompts/01.md' },
      { n: 2, prompt_file: './prompts/01.md' },
    ];
    expect(paths(writeScenario(yaml))).toEqual(['steps']);
  });

  it('rejects duplicate oracle checks', () => {
    const yaml = completeScenarioYaml();
    (yaml.oracle as Record<string, unknown>).checks = [
      'oracle/checks/decision.yaml',
      'oracle/./checks/decision.yaml',
    ];
    expect(paths(writeScenario(yaml))).toEqual(['oracle.checks']);
  });
});

describe('loadScenario — oracle suites (dl-001)', () => {
  it('loads every suite with an absolute directory and its steps in order', () => {
    const root = writeScenario();
    const result = loadScenario(root, 'S9', '1.0');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dir = join(root, 'S9', '1.0');
    expect(result.value.oracle.suites).toEqual([
      { id: 'first', dir: join(dir, 'oracle/first'), afterSteps: [1] },
      { id: 'all', dir: join(dir, 'oracle/all'), afterSteps: [1, 2] },
    ]);
  });

  it('accepts a scenario that declares no suite, and loads none', () => {
    const result = loadScenario(writeScenario(withField(['oracle', 'suites'], [])), 'S9', '1.0');
    expect(result.ok && result.value.oracle.suites).toEqual([]);
  });

  it('requires the suites to be declared', () => {
    expect(issuesOf(writeScenario(withField(['oracle', 'suites'], undefined)))).toEqual([
      { path: 'oracle.suites', message: 'is required' },
    ]);
  });

  it('refuses the single public test directory the suites replace', () => {
    const yaml = completeScenarioYaml();
    (yaml.oracle as Record<string, unknown>).public_tests = 'oracle/first';
    expect(issuesOf(writeScenario(yaml))).toEqual([
      { path: 'oracle.public_tests', message: 'is not a known field' },
    ]);
  });

  it.each([
    [{ id: 'Pointer Suite', dir: 'oracle/first', after_steps: [1] }, 'oracle.suites[0].id'],
    [{ id: 'a/b', dir: 'oracle/first', after_steps: [1] }, 'oracle.suites[0].id'],
    [{ id: 'first', dir: '../outside', after_steps: [1] }, 'oracle.suites[0].dir'],
    [{ id: 'first', dir: 'oracle/first', after_steps: [] }, 'oracle.suites[0].after_steps'],
    [{ id: 'first', dir: 'oracle/first', after_steps: [1, 1] }, 'oracle.suites[0].after_steps'],
    [{ id: 'first', dir: 'oracle/first', after_steps: [1.5] }, 'oracle.suites[0].after_steps[0]'],
    [{ id: 'first', dir: 'oracle/first', after_steps: [1], extra: 1 }, 'oracle.suites[0].extra'],
  ])('rejects a malformed suite %j', (suite, path) => {
    expect(paths(writeScenario(withField(['oracle', 'suites'], [suite])))).toEqual([path]);
  });

  it('refuses a suite bound to a step the scenario does not declare, naming each', () => {
    const suites = [
      { id: 'first', dir: 'oracle/first', after_steps: [1, 3] },
      { id: 'all', dir: 'oracle/all', after_steps: [0, 2] },
    ];
    expect(issuesOf(writeScenario(withField(['oracle', 'suites'], suites)))).toEqual([
      { path: 'oracle.suites[0].after_steps[1]', message: 'must be a declared step: the scenario has steps 1–2' },
      { path: 'oracle.suites[1].after_steps[0]', message: 'must be a declared step: the scenario has steps 1–2' },
    ]);
  });

  it('refuses two suites with the same id', () => {
    const suites = [
      { id: 'first', dir: 'oracle/first', after_steps: [1] },
      { id: 'first', dir: 'oracle/all', after_steps: [2] },
    ];
    expect(issuesOf(writeScenario(withField(['oracle', 'suites'], suites)))).toEqual([
      { path: 'oracle.suites[1].id', message: 'repeats the id of oracle.suites[0]' },
    ]);
  });

  it('refuses two suites on the same directory, however it is spelled', () => {
    const suites = [
      { id: 'first', dir: 'oracle/first', after_steps: [1] },
      { id: 'again', dir: './oracle/first', after_steps: [2] },
    ];
    expect(issuesOf(writeScenario(withField(['oracle', 'suites'], suites)))).toEqual([
      { path: 'oracle.suites[1].dir', message: 'repeats the directory of oracle.suites[0]' },
    ]);
  });

  it('refuses a suite inside another: its tests would be scored after steps nobody declared', () => {
    const suites = [
      { id: 'first', dir: 'oracle/first', after_steps: [1] },
      { id: 'deep', dir: 'oracle/first/deep', after_steps: [2] },
    ];
    const root = writeScenario(withField(['oracle', 'suites'], suites), [
      ...COMPLETE_FILES,
      'oracle/first/deep/c.test.ts',
    ]);
    expect(issuesOf(root)).toEqual([
      { path: 'oracle.suites[1].dir', message: "'oracle.suites[1].dir' overlaps oracle.suites[0].dir" },
    ]);
  });

  it('refuses a suite that is a symbolic link to another', () => {
    const files = COMPLETE_FILES.filter((file) => !file.startsWith('oracle/all/'));
    const root = writeScenario(completeScenarioYaml(), files);
    symlinkSync(join(root, 'S9', '1.0', 'oracle', 'first'), join(root, 'S9', '1.0', 'oracle', 'all'));
    expect(issuesOf(root)).toEqual([
      { path: 'oracle.suites[1].dir', message: "'oracle.suites[1].dir' overlaps oracle.suites[0].dir" },
    ]);
  });

  it('refuses a check inside a suite: a check is a pattern file, not a test to run', () => {
    const yaml = completeScenarioYaml();
    (yaml.oracle as Record<string, unknown>).checks = ['oracle/first/decision.yaml'];
    const root = writeScenario(yaml, [...COMPLETE_FILES, 'oracle/first/decision.yaml']);
    expect(issuesOf(root)).toEqual([
      { path: 'oracle.checks[0]', message: "'oracle.checks[0]' overlaps oracle.suites[0].dir" },
    ]);
  });
});

describe('scenario fixtures', () => {
  it('removes a temporary directory by default when the test that created it finishes', () => {
    let dir = '';
    // Registered before tempDir's own cleanup: Vitest runs these hooks in reverse order, so this one runs after it.
    onTestFinished(() => {
      expect(existsSync(dir)).toBe(false);
    });
    dir = tempDir('bench-default-');
    expect(existsSync(dir)).toBe(true);
  });

  it('remove a temporary directory when the test that created it finishes', () => {
    const cleanups: (() => void)[] = [];
    const dir = tempDir('bench-cleanup-', (cleanup) => cleanups.push(cleanup));
    expect(existsSync(dir)).toBe(true);
    cleanups.forEach((cleanup) => cleanup());
    expect(existsSync(dir)).toBe(false);
  });
});
