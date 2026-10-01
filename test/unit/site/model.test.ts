import { describe, expect, it } from 'vitest';

import type { Group } from '../../../src/results/index.js';
import { metricRow } from '../../../src/site/model.js';
import { CATEGORY_MAP } from '../../../src/site/rules.js';
import type { MapEntry } from '../../../src/site/rules.js';

const M_E1 = CATEGORY_MAP.E[0] as MapEntry;

/** A group of S8 in `arm` whose one directive check scores two steps; `lost` runs never reach step 2. */
function s8(arm: string, violations: readonly number[], lost: readonly string[] = []): Group {
  const runs = violations.map((_, index) => `x/1/runs/S8@1.0/${arm}/m/r${index + 1}`);
  const reached = runs.filter((run) => !lost.some((name) => run.endsWith(`/${name}`)));
  return {
    scenario: 'S8',
    version: '1.0',
    arm,
    model: 'm',
    runs,
    n: runs.length,
    preliminary: runs.length === 1,
    losses: [],
    metrics: {
      checks: [
        {
          id: 'd1',
          kind: 'ast',
          steps: [
            { step: 1, violations: { n: runs.length, runs, values: runs.map(() => 0) }, not_reached: [] },
            {
              step: 2,
              violations: {
                n: reached.length,
                runs: reached,
                values: reached.map((run) => violations[runs.indexOf(run)] ?? 0),
              },
              not_reached: runs.filter((run) => !reached.includes(run)),
            },
          ],
        },
      ],
    },
  } as unknown as Group;
}

describe('a metric row (task-045, after its independent review)', () => {
  it('compares an arm with the baseline when every run reached every directive check step', () => {
    const { row, comparisons } = metricRow(
      'E',
      M_E1,
      [s8('baseline', [2]), s8('wingfoil', [0])],
      ['baseline', 'wingfoil'],
    );
    expect(comparisons.map((c) => `${c.arm} ${c.outcome}`)).toEqual(['wingfoil better']);
    expect(row.values.map((value) => value.note)).toEqual([undefined, undefined]);
  });

  it('makes M-E1 not comparable for an arm with a run that stopped early: no outcome, no headline count', () => {
    const { row, comparisons } = metricRow(
      'E',
      M_E1,
      [s8('baseline', [2]), s8('wingfoil', [0, 0], ['r2'])],
      ['baseline', 'wingfoil'],
    );
    expect(comparisons).toEqual([]);
    expect(row.values[1]).toEqual({ arm: 'wingfoil', note: 'not comparable: r2 did not reach step 2' });
  });

  it('gives no comparison when the baseline is not comparable, and says so beside the arm value', () => {
    const { row, comparisons } = metricRow(
      'E',
      M_E1,
      [s8('baseline', [2], ['r1']), s8('wingfoil', [0])],
      ['baseline', 'wingfoil'],
    );
    expect(comparisons).toEqual([]);
    expect(row.values[0]).toEqual({ arm: 'baseline', note: 'not comparable: r1 did not reach step 2' });
    expect(row.values[1]).toMatchObject({
      arm: 'wingfoil',
      note: 'no comparison: the baseline is not comparable',
    });
    expect(row.values[1]?.summary?.mean).toBe(0);
  });

  it('reads a lower-is-better metric the right way round', () => {
    const { comparisons } = metricRow(
      'E',
      M_E1,
      [s8('baseline', [0]), s8('wingfoil', [3])],
      ['baseline', 'wingfoil'],
    );
    expect(comparisons[0]).toMatchObject({ outcome: 'worse', delta: 3 });
  });

  it('says why a run with no directive check score is not comparable', () => {
    const group = s8('wingfoil', [0]);
    const unscored = { ...group, runs: [...group.runs, 'x/1/runs/S8@1.0/wingfoil/m/r2'] } as Group;
    const { row } = metricRow('E', M_E1, [s8('baseline', [2]), unscored], ['baseline', 'wingfoil']);
    expect(row.values[1]).toEqual({
      arm: 'wingfoil',
      note: 'not comparable: r2 was not scored with the directive checks',
    });
  });
});
