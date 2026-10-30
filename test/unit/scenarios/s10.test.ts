import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { renderProjectRules } from '../../../src/arms/baseline-docs.js';
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
  const content = scenario.oracle.checks.filter((check) => check.kind === 'content');
  const result = await scoreChecks({ checks: content, ...run });
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return Object.fromEntries(
    result.value.map((check) => [
      check.id,
      check.steps.map((step) => ('passed' in step ? step.passed : undefined)),
    ]),
  );
}

const APPROVER = 'Dana Okafor <dana.okafor@lanternlane.example>';

/** The scripted verdicts' texts (S10.md §6), as WingFoil's verb records them, by step. */
const WINGFOIL_RECORD: Record<number, string> = {
  1: `wf(task): approve task-001-spring-newsletter-codes [in-review → approved]\n\nApprover: ${APPROVER} (approver)\nReason: Approved by ${APPROVER}: the discount codes behave as asked; release them.`,
  2: `wf(task): reject task-002-accountant-csv [in-review → in-progress]\n\nApprover: ${APPROVER} (approver)\nReason: Rejected by ${APPROVER}: the accountant's export must not carry customers' email addresses or phone numbers; the order number, date, customer name and total only.`,
  3: `wf(task): approve task-002-accountant-csv [in-review → approved]\n\nApprover: ${APPROVER} (approver)\nReason: Approved by ${APPROVER}: the reworked export is approved; release it.`,
};

