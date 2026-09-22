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
