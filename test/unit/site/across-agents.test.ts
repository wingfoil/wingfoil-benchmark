import { describe, expect, it } from 'vitest';

import { acrossAgents, acrossAgentsFile, acrossAgentsPage } from '../../../src/site/across-agents.js';
import type { CampaignComparison } from '../../../src/results/index.js';

/** An aggregate group of the baseline arm, figures by hand: `passed` of 10 public, of 5 hold-out, per run. */
function group(
  scenario: string,
  model: string,
  passed: readonly number[],
  extra: Record<string, unknown> = {},
) {
  const runs = passed.map((_, i) => `x/1/runs/${scenario}@1.0/baseline/${model}/r${i + 1}`);
  const value = <T>(values: readonly T[]) => ({ n: runs.length, runs, values });
  return {
    scenario,
    version: '1.0',
    arm: 'baseline',
    model,
    runs,
    n: runs.length,
    preliminary: runs.length < 3,
    metrics: {
      m_q1: { final: { m_q1: value(passed.map((p) => ({ passed: p, total: 10 }))) } },
      holdout: {
        scored: true,
        final: { m_q1: value(passed.map((p) => ({ passed: Math.min(p, 5), total: 5 }))) },
      },
      cost: { cost_usd: value(passed.map(() => 0.25)), turns: value(passed.map(() => 4)) },
      checks: [
        {
          id: 'duplicate',
          kind: 'content',
          steps: [
            { step: 2, passed: value(passed.map(() => ({ passed: 1, total: 1 }))) },
            { step: 3, passed: value(passed.map(() => ({ passed: 0, total: 1 }))) },
          ],
        },
      ],
      m_f1: { share: value(passed.map(() => ({ passed: 3, total: 5 }))) },
      m_r: {
        n: runs.length,
        runs,
        ...(runs.length > 1 ? { m_r1: { agree: 9, total: 10 }, m_r2: { mean: 0.5 } } : {}),
      },
      ...extra,
    },
  };
}

const EARLIER = { campaign: '81ebb2691f9c', execution: 1, model: 'claude-sonnet-5-5' };
const NEWER = { campaign: '4682bcc65d6b', execution: 1, model: 'gpt-6.1-sol' };

const comparison = {
  comparison_version: 2,
  earlier: EARLIER,
  newer: NEWER,
  order: 'maintainer',
  pins_differ: [
    { pin: 'agent.name', earlier: 'claude-code', newer: 'codex' },
    { pin: 'models.default', earlier: 'claude-sonnet-5-5', newer: 'gpt-6.1-sol' },
  ],
  compared: [],
  rows: [],
  m_r_across: [
    {
      scenario: 'S1',
      version: '1.0',
      arm: 'baseline',
      model: 'claude-sonnet-5-5 → gpt-6.1-sol',
      earlier: { n: 3, runs: [], not_reached: [] },
      newer: { n: 3, runs: [], not_reached: [] },
      m_r1: { agree: 8, total: 10 },
      m_r2: { mean: 0.4, pairs: [] },
    },
  ],
  not_compared: [],
  only_in: [],
} as unknown as CampaignComparison;

const earlierAggregate = {
  model: 'claude-sonnet-5-5',
  groups: [group('S1', 'claude-sonnet-5-5', [10, 10, 9]), group('S2', 'claude-sonnet-5-5', [7])],
  slices: [group('S1', 'claude-opus-5-5', [10])],
};
/** Codex's runs are priced from the price table (`cost.unpriced`, bug-016). */
function priced(g: ReturnType<typeof group>) {
  return { ...g, metrics: { ...g.metrics, cost: { ...g.metrics.cost, unpriced: g.runs } } };
}
const newerAggregate = {
  model: 'gpt-6.1-sol',
  groups: [
    priced(group('S1', 'gpt-6.1-sol', [10, 10, 10])),
    priced(group('S2', 'gpt-6.1-sol', [8])),
    { ...group('S1', 'gpt-6.1-sol', [1]), arm: 'wingfoil', model: 'not-a-baseline-model' },
  ],
  slices: [priced(group('S1', '<gpt-6-luna>', [6, 10, 6]))],
};

