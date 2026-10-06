import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';
import {
  acceptanceTestTitles,
  acceptanceTitle,
  bugLinkProblems,
  parseFeatureFile,
  readScenarios,
  requiredScenarios,
  startedFeatures,
} from '../support/traceability.js';

describe('acceptance traceability', () => {
  it('every scenario of a started task has an acceptance test named after it', () => {
    const titles = acceptanceTestTitles(repoPath('test/acceptance'));
    const { required, unknown } = requiredScenarios(
      repoPath('docs/memory/task'),
      readScenarios(repoPath('docs/02_specification/acceptance')),
    );
    expect(unknown).toEqual([]);
    expect(required.map(acceptanceTitle).filter((title) => !titles.has(title))).toEqual([]);
  });
});

describe('bug links', () => {
  it('every fixes entry, fixed_by and fixed bug agrees with the tasks and bugs in the repository', () => {
    expect(bugLinkProblems(repoPath('docs/memory/task'), repoPath('docs/memory/bug'))).toEqual([]);
  });
});

describe('bug link check', () => {
  interface Fixture {
    readonly tasks?: Record<string, string[]>;
    readonly bugs?: Record<string, string[]>;
  }

  /** Writes each element as a Markdown file whose front matter is the given lines. */
  function problemsOf({ tasks = {}, bugs = {} }: Fixture): string[] {
    const root = tempDir('bench-bug-links-');
    const write = (dir: string, elements: Record<string, string[]>) => {
      mkdirSync(join(root, dir));
      for (const [id, lines] of Object.entries(elements)) {
        writeFileSync(join(root, dir, `${id}.md`), ['---', `id: ${id}`, ...lines, '---', ''].join('\n'));
      }
    };
    write('task', tasks);
    write('bug', bugs);
    return bugLinkProblems(join(root, 'task'), join(root, 'bug'));
  }

  it('accepts a done task and the fixed bug it fixes, each naming the other', () => {
    expect(
      problemsOf({
        tasks: { 'task-1-a': ['status: done', 'fixes: [bug-1-a]'] },
        bugs: { 'bug-1-a': ['status: fixed', 'fixed_by: task-1-a'] },
      }),
    ).toEqual([]);
  });

  it('accepts a task not yet done whose bug is still open, and tasks that fix nothing', () => {
    expect(
      problemsOf({
        tasks: { 'task-1-a': ['status: in-progress', 'fixes: [bug-1-a]'], 'task-2-b': ['status: done'] },
        bugs: { 'bug-1-a': ['status: approved'] },
      }),
    ).toEqual([]);
  });

  it('reports a fixes entry that names no bug', () => {
    expect(problemsOf({ tasks: { 'task-1-a': ['status: backlog', 'fixes: [bug-9-x]'] } })).toEqual([
      'task-1-a fixes bug-9-x, which does not exist',
    ]);
  });

  it('reports a fixed_by that names no task, or a task that does not list the bug', () => {
    expect(
      problemsOf({
        tasks: { 'task-1-a': ['status: done'] },
        bugs: {
          'bug-1-a': ['status: approved', 'fixed_by: task-9-x'],
          'bug-2-b': ['status: approved', 'fixed_by: task-1-a'],
        },
      }),
    ).toEqual([
      'bug-1-a is fixed_by task-9-x, which does not exist',
      'bug-2-b is fixed_by task-1-a, whose fixes does not list it',
    ]);
  });

  it('reports a fixed bug without fixed_by, or whose task is not done', () => {
    expect(
      problemsOf({
        tasks: { 'task-1-a': ['status: in-review', 'fixes: [bug-2-b]'] },
        bugs: { 'bug-1-a': ['status: fixed'], 'bug-2-b': ['status: fixed', 'fixed_by: task-1-a'] },
      }),
    ).toEqual([
      'bug-1-a is fixed but names no fixed_by task',
      'bug-2-b is fixed by task-1-a, which is in-review, not done',
    ]);
  });

  it('reports a done task whose bug is neither fixed nor deprecated', () => {
    expect(
      problemsOf({
        tasks: { 'task-1-a': ['status: done', 'fixes: [bug-1-a, bug-2-b]'] },
        bugs: { 'bug-1-a': ['status: approved'], 'bug-2-b': ['status: deprecated'] },
      }),
    ).toEqual(['task-1-a is done but bug-1-a is approved, not fixed']);
  });

  it('reports a fixes that is not a list, and does not read it as one', () => {
    expect(
      problemsOf({
        tasks: { 'task-1-a': ['status: done', 'fixes: bug-1-a'] },
        bugs: { 'bug-1-a': ['status: fixed', 'fixed_by: task-1-a'] },
      }),
    ).toEqual([
      'task-1-a has a fixes that is not a list',
      'bug-1-a is fixed_by task-1-a, whose fixes does not list it',
    ]);
  });

  it('reports an element without an id, and two elements with the same id', () => {
    const root = tempDir('bench-bug-links-ids-');
    mkdirSync(join(root, 'task'));
    mkdirSync(join(root, 'bug'));
    writeFileSync(join(root, 'task', 'a.md'), ['---', 'id: task-1-a', 'status: done', '---', ''].join('\n'));
    writeFileSync(
      join(root, 'task', 'b.md'),
      ['---', 'id: task-1-a', 'status: backlog', '---', ''].join('\n'),
    );
    writeFileSync(join(root, 'bug', 'c.md'), ['---', 'status: fixed', '---', ''].join('\n'));
    expect(bugLinkProblems(join(root, 'task'), join(root, 'bug'))).toEqual([
      'b.md repeats the id task-1-a',
      'c.md has no id',
    ]);
  });

  it('reads front matter with CRLF line endings', () => {
    const root = tempDir('bench-bug-links-crlf-');
    mkdirSync(join(root, 'task'));
    mkdirSync(join(root, 'bug'));
    writeFileSync(
      join(root, 'task', 't.md'),
      ['---', 'id: task-1-a', 'status: done', 'fixes: [bug-1-a]', '---', ''].join('\r\n'),
    );
    writeFileSync(
      join(root, 'bug', 'b.md'),
      ['---', 'id: bug-1-a', 'status: approved', '---', ''].join('\r\n'),
    );
    expect(bugLinkProblems(join(root, 'task'), join(root, 'bug'))).toEqual([
      'task-1-a is done but bug-1-a is approved, not fixed',
    ]);
  });
});

