import { describe, expect, it } from 'vitest';

import type { Group } from '../../../src/results/index.js';
import {
  CATEGORY_MAP,
  compare,
  formatDelta,
  formatFigure,
  headlineSentence,
  notCoveredSentence,
  readMetric,
} from '../../../src/site/rules.js';
import type { Comparison, Figures } from '../../../src/site/rules.js';

/** Figures of `values`, one run each. */
function figures(...values: number[]): Figures {
  return { runs: values.map((_, index) => `r${index + 1}`), values };
}

/** A comparison of one category's metric, for the headline. */
function comparison(category: string, outcome: Comparison['outcome'], n = 1): Comparison {
  return {
    category,
    metric: 'M-Q1',
    arm: 'wingfoil',
    outcome,
    delta: 0,
    certainty: n === 1 ? 'preliminary' : 'within variance',
    baseline: { n, mean: 0, min: 0, max: 0, runs: [] },
    other: { n, mean: 0, min: 0, max: 0, runs: [] },
  };
}

describe('the category map (REQ-RES-03 as amended in 1.20, task-045)', () => {
  it('maps C, D, E and F to their metrics in order, each with the way it is better', () => {
    expect(
      Object.fromEntries(
        Object.entries(CATEGORY_MAP).map(([category, metrics]) => [
          category,
          metrics.map((metric) => `${metric.id} ${metric.better}`),
        ]),
      ),
    ).toEqual({
      C: ['M-Q1 higher', 'M-K1 lower'],
      D: ['M-Q1 higher', 'M-D3 lower'],
      E: ['M-E1 lower'],
      F: ['M-F1 higher'],
    });
  });
});

describe('a comparison against the baseline', () => {
  it('is better or worse by the metric direction, and the same when the means are equal', () => {
    expect(compare('higher', figures(0.5), figures(1))).toMatchObject({ outcome: 'better', delta: 0.5 });
    expect(compare('higher', figures(1), figures(0.5))).toMatchObject({ outcome: 'worse', delta: -0.5 });
    expect(compare('lower', figures(0.2), figures(0.1))).toMatchObject({ outcome: 'better' });
    expect(compare('lower', figures(0.1), figures(0.2))).toMatchObject({ outcome: 'worse' });
    expect(compare('lower', figures(3), figures(3))).toMatchObject({ outcome: 'same', delta: 0 });
  });

  it('compares the means, and keeps each side n, mean and range', () => {
    const result = compare('higher', figures(1, 0.5, 0.75), figures(1, 1, 1));
    expect(result.baseline).toEqual({ n: 3, mean: 0.75, min: 0.5, max: 1, runs: ['r1', 'r2', 'r3'] });
    expect(result.other.mean).toBe(1);
  });

  it('is preliminary when either side is a single run', () => {
    expect(compare('higher', figures(0), figures(1, 1, 1)).certainty).toBe('preliminary');
    expect(compare('higher', figures(0, 0, 0), figures(1)).certainty).toBe('preliminary');
  });

  it('is beyond variance only when both sides have n ≥ 3 and their ranges do not overlap', () => {
    expect(compare('higher', figures(0, 0.1, 0.2), figures(0.3, 0.4, 0.5)).certainty).toBe('beyond variance');
    expect(compare('higher', figures(0, 0.1, 0.3), figures(0.3, 0.4, 0.5)).certainty).toBe('within variance');
    expect(compare('higher', figures(0, 0.1), figures(0.3, 0.4)).certainty).toBe('within variance');
  });

  it('is the same, and never beyond variance, when the means are equal', () => {
    expect(compare('higher', figures(1, 1, 1), figures(1, 1, 1))).toMatchObject({
      outcome: 'same',
      certainty: 'within variance',
    });
  });
});

