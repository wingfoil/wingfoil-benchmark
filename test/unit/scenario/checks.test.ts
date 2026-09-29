import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadScenario } from '../../../src/scenario/index.js';
import { COMPLETE_FILES, completeScenarioYaml, writeScenario } from '../../support/scenario-fixture.js';

/**
 * The check files of `oracle.checks` (REQ-SCO-06 as amended in 1.12, task-035): each parsed and
 * validated by the loader, with its id from its file name and, for an `unchanged` check, the seed's
 * lines it keeps.
 */

/** A complete scenario whose checks are `checks`, by path, with `files` written beside them. */
function scenarioWith(
  checks: Readonly<Record<string, string>>,
  files: Readonly<Record<string, string>> = {},
): string {
  const yaml = completeScenarioYaml();
  (yaml.oracle as Record<string, unknown>).checks = Object.keys(checks);
  const root = writeScenario(
    yaml,
    COMPLETE_FILES.filter((file) => file !== 'oracle/checks/decision.yaml'),
  );
  for (const [path, content] of Object.entries({ ...checks, ...files })) {
    const target = join(root, 'S9', '1.0', path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

function issuesOf(root: string): readonly { path: string; message: string }[] {
  const result = loadScenario(root, 'S9', '1.0');
  return result.ok ? [] : result.issues;
}

const SEED_TAX =
  'export const RATE = 22;\n\n/** Tax on shipping. */\nexport function shippingTax(c: number): number {\n  return c;\n}\n';

describe('loading check files (REQ-SCO-06, task-035)', () => {
  it('loads a content check: its id from the file name, its steps and its groups of patterns', () => {
    const root = scenarioWith({
      'oracle/checks/revision.yaml':
        'kind: content\nsteps: [1, 2]\npatterns:\n  - [whole day, full day]\n  - [revised]\n',
    });
    const result = loadScenario(root, 'S9', '1.0');
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.checks).toEqual([
      {
        id: 'revision',
        file: join(root, 'S9', '1.0', 'oracle/checks/revision.yaml'),
        kind: 'content',
        steps: [1, 2],
        patterns: [['whole day', 'full day'], ['revised']],
      },
    ]);
  });

  it("loads an unchanged check with the seed's own lines of each region", () => {
    const root = scenarioWith(
      {
        'oracle/checks/kept.yaml':
          'kind: unchanged\nsteps: [2]\nregions:\n  - { file: src/tax.ts, lines: [3, 6] }\n  - { file: src/tax.ts, lines: [1, 1] }\n',
      },
      { 'seed/src/tax.ts': SEED_TAX },
    );
    const result = loadScenario(root, 'S9', '1.0');
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.checks).toEqual([
      {
        id: 'kept',
        file: join(root, 'S9', '1.0', 'oracle/checks/kept.yaml'),
        kind: 'unchanged',
        steps: [2],
        regions: [
          {
            path: 'src/tax.ts',
            from: 3,
            to: 6,
            lines: [
              '/** Tax on shipping. */',
              'export function shippingTax(c: number): number {',
              '  return c;',
              '}',
            ],
          },
          { path: 'src/tax.ts', from: 1, to: 1, lines: ['export const RATE = 22;'] },
        ],
      },
    ]);
  });

  it('reports a check file that is not YAML, or empty, against its entry', () => {
    expect(issuesOf(scenarioWith({ 'oracle/checks/a.yaml': 'kind: [\n' }))).toEqual([
      { path: 'oracle.checks[0]', message: expect.stringMatching(/^a\.yaml is not valid YAML/) as string },
    ]);
    expect(issuesOf(scenarioWith({ 'oracle/checks/a.yaml': '' }))).toEqual([
      { path: 'oracle.checks[0]', message: 'a.yaml is empty' },
    ]);
  });

  it('reports the schema issues of a check at their field, under its entry', () => {
    expect(issuesOf(scenarioWith({ 'oracle/checks/a.yaml': 'kind: grep\nsteps: [1]\n' }))).toEqual([
      { path: 'oracle.checks[0].kind', message: expect.any(String) as string },
    ]);
    expect(
      issuesOf(
        scenarioWith({ 'oracle/checks/a.yaml': 'kind: content\nsteps: [1]\npatterns: []\nextra: 1\n' }),
      ).map((issue) => issue.path),
    ).toEqual(['oracle.checks[0].patterns', 'oracle.checks[0].extra']);
    expect(
      issuesOf(
        scenarioWith({
          'oracle/checks/a.yaml': 'kind: content\nsteps: [1]\npatterns:\n  - []\n  - ["  "]\n',
        }),
      ).map((issue) => issue.path),
    ).toEqual(['oracle.checks[0].patterns[0]', 'oracle.checks[0].patterns[1][0]']);
  });

  it("refuses steps out of order, repeated, or that the scenario doesn't have", () => {
    expect(
      issuesOf(scenarioWith({ 'oracle/checks/a.yaml': 'kind: content\nsteps: [2, 1]\npatterns: [[x]]\n' })),
    ).toEqual([{ path: 'oracle.checks[0].steps', message: 'must be in ascending order, each step once' }]);
    expect(
      issuesOf(scenarioWith({ 'oracle/checks/a.yaml': 'kind: content\nsteps: [2, 3]\npatterns: [[x]]\n' })),
    ).toEqual([
      { path: 'oracle.checks[0].steps[1]', message: 'must be a declared step: the scenario has steps 1–2' },
    ]);
  });

  it('takes the id from the file name: kebab-case, a .yaml file, and unique', () => {
    expect(
      issuesOf(
        scenarioWith({ 'oracle/checks/Not_Kebab.yaml': 'kind: content\nsteps: [1]\npatterns: [[x]]\n' }),
      ),
    ).toEqual([
      { path: 'oracle.checks[0]', message: "'Not_Kebab.yaml' must be named <id>.yaml, with a kebab-case id" },
    ]);
    expect(
      issuesOf(scenarioWith({ 'oracle/checks/a.yml': 'kind: content\nsteps: [1]\npatterns: [[x]]\n' })),
    ).toEqual([
      { path: 'oracle.checks[0]', message: "'a.yml' must be named <id>.yaml, with a kebab-case id" },
    ]);
    expect(
      issuesOf(
        scenarioWith({
          'oracle/checks/a.yaml': 'kind: content\nsteps: [1]\npatterns: [[x]]\n',
          'oracle/more/a.yaml': 'kind: content\nsteps: [1]\npatterns: [[y]]\n',
        }),
      ),
    ).toEqual([{ path: 'oracle.checks[1]', message: "repeats the id 'a' of oracle.checks[0]" }]);
  });

  it("refuses a region outside the seed's files or past the end of its file", () => {
    const check = (region: string) =>
      issuesOf(
        scenarioWith(
          { 'oracle/checks/a.yaml': `kind: unchanged\nsteps: [1]\nregions:\n  - ${region}\n` },
          { 'seed/src/tax.ts': SEED_TAX },
        ),
      );
    expect(check('{ file: src/missing.ts, lines: [1, 1] }')).toEqual([
      { path: 'oracle.checks[0].regions[0].file', message: "'src/missing.ts' is not a file of the seed" },
    ]);
    expect(check('{ file: src/tax.ts, lines: [5, 9] }')).toEqual([
      {
        path: 'oracle.checks[0].regions[0].lines',
        message: "goes past the end of 'src/tax.ts', which has 6 lines",
      },
    ]);
    expect(check('{ file: src/tax.ts, lines: [4, 3] }')).toEqual([
      { path: 'oracle.checks[0].regions[0].lines', message: 'must be [from, to], with 1 ≤ from ≤ to' },
    ]);
    expect(check('{ file: ../prompts/01.md, lines: [1, 1] }')).toEqual([
      {
        path: 'oracle.checks[0].regions[0].file',
        message: 'must be a relative path inside the scenario directory',
      },
    ]);
  });

  it('refuses a content check that the prompt of one of its steps satisfies on its own', () => {
    const root = scenarioWith(
      {
        'oracle/checks/copied.yaml':
          'kind: content\nsteps: [1, 2]\npatterns:\n  - [Whole  Days]\n  - [revise, change]\n',
      },
      { 'prompts/02.md': 'Bookings are for whole\ndays. Please change that to hours.\n' },
    );
    expect(issuesOf(root)).toEqual([
      {
        path: 'oracle.checks[0]',
        message: 'is satisfied by the text of prompts/02.md: an agent that copies its prompt would pass',
      },
    ]);
  });

  it('accepts a content check whose groups the prompt matches only in part', () => {
    const root = scenarioWith(
      {
        'oracle/checks/partly.yaml':
          'kind: content\nsteps: [2]\npatterns:\n  - [whole days]\n  - [revised]\n',
      },
      { 'prompts/02.md': 'Bookings are for whole days. Add hourly rentals.\n' },
    );
    expect(issuesOf(root)).toEqual([]);
  });

  it("loads a dependencies check with the seed's runtime dependencies, by name, sorted", () => {
    const root = scenarioWith(
      { 'oracle/checks/r1.yaml': 'kind: dependencies\nsteps: [1, 2]\n' },
      {
        'seed/package.json':
          '{ "dependencies": { "zod": "1.0.0", "yaml": "2.0.0" }, "devDependencies": { "tsx": "4" } }\n',
      },
    );
    const result = loadScenario(root, 'S9', '1.0');
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.checks).toEqual([
      {
        id: 'r1',
        file: join(root, 'S9', '1.0', 'oracle/checks/r1.yaml'),
        kind: 'dependencies',
        steps: [1, 2],
        seedDependencies: ['yaml', 'zod'],
      },
    ]);
  });

  it('gives a seed with no package.json no runtime dependency', () => {
    const result = loadScenario(
      scenarioWith({ 'oracle/checks/r1.yaml': 'kind: dependencies\nsteps: [1]\n' }),
      'S9',
      '1.0',
    );
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.checks[0]).toMatchObject({ kind: 'dependencies', seedDependencies: [] });
  });

  it('loads an ast check: its directory in the snapshot and its rules (REQ-SCO-05)', () => {
    const root = scenarioWith({
      'oracle/checks/r3.yaml': 'kind: ast\nsteps: [1]\ndir: src/domain\nrules: [wall-clock, randomness]\n',
    });
    const result = loadScenario(root, 'S9', '1.0');
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.checks[0]).toEqual({
      id: 'r3',
      file: join(root, 'S9', '1.0', 'oracle/checks/r3.yaml'),
      kind: 'ast',
      steps: [1],
      dir: 'src/domain',
      rules: ['wall-clock', 'randomness'],
    });
  });

  it('refuses an ast check with an unknown rule, no rule, a rule twice, or a directory outside', () => {
    const paths = (body: string) =>
      issuesOf(scenarioWith({ 'oracle/checks/a.yaml': `kind: ast\nsteps: [1]\n${body}` })).map(
        (issue) => issue.path,
      );
    expect(paths('dir: src\nrules: [sleep]\n')).toEqual(['oracle.checks[0].rules[0]']);
    expect(paths('dir: src\nrules: []\n')).toEqual(['oracle.checks[0].rules']);
    expect(paths('dir: src\nrules: [throw, throw]\n')).toEqual(['oracle.checks[0].rules']);
    expect(paths('dir: ../src\nrules: [throw]\n')).toEqual(['oracle.checks[0].dir']);
  });
});
