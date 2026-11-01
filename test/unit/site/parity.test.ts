import { describe, expect, it } from 'vitest';

import { paritySection } from '../../../src/results/index.js';
import type { ParityRun, ParitySection } from '../../../src/results/index.js';
import { parityPage } from '../../../src/site/parity.js';

/** Three runs of an arm on a model, every figure the parity comparison reads. */
function runs(arm: string, model: string, costEur: number, wallTimeMs: number, mQ1 = 1): ParityRun[] {
  return [1, 2, 3].map((r) => ({
    name: `abcdef012345/1/runs/S1@1.0/${arm}/${model}/r${r}`,
    scenario: 'S1',
    version: '1.0',
    arm,
    model,
    harness: arm === 'wingfoil',
    mQ1,
    holdout: 1,
    costEur,
    wallTimeMs,
    tokens: { input: 1000, output: 600, cacheCreation: 2000, cacheRead: 30000 },
  }));
}

function section(): ParitySection {
  const built = paritySection(
    [
      ...runs('baseline', 'strong<b>', 0.5, 600_000),
      ...runs('baseline', 'weak', 0.05, 300_000),
      ...runs('wingfoil', 'weak', 0.1, 400_000),
      ...runs('baseline', 'strong<b>', 0.5, 600_000).map((run) => ({
        ...run,
        scenario: 'S2',
        name: `${run.name}-s2`,
      })),
      ...runs('baseline', 'weak', 0.05, 300_000).map((run) => ({
        ...run,
        scenario: 'S2',
        name: `${run.name}-s2`,
      })),
      ...runs('wingfoil', 'strong<b>', 0.9, 700_000).map((run) => ({
        ...run,
        scenario: 'S2',
        name: `${run.name}-s2`,
      })),
    ],
    'strong<b>',
  );
  if (built === undefined) throw new Error('no parity');
  return built;
}

describe('the parity page (REQ-RES-12, dl-032, task-121)', () => {
  const html = parityPage('WingFoil Benchmark — campaign abcdef012345, execution 1', section());

  it('heads each pair and harness with its H-W count, and the unmatched scenarios', () => {
    expect(html).toContain('<h2>wingfoil on weak against the baseline on strong&lt;b&gt;</h2>');
    expect(html).toContain('H-W holds in 1 and fails in 0 of 1 scenarios; 1 not matched.');
    expect(html).toContain('Not matched: S2@1.0 (no wingfoil run on weak).');
  });

  it('shows the verdicts, the ratios and every cell, apart from the same-model results', () => {
    expect(html).toContain(
      '<td>100.0 % against 100.0 %<br><span class="verdict">same, within variance</span></td>',
    );
    expect(html).toContain('<td>0.20×</td><td>0.67×</td>');
    expect(html).toContain('<td><strong>holds</strong></td>');
    expect(html).toContain('weak model, baseline (baseline, weak)');
    expect(html).toContain('33,000 · 600');
    expect(html).toContain('never mixed with the same-model results');
  });

  it('words a lower mean short of the variance apart from a worse one, and a better one as better', () => {
    const built = paritySection(
      [
        ...runs('baseline', 'strong', 0.5, 600_000, 1),
        ...runs('baseline', 'weak', 0.05, 300_000),
        ...runs('wingfoil', 'weak', 0.1, 400_000, 1).map((run, i) => ({ ...run, mQ1: i === 0 ? 0.9 : 1 })),
      ],
      'strong',
    );
    const page = parityPage('T', built as ParitySection);
    expect(page).toContain('<span class="verdict">lower, not beyond the variance, within variance</span>');
  });

  it('estimates the local time per profile, under the assumptions’ sentence', () => {
    expect(html).toContain('slow (300 · 15 tokens/s): no cache · prefix cache');
    expect(html).toContain('<td>2.5 min · 0.8 min</td>');
    expect(html).toContain('<td>slow · slow</td>');
    expect(html).toContain('The profiles are assumptions, not measurements');
  });

  it('escapes every value and holds no script', () => {
    expect(html).not.toContain('strong<b>');
    expect(html).not.toContain('<script');
  });
});
