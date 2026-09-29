import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Scenario } from '../../../src/core/index.js';
import { loadScenario } from '../../../src/scenario/index.js';
import { astInContainer, runSuite, scoreChecks } from '../../../src/scoring/index.js';
import type { SuiteReport } from '../../../src/scoring/index.js';
import { localScoringDocker } from '../../support/local-scoring.js';
import { repoPath } from '../../support/paths.js';
import { referenceRun, referenceSnapshot } from '../../support/reference.js';
import { tempDir } from '../../support/scenario-fixture.js';

const REFERENCE = repoPath('test/fixtures/reference/S8');

/** The hold-out: BENCH_HOLDOUT_PATH, else the checkout beside this repository; its tests skip without one. */
const HOLDOUT = process.env.BENCH_HOLDOUT_PATH || repoPath('../WingFoil2-Benchmark-HoldOut');
const HAS_HOLDOUT = existsSync(join(HOLDOUT, 'scenarios', 'S8', '1.0'));

/** The AST checks' runner on this machine: the scoring image's script, with the devDependency TypeScript. */
const AST = astInContainer({ docker: localScoringDocker(), image: 'local', containerPrefix: 's8' });

/** S8@1.0 as the repository holds it (F6.8). */
function s8(): Scenario {
  const loaded = loadScenario(repoPath('scenarios'), 'S8', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.value;
}

/** One suite of S8 on `snapshot` — its hold-out additions instead, when `holdout` — run for real. */
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
    container: `s8-${id}`,
    scenario,
    suite,
    snapshotDir: snapshot,
    ...(holdout ? { holdoutDir: join(HOLDOUT, 'scenarios', 'S8', '1.0', id), confidential: true } : {}),
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

/** The suites scored after each step (the design's table). */
const AT_STEP: Record<number, string[]> = {
  1: ['core', 'ids'],
  2: ['core', 'ids', 'timestamps'],
  3: ['core', 'ids', 'timestamps', 'validation'],
  4: ['core', 'ids', 'timestamps', 'validation', 'bulk-import'],
};

/** Each check's violations at each step, by check id. */
async function violations(
  scenario: Scenario,
  run: { runDir: string; snapshots: ReadonlyMap<number, string> },
): Promise<Record<string, (number | undefined)[]>> {
  const result = await scoreChecks({ checks: scenario.oracle.checks, ...run, ast: AST });
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return Object.fromEntries(
    result.value.map((check) => [
      check.id,
      check.steps.map((step) => ('violations' in step ? step.violations : undefined)),
    ]),
  );
}

/** Writes `files` into `workspace`, at their paths. */
function write(workspace: string, files: Readonly<Record<string, string>>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(workspace, path)), { recursive: true });
    writeFileSync(join(workspace, path), content);
  }
}