describe('feature file parser', () => {
  it('reads feature tags, error tags, outlines and examples', () => {
    const text = [
      'Feature: x',
      '  @F1.1',
      '  Scenario: First',
      '    Given a',
      '',
      '  @F1.1 @error',
      '  Scenario: Second',
      '  @F6.1 @F6.2',
      '  Scenario Outline: Third',
      '  @F1.2',
      '  Example: Fourth',
      '  @F1.3',
      '  Scenario Template: Fifth',
    ].join('\n');
    expect(parseFeatureFile('x.feature', text).map(acceptanceTitle)).toEqual([
      '@F1.1 First',
      '@F1.1 Second',
      '@F6.1 @F6.2 Third',
      '@F1.2 Fourth',
      '@F1.3 Fifth',
    ]);
  });

  it('gives each Rule its own tags, on top of the Feature tags', () => {
    const text = [
      '@F8.0',
      'Feature: x',
      '@F8.1',
      'Rule: one',
      'Scenario: In rule one',
      '@F8.2',
      'Rule: two',
      'Scenario: In rule two',
    ].join('\n');
    expect(parseFeatureFile('x.feature', text).map(acceptanceTitle)).toEqual([
      '@F8.0 @F8.1 In rule one',
      '@F8.0 @F8.2 In rule two',
    ]);
  });

  it('inherits feature-level tags, keeps tags across comments and reads CRLF files', () => {
    const text = ['@F9.1', 'Feature: x', '  @F9.2', '  # a comment', '  Scenario: Only'].join('\r\n');
    expect(parseFeatureFile('x.feature', text).map(acceptanceTitle)).toEqual(['@F9.1 @F9.2 Only']);
  });
});

describe('acceptance test title scan', () => {
  function titlesOf(source: string): string[] {
    const dir = tempDir('bench-titles-');
    writeFileSync(join(dir, 'a.test.ts'), source);
    return [...acceptanceTestTitles(dir)];
  }

  it("collects titles that contain the other quote kinds, such as the arm's environment", () => {
    expect(
      titlesOf(`it("@F2.1 The arm's environment", () => {});\nit('@F2.2 A \\'quoted\\' word', () => {});`),
    ).toEqual(["@F2.1 The arm's environment", "@F2.2 A 'quoted' word"]);
  });

  it('ignores titles in comments and in skipped or pending tests', () => {
    const source = [
      "// it('@F9.1 commented', () => {});",
      "/* it('@F9.2 block', () => {}); */",
      "it.skip('@F9.3 skipped', () => {});",
      "it.todo('@F9.4 pending');",
      "test('@F9.5 counted', () => {});",
    ].join('\n');
    expect(titlesOf(source)).toEqual(['@F9.5 counted']);
  });
});

