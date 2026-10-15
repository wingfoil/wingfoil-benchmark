import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { CampaignComparison } from '../../../src/results/index.js';
import { comparisonFile, comparisonPage, readComparisons } from '../../../src/site/comparisons.js';
import { tempDir } from '../../support/scenario-fixture.js';

const side = (delta: number, n: number, min = 0.5, max = 0.5) => ({
  arm: { n, mean: 0.5 + delta, min: min + delta, max: max + delta },
  baseline: { n, mean: 0.5, min, max },
  delta,
  certainty: n >= 3 ? ('within variance' as const) : ('preliminary' as const),
});

function comparison(extra: Partial<CampaignComparison> = {}): CampaignComparison {
  return {
    comparison_version: 1,
    m_r_across: [],
    earlier: { campaign: '0123456789ab', execution: 1, model: 'sonnet' },
    newer: { campaign: 'abcdef012345', execution: 2, model: 'sonnet', ended: '2026-10-12T10:00:00.000Z' },
    order: 'maintainer',
    pins_differ: [{ pin: 'harnesses.wingfoil', earlier: 'wingfoil v0.2.2', newer: 'wingfoil v0.2.3 <b>' }],
    compared: [],
    rows: [
      {
        scenario: 'S1',
        version: '1.0',
        category: 'C',
        arm: 'wingfoil',
        model: 'sonnet',
        metric: 'M-Q1',
        cross_model: false,
        earlier: side(0.25, 1),
        newer: side(0.125, 3, 0.25, 0.75),
        change: -0.125,
      },
      {
        scenario: 'S1',
        version: '1.0',
        category: 'C',
        arm: 'speckit',
        model: 'sonnet',
        metric: 'M-Q1',
        cross_model: false,
        earlier: { note: 'no baseline', arm: { n: 1, mean: 0.75, min: 0.75, max: 0.75 } },
        newer: side(0, 1),
      },
    ],
    not_compared: [
      {
        scenario: 'S8',
        version: '1.0',
        arm: 'baseline',
        model: 'sonnet',
        reason: 'not compared: scenario hash a in x, b in y',
      },
    ],
    only_in: [
      { execution: 'abcdef012345/2', scenario: 'S9', version: '1.0', arm: 'openspec', model: 'sonnet' },
    ],
    ...extra,
  };
}

describe('the comparison page (REQ-RES-07, task-084)', () => {
  it('names both executions in the maintainer order, the pins that differ, escaped, and no script', () => {
    const page = comparisonPage(comparison());
    expect(page).toContain('campaign abcdef012345, execution 2');
    expect(page).toContain('campaign 0123456789ab, execution 1');
    // REQ-RES-02 as amended: only site/index.html holds a date (task-084's review)
    expect(page).not.toMatch(/20\d\d-\d\d-\d\d/);
    expect(page).toContain('in the order the maintainer chose');
    expect(page).toContain('<li>harnesses.wingfoil: wingfoil v0.2.2 → wingfoil v0.2.3 &lt;b&gt;</li>');
    expect(page).not.toContain('<script');
    expect(page).not.toContain('<b>');
  });

  it('shows each side delta with its n, the range from n = 3, its certainty and the change', () => {
    const page = comparisonPage(comparison());
    const row = page.slice(
      page.indexOf('<td>wingfoil</td>'),
      page.indexOf('</tr>', page.indexOf('<td>wingfoil</td>')),
    );
    expect(row).toContain('+25');
    expect(row).toContain('n = 1 / 1');
    expect(row).toContain('n = 3 / 3');
    expect(row).toContain('range');
    expect(row).toContain('preliminary');
    expect(row).toContain('within variance');
    expect(row).toContain('<span class="change">');
  });

  it("shows a side's note and the arm value it kept, with no change", () => {
    const page = comparisonPage(comparison());
    const row = page.slice(
      page.indexOf('<td>speckit</td>'),
      page.indexOf('</tr>', page.indexOf('<td>speckit</td>')),
    );
    expect(row).toContain('no baseline');
    expect(row).toContain('75.0% (n = 1)');
    expect(row).not.toContain('<span class="change">');
  });

  it('lists what is not compared and what is on one side only', () => {
    const page = comparisonPage(comparison());
    expect(page).toContain('<li>S8@1.0 baseline (sonnet): scenario hash a in x, b in y</li>');
    expect(page).toContain('S9@1.0 openspec (sonnet): only in abcdef012345/2');
  });

  it('marks a cross-model comparison at the top and on every row it applies to', () => {
    const cross = comparison({
      newer: { campaign: 'abcdef012345', execution: 2, model: 'opus' },
      rows: comparison().rows.map((row) => ({ ...row, cross_model: true, model: 'sonnet → opus' })),
    });
    const page = comparisonPage(cross);
    expect(page).toContain('Cross-model');
    expect(page.split('<span class="cross-model">cross-model</span>').length - 1).toBe(2);
  });

  it('is named after the earlier execution', () => {
    expect(comparisonFile(comparison())).toBe('compare-0123456789ab-1.html');
  });
});

