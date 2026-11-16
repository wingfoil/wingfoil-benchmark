// The review loop's metrics in the aggregate (task-150, REQ-SCO-16): the fix's lines, the outcomes without a value,
// the loops' records, the reviewer's bound, the comparisons, and nothing changed for an execution without loops.
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { aggregateExecution, fixLines, readMetric } from '../../../src/results/index.js';
import type { AggregateFile, Group } from '../../../src/results/index.js';
import { CAMPAIGN, execution } from '../../support/aggregate-fixture.js';
import type { RunSpec } from '../../support/aggregate-fixture.js';
import { cleanAt, loopFinding, notCleanAt5, patchChanging, writeReviewLoop } from '../../support/loop-records.js';

const PINS = 'models:\n  default: model-a\ncurrency:\n  usd_to_eur: 0.5\n';
const ONE_STEP = [[{ id: 'orders', passed: 1, total: 1 }]];

function runDir(dir: string, arm: string, r = 1): string {
  return join(dir, 'runs', 'T3@1.0', arm, 'model-a', `r${r}`);
}

function nameOf(arm: string, r = 1): string {
  return `${CAMPAIGN}/1/runs/T3@1.0/${arm}/model-a/r${r}`;
}

function aggregated(dir: string): AggregateFile {
  const aggregate = aggregateExecution(dir);
  if (!aggregate.ok) throw new Error(JSON.stringify(aggregate.issues));
  return aggregate.value;
}

function groupOf(aggregate: AggregateFile, arm: string): Group {
  const group = aggregate.groups.find((candidate) => candidate.arm === arm);
  if (group === undefined) throw new Error(`no group of ${arm}`);
  return group;
}

describe("a fix's lines (fixLines, REQ-SCO-16's M-V2)", () => {
  it('reads the lines a hunk added or changed, on the new side', () => {
    expect(fixLines(patchChanging('src/cart.ts', 10, 14))).toEqual(new Map([['src/cart.ts', [10, 11, 12, 13, 14]]]));
  });

  it('reads every line of an added file', () => {
    const patch =
      'diff --git a/src/new.ts b/src/new.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/new.ts\n' +
      '@@ -0,0 +1,3 @@\n+one\n+two\n+three\n';
    expect(fixLines(patch)).toEqual(new Map([['src/new.ts', [1, 2, 3]]]));
  });

  it('reads no line where a hunk only deleted, nor of a deleted file', () => {
    const patch =
      'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -4,3 +4,2 @@\n keep\n-gone\n keep\n' +
      'diff --git a/src/b.ts b/src/b.ts\ndeleted file mode 100644\n--- a/src/b.ts\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-x\n-y\n';
    expect(fixLines(patch)).toEqual(new Map());
  });

  it("reads a renamed file's changed lines under its new path, and skips a binary file", () => {
    const patch =
      'diff --git a/src/old.ts b/src/renamed.ts\nsimilarity index 90%\nrename from src/old.ts\nrename to src/renamed.ts\n' +
      '--- a/src/old.ts\n+++ b/src/renamed.ts\n@@ -1,3 +1,3 @@\n same\n-was\n+is\n same\n' +
      'diff --git a/logo.png b/logo.png\nBinary files a/logo.png and b/logo.png differ\n';
    expect(fixLines(patch)).toEqual(new Map([['src/renamed.ts', [2]]]));
  });

  it('counts every hunk of a file, each from its own start', () => {
    const patch =
      'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,2 +1,3 @@\n a\n+b\n c\n' +
      '@@ -20,2 +21,2 @@\n x\n-y\n+z\n';
    expect(fixLines(patch)).toEqual(new Map([['src/a.ts', [2, 22]]]));
  });
});