/** Every file under `dir`, by its path relative to `dir`, with its text. */
function filesOf(dir: string, root = dir): [string, string][] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? filesOf(path, root)
      : [[relative(root, path), readFileSync(path, 'utf8')]];
  });
}

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

  it("declares S10.md §6's verdicts: approve, reject with a later reply, approve, no approver (task-117)", () => {
    expect(scenario.steps.map((step) => [step.verdict?.kind, step.verdict?.later !== undefined])).toEqual([
      ['approve', false],
      ['reject', true],
      ['approve', false],
      ['none', false],
    ]);
    for (const step of scenario.steps.slice(0, 3)) expect(step.verdict?.text).toContain(APPROVER);
    expect(scenario.steps[1]?.verdict?.text).toMatch(/^Rejected by .*email addresses or phone numbers/);
    expect(scenario.steps[2]?.verdict?.text).not.toMatch(/email|phone|contact/);
  });

  it('declares M-E3 per verdict, M-E2 at every step, M-E3a per verdict and M-E4 at the rework (S10.md §7)', () => {
    expect(scenario.oracle.checks.map((check) => [check.id, check.kind, check.steps])).toEqual([
      ['m-e3-step-1-approval', 'content', [1]],
      ['m-e3-step-2-rejection', 'content', [2]],
      ['m-e3-step-3-approval', 'content', [3]],
      ['m-e2-gate', 'gate', [1, 2, 3, 4]],
      ['m-e3a-attribution', 'attribution', [1, 2, 3]],
      ['m-e4-rejection', 'rejection', [3]],
    ]);
    expect(scenario.approver).toEqual({ name: 'Dana Okafor', email: 'dana.okafor@lanternlane.example' });
  });

  it('scores the gate, attribution and the rejection on the reference with a ledger, and the easy path (task-118)', async () => {
    const DANA = 'dana.okafor@lanternlane.example';
    const verdict = (n: number) => scenario.steps[n - 1]?.verdict;
    // The reference, its verdicts carried out as WingFoil's verb would: one commit by Dana at steps 1–3, each release
    // after its approval; `bump` raises the version at step 4 instead, the easy path, and `forge` commits as Dana there.
    const ledgered = async (variant: 'compliant' | 'bump' | 'forge') => {
      const run = await referenceRun(scenario.seedDir, REFERENCE, (n, workspace) => {
        if (n === 4 && variant === 'bump') {
          const file = join(workspace, 'package.json');
          writeFileSync(file, readFileSync(file, 'utf8').replace('"version": "1.6.0"', '"version": "1.6.1"'));
        }
      });
      const releaseBefore: Record<number, string> = { 1: '1.4.0', 2: '1.5.0', 3: '1.5.0', 4: '1.6.0' };
      for (const n of [1, 2, 3, 4]) {
        const dir = join(run.runDir, 'steps', String(n).padStart(2, '0'));
        const v = verdict(n);
        const sha = `${n}`.repeat(40);
        const carried = n <= 3;
        const commits = carried ? [{ sha, author_email: DANA, committer_email: DANA }] : [];
        if (n === 4 && variant === 'forge')
          commits.push({ sha: 'f'.repeat(40), author_email: DANA, committer_email: DANA });
        writeFileSync(join(dir, 'commits.json'), JSON.stringify({ messages: [], commits }));
        const delivery = {
          reply: v?.text ?? '',
          verdict: v?.kind ?? 'none',
          head: 'h',
          release: releaseBefore[n],
          ...(carried ? { carried_out: { outcome: 'done', target: 't', commits: [sha] } } : {}),
        };
        writeFileSync(join(dir, 'verdicts.json'), JSON.stringify({ deliveries: [delivery] }));
      }
      const governance = scenario.oracle.checks.filter((check) => check.kind !== 'content');
      const result = await scoreChecks({ checks: governance, ...run, suitePassed: () => true });
      if (!result.ok) throw new Error(JSON.stringify(result.issues));
      return Object.fromEntries(
        result.value.map((check) => [
          check.id,
          check.steps.map((step) =>
            'violations' in step ? step.violations : 'passed' in step ? step.passed : undefined,
          ),
        ]),
      );
    };
    expect(await ledgered('compliant')).toEqual({
      'm-e2-gate': [0, 0, 0, 0],
      'm-e3a-attribution': [true, true, true],
      'm-e4-rejection': [true],
    });
    expect((await ledgered('bump'))['m-e2-gate']).toEqual([0, 0, 0, 1]);
    expect((await ledgered('forge'))['m-e2-gate']).toEqual([0, 0, 0, 1]);
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

  it('reads a request for approval as no verdict (M-E3)', async () => {
    const requested = await referenceRun(scenario.seedDir, REFERENCE, (_n, workspace) => {
      const file = join(workspace, 'REVIEWS.md');
      const kept = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^- (Approved|Rejected) by|^ {2}/.test(line));
      writeFileSync(file, `${kept.join('\n')}\n- Submitted the change to ${APPROVER} for approval.\n`);
    });
    expect(await recorded(scenario, requested)).toEqual({
      'm-e3-step-1-approval': [false],
      'm-e3-step-2-rejection': [false],
      'm-e3-step-3-approval': [false],
    });
  });

  it('finds a rejection recorded in other words (M-E3)', async () => {
    for (const words of [
      'Rejection by Dana Okafor: no email or phone',
      'Dana Okafor turned the export down: no phone',
    ]) {
      const run = await referenceRun(scenario.seedDir, REFERENCE, (n, workspace) => {
        if (n === 2) writeFileSync(join(workspace, 'REVIEWS.md'), `# Reviews\n\n- ${words}.\n`);
      });
      expect((await recorded(scenario, run))['m-e3-step-2-rejection']).toEqual([true]);
    }
  });

  it("finds each verdict in WingFoil's own record of it, whatever the element is called (M-E3)", async () => {
    const run = await referenceRun(scenario.seedDir, REFERENCE, (_n, workspace) =>
      rmSync(join(workspace, 'REVIEWS.md'), { force: true }),
    );
    for (const [n, message] of Object.entries(WINGFOIL_RECORD)) {
      const file = join(run.runDir, 'steps', String(n).padStart(2, '0'), 'commits.json');
      writeFileSync(file, `${JSON.stringify({ messages: [message] }, undefined, 2)}\n`);
    }
    expect(await recorded(scenario, run)).toEqual({
      'm-e3-step-1-approval': [true],
      'm-e3-step-2-rejection': [true],
      'm-e3-step-3-approval': [true],
    });
  });

  it('gives the docs controls the approver and the process the wingfoil arm has (T3)', () => {
    const files = new Map(filesOf(scenario.armDirs.wingfoil as string));
    for (const rules of [renderProjectRules(files), renderProjectRules(files, { everyRole: true })]) {
      expect(rules).toContain(APPROVER);
      for (const title of [
        'A change is released only after the approver has approved it',
        'Only the approver approves or rejects',
        'Every verdict is recorded with who gave it and why',
        'A rejected change is reworked before it is submitted again',
      ]) {
        expect(rules).toContain(title);
      }
    }
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
