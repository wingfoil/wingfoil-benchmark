import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort } from '../../src/agents/index.js';
import { main } from '../../src/cli/index.js';
import { gitCli, systemProcess } from '../../src/core/index.js';
import { loadScenario } from '../../src/scenario/index.js';
import { scoreChecks } from '../../src/scoring/index.js';
import { localScoringDocker } from '../support/local-scoring.js';
import { repoPath } from '../support/paths.js';
import { referenceFiles, referenceRun } from '../support/reference.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun, usageOf } from '../support/score-fixture.js';
import { tempDir } from '../support/scenario-fixture.js';
import type { Files } from '../support/score-fixture.js';

/** A pairwise Jaccard similarity, as aggregate.json's `m_r` holds it (task-042). */
interface Jaccard {
  mean: number;
  pairs: { runs: string[]; intersection: number; union: number }[];
}
type MR = { n: number; runs: string[]; m_r1?: unknown; m_r2?: Jaccard; m_r3?: Jaccard };

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('scoring runs no agent')),
  resume: () => Promise.reject(new Error('scoring runs no agent')),
};

/** R1–R4 of S8.md §4 as checks (task-037), over T3's `src/` in place of S8's domain directory. */
const DIRECTIVES = {
  'oracle/checks/r1-no-new-dependency.yaml': 'kind: dependencies\nsteps: [1, 2]\n',
  'oracle/checks/r2-tsdoc-on-exports.yaml':
    'kind: ast\nsteps: [1, 2]\ndir: src\nrules: [undocumented-export]\n',
  'oracle/checks/r3-no-clock-or-randomness.yaml':
    'kind: ast\nsteps: [1, 2]\ndir: src\nrules: [wall-clock, randomness]\n',
  'oracle/checks/r4-no-throw.yaml': 'kind: ast\nsteps: [1, 2]\ndir: src\nrules: [throw]\n',
};

