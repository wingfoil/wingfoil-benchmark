import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Scenario, Suite } from '../../../src/core/index.js';
import { loadScenario } from '../../../src/scenario/index.js';
import { parseReport, runSuite, suiteCommand, suiteTestFiles } from '../../../src/scoring/index.js';
import { reporterLine, scoringDocker, T3_TEST } from '../../support/score-fixture.js';
import { completeScenarioYaml, writeScenario } from '../../support/scenario-fixture.js';

/** The first suite a scenario declares: `first` in the complete fixture. */
function firstSuite(scenario: Scenario): Suite {
  const [suite] = scenario.oracle.suites;
  if (suite === undefined) throw new Error('no suite');
  return suite;
}

describe('parseReport', () => {
  it('reads the test lines and the files that failed as a whole', () => {
    const stdout =
      reporterLine(T3_TEST, 'pass') +
      reporterLine({ file: 'a.test.ts', path: ['x'] }, 'skip') +
      '{"kind":"file","file":"b.test.ts","status":"fail"}\n\n';
    expect(parseReport(stdout)).toEqual({
      ok: true,
      value: {
        tests: [
          { ...T3_TEST, status: 'pass' },
          { file: 'a.test.ts', path: ['x'], status: 'skip' },
        ],
        failedFiles: ['b.test.ts'],
      },
    });
  });

  it('refuses a line the reporter would not write, naming it by number', () => {
    expect(parseReport(`${reporterLine(T3_TEST, 'pass')}not json\n`)).toEqual({
      ok: false,
      issues: [{ path: 'report line 2', message: 'is not a reporter line' }],
    });
    expect(parseReport('{"kind":"test","file":"a","path":[],"status":"maybe"}\n')).toEqual({
      ok: false,
      issues: [{ path: 'report line 1', message: 'is not a reporter line' }],
    });
  });
});

describe('suiteTestFiles and suiteCommand (REQ-SCO-02)', () => {
  it("takes a suite's test files, not its helpers, relative to the scenario version, in order", () => {
    const root = writeScenario(completeScenarioYaml(), [
      'seed/README.md',
      'prompts/01.md',
      'prompts/02.md',
      'oracle/first/b.test.ts',
      'oracle/first/a.test.mts',
      'oracle/first/deep/c.test.js',
      'oracle/first/helpers.ts',
      'oracle/first/data.json',
      'oracle/all/z.test.ts',
      'oracle/checks/decision.yaml',
    ]);
    const scenario = loadScenario(root, 'S9', '1.0');
    if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
    expect(suiteTestFiles(scenario.value, firstSuite(scenario.value))).toEqual([
      'oracle/first/a.test.mts',
      'oracle/first/b.test.ts',
      'oracle/first/deep/c.test.js',
    ]);
  });

  it('runs node:test with tsx, one file at a time, bounded, through the benchmark reporter', () => {
    expect(suiteCommand(['oracle/first/a.test.ts'])).toEqual([
      'timeout',
      '--kill-after=10',
      '900',
      'node',
      '--import',
      '/opt/score/node_modules/tsx/dist/loader.mjs',
      '--test',
      '--test-concurrency=1',
      '--test-timeout=120000',
      '--test-reporter=/opt/score/reporter.mjs',
      'oracle/first/a.test.ts',
    ]);
  });
});

describe('runSuite (REQ-SCO-01)', () => {
  function t3Like() {
    const root = writeScenario(completeScenarioYaml(), [
      'seed/README.md',
      'prompts/01.md',
      'prompts/02.md',
      'oracle/first/a.test.ts',
      'oracle/all/b.test.ts',
      'oracle/checks/decision.yaml',
    ]);
    const scenario = loadScenario(root, 'S9', '1.0');
    if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
    return scenario.value;
  }

  it('copies the snapshot where the seed is, mounts the suite read-only where it is, and runs it there', async () => {
    const scenario = t3Like();
    const { docker, recorded } = scoringDocker(() => ({
      code: 1,
      stdout: reporterLine({ file: 'oracle/first/a.test.ts', path: ['t'] }, 'fail'),
      stderr: '',
    }));
    const snapshot = join(scenario.dir, 'seed');

    const report = await runSuite({
      docker,
      image: 'bench-score:abc',
      container: 'bench-score-x-1',
      scenario,
      suite: firstSuite(scenario),
      snapshotDir: snapshot,
    });

    expect(report).toEqual({
      ok: true,
      value: { tests: [{ file: 'oracle/first/a.test.ts', path: ['t'], status: 'fail' }], failedFiles: [] },
    });
    expect(recorded.creates).toEqual([
      {
        image: 'bench-score:abc',
        name: 'bench-score-x-1',
        user: 'node',
        workdir: '/score',
        readOnly: [{ source: join(scenario.dir, 'oracle/first'), target: '/score/oracle/first' }],
      },
    ]);
    expect(recorded.copies).toEqual([`${snapshot} -> score-1:/score/seed`]);
    expect(recorded.execs[0]?.command.at(-1)).toBe('oracle/first/a.test.ts');
    expect(recorded.removes).toEqual(['score-1']);
  });

  it('takes a timed-out suite as it stands: what did not report fails later, by the census', async () => {
    const scenario = t3Like();
    const { docker } = scoringDocker(() => ({ code: 124, stdout: '', stderr: '' }));
    const report = await runSuite({
      docker,
      image: 'i',
      container: 'c',
      scenario,
      suite: firstSuite(scenario),
      snapshotDir: scenario.seedDir,
    });
    expect(report).toEqual({ ok: true, value: { tests: [], failedFiles: [] } });
  });

  it('reports a suite that could not run at all, and removes its container', async () => {
    const scenario = t3Like();
    const { docker, recorded } = scoringDocker(() => ({
      code: 127,
      stdout: '',
      stderr: 'node: not found\n',
    }));
    const report = await runSuite({
      docker,
      image: 'i',
      container: 'c',
      scenario,
      suite: firstSuite(scenario),
      snapshotDir: scenario.seedDir,
    });
    expect(report).toEqual({
      ok: false,
      issues: [
        { path: 'suite first', message: 'the scoring container exited with code 127: node: not found' },
      ],
    });
    expect(recorded.removes).toEqual(['score-1']);
  });

  it('runs nothing for a suite with no test file', async () => {
    const scenario = t3Like();
    const dir = join(scenario.dir, 'oracle', 'empty');
    mkdirSync(dir);
    writeFileSync(join(dir, 'helpers.ts'), '');
    const { docker, recorded } = scoringDocker();
    const report = await runSuite({
      docker,
      image: 'i',
      container: 'c',
      scenario,
      suite: { id: 'empty', dir, afterSteps: [1] },
      snapshotDir: scenario.seedDir,
    });
    expect(report).toEqual({ ok: true, value: { tests: [], failedFiles: [] } });
    expect(recorded.creates).toEqual([]);
  });
});
