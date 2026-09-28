import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { executionRuns, readStoredRun } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A run.json at `<execution>/runs/<ref>/<arm>/<model>/r<k>/`, returning the run's directory. */
function run(execution: string, where: string, record: unknown): string {
  const dir = join(execution, 'runs', where);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'run.json'), typeof record === 'string' ? record : JSON.stringify(record));
  return dir;
}

const RECORD = {
  campaign: 'abcdef012345',
  scenario: 'T3',
  version: '1.0',
  scenario_hash: 'sha256:h',
  arm: 'baseline',
  model: 'fake-model',
  repetition: 1,
  outcome: 'completed',
  setup: { duration_ms: 3, commit: 'c'.repeat(40), tree: 't'.repeat(40) },
  steps: [
    { n: 1, outcome: 'completed', tree: '1'.repeat(40) },
    { n: 2, outcome: 'completed', tree: '2'.repeat(40) },
  ],
};

describe('executionRuns (REQ-FMT-06)', () => {
  it("lists every run of an execution that has a run.json, in path order, and nothing else", () => {
    const execution = tempDir('bench-results-');
    run(execution, 'T3@1.0/wingfoil/fake-model/r1', RECORD);
    run(execution, 'T3@1.0/baseline/fake-model/r2', RECORD);
    run(execution, 'T3@1.0/baseline/fake-model/r1', RECORD);
    mkdirSync(join(execution, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r3'), { recursive: true });
    writeFileSync(join(execution, 'campaign.yaml'), 'x');

    expect(executionRuns(execution)).toEqual([
      join(execution, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r1'),
      join(execution, 'runs', 'T3@1.0', 'baseline', 'fake-model', 'r2'),
      join(execution, 'runs', 'T3@1.0', 'wingfoil', 'fake-model', 'r1'),
    ]);
  });

  it('has no run in an execution with no runs/ directory', () => {
    expect(executionRuns(tempDir('bench-results-'))).toEqual([]);
  });
});

describe('readStoredRun (task-027)', () => {
  it('reads what scoring needs from a run.json, whatever else it holds', () => {
    const dir = run(tempDir('bench-results-'), 'T3@1.0/baseline/fake-model/r1', { ...RECORD, extra: 1 });
    expect(readStoredRun(dir)).toEqual({
      ok: true,
      value: {
        scenario: 'T3',
        version: '1.0',
        scenarioHash: 'sha256:h',
        arm: 'baseline',
        model: 'fake-model',
        repetition: 1,
        outcome: 'completed',
        setupTree: 't'.repeat(40),
        steps: [
          { n: 1, tree: '1'.repeat(40) },
          { n: 2, tree: '2'.repeat(40) },
        ],
      },
    });
  });

  it('reads a run stored before trees were recorded, with none', () => {
    const { setup, steps, ...rest } = RECORD;
    const dir = run(tempDir('bench-results-'), 'r', {
      ...rest,
      setup: { duration_ms: setup.duration_ms },
      steps: steps.map(({ n, outcome }) => ({ n, outcome })),
    });
    const result = readStoredRun(dir);
    expect(result.ok && result.value).toMatchObject({ steps: [{ n: 1 }, { n: 2 }] });
    expect(result.ok && result.value.setupTree).toBeUndefined();
    expect(result.ok && result.value.steps[0]?.tree).toBeUndefined();
  });

  it('names run.json when it cannot be read or does not say what scoring needs', () => {
    const root = tempDir('bench-results-');
    expect(readStoredRun(run(root, 'a', '{not json'))).toEqual({
      ok: false,
      issues: [{ path: 'run.json', message: expect.stringMatching(/^is not JSON/) }],
    });
    const missing: Partial<typeof RECORD> = { ...RECORD };
    delete missing.scenario_hash;
    expect(readStoredRun(run(root, 'b', missing))).toEqual({
      ok: false,
      issues: [{ path: 'run.json.scenario_hash', message: 'is required' }],
    });
  });
});
