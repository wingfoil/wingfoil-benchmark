import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';
import {
  acceptanceTestTitles,
  acceptanceTitle,
  parseFeatureFile,
  readScenarios,
  startedFeatures,
} from '../support/traceability.js';

describe('acceptance traceability', () => {
  it('every scenario of a started task has an acceptance test named after it', () => {
    const started = startedFeatures(repoPath('docs/memory/task'));
    const titles = acceptanceTestTitles(repoPath('test/acceptance'));
    const missing = readScenarios(repoPath('docs/02_specification/acceptance'))
      .filter((scenario) => scenario.features.some((feature) => started.has(feature)))
      .map(acceptanceTitle)
      .filter((title) => !titles.has(title));
    expect(missing).toEqual([]);
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

  it('ignores titles computed at run time', () => {
    expect(titlesOf("const t = 'x';\nit(`@F9.10 ${t}`, () => {});")).toEqual([]);
  });
});