/** `bench score` on the fixture's execution, with the local scoring double: hidden tests and AST for real. */
async function benchScoreLocally(root: string) {
  let stdout = '';
  const code = await main(
    ['score', EXECUTION],
    { stdout: (text) => (stdout += text), stderr: (text) => (stdout += text) },
    { docker: localScoringDocker(), git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout };
}

/** `bench score` on the fixture's execution, with Docker replaced by the scoring double. */
async function benchScore(root: string) {
  const { docker, recorded } = scoringDocker();
  let stdout = '';
  const code = await main(
    ['score', EXECUTION],
    { stdout: (text) => (stdout += text), stderr: () => undefined },
    { docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, recorded };
}

/**
 * Two runs of S3 stored from its reference (task-039), in one execution, and scored by `bench score`
 * with the local scoring double, the hidden tests really run: r1 as the reference wrote it, r2 with
 * step 4's record of the D3 revision taken back out (DECISIONS.md as step 1 wrote it), its code the
 * same. Their `score.json` files, r1's then r2's. Scored once for the three @F4.7 scenarios.
 */
let s3Scores: Promise<readonly Record<string, unknown>[]> | undefined;
function scoredS3Runs(): Promise<readonly Record<string, unknown>[]> {
  s3Scores ??= (async () => {
    const reference = repoPath('test/fixtures/reference/S3');
    const steps = referenceFiles(reference);
    const recorded = await storedRun({ scenario: 'S3', steps });
    const [first] = steps;
    const silent = steps.map((files, index) =>
      index === 3 ? { ...files, 'DECISIONS.md': first?.['DECISIONS.md'] ?? null } : files,
    );
    const unrecorded = await storedRun({
      scenario: 'S3',
      steps: silent,
      into: { root: recorded.root, repetition: 2 },
    });
    const { code, stdout } = await benchScoreLocally(recorded.root);
    if (code !== 0) throw new Error(stdout);
    return [recorded.runDir, unrecorded.runDir].map(
      (runDir) => JSON.parse(readFileSync(join(runDir, 'score.json'), 'utf8')) as Record<string, unknown>,
    );
  })();
  return s3Scores;
}

/**
 * An execution of T3 (standing in for S3) in the baseline and wingfoil arms, scored and aggregated by
 * `bench score` (task-040): the baseline's steps cost 0.05 EUR times their number; wingfoil's cost
 * `stepEur` times their number, with a setup of `setupEur` and the steps `wingfoilSteps` wrote. The
 * aggregate's break-even entry for wingfoil.
 */
async function breakEvenOf(options: { stepEur: number; setupEur: number; wingfoilSteps: readonly Files[] }) {
  const base = await storedRun({ steps: [{}, CANCEL] });
  await storedRun({
    steps: options.wingfoilSteps,
    into: { root: base.root, arm: 'wingfoil' },
    setupUsage: { ...usageOf(0), costUsd: 2 * options.setupEur, costEur: options.setupEur },
    record: (n) => ({
      usage: { ...usageOf(n), costUsd: 2 * options.stepEur * n, costEur: options.stepEur * n },
    }),
  });
  const { code, stdout } = await benchScore(base.root);
  if (code !== 0) throw new Error(stdout);
  const aggregate = JSON.parse(readFileSync(join(base.executionDir, 'aggregate.json'), 'utf8')) as {
    break_even: { arm: string; value: unknown }[];
  };
  return aggregate.break_even.find((entry) => entry.arm === 'wingfoil');
}

/**
 * Three repetitions of S1 in the wingfoil arm, stored from its reference (task-042), and one run of S2
 * in the same arm, in one execution scored and aggregated by `bench score` with the local scoring
 * double: r1 as the reference wrote it; r2 with step 4's merge patch keeping `null` members, behind a
 * parameter of its own, so that some hidden tests fail and one export changes; r3 with a notes file and
 * a lockfile beside the reference's code. The aggregate, the output, and r1's and r2's `score.json`.
 */
const KEEPS_NULLS =
  '/** JSON Merge Patch (RFC 7386), keeping explicit nulls unless told otherwise. */\n\n' +
  'function isObject(value: unknown): value is Record<string, unknown> {\n' +
  "  return value !== null && typeof value === 'object' && !Array.isArray(value);\n}\n\n" +
  '/** `target` merged with `patch`. */\n' +
  'export function applyMergePatch(target: unknown, patch: unknown, keepNulls = true): unknown {\n' +
  '  if (!isObject(patch)) return structuredClone(patch);\n' +
  '  const result: Record<string, unknown> = isObject(target) ? { ...target } : {};\n' +
  '  for (const [key, value] of Object.entries(patch)) {\n' +
  '    if (value === null && !keepNulls) Reflect.deleteProperty(result, key);\n' +
  '    else result[key] = value === null ? null : applyMergePatch(result[key], value, keepNulls);\n' +
  '  }\n  return result;\n}\n';
let s1Repetitions:
  | Promise<{ aggregate: Record<string, unknown>; stdout: string; scores: Record<string, unknown>[] }>
  | undefined;
function scoredS1Repetitions() {
  s1Repetitions ??= (async () => {
    const steps = referenceFiles(repoPath('test/fixtures/reference/S1'));
    const withStep4 = (files: Files) =>
      steps.map((step, index) => (index === 3 ? { ...step, ...files } : step));
    const root = tempDir('bench-score-repo-');
    const at = (repetition: number) => ({ root, arm: 'wingfoil', repetition });
    const r1 = await storedRun({ scenario: 'S1', steps, into: at(1) });
    const r2 = await storedRun({
      scenario: 'S1',
      steps: withStep4({ 'src/merge-patch.ts': KEEPS_NULLS }),
      into: at(2),
    });
    await storedRun({
      scenario: 'S1',
      steps: withStep4({ 'NOTES.md': 'Merge patch done.\n', 'package-lock.json': '{}\n' }),
      into: at(3),
    });
    await storedRun({ scenario: 'S2', steps: [{}, {}, {}], into: { root, arm: 'wingfoil' } });
    const { code, stdout } = await benchScoreLocally(root);
    if (code !== 0) throw new Error(stdout);
    const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    return {
      aggregate: read(join(r1.executionDir, 'aggregate.json')),
      stdout,
      scores: [r1.runDir, r2.runDir].map((runDir) => read(join(runDir, 'score.json'))),
    };
  })();
  return s1Repetitions;
}

// T3 stands in for S1 until W7: two steps, one suite scored after both. Its one hidden test fails on
// the seed and after step 1 (which changed nothing), and passes after step 2 (which cancels orders).
describe('scoring.feature', { timeout: 120_000 }, () => {
  it('@F4.1 Hidden tests run outside the container on each snapshot', async () => {
    // Given a completed run with one committed snapshot per step
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    // When the run is scored
    const { code, recorded } = await benchScore(fixture.root);

    // Then the scenario's hidden tests are executed in a scoring environment separate from the run
    // container: every container is a scoring one — no network, the suite mounted read-only, the
    // snapshot copied in — from the scoring image; the double refuses any run-container call.
    expect(code).toBe(0);
    expect(recorded.creates.length).toBeGreaterThan(0);
    for (const create of recorded.creates) {
      expect(create.image).toMatch(/^bench-score:/);
      // M-Q2's container (task-041) and M-R2's (task-042) read the snapshot alone: no oracle is mounted.
      expect(create.readOnly).toEqual(
        create.name.endsWith('-quality') || create.name.endsWith('-interface')
          ? []
          : [{ source: join(fixture.scenario.dir, 'oracle', 'public'), target: '/score/oracle/public' }],
      );
    }
    // Each snapshot where the suites import it from; M-Q2's copy of the final one where its script reads it.
    expect(
      recorded.copies.every((copy) => copy.endsWith(':/score/seed') || copy.endsWith(':/score/snapshot')),
    ).toBe(true);
    expect(recorded.removes).toHaveLength(recorded.creates.length);

    // And M-Q1 is recorded for the final snapshot and for every step that defines tests
    const score = JSON.parse(readFileSync(join(fixture.runDir, 'score.json'), 'utf8')) as {
      steps: { n: number; m_q1: { passed: number; total: number } }[];
      final: { step: number; m_q1: { passed: number; total: number } };
    };
    expect(score.steps.map((step) => [step.n, step.m_q1])).toEqual([
      [1, { passed: 0, total: 1 }],
      [2, { passed: 1, total: 1 }],
    ]);
    expect(score.final).toMatchObject({ step: 2, m_q1: { passed: 1, total: 1 } });
  });

  it('@F4.1 Scoring the same snapshot twice gives the same result', async () => {
    // Given a run that was already scored
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    await benchScore(fixture.root);
    const first = readFileSync(join(fixture.runDir, 'score.json'));

    // When it is scored again with the same oracle version
    const again = await benchScore(fixture.root);

    // Then every recorded metric is identical
    expect(again.code).toBe(0);
    expect(readFileSync(join(fixture.runDir, 'score.json'))).toEqual(first);
  });

  it('@F4.3 Cost metrics are recorded per step and per run', async () => {
    // Given a completed run with one committed snapshot per step — step 2 answered once by the approver
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    // When the run is scored
    await benchScore(fixture.root);

    // Then M-K1 and M-K2 are recorded per step and summed per run: tokens by kind, API-equivalent cost
    // in euro, wall time, turns and interventions
    const { cost } = JSON.parse(readFileSync(join(fixture.runDir, 'score.json'), 'utf8')) as {
      cost: { steps: Record<string, unknown>[]; run: Record<string, unknown> };
    };
    expect(
      cost.steps.map((step) => [step.n, step.cost_eur, step.wall_time_ms, step.turns, step.interventions]),
    ).toEqual([
      [1, 0.05, 1000, 3, 0],
      [2, 0.1, 2000, 6, 1],
    ]);
    expect(cost.steps[1]?.tokens).toEqual({
      input: 20,
      output: 200,
      cache_creation: 2000,
      cache_read: 20000,
    });
    expect(cost.run).toEqual({
      tokens: { input: 30, output: 300, cache_creation: 3000, cache_read: 30000 },
      cost_usd: 0.3,
      cost_eur: 0.15,
      cost_reported: true,
      wall_time_ms: 3000,
      turns: 9,
      interventions: 1,
    });
  });

  it('@F4.8 Directive violations are counted per rule and per step', async () => {
    // A run of T3 standing in for S8 until task-038: its four directives as checks (REQ-SCO-05), with
    // steps that break each of them — a dependency and randomness in step 1, the wall clock and a throw
    // in step 2 — and T3's seed, whose `ship` has no TSDoc, already breaking R2.
    const fixture = await storedRun({
      checks: DIRECTIVES,
      steps: [
        {
          'package.json': '{ "name": "t3", "dependencies": { "uuid": "9.0.1" } }\n',
          'src/ids.ts':
            '/** A new id. */\nexport function newId(): string {\n  return String(Math.random());\n}\n',
        },
        {
          ...CANCEL,
          'src/clock.ts': '/** Now. */\nexport function now(): number {\n  return Date.now();\n}\n',
          'src/guard.ts': "/** Refuses. */\nexport function refuse(): never {\n  throw new Error('no');\n}\n",
        },
      ],
    });

    // When a run of S8 is scored
    const { code } = await benchScoreLocally(fixture.root);

    // Then M-E1 records the violations of R1, R2, R3 and R4 for each step snapshot
    expect(code).toBe(0);
    const { checks } = JSON.parse(readFileSync(join(fixture.runDir, 'score.json'), 'utf8')) as {
      checks: { id: string; steps: { n: number; violations: number }[] }[];
    };
    expect(checks.map((check) => [check.id, check.steps.map((step) => [step.n, step.violations])])).toEqual([
      [
        'r1-no-new-dependency',
        [
          [1, 1],
          [2, 1],
        ],
      ],
      [
        'r2-tsdoc-on-exports',
        [
          [1, 1],
          [2, 1],
        ],
      ],
      [
        'r3-no-clock-or-randomness',
        [
          [1, 1],
          [2, 2],
        ],
      ],
      [
        'r4-no-throw',
        [
          [1, 0],
          [2, 1],
        ],
      ],
    ]);
  });

  it('@F4.2 Static quality is reported per indicator', async () => {
    // Given a run of S8, its reference — a seed with tests, which the reference extends — stored as the
    // runner stores one
    const reference = repoPath('test/fixtures/reference/S8');
    const run = await storedRun({ scenario: 'S8', steps: referenceFiles(reference) });

    // When the run is scored — the image's quality.mjs run with the same pinned tools on this machine
    const { code, stdout } = await benchScoreLocally(run.root);
    expect(code, stdout).toBe(0);
    const score = JSON.parse(readFileSync(join(run.runDir, 'score.json'), 'utf8')) as {
      m_q2: Record<string, unknown>;
      scorer: Record<string, string>;
    };

    // Then M-Q2 records, for the files changed by the run: lint findings per 1,000 lines, mean and
    // maximum cyclomatic complexity, duplicated-line percentage, and test coverage — as the integers
    // each is a ratio of
    const m = score.m_q2 as {
      measured: string[];
      coverage_targets: string[];
      lint: { findings: number; lines: number };
      complexity: { functions: number; sum: number; max: number };
      duplication: { duplicated_lines: number; lines: number };
      coverage: { covered: number; total: number; tests: string };
    };
    expect(m.measured).toContain('test/list.test.ts');
    expect(m.measured).toContain('src/domain/import.ts');
    expect(m.coverage_targets).not.toContain('test/list.test.ts');
    expect(m.lint.lines).toBeGreaterThan(0);
    expect(m.complexity.functions).toBeGreaterThan(0);
    expect(m.complexity.max).toBeGreaterThanOrEqual(1);
    expect(m.duplication.lines).toBe(m.lint.lines);
    expect(m.coverage).toMatchObject({ tests: 'passed' });
    expect(m.coverage.covered).toBeGreaterThan(0);
    expect(m.coverage.covered).toBeLessThanOrEqual(m.coverage.total);

    // And no composite score is produced
    expect(Object.keys(m)).toEqual([
      'measured',
      'coverage_targets',
      'lint',
      'complexity',
      'duplication',
      'coverage',
    ]);
    expect(Object.keys(score.scorer)).toEqual(
      expect.arrayContaining(['eslint', 'typescript_eslint', 'jscpd', 'c8']),
    );
  }, 600_000);

  it('@F4.4 Break-even is computed only when quality is not worse', async () => {
    // Given the wingfoil arm's M-Q1 is not lower than the baseline's on S3 — both cancel orders at step 2
    // And the wingfoil arm's mean step cost is lower than the baseline's — 0.0375 EUR against 0.075
    // When break-even is computed for S3 — a setup of 0.3 EUR, synthetic: no v0.1 setup costs anything
    const entry = await breakEvenOf({ stepEur: 0.025, setupEur: 0.3, wingfoilSteps: [{}, CANCEL] });

    // Then M-K4 equals the wingfoil setup cost divided by the difference in mean step cost
    expect(entry).toMatchObject({
      value: 8,
      setup_cost_eur: { arm: 0.3 },
      mean_step_cost_eur: { baseline: 0.075, arm: 0.0375 },
      final_m_q1: { baseline: 1, arm: 1 },
    });
  });

  it('@F4.4 Break-even special cases', async () => {
    // | quality        | step cost      | result         |
    // | lower than     | lower than     | not applicable |  wingfoil never cancels an order
    const lower = await breakEvenOf({ stepEur: 0.025, setupEur: 0.3, wingfoilSteps: [{}, {}] });
    expect(lower).toMatchObject({ value: 'not applicable', final_m_q1: { baseline: 1, arm: 0 } });

    // | not lower than | not lower than | never          |  wingfoil's steps cost twice the baseline's
    const dearer = await breakEvenOf({ stepEur: 0.1, setupEur: 0.3, wingfoilSteps: [{}, CANCEL] });
    expect(dearer).toMatchObject({ value: 'never', mean_step_cost_eur: { baseline: 0.075, arm: 0.15 } });
  });

  it('@F4.5 Determinism is measured across repetitions', async () => {
    // Given 3 completed repetitions of S1 in the wingfoil arm with the same pins
    // When determinism is computed
    const { aggregate, scores } = await scoredS1Repetitions();
    const groups = aggregate.groups as {
      scenario: string;
      arm: string;
      runs: string[];
      metrics: { m_r: MR };
    }[];
    const group = groups.find((candidate) => candidate.scenario === 'S1' && candidate.arm === 'wingfoil');
    const m = group?.metrics.m_r as MR;
    expect(m.n).toBe(3);
    expect(m.runs).toEqual(group?.runs);

    // Then M-R1 is the share of hidden tests with the same verdict in all 3 repetitions — r2's failing
    // tests are the only ones that disagree
    const [, r2] = scores as [
      unknown,
      { final: { suites: { failed: string[] }[]; m_q1: { total: number } } },
    ];
    const disagree = r2.final.suites.flatMap((suite) => suite.failed).length;
    expect(disagree).toBeGreaterThan(0);
    expect(m.m_r1).toEqual({ agree: r2.final.m_q1.total - disagree, total: r2.final.m_q1.total });

    // And M-R2 is the mean pairwise Jaccard similarity of the public interfaces — r2 changed one export
    const [r1] = scores as [{ determinism: { interface: string[] } }];
    expect(r1.determinism.interface).toContain(
      'src/merge-patch.ts: export function applyMergePatch(target: unknown, patch: unknown): unknown;',
    );
    const k = r1.determinism.interface.length;
    const pairs = (m.m_r2 as Jaccard).pairs;
    expect(pairs.map((p) => [p.intersection, p.union])).toEqual([
      [k - 1, k + 1],
      [k, k],
      [k - 1, k + 1],
    ]);
    expect((m.m_r2 as Jaccard).mean).toBe(Math.round((((2 * (k - 1)) / (k + 1) + 1) / 3) * 1e4) / 1e4);

    // And M-R3 is the mean pairwise Jaccard similarity of the file-path sets, excluding generated and
    // harness files — r3's notes count, its lockfile and every run's CLAUDE.md do not
    const paths = (m.m_r3 as Jaccard).pairs.map((p) => p.union - p.intersection);
    expect(paths).toEqual([0, 1, 1]);

    // And no threshold of equivalence is applied
    expect(Object.keys(m)).toEqual(['n', 'runs', 'not_reached', 'm_r1', 'm_r2', 'm_r3']);
  }, 900_000);

  it('@F4.5 Determinism is not computed from a single repetition', async () => {
    // Given 1 completed repetition of S2 in the wingfoil arm
    // When determinism is computed
    const { aggregate, stdout } = await scoredS1Repetitions();
    const groups = aggregate.groups as { scenario: string; runs: string[]; metrics: { m_r: MR } }[];
    const group = groups.find((candidate) => candidate.scenario === 'S2');

    // Then no determinism value is produced for S2
    expect(group?.metrics.m_r).toEqual({ n: 1, runs: group?.runs, not_reached: [] });

    // And the report states "n = 1"
    expect(stdout).toContain('determinism measured in 1, n = 1 in 1)');
  }, 900_000);

  it('@F4.7 Next-change cost is attributed to later steps', async () => {
    // When a run of S3 is scored — the reference, each step at the fixture's cost of 0.05 EUR times its number
    const [recorded] = await scoredS3Runs();

    // Then M-F2 records the cost and the M-Q1 pass rate of steps 2 to 5
    expect(recorded?.m_f2).toEqual({
      steps: [
        { n: 2, cost_eur: 0.1, m_q1: { passed: 16, total: 16 } },
        { n: 3, cost_eur: 0.15, m_q1: { passed: 20, total: 20 } },
        { n: 4, cost_eur: 0.2, m_q1: { passed: 30, total: 30 } },
        { n: 5, cost_eur: 0.25, m_q1: { passed: 37, total: 37 } },
      ],
    });
  }, 600_000);

  it('@F4.7 Decision consistency counts explicit revisions as consistent', async () => {
    // Given after step 4 of S3 whole-day bookings still behave as before
    // And the repository records that the "whole days only" decision was revised — the reference's
    // DECISIONS.md at step 4
    const [recorded] = await scoredS3Runs();

    // When M-F1 is computed
    // Then decision D3 counts as consistent
    expect(recorded?.m_f1).toEqual({
      consistent: 5,
      total: 5,
      decisions: [
        { id: 'D1', outcome: 'respected', failed: [] },
        { id: 'D2', outcome: 'respected', failed: [] },
        { id: 'D3', outcome: 'revised', failed: [], check: 'd3-revision' },
        { id: 'D4', outcome: 'respected', failed: [] },
        { id: 'D5', outcome: 'respected', failed: [] },
      ],
    });
    // And nothing that passed on S3's seed, which has no code, can regress (M-D3)
    expect(recorded?.m_d3).toEqual({ count: 0, tests: [] });
    // And a project with no tests covers nothing, its changed files still counted (M-Q2, task-041)
    expect(recorded?.m_q2).toMatchObject({ coverage: { covered: 0 } });
    expect((recorded?.m_q2 as { coverage: { total: number } }).coverage.total).toBeGreaterThan(0);
  }, 600_000);

  it('@F4.7 A silent revision counts as a failure', async () => {
    // Given after step 4 of S3 whole-day bookings still behave as before — the same code
    // And nothing in the repository records the revision of "whole days only"
    const [, unrecorded] = await scoredS3Runs();
    const final = unrecorded?.final as { m_q1: unknown };
    expect(final.m_q1).toEqual({ passed: 37, total: 37 });

    // When M-F1 is computed
    // Then decision D3 counts as a failure
    expect(unrecorded?.m_f1).toEqual(
      expect.objectContaining({
        consistent: 4,
        total: 5,
        decisions: expect.arrayContaining([
          { id: 'D3', outcome: 'failed', failed: [], check: 'd3-revision' },
        ]),
      }),
    );
  }, 600_000);

  it("@F4.8 Governance checks do not depend on a harness's format", async () => {
    // Given two runs of S3 that record the D3 revision, one in a WingFoil decision-log and one in a
    // plain notes file — S3's reference, with step 4's own record replaced by each of them
    const scenario = loadScenario(repoPath('scenarios'), 'S3', '1.0');
    if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
    const reference = repoPath('test/fixtures/reference/S3');
    const recordedAs = (path: string, text: string) => (n: number, workspace: string) => {
      if (n !== 4) return;
      writeFileSync(join(workspace, 'DECISIONS.md'), readFileSync(join(reference, '01', 'DECISIONS.md')));
      mkdirSync(dirname(join(workspace, path)), { recursive: true });
      writeFileSync(join(workspace, path), text);
    };
    const runs = [
      recordedAs(
        '.wingfoil/memory/decision-log/dl-002-hourly-rentals.md',
        '---\nid: dl-002-hourly-rentals\ntype: decision-log\nstatus: approved\n---\n\n## Decision\n\n' +
          'Supersedes dl-001: bookings are no longer whole days only; rentals shorter than a day go by the hour.\n',
      ),
      recordedAs('NOTES.md', 'Whole-day bookings only: revised. Customers can now rent by the hour.\n'),
    ];

    // When M-F1 is computed for both — its content half, D3's check (W8 decision 3)
    const results = [];
    for (const edit of runs) {
      const { runDir, snapshots } = await referenceRun(scenario.value.seedDir, reference, edit);
      results.push(await scoreChecks({ checks: scenario.value.oracle.checks, runDir, snapshots }));
    }

    // Then D3 counts as consistent in both runs
    expect(results).toEqual([
      {
        ok: true,
        value: [
          {
            id: 'd3-revision',
            kind: 'content',
            steps: [
              {
                n: 4,
                passed: true,
                where: { file: '.wingfoil/memory/decision-log/dl-002-hourly-rentals.md' },
              },
            ],
          },
        ],
      },
      {
        ok: true,
        value: [
          {
            id: 'd3-revision',
            kind: 'content',
            steps: [{ n: 4, passed: true, where: { file: 'NOTES.md' } }],
          },
        ],
      },
    ]);
  });
});
