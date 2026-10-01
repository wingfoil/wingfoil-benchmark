import { describe, expect, it } from 'vitest';

import type { Group } from '../../../src/results/index.js';
import type { CategoryRow, SiteModel } from '../../../src/site/model.js';
import { categoryPage, landingPage } from '../../../src/site/render.js';
import { CATEGORY_MAP, compare, summarize } from '../../../src/site/rules.js';
import type { MapEntry } from '../../../src/site/rules.js';

/** A group as the pages read it: its runs, losses, final suites and hold-out. */
function group(
  arm: string,
  extra: Partial<{ model: string; losses: Group['losses']; scored: boolean }> = {},
): Group {
  const runs = ['r1', 'r2', 'r3'].map((r) => `abcdef012345/1/runs/S1@1.0/${arm}/${extra.model ?? 'm'}/${r}`);
  const tally = {
    n: 3,
    runs,
    values: [
      { passed: 1, total: 2 },
      { passed: 2, total: 2 },
      { passed: 2, total: 2 },
    ],
  };
  return {
    scenario: 'S1',
    version: '1.0',
    arm,
    model: extra.model ?? 'm',
    runs,
    n: 3,
    preliminary: false,
    losses: extra.losses ?? [],
    metrics: {
      m_q1: { steps: [], final: { m_q1: tally, suites: [{ id: 'pointer', value: tally }], not_reached: [] } },
      holdout:
        extra.scored === false
          ? { scored: false, reason: 'no hold-out given' }
          : { scored: true, not_scored: [], steps: [], final: { m_q1: tally, suites: [], not_reached: [] } },
    },
  } as unknown as Group;
}

const S1 = { id: 'S1', version: '1.0', primary: 'C' as const, secondary: ['D' as const] };

/** A model of S1 in two arms with three runs each: wingfoil's M-Q1 apart from the baseline's, its cost not measured. */
function model(): SiteModel {
  const baseline = group('baseline', { scored: false });
  const wingfoil = group('wingfoil', {
    losses: [
      {
        run: 'abcdef012345/1/runs/S1@1.0/wingfoil/m/r3',
        reason: 'expected failure (missing workflow-engine)',
      },
    ],
  });
  const low = { runs: ['a', 'b', 'c'], values: [0.1, 0.2, 0.3] };
  const high = { runs: ['d', 'e', 'f'], values: [0.8, 0.9, 1] };
  const result = compare('higher', low, high);
  const comparison = { category: 'C', metric: 'M-Q1' as const, arm: 'wingfoil', ...result };
  const [q1, k1] = CATEGORY_MAP.C;
  const c: CategoryRow = {
    category: 'C',
    secondary: [],
    scenarios: [
      {
        scenario: S1,
        groups: [baseline, wingfoil],
        metrics: [
          {
            entry: q1 as MapEntry,
            values: [
              { arm: 'baseline', summary: summarize(low) },
              { arm: 'wingfoil', summary: result.other, comparison },
            ],
          },
          { entry: k1 as MapEntry, values: [{ arm: 'baseline' }, { arm: 'wingfoil' }] },
        ],
      },
    ],
  };
  const d: CategoryRow = { category: 'D', scenarios: [], secondary: [S1] };
  return {
    campaign: 'abcdef012345',
    execution: 1,
    model: 'm',
    arms: ['baseline', 'wingfoil'],
    runs: 9,
    categories: [c, d],
    comparisons: [comparison],
    slices: [group('wingfoil', { model: 'other-model' })],
  };
}

describe('the pages, from a hand-built model (task-045)', () => {
  it('shows a range from n = 3, beyond variance, not measured, a loss with its reason, and a hold-out not scored', () => {
    const page = landingPage(model());
    expect(page).toContain('<span class="range">range 10.0%–30.0%</span>');
    expect(page).toContain('<span class="certainty">beyond variance</span>');
    expect(page).toContain('<div class="value"><span class="metric">M-K1</span> not measured</div>');
    expect(page).toContain('loss: r3: expected failure (missing workflow-engine)');
    expect(page).toContain('<span class="holdout">hold-out</span> not scored');
    // The chart's whisker shows the range of three runs; the second arm is hatched, not only coloured
    expect(page).toContain('<line class="whisker"');
    expect(page).toContain('fill="url(#hatch-1)"');
    expect(page).toContain('Campaign abcdef012345, execution 1: 9 runs.');
  });

  it('lists a scenario on its secondary categories pages, without covering them', () => {
    const m = model();
    const d = categoryPage(m, m.categories[1] as CategoryRow);
    expect(d).toContain('not covered in this campaign');
    expect(d).toContain('S1@1.0: primary category <a href="category-c.html">C</a>');
  });

  it('reports a slice apart from the campaign model, on its category page', () => {
    const m = model();
    const c = categoryPage(m, m.categories[0] as CategoryRow);
    expect(c).toContain('Other models (slices)');
    expect(c).toContain('wingfoil, other-model: M-Q1 1/2, 2/2, 2/2 (n = 3)');
    expect(c).toContain('loss: expected failure (missing workflow-engine)');
    expect(c).toContain('pointer 1/2, 2/2, 2/2');
  });
});
