import { describe, expect, it } from 'vitest';

import { mD3, mF1, mF2 } from '../../../src/scoring/index.js';
import type {
  CheckScore,
  CostFigures,
  CostScore,
  FinalScore,
  SeedScore,
  StepScore,
} from '../../../src/scoring/index.js';

/**
 * The continuity metrics and M-D3 (REQ-SCO-12, task-039): M-F1 from the decisions an oracle lists,
 * M-F2 as a reading of steps 2 to n, and M-D3 from the seed's own verdicts. Pure functions of what
 * scoring already has: no container, no clock.
 */

const D1_QUOTE = 'oracle/bookings/a.test.mts > bookings > D1: a quote is in cents';
const D1_REFUND = 'oracle/cancel/c.test.mts > cancel > D1: a refund is in cents';
const D3_DAY = 'oracle/bookings/a.test.mts > bookings > D3: a whole day is still accepted';
const PLAIN = 'oracle/bookings/a.test.mts > bookings > lists the items';
// A test whose name mentions a decision but does not start with it checks no decision.
const MENTION = 'oracle/bookings/a.test.mts > bookings > keeps D1: as written';
const TESTS = [D1_QUOTE, D1_REFUND, D3_DAY, PLAIN, MENTION];

function finalFailing(...failed: string[]): FinalScore {
  const suite = (id: string, dir: string, total: number) => {
    const own = failed.filter((key) => key.startsWith(`oracle/${dir}/`));
    return { id, passed: total - own.length, total, failed: own };
  };
  return {
    step: 5,
    suites: [suite('bookings', 'bookings', 4), suite('cancel', 'cancel', 1)],
    m_q1: { passed: 5 - failed.length, total: 5 },
  };
}

function revision(steps: CheckScore['steps']): CheckScore {
  return { id: 'd3-revision', kind: 'content', steps };
}

const DECISIONS = [{ id: 'D1' }, { id: 'D3', revisedBy: 'd3-revision' }];
const RECORDED = revision([{ n: 4, passed: true, where: { file: 'NOTES.md' } }]);
const SILENT = revision([{ n: 4, passed: false }]);

describe('mF1: decision consistency (experiment design §4.3, REQ-SCO-12)', () => {
  it('respects a decision whose tests all pass, and revises one whose revision check passed too', () => {
    expect(mF1(DECISIONS, TESTS, finalFailing(PLAIN), [RECORDED])).toEqual({
      ok: true,
      value: {
        consistent: 2,
        total: 2,
        decisions: [
          { id: 'D1', outcome: 'respected', failed: [] },
          { id: 'D3', outcome: 'revised', failed: [], check: 'd3-revision' },
        ],
      },
    });
  });

  it('fails a declared revision that nothing records, though its tests all pass: a silent revision', () => {
    const result = mF1(DECISIONS, TESTS, finalFailing(), [SILENT]);
    expect(result.ok && result.value).toEqual({
      consistent: 1,
      total: 2,
      decisions: [
        { id: 'D1', outcome: 'respected', failed: [] },
        { id: 'D3', outcome: 'failed', failed: [], check: 'd3-revision' },
      ],
    });
  });

  it('fails a decision any of whose tests fails, whatever its check says, and names those tests', () => {
    const result = mF1(DECISIONS, TESTS, finalFailing(D1_REFUND, D3_DAY), [RECORDED]);
    expect(result.ok && result.value).toEqual({
      consistent: 0,
      total: 2,
      decisions: [
        { id: 'D1', outcome: 'failed', failed: [D1_REFUND] },
        { id: 'D3', outcome: 'failed', failed: [D3_DAY], check: 'd3-revision' },
      ],
    });
  });

  it('reads a revision check at its last step, and a check not reached there as nothing recorded', () => {
    const late = revision([
      { n: 4, passed: true, where: { commit: 1 } },
      { n: 5, not_reached: true },
    ]);
    const result = mF1(DECISIONS, TESTS, finalFailing(), [late]);
    expect(result.ok && result.value).toEqual(expect.objectContaining({ consistent: 1 }));
  });

  it('is not reached when the final snapshot is not', () => {
    expect(mF1(DECISIONS, TESTS, { not_reached: true }, [RECORDED])).toEqual({
      ok: true,
      value: { not_reached: true },
    });
  });

  it('is an oracle error when a declared decision has no public hidden test', () => {
    expect(mF1([...DECISIONS, { id: 'D6' }], TESTS, finalFailing(), [RECORDED])).toEqual({
      ok: false,
      issues: [{ path: 'oracle.decisions[D6]', message: "has no public hidden test named 'D6: …'" }],
    });
  });

  it('is undefined for a scenario that lists no decision', () => {
    expect(mF1([], TESTS, finalFailing(), [])).toEqual({ ok: true, value: undefined });
  });
});

function figures(eur: number): CostFigures {
  return {
    tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0 },
    cost_usd: eur * 2,
    cost_eur: eur,
    cost_reported: true,
    wall_time_ms: 0,
    turns: 0,
    interventions: 0,
  };
}

describe('mF2: next-change cost (experiment design §4.3, REQ-SCO-12)', () => {
  const steps: StepScore[] = [
    { n: 1, suites: [{ id: 'a', passed: 1, total: 2, failed: ['x'] }], m_q1: { passed: 1, total: 2 } },
    { n: 2, suites: [{ id: 'a', passed: 2, total: 2, failed: [] }], m_q1: { passed: 2, total: 2 } },
    { n: 3, suites: [] },
    { n: 4, not_reached: true },
  ];
  const cost: CostScore = {
    usd_to_eur: 0.5,
    steps: [
      { n: 1, outcome: 'completed', ...figures(0.5) },
      { n: 2, outcome: 'completed', ...figures(0.25) },
      { n: 3, outcome: 'completed', ...figures(0.125) },
      { n: 4, not_reached: true },
    ],
    run: figures(0.875),
  };

  it('reads each step after the first: its cost in euro and its M-Q1, or that it was not reached', () => {
    expect(mF2(steps, cost)).toEqual({
      steps: [
        { n: 2, cost_eur: 0.25, m_q1: { passed: 2, total: 2 } },
        { n: 3, cost_eur: 0.125 },
        { n: 4, not_reached: true },
      ],
    });
  });

  it('is undefined for a scenario of one step', () => {
    expect(mF2(steps.slice(0, 1), { ...cost, steps: cost.steps.slice(0, 1) })).toBeUndefined();
  });
});

describe('mD3: regressions from the seed (experiment design §4.1, REQ-SCO-12)', () => {
  const seed: SeedScore = {
    suites: [
      { id: 'bookings', passed: 2, total: 4, failed: [D1_QUOTE, D3_DAY] },
      { id: 'cancel', passed: 1, total: 1, failed: [] },
    ],
    m_q1: { passed: 3, total: 5 },
  };

  it('counts the tests that passed on the seed and fail on the final snapshot, sorted', () => {
    expect(mD3(seed, finalFailing(D3_DAY, PLAIN, D1_REFUND))).toEqual({
      count: 2,
      tests: [PLAIN, D1_REFUND],
    });
  });

  it('counts none when every test that passed on the seed still does', () => {
    expect(mD3(seed, finalFailing(D1_QUOTE))).toEqual({ count: 0, tests: [] });
  });

  it('is not reached when the final snapshot is not', () => {
    expect(mD3(seed, { not_reached: true })).toEqual({ not_reached: true });
  });
});