describe('reading a metric from a group', () => {
  const group = {
    runs: ['r1', 'r2'],
    metrics: {
      m_q1: {
        final: {
          m_q1: {
            n: 2,
            runs: ['r1', 'r2'],
            values: [
              { passed: 3, total: 4 },
              { passed: 0, total: 0 },
            ],
          },
        },
      },
      cost: { cost_eur: { n: 2, runs: ['r1', 'r2'], values: [0.1, 0.3] } },
      checks: [
        {
          id: 'a',
          kind: 'ast',
          steps: [
            { step: 1, violations: { n: 2, runs: ['r1', 'r2'], values: [1, 0] }, not_reached: [] },
            { step: 2, violations: { n: 1, runs: ['r2'], values: [2] }, not_reached: [] },
          ],
        },
        { id: 'b', kind: 'content', steps: [{ step: 1, not_reached: [] }] },
      ],
    },
  } as unknown as Group;

  it('reads M-Q1 as each run share of the final snapshot, 0 of 0 being 0', () => {
    expect(readMetric('M-Q1', group)).toEqual({ runs: ['r1', 'r2'], values: [0.75, 0] });
  });

  it('reads M-K1 as each run cost in EUR', () => {
    expect(readMetric('M-K1', group)).toEqual({ runs: ['r1', 'r2'], values: [0.1, 0.3] });
  });

  it('reads M-E1 as each run violations, summed over every step of its directive checks (ast, dependencies)', () => {
    expect(readMetric('M-E1', group)).toEqual({ runs: ['r1', 'r2'], values: [1, 2] });
  });

  it('names the runs that did not reach a directive check step: M-E1 is not comparable for them', () => {
    const lost = {
      ...group,
      metrics: {
        ...group.metrics,
        checks: [
          {
            id: 'a',
            kind: 'dependencies',
            steps: [
              { step: 1, violations: { n: 2, runs: ['r1', 'r2'], values: [1, 0] }, not_reached: [] },
              { step: 2, violations: { n: 1, runs: ['r2'], values: [2] }, not_reached: ['r1'] },
            ],
          },
        ],
      },
    } as unknown as Group;
    expect(readMetric('M-E1', lost)).toEqual({
      runs: ['r2'],
      values: [2],
      unreached: [{ run: 'r1', step: 2 }],
    });
    // A directive check no run reached still makes M-E1 not comparable, never "not measured"
    const none = {
      ...group,
      metrics: {
        ...group.metrics,
        checks: [{ id: 'a', kind: 'ast', steps: [{ step: 1, not_reached: ['r1', 'r2'] }] }],
      },
    } as unknown as Group;
    expect(readMetric('M-E1', none)).toEqual({
      runs: [],
      values: [],
      unreached: [
        { run: 'r1', step: 1 },
        { run: 'r2', step: 1 },
      ],
    });
  });

  it('reads a metric the group lacks as not measured', () => {
    expect(readMetric('M-F1', group)).toBeUndefined();
    expect(readMetric('M-D3', group)).toBeUndefined();
    const noDirective = { ...group, metrics: { ...group.metrics, checks: [] } } as unknown as Group;
    expect(readMetric('M-E1', noDirective)).toBeUndefined();
  });
});

describe('the headline', () => {
  it('counts better, worse and same with the same weight, and names the categories and the preliminary', () => {
    const comparisons = [
      comparison('C', 'same'),
      comparison('C', 'same'),
      comparison('D', 'worse'),
      comparison('D', 'same'),
      comparison('F', 'better'),
    ];
    expect(headlineSentence('wingfoil', comparisons)).toBe(
      'Against the baseline, wingfoil is better in 1, worse in 1 and the same in 3 of 5 comparisons ' +
        'across categories C, D and F (preliminary: n = 1 in C, D and F).',
    );
  });

  it('emphasises the arm as asked, and leaves out the preliminary clause when none is', () => {
    expect(
      headlineSentence('wingfoil', [comparison('C', 'better', 3)], (arm) => `<strong>${arm}</strong>`),
    ).toBe(
      'Against the baseline, <strong>wingfoil</strong> is better in 1, worse in 0 and the same in 0 of 1 ' +
        'comparison across category C.',
    );
  });

  it('says when an arm has no comparison', () => {
    expect(headlineSentence('wingfoil', [])).toBe(
      'Against the baseline, wingfoil has no comparison: no metric of the category map was measured in both.',
    );
  });

  it('names the categories not covered', () => {
    expect(notCoveredSentence(['A', 'B', 'E', 'G'])).toBe('A, B, E and G are not covered in this campaign.');
    expect(notCoveredSentence(['G'])).toBe('G is not covered in this campaign.');
    expect(notCoveredSentence([])).toBe('');
  });
});

describe('numbers', () => {
  it('formats a share, a cost and a count, and their deltas, with one function each', () => {
    expect(formatFigure('M-Q1', 0.75)).toBe('75.0%');
    expect(formatFigure('M-K1', 0.15)).toBe('0.1500 EUR');
    expect(formatFigure('M-E1', 2)).toBe('2');
    expect(formatFigure('M-E1', 1.5)).toBe('1.5');
    expect(formatDelta('M-Q1', -1)).toBe('−100.0 pp');
    expect(formatDelta('M-F1', 0.25)).toBe('+25.0 pp');
    expect(formatDelta('M-K1', 0)).toBe('±0.0000 EUR');
    expect(formatDelta('M-D3', 2)).toBe('+2');
    // A difference that rounds to nothing is shown with enough digits to be seen
    expect(formatDelta('M-Q1', 0.0004)).toBe('+0.040 pp');
    expect(formatDelta('M-K1', -0.00002)).toBe('−0.000020 EUR');
  });
});
