import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findingNote } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const RUNS = ['c/1/runs/S3@1.0/wingfoil/m/r1', 'c/1/runs/S3@1.0/wingfoil/m/r2'];
const value = <T>(values: T[]) => ({ n: values.length, runs: RUNS.slice(0, values.length), values });
const snapshot = { m_q1: value([{ passed: 3, total: 4 }]), suites: [], not_reached: [] };
const cost = {
  cost_eur: value([0.1]),
  cost_usd: value([0.2]),
  tokens_input: value([1]),
  tokens_output: value([2]),
  tokens_cache_creation: value([3]),
  tokens_cache_read: value([4]),
  wall_time_ms: value([1000]),
  turns: value([5]),
  interventions: value([0]),
  bound: [RUNS[0]],
};

/** An aggregate of S3 in two arms, each metric in a form the fixture execution never reaches. */
function execution(wingfoil: Record<string, unknown>): string {
  const dir = join(tempDir('bench-finding-values-'), 'results', 'c', '1');
  mkdirSync(dir, { recursive: true });
  const group = (arm: string, metrics: Record<string, unknown>) => ({
    scenario: 'S3',
    version: '1.0',
    arm,
    model: 'm',
    runs: RUNS,
    n: 2,
    preliminary: false,
    losses: [{ run: RUNS[1], reason: 'final not reached' }],
    metrics: {
      m_q1: { steps: [], final: { ...snapshot, not_reached: [RUNS[1]] } },
      holdout: { scored: true, not_scored: [], steps: [], final: snapshot },
      cost,
      regressions: [],
      checks: [],
      m_r: { n: 2, runs: RUNS, not_reached: [], pins_differ: ['scorer'] },
      ...metrics,
    },
  });
  // Each run's record: what the note reads besides the aggregate (its scenario hash and harness).
  for (const run of RUNS) {
    for (const arm of ['baseline', 'wingfoil']) {
      const runDir = join(dir, run.split('/').slice(2).join('/').replace('/wingfoil/', `/${arm}/`));
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'run.json'), JSON.stringify({ scenario_hash: 'sha256:s3' }));
    }
  }
  writeFileSync(
    join(dir, 'aggregate.json'),
    JSON.stringify({
      aggregate_version: 1,
      campaign: 'c',
      execution: 1,
      model: 'm',
      groups: [group('baseline', {}), group('wingfoil', wingfoil)],
      slices: [],
      break_even: [],
    }),
  );
  return dir;
}

function values(dir: string, metric: string): string {
  const note = findingNote({ executionDir: dir, scenario: 'S3', version: '1.0', metric, arms: ['wingfoil'], as: 'bug' });
  if (!note.ok) throw new Error(JSON.stringify(note.issues));
  return note.value.text.split('## Metric values')[1]?.split('## Links')[0] ?? '';
}