describe("the loop's metrics in the aggregate (task-150, REQ-SCO-16)", () => {
  it('counts every outcome without a value apart, by outcome, never as a round', () => {
    const outcomes = ['failed', 'no fix', 'interrupted', 'quota exhausted', 'no loop'];
    const dir = execution(
      outcomes.map((_, index) => ({ arm: 'baseline', r: index + 1, steps: ONE_STEP })),
      PINS,
    );
    outcomes.forEach((outcome, index) =>
      writeReviewLoop(runDir(dir, 'baseline', index + 1), {
        outcome,
        reason: `why ${outcome}`,
        rounds: outcome === 'no loop' ? [] : [{ findings: null }],
      }),
    );
    const mV = groupOf(aggregated(dir), 'baseline').metrics.m_v;
    expect(mV?.rounds_to_clean).toEqual({ n: 0, runs: [], values: [] });
    expect(mV?.not_clean).toEqual([]);
    expect(mV?.no_value).toEqual(outcomes.map((outcome, index) => ({ outcome, runs: [nameOf('baseline', index + 1)] })));
    // `no loop` has no loop, so no cost: M-V3 reads the four loops that ran.
    expect(mV?.cost.total.runs).toEqual([1, 2, 3, 4].map((r) => nameOf('baseline', r)));
  });

  it("stores each run's loop for the site: outcome, reason, reviewer, and each finding without its why", () => {
    const dir = execution([{ arm: 'baseline', steps: ONE_STEP }], PINS);
    writeReviewLoop(runDir(dir, 'baseline'), {
      outcome: 'clean',
      rounds: [
        {
          findings: [loopFinding('blocker', 'src/cart.ts', 12, 'Refund skips the ledger')],
          fix: { patch: patchChanging('src/cart.ts', 10, 14) },
        },
        { findings: [loopFinding('nit', 'README.md', null, 'A typo')] },
      ],
    });
    const aggregate = aggregated(dir);
    expect(aggregate.review_loops).toEqual([
      {
        run: nameOf('baseline'),
        outcome: 'clean',
        reviewer: { agent: 'claude-code', version: '2.1.0', model: 'reviewer-model', effort: 'high' },
        max_rounds: 5,
        rounds: [
          {
            n: 1,
            fixed: true,
            findings: [{ severity: 'blocker', file: 'src/cart.ts', line: 12, title: 'Refund skips the ledger' }],
          },
          { n: 2, fixed: false, findings: [{ severity: 'nit', file: 'README.md', line: null, title: 'A typo' }] },
        ],
      },
    ]);
    expect(JSON.stringify(aggregate)).not.toContain('Because of');
  });

  it("names a reviewer's session counted at its bound, and counts it at the bound", () => {
    const dir = execution([{ arm: 'baseline', steps: ONE_STEP }], PINS);
    writeReviewLoop(runDir(dir, 'baseline'), {
      outcome: 'failed',
      reason: "round 1's reviewer was killed at its time cap",
      rounds: [{ findings: null, reviewerEur: 0.01, reviewerBoundEur: 0.4 }],
    });
    const cost = groupOf(aggregated(dir), 'baseline').metrics.m_v?.cost;
    expect(cost?.reviewer.cost_eur.values).toEqual([0.4]);
    expect(cost?.reviewer.bound).toEqual([nameOf('baseline')]);
    expect(cost?.total.bound).toEqual([nameOf('baseline')]);
  });

  it('names the runs of a group with loops that recorded none', () => {
    const dir = execution(
      [1, 2].map((r) => ({ arm: 'baseline', r, steps: ONE_STEP })),
      PINS,
    );
    writeReviewLoop(runDir(dir, 'baseline', 1), cleanAt(1));
    expect(groupOf(aggregated(dir), 'baseline').metrics.m_v?.not_recorded).toEqual([nameOf('baseline', 2)]);
  });

  it('refuses a loop record it cannot read, naming the file', () => {
    const dir = execution([{ arm: 'baseline', steps: ONE_STEP }], PINS);
    writeReviewLoop(runDir(dir, 'baseline'), cleanAt(1));
    writeFileSync(join(runDir(dir, 'baseline'), 'review', 'loop.json'), '{"outcome": 3}');
    const aggregate = aggregateExecution(dir);
    expect(aggregate.ok).toBe(false);
    if (!aggregate.ok) expect(aggregate.issues[0]?.path).toBe('runs/T3@1.0/baseline/model-a/r1/review/loop.json');
  });

  it('writes the same aggregate as before for an execution without loops, and the same figures beside a loop', () => {
    const runs: RunSpec[] = [
      { arm: 'baseline', steps: ONE_STEP, costEur: 0.5 },
      { arm: 'wingfoil', steps: ONE_STEP, costEur: 0.7, harnessCommit: 'abc1234' },
    ];
    const dir = execution(runs, PINS);
    const before = aggregated(dir);
    expect(before.review_loops).toBeUndefined();
    expect(before.groups.every((group) => group.metrics.m_v === undefined)).toBe(true);
    expect(Object.keys(before)).not.toContain('review_loops');

    writeReviewLoop(runDir(dir, 'baseline'), cleanAt(2));
    writeReviewLoop(runDir(dir, 'wingfoil'), notCleanAt5());
    const after = aggregated(dir);
    const strip = (aggregate: AggregateFile) => {
      const { review_loops: _loops, ...rest } = aggregate;
      return {
        ...rest,
        groups: rest.groups.map((group) => {
          const { m_v: _mV, ...metrics } = group.metrics;
          return { ...group, metrics };
        }),
      };
    };
    expect(strip(after)).toEqual(strip(before));
    expect(JSON.stringify(strip(after))).toBe(JSON.stringify(before));

    // The records removed again, the aggregate is byte for byte the first.
    for (const arm of ['baseline', 'wingfoil']) rmSync(join(runDir(dir, arm), 'review'), { recursive: true });
    expect(JSON.stringify(aggregated(dir))).toBe(JSON.stringify(before));
    expect(readdirSync(runDir(dir, 'baseline'))).not.toContain('review');
  });
});

