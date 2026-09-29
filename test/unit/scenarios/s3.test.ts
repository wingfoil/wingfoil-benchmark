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

const REFERENCE = repoPath('test/fixtures/reference/S3');

/** The hold-out: BENCH_HOLDOUT_PATH, else the checkout beside this repository; its tests skip without one. */
const HOLDOUT = process.env.BENCH_HOLDOUT_PATH || repoPath('../WingFoil2-Benchmark-HoldOut');
const HAS_HOLDOUT = existsSync(join(HOLDOUT, 'scenarios', 'S3', '1.0'));

/** S3@1.0 as the repository holds it (F6.3). */
function s3(): Scenario {
  const loaded = loadScenario(repoPath('scenarios'), 'S3', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.value;
}

/** One suite of S3 on `snapshot` — its hold-out additions instead, when `holdout` — run for real. */
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
    container: `s3-${id}`,
    scenario,
    suite,
    snapshotDir: snapshot,
    ...(holdout ? { holdoutDir: join(HOLDOUT, 'scenarios', 'S3', '1.0', id), confidential: true } : {}),
  });
  if (!report.ok) throw new Error(JSON.stringify(report.issues));
  return report.value;
}

function counts(report: SuiteReport): { pass: number; fail: number; files: number } {
  return {
    pass: report.tests.filter((test) => test.status === 'pass').length,
    fail: report.tests.filter((test) => test.status === 'fail').length,
    files: report.failedFiles.length,
  };
}

/** The suites scored after each step (S3.md §7, the design's table). */
const AT_STEP: Record<number, string[]> = {
  1: ['bookings'],
  2: ['bookings', 'availability'],
  3: ['bookings', 'availability', 'discount'],
  4: ['bookings', 'availability', 'discount', 'hourly'],
  5: ['bookings', 'availability', 'discount', 'hourly', 'cancellation'],
};

// The hidden tests really run, one Node process per suite and snapshot: seconds, not milliseconds.
describe('S3@1.0 (F6.3)', { timeout: 240_000 }, () => {
  let scenario: Scenario;
  beforeAll(() => {
    scenario = s3();
  });

  it("declares S3.md's card: F and C, its questions, no capability, a hold-out, five steps", () => {
    expect(scenario.categories).toEqual({ primary: 'F', secondary: ['C'] });
    expect(scenario.profiles).toEqual(['solo-developer', 'team-developer', 'architect']);
    expect(scenario.gqm).toEqual(['Q-F1', 'Q-F2', 'Q-C1']);
    expect(scenario.capabilities).toEqual([]);
    expect(scenario.holdout).toBe(true);
    expect(scenario.steps.map((step) => step.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('scores each feature from the step that introduces it to the last', () => {
    for (const [n, ids] of Object.entries(AT_STEP)) {
      expect(
        scenario.oracle.suites.filter((suite) => suite.afterSteps.includes(Number(n))).map((s) => s.id),
      ).toEqual(ids);
    }
  });

  it("declares D3's revision as a content check at step 4 (REQ-SCO-06)", () => {
    expect(scenario.oracle.checks.map(({ id, kind, steps }) => [id, kind, steps])).toEqual([
      ['d3-revision', 'content', [4]],
    ]);
  });

  it('passes no test of any suite on the seed, and names each test once (adr-004 decision 10)', async () => {
    const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
    for (const suite of scenario.oracle.suites) {
      const report = await score(scenario, suite.id, seed);
      expect({ suite: suite.id, ...counts(report) }).toMatchObject({ suite: suite.id, pass: 0, files: 0 });
      expect(report.tests.length).toBeGreaterThan(0);
      const names = report.tests.map((test) => [test.file, ...test.path].join(' > '));
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('passes every suite scored at each step of the reference', async () => {
    for (const [n, ids] of Object.entries(AT_STEP)) {
      const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, Number(n));
      for (const id of ids) {
        expect({ step: n, suite: id, ...counts(await score(scenario, id, snapshot)) }).toMatchObject({
          step: n,
          suite: id,
          fail: 0,
          files: 0,
        });
      }
    }
  });

  it('names a test for every decision, D1–D5, at the steps S3.md §5 tests it', async () => {
    const snapshot = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
    const decisions = new Map<string, Set<string>>();
    for (const suite of scenario.oracle.suites) {
      for (const test of (await score(scenario, suite.id, snapshot)).tests) {
        const name = /^(D[1-5]):/.exec(test.path[test.path.length - 1] ?? '')?.[1];
        if (name !== undefined) decisions.set(name, (decisions.get(name) ?? new Set()).add(suite.id));
      }
    }
    // D1, D2 every step (bookings); D3 revised in step 4 (hourly keeps whole days); D4 steps 1, 2, 4;
    // D5 in step 5 only.
    expect(decisions.get('D1')).toContain('bookings');
    expect(decisions.get('D2')).toContain('bookings');
    expect(decisions.get('D3')).toContain('hourly');
    expect([...(decisions.get('D4') ?? [])]).toEqual(
      expect.arrayContaining(['bookings', 'availability', 'hourly']),
    );
    expect([...(decisions.get('D5') ?? [])]).toEqual(['cancellation']);
  });

  it("passes D3's check when step 4 records the revision, and fails a silent step 4", async () => {
    const d3 = async (edit?: (n: number, workspace: string) => void) => {
      const { runDir, snapshots } = await referenceRun(scenario.seedDir, REFERENCE, edit);
      const result = scoreChecks({ checks: scenario.oracle.checks, runDir, snapshots });
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      return result.value[0]?.steps;
    };
    expect(await d3()).toEqual([{ n: 4, passed: true, where: { file: 'DECISIONS.md' } }]);
    const silent = await d3((n, workspace) => {
      if (n !== 4) return;
      // Step 4 as the reference writes it, but with DECISIONS.md left as step 1 wrote it.
      writeFileSync(
        join(workspace, 'DECISIONS.md'),
        readFileSync(join(REFERENCE, '01', 'DECISIONS.md'), 'utf8'),
      );
    });
    expect(silent).toEqual([{ n: 4, passed: false }]);
    const deleted = await d3((n, workspace) => {
      if (n === 4) rmSync(join(workspace, 'DECISIONS.md'));
    });
    expect(deleted).toEqual([{ n: 4, passed: false }]);
  });

  it.skipIf(!HAS_HOLDOUT)(
    "passes the hold-out's additions after the last step, and fails them on the seed",
    async () => {
      const done = referenceSnapshot(scenario.seedDir, REFERENCE, 5);
      const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
      for (const suite of scenario.oracle.suites) {
        if (!existsSync(join(HOLDOUT, 'scenarios', 'S3', '1.0', suite.id))) continue;
        expect({ suite: suite.id, ...counts(await score(scenario, suite.id, done, true)) }).toMatchObject({
          suite: suite.id,
          fail: 0,
          files: 0,
        });
        expect({ suite: suite.id, ...counts(await score(scenario, suite.id, seed, true)) }).toMatchObject({
          suite: suite.id,
          pass: 0,
        });
      }
    },
  );
});
