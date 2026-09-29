import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Scenario } from '../../../src/core/index.js';
import { loadScenario } from '../../../src/scenario/index.js';
import { runSuite, scoreChecks } from '../../../src/scoring/index.js';
import type { SuiteReport } from '../../../src/scoring/index.js';
import { localScoringDocker } from '../../support/local-scoring.js';
import { repoPath } from '../../support/paths.js';
import { referenceRun, referenceSnapshot } from '../../support/reference.js';

/**
 * The hold-out, where S2's answer key and reference fixes are (W7 decision 5): BENCH_HOLDOUT_PATH, else
 * the checkout beside this repository. Without one, the tests that need the reference are skipped.
 */
const HOLDOUT = process.env.BENCH_HOLDOUT_PATH || repoPath('../WingFoil2-Benchmark-HoldOut');
const REFERENCE = join(HOLDOUT, 'reference', 'S2');
const HAS_REFERENCE = existsSync(REFERENCE);

function s2(): Scenario {
  const loaded = loadScenario(repoPath('scenarios'), 'S2', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.value;
}

/** One suite of S2 on `snapshot` — its hold-out additions instead, when `holdout` — run for real. */
async function score(
  scenario: Scenario,
  id: string,
  snapshot: string,
  holdout = false,
): Promise<SuiteReport> {
  const suite = scenario.oracle.suites.find((candidate) => candidate.id === id);
  if (suite === undefined) throw new Error(`no suite ${id}`);
  const report = await runSuite({
    docker: localScoringDocker(),
    image: 'local',
    container: `s2-${id}`,
    scenario,
    suite,
    snapshotDir: snapshot,
    ...(holdout ? { holdoutDir: join(HOLDOUT, 'scenarios', 'S2', '1.0', id), confidential: true } : {}),
  });
  if (!report.ok) throw new Error(JSON.stringify(report.issues));
  return report.value;
}

/** Passing and failing tests by kind — the first name of their path — with files that failed whole. */
function byKind(report: SuiteReport): Record<string, string> {
  const kinds: Record<string, { pass: number; fail: number }> = {};
  for (const test of report.tests) {
    const kind = (kinds[test.path[0] ?? ''] ??= { pass: 0, fail: 0 });
    if (test.status === 'pass') kind.pass += 1;
    else kind.fail += 1;
  }
  return Object.fromEntries([
    ...Object.entries(kinds).map(([kind, { pass, fail }]) => [kind, `${pass} pass, ${fail} fail`]),
    ...(report.failedFiles.length > 0 ? [['files', report.failedFiles.join(', ')]] : []),
  ]);
}

/** The seed's own visible suite, run as `npm test` runs it, in `dir`. */
function visibleSuite(dir: string): { code: number | null; output: string } {
  const result = spawnSync(process.execPath, ['--test', 'test/*.test.ts'], { cwd: dir, encoding: 'utf8' });
  return { code: result.status, output: result.stdout };
}

// The hidden tests really run, one Node process per suite and snapshot: seconds, not milliseconds.
describe('S2@1.0 (F6.2)', { timeout: 120_000 }, () => {
  let scenario: Scenario;
  beforeAll(() => {
    scenario = s2();
  });

  it("declares S2.md's card: D and F, its questions, no capability, a hold-out, and its two checks", () => {
    expect(scenario.categories).toEqual({ primary: 'D', secondary: ['F'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'code-reviewer', 'team-developer']);
    expect(scenario.gqm).toEqual(['Q-D1', 'Q-D2', 'Q-D3', 'Q-F1']);
    expect(scenario.capabilities).toEqual([]);
    expect(scenario.holdout).toBe(true);
    expect(scenario.oracle.checks.map(({ id, kind, steps }) => [id, kind, steps])).toEqual([
      ['duplicate', 'content', [3]],
      ['false-report', 'unchanged', [2, 3]],
    ]);
    expect(scenario.oracle.thirdParty).toEqual([]);
    expect(scenario.steps.map((step) => step.n)).toEqual([1, 2, 3]);
  });

  it("binds each report's suite from its step on, and the rules to every step", () => {
    expect(scenario.oracle.suites.map(({ id, afterSteps }) => [id, afterSteps])).toEqual([
      ['regression', [1, 2, 3]],
      ['reports-1', [1, 2, 3]],
      ['reports-2', [2, 3]],
      ['false-report', [2, 3]],
      ['reports-3', [3]],
    ]);
  });

  it('has a seed whose visible suite passes with no install, on Node alone', () => {
    const { code, output } = visibleSuite(scenario.seedDir);
    expect(code).toBe(0);
    expect(output).toMatch(/# pass 14\n# fail 0\n/);
  });

  it('on the seed: every rule and the false report hold, every reported symptom shows', async () => {
    const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
    const results = Object.fromEntries(
      await Promise.all(
        scenario.oracle.suites.map(async (suite) => [
          suite.id,
          byKind(await score(scenario, suite.id, seed)),
        ]),
      ),
    );
    expect(results).toEqual({
      regression: { rule: '16 pass, 0 fail' },
      'reports-1': { defect: '0 pass, 3 fail' },
      'reports-2': { defect: '0 pass, 2 fail' },
      'false-report': { 'false report': '1 pass, 0 fail' },
      'reports-3': { defect: '0 pass, 1 fail', duplicate: '0 pass, 1 fail' },
    });
  });

  describe.skipIf(!HAS_REFERENCE)('with the reference fixes of the hold-out (decision 5)', () => {
    it('turns each report green at its step and keeps every earlier one green', async () => {
      const expected: Record<number, Record<string, Record<string, string>>> = {
        1: { regression: { rule: '16 pass, 0 fail' }, 'reports-1': { defect: '3 pass, 0 fail' } },
        2: {
          regression: { rule: '16 pass, 0 fail' },
          'reports-1': { defect: '3 pass, 0 fail' },
          'reports-2': { defect: '2 pass, 0 fail' },
          'false-report': { 'false report': '1 pass, 0 fail' },
        },
        3: {
          regression: { rule: '16 pass, 0 fail' },
          'reports-1': { defect: '3 pass, 0 fail' },
          'reports-2': { defect: '2 pass, 0 fail' },
          'false-report': { 'false report': '1 pass, 0 fail' },
          'reports-3': { defect: '1 pass, 0 fail', duplicate: '1 pass, 0 fail' },
        },
      };
      for (const step of [1, 2, 3]) {
        const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, step);
        const suites = scenario.oracle.suites.filter((suite) => suite.afterSteps.includes(step));
        const results = Object.fromEntries(
          await Promise.all(
            suites.map(async (suite) => [suite.id, byKind(await score(scenario, suite.id, snapshot))]),
          ),
        );
        expect(results, `step ${step}`).toEqual(expected[step]);
      }
    });

    // The content checks of S2.md §6 (task-035): the duplicate recognised in step 3's files or commits,
    // and the code behind the false report left as it was.
    async function checksOf(edit?: (n: number, workspace: string) => void) {
      const { runDir, snapshots } = await referenceRun(scenario.seedDir, REFERENCE, edit);
      const result = await scoreChecks({ checks: scenario.oracle.checks, runDir, snapshots });
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      return Object.fromEntries(
        result.value.map((check) => [
          check.id,
          check.steps.map((step) => ('passed' in step ? step.passed : null)),
        ]),
      );
    }

    it('passes both checks on the reference, at every step they apply to', async () => {
      expect(await checksOf()).toEqual({ duplicate: [true], 'false-report': [true, true] });
    });

    it('fails the duplicate check when step 3 records nothing about the duplicate', async () => {
      const silent = await checksOf((n, workspace) => {
        if (n === 3) rmSync(join(workspace, 'NOTES.md'), { force: true });
      });
      expect(silent.duplicate).toEqual([false]);
    });

    it('fails the false-report check when step 2 "fixes" the VAT on shipping', async () => {
      const fixed = await checksOf((n, workspace) => {
        if (n !== 2) return;
        const tax = join(workspace, 'src', 'tax.ts');
        writeFileSync(
          tax,
          readFileSync(tax, 'utf8').replace('return percentOf(shipping, VAT_RATES.standard);', 'return 0;'),
        );
      });
      expect(fixed['false-report']).toEqual([false, false]);
    });

    it("keeps the seed's visible suite green after the last fix", () => {
      expect(visibleSuite(referenceSnapshot(scenario.seedDir, REFERENCE, 3)).code).toBe(0);
    });

    it("passes the hold-out's additions after the last fix, and its defect variants fail on the seed", async () => {
      const fixed = referenceSnapshot(scenario.seedDir, REFERENCE, 3);
      const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
      for (const suite of scenario.oracle.suites) {
        const onFixed = await score(scenario, suite.id, fixed, true);
        expect(onFixed.tests.length, suite.id).toBeGreaterThan(0);
        expect(
          onFixed.tests.every((test) => test.status === 'pass'),
          suite.id,
        ).toBe(true);
        const onSeed = await score(scenario, suite.id, seed, true);
        const failing = onSeed.tests.filter((test) => test.status !== 'pass').length;
        if (suite.id.startsWith('reports-')) expect(failing, suite.id).toBeGreaterThan(0);
        else expect(failing, suite.id).toBe(0);
      }
    });
  });
});
