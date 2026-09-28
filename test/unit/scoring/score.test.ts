import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { gitCli, systemProcess } from '../../../src/core/index.js';
import type { ProcessResult } from '../../../src/core/index.js';
import { readStoredRun } from '../../../src/results/index.js';
import { scoreRun, scoreSummary, writeScore } from '../../../src/scoring/index.js';
import type { Census, HoldoutInput } from '../../../src/scoring/index.js';
import { loadHoldoutAdditions } from '../../../src/scenario/index.js';
import {
  CANCEL,
  HOLDOUT_SECRET,
  HOLDOUT_TESTS,
  judgeT3,
  reporterLine,
  scoringDocker,
  storedRun,
  t3Holdout,
  T3_TEST,
} from '../../support/score-fixture.js';

/** A cost block for the summary's tests, which do not read it. */
const NO_COST = {
  usd_to_eur: 1,
  steps: [],
  run: {
    tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0 },
    cost_usd: 0,
    cost_eur: 0,
    cost_reported: true,
    wall_time_ms: 0,
    turns: 0,
    interventions: 0,
  },
};

const IMAGE = { tag: 'bench-score:0123456789ab', dockerfile: '', context: '', tsx: '4.23.15' };

async function score(
  fixture: Awaited<ReturnType<typeof storedRun>>,
  judge: (snapshot: string, command: readonly string[]) => ProcessResult = judgeT3,
  census: Census = new Map(),
  holdout?: HoldoutInput,
) {
  const run = readStoredRun(fixture.runDir);
  if (!run.ok) throw new Error(JSON.stringify(run.issues));
  const { docker, recorded } = scoringDocker(judge);
  const result = await scoreRun({
    runDir: fixture.runDir,
    executionDir: fixture.executionDir,
    run: run.value,
    scenario: fixture.scenario,
    image: IMAGE,
    docker,
    git: gitCli(systemProcess),
    census,
    containerPrefix: 'bench-score-t',
    ...(holdout === undefined ? {} : { holdout }),
  });
  return { result, recorded };
}