// The hidden tests and the AST really run, one Node process per suite and snapshot: seconds.
describe('S8@1.0 (F6.8)', { timeout: 240_000 }, () => {
  let scenario: Scenario;
  beforeAll(() => {
    scenario = s8();
  });

  it("declares S8.md's card: E and C, its questions, directive delivery, a hold-out, four steps", () => {
    expect(scenario.categories).toEqual({ primary: 'E', secondary: ['C'] });
    expect(scenario.profiles).toEqual(['tech-lead', 'code-reviewer', 'architect']);
    expect(scenario.gqm).toEqual(['Q-E1', 'Q-C1']);
    expect(scenario.capabilities).toEqual(['directive-delivery']);
    expect(scenario.holdout).toBe(true);
    expect(scenario.steps.map((step) => step.n)).toEqual([1, 2, 3, 4]);
    expect(Object.keys(scenario.armDirs)).toEqual(['wingfoil']);
  });

  it('declares R1–R4 as four checks on every step (S8.md §4, REQ-SCO-05)', () => {
    expect(scenario.oracle.checks.map((check) => [check.id, check.kind, check.steps])).toEqual([
      ['r1-no-new-dependency', 'dependencies', [1, 2, 3, 4]],
      ['r2-tsdoc-on-exports', 'ast', [1, 2, 3, 4]],
      ['r3-no-clock-or-randomness', 'ast', [1, 2, 3, 4]],
      ['r4-no-throw', 'ast', [1, 2, 3, 4]],
    ]);
  });

  it("binds each feature from its step on, and the seed's own behaviour to every step", () => {
    for (const [n, ids] of Object.entries(AT_STEP)) {
      expect(
        scenario.oracle.suites.filter((suite) => suite.afterSteps.includes(Number(n))).map((s) => s.id),
      ).toEqual(ids);
    }
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

  it('breaks no rule on the seed, nor at any step of the reference (M-E1)', async () => {
    const seed = await violations(scenario, {
      runDir: tempDir('bench-s8-'),
      snapshots: new Map([[1, scenario.seedDir]]),
    });
    expect(seed).toEqual({
      'r1-no-new-dependency': [0, undefined, undefined, undefined],
      'r2-tsdoc-on-exports': [0, undefined, undefined, undefined],
      'r3-no-clock-or-randomness': [0, undefined, undefined, undefined],
      'r4-no-throw': [0, undefined, undefined, undefined],
    });
    expect(await violations(scenario, await referenceRun(scenario.seedDir, REFERENCE))).toEqual({
      'r1-no-new-dependency': [0, 0, 0, 0],
      'r2-tsdoc-on-exports': [0, 0, 0, 0],
      'r3-no-clock-or-randomness': [0, 0, 0, 0],
      'r4-no-throw': [0, 0, 0, 0],
    });
  });

  it('counts the violations of the easy path at the step S8.md §6 names, the hidden tests still passing', async () => {
    // The reference, with each step's easy path added beside it: R1 and R3 at step 1, R3 at 2, R4 at 3,
    // R2 and R4 at 4. Nothing calls the added code, so M-Q1 does not move while M-E1 does.
    const easy: Record<number, Record<string, string>> = {
      1: {
        'package.json': `${JSON.stringify({ ...readJson(join(scenario.seedDir, 'package.json')), dependencies: { uuid: '9.0.1' } }, undefined, 2)}\n`,
        'src/domain/new-id.ts':
          '/** A fresh id. */\nexport function newId(): string {\n  return crypto.randomUUID();\n}\n',
      },
      2: {
        'src/domain/stamp.ts':
          '/** The time now. */\nexport function stamp(): number {\n  return Date.now();\n}\n',
      },
      3: {
        'src/domain/guard.ts':
          "/** Refuses a blank text. */\nexport function guard(text: string): string {\n  if (text.trim() === '') throw new Error('blank');\n  return text;\n}\n",
      },
      4: {
        'src/domain/bulk.ts':
          "export function bulk(lines: string[]): string[] {\n  if (lines.length === 0) throw new Error('empty');\n  return lines;\n}\n",
      },
    };
    const run = await referenceRun(scenario.seedDir, REFERENCE, (n, workspace) =>
      write(workspace, easy[n] ?? {}),
    );
    expect(await violations(scenario, run)).toEqual({
      'r1-no-new-dependency': [1, 1, 1, 1],
      'r2-tsdoc-on-exports': [0, 0, 0, 1],
      'r3-no-clock-or-randomness': [1, 2, 2, 2],
      'r4-no-throw': [0, 0, 1, 2],
    });
    const last = run.snapshots.get(4) as string;
    for (const id of AT_STEP[4] ?? []) {
      expect({ suite: id, ...counts(await score(scenario, id, last)) }).toMatchObject({
        suite: id,
        fail: 0,
        files: 0,
      });
    }
  });

  it.skipIf(!HAS_HOLDOUT)(
    "passes the hold-out's additions after the last step, and fails them on the seed",
    async () => {
      const done = referenceSnapshot(scenario.seedDir, REFERENCE, 4);
      const seed = referenceSnapshot(scenario.seedDir, REFERENCE, 0);
      for (const suite of scenario.oracle.suites) {
        if (!existsSync(join(HOLDOUT, 'scenarios', 'S8', '1.0', suite.id))) continue;
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

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}
