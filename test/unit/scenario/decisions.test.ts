import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadScenario } from '../../../src/scenario/index.js';
import { COMPLETE_FILES, completeScenarioYaml, writeScenario } from '../../support/scenario-fixture.js';

/**
 * The decisions an oracle lists (REQ-FMT-04 as amended in 1.14, task-039): M-F1's list, each with the
 * content check that records its revision when the scenario revises it.
 */

/** A complete scenario whose `oracle.decisions` is `decisions`, and whose checks are `checks`. */
function scenarioWith(decisions: unknown, checks: Readonly<Record<string, string>> = {}): string {
  const yaml = completeScenarioYaml();
  const oracle = yaml.oracle as Record<string, unknown>;
  oracle.decisions = decisions;
  const paths = Object.keys(checks);
  if (paths.length > 0) oracle.checks = ['oracle/checks/decision.yaml', ...paths];
  const root = writeScenario(yaml, COMPLETE_FILES);
  for (const [path, content] of Object.entries(checks)) writeScenarioFile(root, path, content);
  return root;
}

function writeScenarioFile(root: string, path: string, content: string): void {
  const target = join(root, 'S9', '1.0', path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function issuesOf(root: string): readonly { path: string; message: string }[] {
  const result = loadScenario(root, 'S9', '1.0');
  return result.ok ? [] : result.issues;
}

describe('oracle.decisions (REQ-FMT-04 as amended in 1.14, task-039)', () => {
  it('defaults to none', () => {
    const result = loadScenario(writeScenario(completeScenarioYaml(), COMPLETE_FILES), 'S9', '1.0');
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.decisions).toEqual([]);
  });

  it('loads each decision in declaration order, with the check that records its revision', () => {
    const root = scenarioWith([{ id: 'D2' }, { id: 'D1', revised_by: 'decision' }]);
    const result = loadScenario(root, 'S9', '1.0');
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.oracle.decisions).toEqual([{ id: 'D2' }, { id: 'D1', revisedBy: 'decision' }]);
  });

  it('refuses an id that is not a capitalised word, and an unknown key', () => {
    expect(issuesOf(scenarioWith([{ id: 'd1' }]))).toEqual([
      expect.objectContaining({ path: 'oracle.decisions[0].id' }),
    ]);
    expect(issuesOf(scenarioWith([{ id: 'D1', check: 'decision' }]))).toEqual([
      expect.objectContaining({ path: 'oracle.decisions[0].check' }),
    ]);
  });

  it('refuses a decision declared twice', () => {
    expect(issuesOf(scenarioWith([{ id: 'D1' }, { id: 'D1' }]))).toEqual([
      { path: 'oracle.decisions[1]', message: "repeats the id 'D1' of oracle.decisions[0]" },
    ]);
  });

  it('refuses a revision check the scenario does not have', () => {
    expect(issuesOf(scenarioWith([{ id: 'D1', revised_by: 'missing' }]))).toEqual([
      {
        path: 'oracle.decisions[0].revised_by',
        message: "names no check of oracle.checks: 'missing'",
      },
    ]);
  });

  it('refuses a revision check that is not a content check: only content records a revision', () => {
    const root = scenarioWith([{ id: 'D1', revised_by: 'kept' }], {
      'oracle/checks/kept.yaml': 'kind: dependencies\nsteps: [1]\n',
    });
    expect(issuesOf(root)).toEqual([
      {
        path: 'oracle.decisions[0].revised_by',
        message: "names the dependencies check 'kept': a revision is recorded by a content check",
      },
    ]);
  });
});