describe('reading the comparisons of an execution (REQ-RES-02 as amended, task-084)', () => {
  function write(root: string, name: string, text: string) {
    const dir = join(root, 'results', 'comparisons', 'abcdef012345-2');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), text);
  }

  it('reads every comparison whose newer side is the execution, in file-name order; none is none', () => {
    const root = tempDir('bench-site-cmp-');
    expect(readComparisons(root, 'abcdef012345', 2)).toEqual({ ok: true, value: [] });
    write(
      root,
      'fedcba987654-1.json',
      JSON.stringify({
        ...comparison(),
        earlier: { campaign: 'fedcba987654', execution: 1, model: 'sonnet' },
      }),
    );
    write(root, '0123456789ab-1.json', JSON.stringify(comparison()));
    const read = readComparisons(root, 'abcdef012345', 2);
    expect(read.ok && read.value.map((c) => c.earlier.campaign)).toEqual(['0123456789ab', 'fedcba987654']);
  });

  it('reads a comparison of version 2, with its M-R across the executions, and one of version 1 without (1.32)', () => {
    const root = tempDir('bench-site-cmp-');
    write(
      root,
      '0123456789ab-1.json',
      JSON.stringify({
        ...comparison(),
        comparison_version: 2,
        m_r_across: [
          {
            scenario: 'S3',
            version: '1.0',
            arm: 'baseline',
            model: 'claude-sonnet-5-5 → gpt-6.1-sol',
            earlier: { n: 2, runs: ['a', 'b'], not_reached: [] },
            newer: { n: 2, runs: ['c', 'd'], not_reached: [] },
            m_r1: { agree: 30, total: 37 },
          },
        ],
      }),
    );
    const { m_r_across: _dropped, ...versionOne } = comparison();
    write(
      root,
      'fedcba987654-1.json',
      JSON.stringify({ ...versionOne, earlier: { campaign: 'fedcba987654', execution: 1, model: 's' } }),
    );
    const read = readComparisons(root, 'abcdef012345', 2);
    expect(read.ok && read.value.map((c) => c.comparison_version)).toEqual([2, 1]);
  });

  it('refuses a comparison it cannot read, or one whose newer side is another execution', () => {
    const root = tempDir('bench-site-cmp-');
    write(root, '0123456789ab-1.json', '{');
    write(
      root,
      'fedcba987654-1.json',
      JSON.stringify({ ...comparison(), newer: { campaign: 'abcdef012345', execution: 3, model: 's' } }),
    );
    const read = readComparisons(root, 'abcdef012345', 2);
    expect(read.ok ? [] : read.issues.map((issue) => issue.path)).toEqual([
      'results/comparisons/abcdef012345-2/0123456789ab-1.json',
      'results/comparisons/abcdef012345-2/fedcba987654-1.json',
    ]);
  });
});

describe('the comparison page, after its first review (task-084)', () => {
  it('groups the rows by category, then scenario, arm and model, keeping the metric order', () => {
    const row = (category: string, scenario: string, arm: string, metric: 'M-Q1' | 'M-K1') => ({
      ...(comparison().rows[0] as CampaignComparison['rows'][number]),
      category,
      scenario,
      arm,
      metric,
    });
    const page = comparisonPage(
      comparison({
        rows: [
          row('D', 'S2', 'wingfoil', 'M-Q1'),
          row('C', 'S3', 'wingfoil', 'M-Q1'),
          row('C', 'S1', 'wingfoil', 'M-Q1'),
          row('C', 'S1', 'wingfoil', 'M-K1'),
        ],
      }),
    );
    const order = [
      ...page.matchAll(
        /<tr><td>([A-G])<\/td><td>(S\d)@1\.0<\/td><td>wingfoil<\/td><td>[^<]*<\/td><td>(M-..)</g,
      ),
    ].map((match) => `${match[1]} ${match[2]} ${match[3]}`);
    expect(order).toEqual(['C S1 M-Q1', 'C S1 M-K1', 'C S3 M-Q1', 'D S2 M-Q1']);
  });
});

describe('reading the comparisons, after the first review (task-084)', () => {
  function write(root: string, name: string, value: unknown) {
    const dir = join(root, 'results', 'comparisons', 'abcdef012345-2');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), typeof value === 'string' ? value : JSON.stringify(value));
  }
  const paths = (root: string) => {
    const read = readComparisons(root, 'abcdef012345', 2);
    return read.ok ? [] : read.issues.map((issue) => `${issue.path}: ${issue.message}`);
  };

  it('refuses an earlier side that names no execution of a campaign, which would name a page outside the site', () => {
    const root = tempDir('bench-site-cmp-');
    write(root, '..-1.json', {
      ...comparison(),
      earlier: { campaign: '../../../x', execution: 1, model: 's' },
    });
    expect(paths(root)).toEqual([
      'results/comparisons/abcdef012345-2/..-1.json: is not a comparison this site reads',
    ]);
  });

  it('refuses a file not named after its earlier execution', () => {
    const root = tempDir('bench-site-cmp-');
    write(root, '0123456789ab-1 (copy).json', comparison());
    expect(paths(root)).toEqual([
      'results/comparisons/abcdef012345-2/0123456789ab-1 (copy).json: is named for another comparison than 0123456789ab/1: 0123456789ab-1.json',
    ]);
  });

  it('refuses a row whose side lacks what the page reads', () => {
    const root = tempDir('bench-site-cmp-');
    const [first] = comparison().rows;
    write(root, '0123456789ab-1.json', { ...comparison(), rows: [{ ...first, earlier: { delta: 1 } }] });
    expect(paths(root)).toEqual([
      'results/comparisons/abcdef012345-2/0123456789ab-1.json: is not a comparison this site reads',
    ]);
  });
});