describe("the loop's metrics compared (task-150, REQ-SCO-16, REQ-SCO-14)", () => {
  /** A harness, its docs control and the baseline, each with the loops `specs` gives it. */
  function compared(specs: Record<string, Parameters<typeof writeReviewLoop>[1][]>): AggregateFile {
    const runs: RunSpec[] = Object.entries(specs).flatMap(([arm, loops]) =>
      loops.map((_, index) => ({
        arm,
        r: index + 1,
        steps: ONE_STEP,
        ...(arm === 'wingfoil' ? { harnessCommit: 'abc1234' } : {}),
        ...(arm === 'wingfoil-docs' ? { docsOf: 'wingfoil' } : {}),
      })),
    );
    const dir = execution(runs, PINS);
    for (const [arm, loops] of Object.entries(specs)) {
      loops.forEach((spec, index) => writeReviewLoop(runDir(dir, arm, index + 1), spec));
    }
    return aggregated(dir);
  }

  it('reads M-V1 to M-V3 as figures, M-V2 as shares', () => {
    const aggregate = compared({ baseline: [cleanAt(1), cleanAt(3)] });
    const group = groupOf(aggregate, 'baseline');
    expect(readMetric('M-V1', group)?.values).toEqual([1, 3]);
    expect(readMetric('M-V2', group)?.values).toEqual([0, 0]);
    expect(readMetric('M-V3', group)?.values.length).toBe(2);
    expect(readMetric('M-V1', group)?.withheld).toBeUndefined();
  });

  it('withholds M-V1 when a loop has no value, naming the counts', () => {
    const aggregate = compared({ baseline: [cleanAt(1), notCleanAt5(), { outcome: 'failed', reason: 'x' }] });
    expect(readMetric('M-V1', groupOf(aggregate, 'baseline'))?.withheld).toBe(
      '1 loop not clean at 5, 1 loop failed',
    );
  });

  it('compares a harness with its docs control on the three, by the same rule', () => {
    const aggregate = compared({
      wingfoil: [cleanAt(1), cleanAt(1)],
      'wingfoil-docs': [cleanAt(2), cleanAt(3)],
    });
    const metrics = aggregate.controls?.[0]?.metrics ?? [];
    const v1 = metrics.find((metric) => metric.metric === 'M-V1');
    expect(v1).toMatchObject({ outcome: 'better', delta: -1.5, certainty: 'preliminary' });
    expect(metrics.map((metric) => metric.metric)).toEqual(expect.arrayContaining(['M-V1', 'M-V2', 'M-V3']));
  });

  it("says why M-V1 is not compared with a docs control when a side's loop has no value", () => {
    const aggregate = compared({
      wingfoil: [cleanAt(1), notCleanAt5()],
      'wingfoil-docs': [cleanAt(2), cleanAt(3)],
    });
    const v1 = aggregate.controls?.[0]?.metrics.find((metric) => metric.metric === 'M-V1');
    expect(v1).toEqual({ metric: 'M-V1', note: 'not compared: wingfoil has 1 loop not clean at 5' });
  });
});
