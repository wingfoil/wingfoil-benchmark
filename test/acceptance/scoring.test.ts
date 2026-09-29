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
import { referenceRun } from '../support/reference.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun } from '../support/score-fixture.js';

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
      expect(create.readOnly).toEqual([
        { source: join(fixture.scenario.dir, 'oracle', 'public'), target: '/score/oracle/public' },
      ]);
    }
    expect(recorded.copies.every((copy) => copy.endsWith(':/score/seed'))).toBe(true);
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
