import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readableTranscript } from '../../../src/agents/index.js';
import { compareRuns, showRun } from '../../../src/cli/show.js';
import type { RunDetail } from '../../../src/results/index.js';
import { readRunDetail } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const USAGE = {
  inputTokens: 1,
  outputTokens: 2,
  cacheCreationInputTokens: 3,
  cacheReadInputTokens: 4,
  costUsd: 0.5,
  costEur: 0.25,
  turns: 2,
  durationMs: 1500,
};

/** A run with everything the detail can show: pins, a setup, an error, a scored hold-out, checks, M-F1, M-D3, M-Q2. */
const RICH: RunDetail = {
  dir: '/r',
  name: 'dry-runs/3/runs/S3@1.0/wingfoil/m/r2',
  origin: { dryRun: true, execution: '3' },
  scenario: 'S3',
  version: '1.0',
  scenarioHash: 'sha256:s3',
  arm: 'wingfoil',
  model: 'm',
  repetition: 2,
  outcome: 'failed',
  error: 'step 02 timed out',
  agent: 'claude-code',
  approverPolicy: 'v1',
  harness: { tool: 'wingfoil', commit: 'abc' },
  manualTokens: 463,
  setup: { durationMs: 1200, costUsd: 0 },
  steps: [{ n: 1, outcome: 'completed', interventions: 0, usage: USAGE, patch: '', messages: [] }],
  interventions: [],
  score: {
    steps: [
      { n: 1, suites: [{ id: 'a', passed: 1, total: 2, failed: ['t > x'] }], m_q1: { passed: 1, total: 2 } },
      { n: 2, not_reached: true },
      { n: 3, suites: [] },
    ],
    final: { step: 3, suites: [{ id: 'a', passed: 2, total: 2, failed: [] }], m_q1: { passed: 2, total: 2 } },
    holdout: { scored: true, final: { step: 3, m_q1: { passed: 3, total: 4 } } },
    checks: [
      {
        id: 'r1',
        kind: 'ast',
        steps: [
          { n: 1, passed: false, violations: 2 },
          { n: 2, not_reached: true },
        ],
      },
    ],
    cost: { steps: [{ n: 1, cost_eur: 0.25 }], run: { cost_eur: 0.25 } },
    m_f1: { consistent: 4, total: 5 },
    m_d3: { count: 1 },
    m_q2: {
      lint: { findings: 1, lines: 10 },
      complexity: { sum: 3, functions: 2 },
      duplication: { duplicated_lines: 0, lines: 10 },
      coverage: { covered: 5, total: 8 },
    },
  },
};