describe('the across-agents comparison page (REQ-RES-07 as amended in 1.36, task-104)', () => {
  it('is the comparison of two executions whose agents differ, in the newer execution', () => {
    expect(acrossAgents(comparison)).toBe(true);
    expect(acrossAgents({ ...comparison, pins_differ: comparison.pins_differ.slice(1) })).toBe(false);
    expect(acrossAgentsFile(comparison)).toBe('across-agents-81ebb2691f9c-1.html');
  });

  const page = acrossAgentsPage(comparison, earlierAggregate, newerAggregate, [
    'Codex ran on a ChatGPT Plus subscription; its cost is API-equivalent from a pinned price table.',
  ]);

  it('shows, per scenario of the baseline arm, one row per model of each agent, with n on every value', () => {
    expect(page).toContain('<h2>S1@1.0</h2>');
    expect(page).toContain('<h2>S2@1.0</h2>');
    for (const model of ['claude-sonnet-5-5', 'claude-opus-5-5', 'gpt-6.1-sol', '&lt;gpt-6-luna&gt;']) {
      expect(page).toContain(`<td>${model}</td>`);
    }
    expect(page).toContain('<td>claude-code</td>');
    expect(page).toContain('<td>codex</td>');
    expect(page).toContain('9–10/10');
    expect(page).toContain('n = 3');
    expect(page).toContain('M-R across');
    expect(page).toContain('8/10');
  });

  it('marks preliminary values, states the notes at its top, and has no headline, mark or script', () => {
    expect(page).toContain('preliminary');
    expect(page.indexOf('ChatGPT Plus')).toBeLessThan(page.indexOf('<h2>S1@1.0</h2>'));
    expect(page).not.toMatch(/[▲▼]/);
    expect(page).not.toContain('class="headline"');
    expect(page).not.toContain('<script');
  });

  it('shows each cell with its own n, and the cost with its basis (review round 1)', () => {
    const sonnet = page.slice(
      page.indexOf('<td>claude-sonnet-5-5</td>'),
      page.indexOf('</tr>', page.indexOf('<td>claude-sonnet-5-5</td>')),
    );
    const sol = page.slice(
      page.indexOf('<td>gpt-6.1-sol</td>'),
      page.indexOf('</tr>', page.indexOf('<td>gpt-6.1-sol</td>')),
    );
    // hold-out, checks summed over every scored step, M-F1
    expect(sonnet).toContain('5/5');
    expect(sonnet).toContain('1/2');
    expect(sonnet).toContain('3/5');
    // the cost's basis: reported by the agent, or from the price table
    expect(sonnet).toContain('0.2500');
    expect(sonnet).toContain('reported by the agent');
    expect(sol).toContain('price table');
    // M-R1 and M-R2 within the agent, with their n
    expect(sonnet).toMatch(/9\/10 <span class="n">n = 3<\/span>/);
  });

  it('marks a preliminary M-R across, leaves non-baseline groups out, and shows a missing value as a dash', () => {
    expect(page).not.toContain('not-a-baseline-model');
    const s2 = page.slice(page.indexOf('<h2>S2@1.0</h2>'));
    expect(s2).toContain('<td>—</td>');
    const lowN = acrossAgentsPage(
      {
        ...comparison,
        m_r_across: [{ ...comparison.m_r_across[0], earlier: { n: 1, runs: [], not_reached: [] } }],
      } as unknown as CampaignComparison,
      earlierAggregate,
      newerAggregate,
      [],
    );
    const across = lowN.slice(lowN.indexOf('M-R across the two agents'));
    expect(across).toContain('<span class="preliminary">preliminary</span>');
    const nothing = acrossAgentsPage(
      {
        ...comparison,
        m_r_across: [{ ...comparison.m_r_across[0], m_r1: undefined, m_r2: undefined }],
      } as unknown as CampaignComparison,
      earlierAggregate,
      newerAggregate,
      [],
    );
    expect(nothing).toContain('claude-sonnet-5-5 → gpt-6.1-sol: not measured');
  });
});