describe('findingNote, every form of a metric (task-044)', () => {
  it('reads what an execution of S3 would hold, and says each lack', () => {
    const dir = execution({
      m_q2: {
        lint: value([]),
        complexity_mean: value([]),
        complexity_max: value([]),
        duplication: value([]),
        coverage: value([]),
        not_reached: [RUNS[1]],
        not_applicable: [RUNS[0]],
      },
      m_f1: {
        share: value([{ passed: 4, total: 5 }]),
        decisions: [{ id: 'D3', consistent: value([{ passed: 0, total: 1 }]), outcomes: { respected: 0, revised: 0, failed: 1 } }],
        not_reached: [],
      },
      m_f2: { steps: [{ step: 2, cost_eur: value([0.1]), m_q1: value([]), not_reached: [RUNS[1]] }] },
      checks: [
        { id: 'r1', kind: 'dependencies', steps: [{ step: 1, passed: value([]), violations: value([2]), not_reached: [] }] },
      ],
    });
    expect(values(dir, 'M-Q1')).toContain(`- final not reached: ${RUNS[1]}`);
    expect(values(dir, 'M-Q1-holdout')).toContain('- hold-out final M-Q1: 3/4 (r1)');
    expect(values(dir, 'M-Q2')).toContain('- lint (findings/lines): no value');
    expect(values(dir, 'M-Q2')).toContain(`- not applicable: ${RUNS[0]}`);
    expect(values(dir, 'M-D3')).toContain('not measured for this scenario');
    expect(values(dir, 'M-F1')).toContain('- D3: 0/1 (r1); respected 0, revised 0, failed 1');
    expect(values(dir, 'M-F2')).toContain(`- step 02: cost 0.1000 EUR (r1); M-Q1 no value; not reached: ${RUNS[1]}`);
    expect(values(dir, 'M-K1')).toContain(`- cost is a bound for: ${RUNS[0]}`);
    expect(values(dir, 'M-K3')).toContain('- setup not recorded for this arm');
    expect(values(dir, 'M-K4')).toContain('- wingfoil: no break-even (no baseline, or a run scored before step costs)');
    expect(values(dir, 'M-E1')).toContain('- r1, step 01: violations 2 (r1)');
    expect(values(dir, 'M-R')).toContain('- wingfoil: pins differ (scorer): no value');
  });

  it("never lists the gate's violations (M-E2) under M-E1 (task-118 review round 1)", () => {
    const dir = execution({
      checks: [
        { id: 'm-e2-gate', kind: 'gate', steps: [{ step: 4, passed: value([]), violations: value([]), not_reached: [] }] },
      ],
    });
    expect(values(dir, 'M-E1')).toContain('- no directive check in this scenario');
  });

  it('says a scenario whose checks are not directives, and a determinism scored before M-R2', () => {
    const dir = execution({
      checks: [{ id: 'd3', kind: 'content', steps: [{ step: 4, passed: value([]), not_reached: [] }] }],
      m_r: { n: 2, runs: RUNS, not_reached: [RUNS[1]], m_r1: { agree: 1, total: 2 } },
    });
    expect(values(dir, 'M-E1')).toContain('- no directive check in this scenario');
    expect(values(dir, 'M-R')).toContain('- M-R2: not measured (scored before task-042)');
    expect(values(dir, 'M-R')).toContain(`- not reached, left out: ${RUNS[1]}`);
    const note = findingNote({ executionDir: dir, scenario: 'S3', version: '1.0', metric: 'M-Q1', arms: ['wingfoil'], as: 'bug' });
    expect(note.ok && note.value.text).toContain('- none: no arm named ran WingFoil');
    expect(note.ok && note.value.text).toContain(`  - loss: ${RUNS[1]} — final not reached`);
  });

  it('refuses an aggregate that is not JSON', () => {
    const dir = execution({});
    writeFileSync(join(dir, 'aggregate.json'), '{');
    const note = findingNote({ executionDir: dir, scenario: 'S3', version: '1.0', metric: 'M-Q1', arms: ['wingfoil'], as: 'bug' });
    expect(note.ok).toBe(false);
  });

  it("states a final not reached for M-D3 and M-F1, the hold-out's runs not scored, and a setup not recorded", () => {
    const dir = execution({
      m_d3: { value: value([0, 5]), not_reached: [RUNS[1]] },
      m_f1: { share: value([{ passed: 5, total: 5 }]), decisions: [], not_reached: [RUNS[1]] },
      holdout: { scored: true, not_scored: [{ run: RUNS[1], reason: 'not configured' }], steps: [], final: snapshot },
    });
    expect(values(dir, 'M-D3')).toContain(
      `- final not reached, a loss of every test the seed passed: ${RUNS[1]}`,
    );
    expect(values(dir, 'M-F1')).toContain(`- final not reached, nothing consistent: ${RUNS[1]}`);
    expect(values(dir, 'M-Q1-holdout')).toContain(`- hold-out not scored: ${RUNS[1]} (not configured)`);
    expect(values(dir, 'M-K3')).toContain('- setup not recorded for this arm');
  });

  it("states a hold-out final not reached, and a check's step not reached", () => {
    const dir = execution({
      holdout: { scored: true, not_scored: [], steps: [], final: { ...snapshot, not_reached: [RUNS[1]] } },
      checks: [
        { id: 'r1', kind: 'ast', steps: [{ step: 2, passed: value([]), violations: value([0]), not_reached: [RUNS[1]] }] },
      ],
    });
    expect(values(dir, 'M-Q1-holdout')).toContain(`- hold-out final not reached: ${RUNS[1]}`);
    expect(values(dir, 'M-E1')).toContain(`- r1, step 02: violations 0 (r1); not reached: ${RUNS[1]}`);
  });
});


describe('findingNote on M-K3 and M-K4, by aggregate version (task-129)', () => {
  const of = (aggregate: Record<string, unknown>, metric: string) => {
    const dir = execution({});
    const file = join(dir, 'aggregate.json');
    const read = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    writeFileSync(file, JSON.stringify({ ...read, ...aggregate }));
    return values(dir, metric);
  };
  const key = { scenario: 'S3', version: '1.0', model: 'm', arm: 'wingfoil' };

  it("reads a version-1 break-even by 1.15's rule", () => {
    const v1 = {
      ...key,
      value: 'never',
      setup_cost_eur: { arm: 0.3 },
      mean_step_cost_eur: { baseline: 0.1, arm: 0.2 },
      final_m_q1: { baseline: 1, arm: 1 },
      runs: { baseline: [], arm: [] },
      n: { baseline: 1, arm: 1 },
    };
    expect(of({ break_even: [v1] }, 'M-K4')).toContain("- wingfoil: never (1.15's rule); setup ");
  });

  it('reads a version-2 break-even with its reason and both comparisons, and M-K3 every model\'s', () => {
    const side = (n: number, mean?: number) => ({ runs: [], n, ...(mean === undefined ? {} : { mean, min: mean, max: mean }) });
    const v2 = {
      ...key,
      value: 'not applicable',
      reason: 'saving within variance',
      m_k3_eur: 0.3,
      quality: { outcome: 'same', baseline: side(3, 1), arm: side(3, 1) },
      step_cost: { outcome: 'within the variance', baseline: side(3, 0.2), arm: side(3, 0.19) },
    };
    const m_k3 = [{ scenario: 'S3', version: '1.0', arm: 'wingfoil', configuration_eur: 0, configuration: 'not recorded', setup_mean_eur: 0.3, value: 0.3, runs: [], n: 3 }];
    const k4 = of({ aggregate_version: 2, break_even: [v2], m_k3 }, 'M-K4');
    expect(k4).toContain('- wingfoil: not applicable (saving within variance); M-K3 ');
    expect(k4).toContain('within the variance, n 3 against 3');
    expect(of({ aggregate_version: 2, break_even: [v2], m_k3 }, 'M-K3')).toContain('(configuration not recorded; setup mean ');
  });
});
