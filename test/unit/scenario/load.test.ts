import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadScenario } from '../../../src/scenario/index.js';
import { completeScenarioYaml, writeScenario } from '../../support/scenario-fixture.js';

function issuesOf(root: string, id = 'S9', version = '1.0') {
  const result = loadScenario(root, id, version);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

function paths(root: string, id = 'S9', version = '1.0'): string[] {
  return issuesOf(root, id, version).map((issue) => issue.path);
}

function withField(path: string[], value: unknown): Record<string, unknown> {
  const yaml = completeScenarioYaml();
  let node: Record<string, unknown> = yaml;
  for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
  const last = path[path.length - 1] as string;
  if (value === undefined) delete node[last];
  else node[last] = value;
  return yaml;
}

describe('loadScenario', () => {
  it('loads the trivial fixture scenario T0', () => {
    const result = loadScenario('test/fixtures/scenarios', 'T0', '1.0');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.steps).toHaveLength(1);
  });

  it('resolves oracle checks and keeps third-party pins and the hold-out flag', () => {
    const root = writeScenario();
    const result = loadScenario(root, 'S9', '1.0');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.oracle.checks).toEqual([join(root, 'S9', '1.0', 'oracle/checks/decision.yaml')]);
    expect(result.value.oracle.thirdParty[0]?.license).toBe('MIT');
    expect(result.value.holdout).toBe(true);
    expect(result.value.dir).toBe(join(root, 'S9', '1.0'));
  });

  it('defaults oracle checks and third-party pins to empty lists', () => {
    const yaml = completeScenarioYaml();
    yaml.oracle = { public_tests: 'oracle/public' };
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

  it('rejects unknown keys, so that a typo never drops a field', () => {
    const yaml = { ...completeScenarioYaml(), holdut: false };
    expect(issuesOf(writeScenario(yaml))[0]?.message).toMatch(/holdut/);
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
      [{ name: 'x', url: 'u', commit: 'main', license: 'MIT' }],
      'oracle.third_party[0].commit',
    ],
    [['holdout'], 'yes', 'holdout'],
  ])('rejects a malformed %j', (field, value, path) => {
    expect(paths(writeScenario(withField(field as string[], value)))).toEqual([path]);
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
      { path: 'oracle.public_tests', message: "directory 'oracle/public' does not exist" },
      { path: 'oracle.checks[0]', message: "file 'oracle/checks/decision.yaml' does not exist" },
    ]);
  });

  it('rejects a file where a directory is expected', () => {
    const yaml = withField(['seed'], 'prompts/01.md');
    expect(issuesOf(writeScenario(yaml))).toEqual([
      { path: 'seed', message: "directory 'prompts/01.md' does not exist" },
    ]);
  });
});