describe('showRun (F5.3, task-043)', () => {
  it('shows a dry run with its pins, setup, error, and every scored figure', () => {
    const text = showRun(RICH, false);
    expect(text).toContain('- dry run: execution 3');
    expect(text).toContain('- outcome: failed (step 02 timed out)');
    expect(text).toContain('- agent: claude-code, approver policy: v1');
    expect(text).toContain('- harness: wingfoil abc');
    expect(text).toContain('- manual: 463 tokens');
    expect(text).toContain('- setup: 1200 ms, 0.0000 USD');
    expect(text).toContain('- cost: 0.5000 USD, 0.2500 EUR, 2 turns, 1.5 s');
    expect(text).toContain('- commits: none');
    expect(text).toContain('### Diff\n\nno change');
    expect(text).toContain('- step 01: M-Q1 1/2 (a 1/2)\n  - failing: t > x');
    expect(text).toContain('- step 02: not reached');
    expect(text).toContain('- step 03: no suite');
    expect(text).toContain('- hold-out: final 3/4');
    expect(text).toContain('- check r1 (ast): step 01 failed (2 violations), step 02 not reached');
    expect(text).toContain('- M-F1: 4/5');
    expect(text).toContain('- M-D3: 1');
    expect(text).toContain('- M-Q2: lint 1/10, complexity 3/2, duplication 0/10, coverage 5/8');
  });

  it('shows the effort the model ran at, and a cost the agent could not price (dl-015, bug-016)', () => {
    const model = (costBasis?: string) => ({
      inputTokens: 1,
      outputTokens: 2,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 3,
      costUsd: 0.5,
      ...(costBasis === undefined ? {} : { costBasis }),
    });
    const text = showRun(
      {
        ...RICH,
        effort: 'high',
        steps: [
          {
            n: 1,
            outcome: 'completed',
            interventions: 0,
            usage: USAGE,
            patch: '',
            messages: [],
            models: { 'claude-sonnet-5-5': model('unknown'), 'claude-haiku-4-5': model('list') },
          },
        ],
      },
      false,
    );
    expect(text).toContain('- arm: wingfoil, model: m at effort high, repetition: 2');
    expect(text).toContain('- unpriced: the agent could not price claude-sonnet-5-5 (unknown)');
    expect(text).toContain('claude-sonnet-5-5 (output 2, cache read 3, 0.5000 USD, priced unknown)');
    expect(text).toContain('claude-haiku-4-5 (output 2, cache read 3, 0.5000 USD)');
    // A run with no effort and every cost priced shows neither.
    const plain = showRun(RICH, false);
    expect(plain).toContain('- arm: wingfoil, model: m, repetition: 2');
    expect(plain).not.toContain('unpriced');
  });

  it('says what a score could not reach or apply', () => {
    const score = {
      ...RICH.score,
      steps: [],
      final: { not_reached: true as const },
      holdout: { scored: true, final: { not_reached: true as const } },
      m_f1: {},
      m_d3: {},
      m_q2: { not_reached: true },
    } as RunDetail['score'];
    const text = showRun({ ...RICH, score }, false);
    expect(text).toContain('- final: not reached');
    expect(text).toContain('- hold-out: final not reached');
    expect(text).toContain('- M-F1: not reached');
    expect(text).toContain('- M-D3: not reached');
    expect(text).toContain('- M-Q2: not reached');
    const notApplicable = showRun(
      { ...RICH, score: { ...score, m_q2: { not_applicable: true } } as RunDetail['score'] },
      false,
    );
    expect(notApplicable).toContain('- M-Q2: not applicable');
    const unscoredHoldout = showRun(
      {
        ...RICH,
        score: { ...score, holdout: { scored: false, reason: 'not configured' } } as RunDetail['score'],
      },
      false,
    );
    expect(unscoredHoldout).toContain('- hold-out: not scored (not configured)');
  });
});

describe('compareRuns (task-043)', () => {
  it('tells two runs of one arm and repetition apart by their model, and shows their scored rows', () => {
    const other: RunDetail = { ...RICH, model: 'n', name: 'dry-runs/3/runs/S3@1.0/wingfoil/n/r2' };
    const text = compareRuns(RICH, other);
    expect(text).toContain('| step | wingfoil m r2 cost |');
    expect(text).toContain('| 01 | 0.2500 EUR | 1/2 | 0 | 0.2500 EUR | 1/2 | 0 |');
    expect(text).toContain('| hold-out final | — | 3/4 | — | — | 3/4 | — |');
    expect(text).toContain('| checks | — | 0/1 | — | — | 0/1 | — |');
    expect(text).toContain('| total | 0.2500 EUR | — | 0 | 0.2500 EUR | — | 0 |');
  });
});

describe('the transcript and the name, at their edges (task-043)', () => {
  it('keeps an event it does not know as it is', () => {
    expect(readableTranscript(['{"type":"stream_event","x":1}', ''], { full: false })).toEqual([
      '- ? {"type":"stream_event","x":1}',
    ]);
  });

  it('names a run outside the results layout by its directory', () => {
    const dir = join(tempDir('bench-detail-plain-'), 'somewhere');
    mkdirSync(dir);
    writeFileSync(
      join(dir, 'run.json'),
      JSON.stringify({
        scenario: 'T3',
        version: '1.0',
        scenario_hash: 'h',
        arm: 'baseline',
        model: 'm',
        repetition: 1,
        agent: { name: 'fake' },
        outcome: 'completed',
        steps: [],
      }),
    );
    const detail = readRunDetail(dir);
    expect(detail.ok && detail.value).toMatchObject({ name: dir, origin: {}, agent: 'fake' });
  });
});
