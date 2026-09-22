import { describe, expect, it } from 'vitest';

import {
  acceptanceTestTitles,
  acceptanceTitle,
  parseFeatureFile,
  readScenarios,
  startedFeatures,
} from '../support/traceability.js';

describe('acceptance traceability', () => {
  it('every scenario of a started task has an acceptance test named after it', () => {
    const started = startedFeatures('docs/memory/task');
    const titles = acceptanceTestTitles('test/acceptance');
    const missing = readScenarios('docs/02_specification/acceptance')
      .filter((scenario) => scenario.features.some((feature) => started.has(feature)))
      .map(acceptanceTitle)
      .filter((title) => !titles.has(title));
    expect(missing).toEqual([]);
  });

  it('parses feature tags, error tags and outlines', () => {
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
    ].join('\n');
    expect(parseFeatureFile('x.feature', text).map(acceptanceTitle)).toEqual([
      '@F1.1 First',
      '@F1.1 Second',
      '@F6.1 @F6.2 Third',
    ]);
  });
});