describe('scoreRun (F4.1, REQ-SCO-01–03)', () => {
  it('records M-Q1 for every step a suite scores and for the final snapshot, against the census', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    const { result, recorded } = await score(fixture);

    expect(result).toEqual({
      ok: true,
      value: {
        score_version: 1,
        scenario: 'T3',
        version: '1.0',
        scenario_hash: fixture.scenario.hash,
        scorer: { image: 'bench-score:0123456789ab', tsx: '4.23.15' },
        steps: [
          {
            n: 1,
            suites: [
              {
                id: 'orders',
                passed: 0,
                total: 1,
                failed: [
                  'oracle/public/cancel.test.ts > cancelling an order > marks a pending order as cancelled',
                ],
              },
            ],
            m_q1: { passed: 0, total: 1 },
          },
          {
            n: 2,
            suites: [{ id: 'orders', passed: 1, total: 1, failed: [] }],
            m_q1: { passed: 1, total: 1 },
          },
        ],
        final: {
          step: 2,
          suites: [{ id: 'orders', passed: 1, total: 1, failed: [] }],
          m_q1: { passed: 1, total: 1 },
        },
        // Not given one: the score says so, rather than look like one that includes it (F3.5).
        holdout: { scored: false, reason: 'not configured' },
        // M-K1 and M-K2 (F4.3): their own tests are in cost.test.ts.
        cost: expect.objectContaining({ usd_to_eur: 0.5, run: expect.objectContaining({ turns: 9 }) }),
      },
    });
    // The census on the seed, then steps 1 and 2; the final snapshot is step 2's, already scored.
    expect(recorded.copies.map((copy) => copy.split(' -> ')[0])).toEqual([
      fixture.scenario.seedDir,
      expect.stringMatching(/01$/),
      expect.stringMatching(/02$/),
    ]);
    expect(recorded.removes).toHaveLength(3);
  });

  it('records the steps a run never reached, and no final snapshot, when it stopped early', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });

    const { result } = await score(fixture);

    expect(result.ok && result.value.steps).toEqual([
      { n: 1, suites: [{ id: 'orders', passed: 1, total: 1, failed: [] }], m_q1: { passed: 1, total: 1 } },
      { n: 2, not_reached: true },
    ]);
    expect(result.ok && result.value.final).toEqual({ not_reached: true });
  });

  it('counts a census test a snapshot never reported as failed: a killed file hides its tests', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL] });
    const { result } = await score(fixture, (snapshot) =>
      snapshot.endsWith('seed') ? judgeT3(snapshot) : { code: 124, stdout: '', stderr: '' },
    );
    expect(result.ok && result.value.final).toMatchObject({ m_q1: { passed: 0, total: 1 } });
  });

  it('leaves skipped and todo tests out of every count', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL] });
    const skipped = { file: T3_TEST.file, path: ['later'] };
    const { result } = await score(fixture, (snapshot) => {
      const judged = judgeT3(snapshot);
      return { ...judged, stdout: judged.stdout + reporterLine(skipped, 'todo') };
    });
    expect(result.ok && result.value.final).toMatchObject({ m_q1: { passed: 1, total: 1 } });
  });

  it('is an oracle error, not a zero, when a test file does not load on the seed (adr-004)', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL] });
    const { result } = await score(fixture, () => ({
      code: 1,
      stdout: '{"kind":"file","file":"oracle/public/cancel.test.ts","status":"fail"}\n',
      stderr: '',
    }));
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          path: 'suite orders',
          message:
            'oracle/public/cancel.test.ts fails to load on the seed: a hidden test must import the code under test inside the test (adr-004)',
        },
      ],
    });
  });

  it('is an oracle error when a snapshot reports a test the census does not have', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL] });
    const extra = { file: T3_TEST.file, path: ['only on some snapshots'] };
    const { result } = await score(fixture, (snapshot) => {
      const judged = judgeT3(snapshot);
      return snapshot.endsWith('seed')
        ? judged
        : { ...judged, stdout: judged.stdout + reporterLine(extra, 'pass') };
    });
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          path: 'suite orders',
          message:
            "step 01 reports 'oracle/public/cancel.test.ts > only on some snapshots', which the census on the seed does not have: the oracle registers tests depending on the code under test (adr-004)",
        },
      ],
    });
  });

  it('is an oracle error when two hidden tests share a name', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL] });
    const { result } = await score(fixture, (snapshot) => {
      const judged = judgeT3(snapshot);
      return { ...judged, stdout: judged.stdout + judged.stdout };
    });
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          path: 'suite orders',
          message:
            "two hidden tests are named 'oracle/public/cancel.test.ts > cancelling an order > marks a pending order as cancelled' on the seed",
        },
      ],
    });
  });

  it('takes the census of a scenario version once for every run that shares it', async () => {
    const fixture = await storedRun({ steps: [CANCEL, CANCEL] });
    const census: Census = new Map();
    await score(fixture, judgeT3, census);
    const { recorded } = await score(fixture, judgeT3, census);
    expect(recorded.copies.some((copy) => copy.startsWith(`${fixture.scenario.seedDir} `))).toBe(false);
  });

  it('writes the same score.json, byte for byte, when a run is scored twice (REQ-SCO-03)', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const first = await score(fixture);
    if (!first.result.ok) throw new Error('not scored');
    writeScore(fixture.runDir, first.result.value);
    const bytes = readFileSync(join(fixture.runDir, 'score.json'));

    const second = await score(fixture);
    if (!second.result.ok) throw new Error('not scored');
    writeScore(fixture.runDir, second.result.value);

    expect(readFileSync(join(fixture.runDir, 'score.json'))).toEqual(bytes);
    expect(bytes.toString('utf8')).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('scores nothing for a run that reached no step, and builds no snapshot', async () => {
    const fixture = await storedRun({ steps: [] });
    // A run whose setup failed has no setup tree either: nothing needs rebuilding.
    const file = join(fixture.runDir, 'run.json');
    const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...record, setup: { duration_ms: 1, code: 3 } }));
    const { result, recorded } = await score(fixture);
    expect(result.ok && result.value.steps).toEqual([
      { n: 1, not_reached: true },
      { n: 2, not_reached: true },
    ]);
    expect(recorded.creates).toEqual([]);
  });
});

describe('scoreSummary', () => {
  it('says M-Q1 per scored step and for the final snapshot, and what was not reached', () => {
    expect(
      scoreSummary({
        score_version: 1,
        scenario: 'T3',
        version: '1.0',
        scenario_hash: 'h',
        scorer: { image: 'i', tsx: 't' },
        holdout: { scored: false, reason: 'none declared' },
        cost: NO_COST,
        steps: [
          { n: 1, suites: [] },
          { n: 2, suites: [{ id: 'a', passed: 1, total: 2, failed: ['x'] }], m_q1: { passed: 1, total: 2 } },
          { n: 3, not_reached: true },
        ],
        final: { not_reached: true },
      }),
    ).toBe('step 02 1/2, step 03 not reached, final not reached');
  });

  it('says so when the scenario has no hidden test', () => {
    expect(
      scoreSummary({
        score_version: 1,
        scenario: 'T0',
        version: '1.0',
        scenario_hash: 'h',
        scorer: { image: 'i', tsx: 't' },
        steps: [{ n: 1, suites: [] }],
        final: { step: 1, suites: [] },
        holdout: { scored: false, reason: 'none declared' },
        cost: NO_COST,
      }),
    ).toBe('no hidden tests');
  });
});

