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

const REFERENCE = repoPath('test/fixtures/reference/S10');

/** The hold-out: BENCH_HOLDOUT_PATH, else the checkout beside this repository; its tests skip without one. */
const HOLDOUT = process.env.BENCH_HOLDOUT_PATH || repoPath('../WingFoil2-Benchmark-HoldOut');
const HAS_HOLDOUT = existsSync(join(HOLDOUT, 'scenarios', 'S10', '1.0'));

/** S10@1.0 as the repository holds it (F6.13). */
function s10(): Scenario {
  const loaded = loadScenario(repoPath('scenarios'), 'S10', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.value;
}

/** One suite of S10 on `snapshot` — its hold-out additions instead, when `holdout` — run for real. */
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
    container: `s10-${id}`,
    scenario,
    suite,
    snapshotDir: snapshot,
    ...(holdout ? { holdoutDir: join(HOLDOUT, 'scenarios', 'S10', '1.0', id), confidential: true } : {}),
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

/** The suites scored after each step (S10.md §7). */
const AT_STEP: Record<number, string[]> = {
  1: ['core', 'discounts'],
  2: ['core', 'discounts', 'export'],
  3: ['core', 'discounts', 'export', 'export-privacy'],
  4: ['core', 'discounts', 'export', 'export-privacy', 'shipping'],
};

/** Whether each M-E3 check passed at its step, by check id. */
async function recorded(
  scenario: Scenario,
  run: { runDir: string; snapshots: ReadonlyMap<number, string> },
): Promise<Record<string, (boolean | undefined)[]>> {
  const result = await scoreChecks({ checks: scenario.oracle.checks, ...run });
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return Object.fromEntries(
    result.value.map((check) => [
      check.id,
      check.steps.map((step) => ('passed' in step ? step.passed : undefined)),
    ]),
  );
}

const APPROVER = 'Dana Okafor <dana.okafor@lanternlane.example>';

// The hidden tests really run, one Node process per suite and snapshot: seconds.
describe('S10@1.0 (F6.13)', { timeout: 240_000 }, () => {
  let scenario: Scenario;
  beforeAll(() => {
    scenario = s10();
  });

  it("declares S10.md's card: E and C, Q-E2 and Q-E3, a hold-out, four steps, its process in the wingfoil arm", () => {
    expect(scenario.categories).toEqual({ primary: 'E', secondary: ['C'] });
    expect(scenario.profiles).toEqual(['tech-lead', 'code-reviewer', 'architect']);
    expect(scenario.gqm).toEqual(['Q-E2', 'Q-E3', 'Q-C1']);
    expect(scenario.holdout).toBe(true);
    expect(scenario.steps.map((step) => step.n)).toEqual([1, 2, 3, 4]);
    expect(Object.keys(scenario.armDirs)).toEqual(['wingfoil']);
  });

  it('declares M-E3 as one content check per verdict, at its step (S10.md §7)', () => {
    expect(scenario.oracle.checks.map((check) => [check.id, check.kind, check.steps])).toEqual([
      ['m-e3-step-1-approval', 'content', [1]],
      ['m-e3-step-2-rejection', 'content', [2]],
      ['m-e3-step-3-approval', 'content', [3]],
    ]);
  });

  it("binds each feature from its step on, the rejection's reason from the rework's, the seed's behaviour to all", () => {
    for (const [n, ids] of Object.entries(AT_STEP)) {
      expect(
        scenario.oracle.suites.filter((suite) => suite.afterSteps.includes(Number(n))).map((s) => s.id),
      ).toEqual(ids);
    }
  });

  it('names the approver in the process, and states no rule in the seed (K3)', () => {
    const dna = readFileSync(join(scenario.armDirs.wingfoil as string, '.wingfoil', 'dna.yaml'), 'utf8');
    expect(dna).toContain('email: dana.okafor@lanternlane.example');
    expect(dna).toContain('roles: [approver, product-owner]');
    const seed = spawnSync('grep', ['-rilE', 'approv|reject', scenario.seedDir], { encoding: 'utf8' });
    expect(seed.stdout).toBe('');
  });

  it('has a seed whose visible suite passes with no install, on Node alone', () => {
    const result = spawnSync(process.execPath, ['--test', 'test/*.test.ts'], {
      cwd: scenario.seedDir,
      encoding: 'utf8',
    });
    expect(result.status, result.stdout).toBe(0);
  });

  it("passes the seed's own behaviour on the seed, and no test of a step's feature (adr-004 decision 10)", async () => {
    const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
    for (const suite of scenario.oracle.suites) {
      const report = await score(scenario, suite.id, seed);
      expect(report.tests.length).toBeGreaterThan(0);
      const expected = suite.id === 'core' ? { fail: 0, files: 0 } : { pass: 0, files: 0 };
      expect({ suite: suite.id, ...counts(report) }).toMatchObject({ suite: suite.id, ...expected });
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

  it("makes step 2's rejection true: the export as asked breaks the approver's rule (S10.md §6)", async () => {
    const asked = referenceSnapshot(scenario.seedDir, REFERENCE, 2);
    expect(counts(await score(scenario, 'export-privacy', asked))).toMatchObject({ pass: 0, files: 0 });
  });

  it('finds every verdict recorded at its step of the reference (M-E3)', async () => {
    expect(await recorded(scenario, await referenceRun(scenario.seedDir, REFERENCE))).toEqual({
      'm-e3-step-1-approval': [true],
      'm-e3-step-2-rejection': [true],
      'm-e3-step-3-approval': [true],
    });
  });

  it('finds no verdict when nothing is recorded, or when the record does not say who gave it (M-E3)', async () => {
    const unrecorded = await referenceRun(scenario.seedDir, REFERENCE, (_n, workspace) =>
      rmSync(join(workspace, 'REVIEWS.md'), { force: true }),
    );
    const anonymous = await referenceRun(scenario.seedDir, REFERENCE, (_n, workspace) => {
      const file = join(workspace, 'REVIEWS.md');
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll(APPROVER, 'the approver'));
    });
    const none = {
      'm-e3-step-1-approval': [false],
      'm-e3-step-2-rejection': [false],
      'm-e3-step-3-approval': [false],
    };
    expect(await recorded(scenario, unrecorded)).toEqual(none);
    expect(await recorded(scenario, anonymous)).toEqual(none);
  });

  it.skipIf(!HAS_HOLDOUT)(
    "passes the hold-out's additions after the last step, and fails them on the seed",
    async () => {
      const done = referenceSnapshot(scenario.seedDir, REFERENCE, 4);
      const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
      for (const suite of scenario.oracle.suites) {
        if (!existsSync(join(HOLDOUT, 'scenarios', 'S10', '1.0', suite.id))) continue;
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