describe('required scenarios', () => {
  const SCENARIOS = [
    { file: 'a.feature', features: ['F9.1'], title: 'One' },
    { file: 'a.feature', features: ['F9.1'], title: 'Two' },
    { file: 'a.feature', features: ['F9.2'], title: 'Three' },
    { file: 'b.feature', features: ['F9.3'], title: 'Four' },
  ];

  function tasks(...frontmatters: string[][]): string {
    const dir = tempDir('bench-tasks-');
    frontmatters.forEach((lines, index) =>
      writeFileSync(join(dir, `t${index}.md`), ['---', ...lines, '---', ''].join('\n')),
    );
    return dir;
  }

  it("requires every scenario of a started task's features when it names none", () => {
    const dir = tasks(['status: in-progress', 'features: [F9.1]'], ['status: backlog', 'features: [F9.2]']);
    expect(requiredScenarios(dir, SCENARIOS).required.map((s) => s.title)).toEqual(['One', 'Two']);
  });

  it('requires only the scenarios a started task names by file and title', () => {
    const dir = tasks([
      'status: in-progress',
      'features: [F9.1, F9.2]',
      'acceptance: ["a.feature#Two", "a.feature#Three"]',
    ]);
    expect(requiredScenarios(dir, SCENARIOS)).toEqual({
      required: [SCENARIOS[1], SCENARIOS[2]],
      unknown: [],
    });
  });

  it('reports a named scenario that does not exist, so that a rename cannot drop it silently', () => {
    const dir = tasks([
      'status: done',
      'features: [F9.3]',
      'acceptance: ["b.feature#Five", "a.feature#Four"]',
    ]);
    expect(requiredScenarios(dir, SCENARIOS)).toEqual({
      required: [],
      unknown: ['t0.md: b.feature#Five', 't0.md: a.feature#Four'],
    });
  });

  it('keeps a feature file named without a scenario as information, as the tasks of v0.1 do', () => {
    const dir = tasks(['status: done', 'features: [F9.3]', 'acceptance: [b.feature]']);
    expect(requiredScenarios(dir, SCENARIOS).required.map((s) => s.title)).toEqual(['Four']);
  });
});

describe('started features', () => {
  it('reads task frontmatter with CRLF line endings', () => {
    const dir = tempDir('bench-tasks-');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 't.md'),
      ['---', 'status: in-progress', 'features: [F9.9]', '---', ''].join('\r\n'),
    );
    expect([...startedFeatures(dir)]).toEqual(['F9.9']);
  });
});

describe('acceptance test title scan, edge cases', () => {
  function titlesOf(source: string): string[] {
    const dir = tempDir('bench-titles-');
    writeFileSync(join(dir, 'a.test.ts'), source);
    return [...acceptanceTestTitles(dir)].sort();
  }

  it('does not count titles in trailing comments or in calls that are not tests', () => {
    const source = [
      "foo(); // it('@F9.1 trailing comment', () => {});",
      "const re = /x/; re.test('@F9.2 regex test call');",
      "expect.it('@F9.3 member it');",
      "describe('@F9.8 a describe title', () => {});",
    ].join('\n');
    expect(titlesOf(source)).toEqual([]);
  });

  it('counts the test forms Vitest runs', () => {
    const source = [
      "it.each([[f(1)]])('@F9.4 each with nested calls', () => {});",
      "it.concurrent('@F9.5 concurrent', () => {});",
      "it ('@F9.6 space before the parenthesis', () => {});",
      "test.each`a\n${1}`('@F9.7 each with a template table', () => {});",
      "it.only('@F9.9 only', () => {});",
    ].join('\n');
    expect(titlesOf(source)).toEqual([
      '@F9.4 each with nested calls',
      '@F9.5 concurrent',
      '@F9.6 space before the parenthesis',
      '@F9.7 each with a template table',
      '@F9.9 only',
    ]);
  });

  it('does not count tests inside skipped or pending suites', () => {
    const source = [
      "describe.skip('a', () => { it('@F8.1 in a skipped suite', () => {}); });",
      "describe.todo('b', () => { it('@F8.2 in a pending suite', () => {}); });",
      "describe('c', () => { describe.skip('d', () => { it('@F8.3 nested', () => {}); }); });",
      "describe.only('e', () => { it('@F8.4 counted', () => {}); });",
    ].join('\n');
    expect(titlesOf(source)).toEqual(['@F8.4 counted']);
  });

  it('ignores titles computed at run time', () => {
    expect(titlesOf("const t = 'x';\nit(`@F9.10 ${t}`, () => {});")).toEqual([]);
  });
});