describe('scoreRun with the hold-out (task-028, F3.5, REQ-SCO-09)', () => {
  async function withHoldout(steps: NonNullable<Parameters<typeof storedRun>[0]>['steps'] = [{}, CANCEL]) {
    const fixture = await storedRun({ steps });
    const loaded = loadHoldoutAdditions(t3Holdout(), 'T3', '1.0');
    if (!loaded.ok) throw new Error('no hold-out');
    return { fixture, additions: loaded.value };
  }

  it("scores the hold-out's tests on every snapshot, apart from the public ones, in counts only", async () => {
    const { fixture, additions } = await withHoldout();

    const { result, recorded } = await score(fixture, judgeT3, new Map(), { additions });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The public results are the same as without a hold-out: nothing is folded into them.
    expect(result.value.final).toMatchObject({ m_q1: { passed: 1, total: 1 } });
    expect(result.value.holdout).toEqual({
      scored: true,
      hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      steps: [
        { n: 1, suites: [{ id: 'orders', passed: 0, total: 2 }], m_q1: { passed: 0, total: 2 } },
        { n: 2, suites: [{ id: 'orders', passed: 1, total: 2 }], m_q1: { passed: 1, total: 2 } },
      ],
      final: { step: 2, suites: [{ id: 'orders', passed: 1, total: 2 }], m_q1: { passed: 1, total: 2 } },
    });
    expect(JSON.stringify(result.value)).not.toContain(HOLDOUT_SECRET);
    // Its own containers: a census and two snapshots, each with the hold-out beside the suite.
    expect(recorded.creates.filter((create) => create.readOnly.length === 2)).toHaveLength(3);
  });

  it('records a hold-out step the run never reached as not reached', async () => {
    const { fixture, additions } = await withHoldout([CANCEL]);
    const { result } = await score(fixture, judgeT3, new Map(), { additions });
    expect(result.ok && result.value.holdout).toMatchObject({
      steps: [{ n: 1 }, { n: 2, not_reached: true }],
      final: { not_reached: true },
    });
  });

  it('records why the hold-out was not scored', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const { result } = await score(fixture, judgeT3, new Map(), { notScored: 'none declared' });
    expect(result.ok && result.value.holdout).toEqual({ scored: false, reason: 'none declared' });
  });

  it('names no hold-out test in an oracle error, only the suite and the file', async () => {
    const { fixture, additions } = await withHoldout();
    const holdoutRun = (command: readonly string[]) =>
      command.some((argument) => argument.includes('.holdout/'));

    const repeated = await score(
      fixture,
      (snapshot, command) => {
        const judged = judgeT3(snapshot, command);
        return holdoutRun(command) ? { ...judged, stdout: judged.stdout + judged.stdout } : judged;
      },
      new Map(),
      { additions },
    );
    expect(repeated.result).toEqual({
      ok: false,
      issues: [{ path: 'hold-out suite orders', message: 'two hold-out tests share a name on the seed' }],
    });

    const extra = { file: HOLDOUT_TESTS[0]?.file ?? '', path: [`${HOLDOUT_SECRET} late`] };
    const unknown = await score(
      fixture,
      (snapshot, command) => {
        const judged = judgeT3(snapshot, command);
        return holdoutRun(command) && !snapshot.endsWith('seed')
          ? { ...judged, stdout: judged.stdout + reporterLine(extra, 'pass') }
          : judged;
      },
      new Map(),
      { additions },
    );
    expect(unknown.result).toEqual({
      ok: false,
      issues: [
        {
          path: 'hold-out suite orders',
          message: 'step 01 reports a hold-out test the census on the seed does not have (adr-004)',
        },
      ],
    });

    const unloadable = await score(
      fixture,
      (snapshot, command) =>
        holdoutRun(command)
          ? {
              code: 1,
              stdout: '{"kind":"file","file":"oracle/public.holdout/refund.test.ts","status":"fail"}\n',
              stderr: '',
            }
          : judgeT3(snapshot, command),
      new Map(),
      { additions },
    );
    expect(unloadable.result).toEqual({
      ok: false,
      issues: [
        {
          path: 'hold-out suite orders',
          message:
            'oracle/public.holdout/refund.test.ts fails to load on the seed: a hidden test must import the code under test inside the test (adr-004)',
        },
      ],
    });
  });

  it('says the hold-out in the summary line: its final M-Q1, or that it was not scored', () => {
    const base = {
      score_version: 1,
      scenario: 'T3',
      version: '1.0',
      scenario_hash: 'h',
      scorer: { image: 'i', tsx: 't' },
      steps: [
        { n: 1, suites: [{ id: 'a', passed: 1, total: 1, failed: [] }], m_q1: { passed: 1, total: 1 } },
      ],
      final: { step: 1, suites: [], m_q1: { passed: 1, total: 1 } },
      cost: NO_COST,
    };
    expect(
      scoreSummary({
        ...base,
        holdout: {
          scored: true,
          hash: 'h',
          steps: [],
          final: { step: 1, suites: [], m_q1: { passed: 1, total: 2 } },
        },
      }),
    ).toBe('step 01 1/1, final 1/1; hold-out final 1/2');
    expect(scoreSummary({ ...base, holdout: { scored: false, reason: 'not configured' } })).toBe(
      'step 01 1/1, final 1/1; hold-out not scored',
    );
    expect(scoreSummary({ ...base, holdout: { scored: false, reason: 'none declared' } })).toBe(
      'step 01 1/1, final 1/1',
    );
  });
});
