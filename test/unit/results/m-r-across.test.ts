import { describe, expect, it } from 'vitest';

import { mRAcross } from '../../../src/results/index.js';
import type { MRRun } from '../../../src/results/index.js';

/** A run that reached its final snapshot: one suite of four tests, those failing, its interface and paths. */
function run(name: string, failed: string[], api: string[], paths: string[], hash = 'h1'): MRRun {
  return {
    name,
    score: {
      scenario_hash: hash,
      scorer: { image: 'bench-score:x' },
      final: { n: 3, suites: [{ id: 'public', passed: 4 - failed.length, total: 4, failed }] },
      determinism: { interface: api, paths },
    },
  };
}

const NOT_REACHED: MRRun = {
  name: 'b/1/S3@1.0/baseline/m/r9',
  score: { scenario_hash: 'h1', scorer: { image: 'bench-score:x' }, final: { n: 3, not_reached: true } },
};

describe('M-R across two executions (REQ-SCO-07 as amended in 1.32, experiment design 1.4 §4.5)', () => {
  const a1 = run('a/1/S3@1.0/baseline/claude/r1', ['t2'], ['x', 'y'], ['src/a.ts', 'src/b.ts']);
  const a2 = run('a/1/S3@1.0/baseline/claude/r2', ['t2'], ['x', 'y'], ['src/a.ts', 'src/b.ts']);
  const b1 = run('b/1/S3@1.0/baseline/gpt/r1', ['t2', 't3'], ['x', 'z'], ['src/a.ts', 'src/c.ts']);

  it('takes M-R1 over the pooled runs: a test agrees when every run of both sides gives it one verdict', () => {
    expect(mRAcross([a1, a2], [b1]).m_r1).toEqual({ agree: 3, total: 4 });
  });

  it('takes M-R2 and M-R3 over the cross pairs only, one run from each side', () => {
    const across = mRAcross([a1, a2], [b1]);

    expect(across.m_r2?.pairs.map((pair) => pair.runs)).toEqual([
      [a1.name, b1.name],
      [a2.name, b1.name],
    ]);
    expect(across.m_r2?.mean).toBe(0.3333);
    expect(across.m_r3?.mean).toBe(0.3333);
  });

  it('names the runs compared on each side, and those that did not reach their final snapshot', () => {
    expect(mRAcross([a1, a2], [b1, NOT_REACHED])).toMatchObject({
      earlier: { n: 2, runs: [a1.name, a2.name], not_reached: [] },
      newer: { n: 1, runs: [b1.name], not_reached: [NOT_REACHED.name] },
    });
  });

  it('gives no value when a per-run pin differs, and names it', () => {
    const other = run('b/1/S3@1.0/baseline/gpt/r1', ['t2'], ['x'], ['src/a.ts'], 'h2');
    const across = mRAcross([a1], [other]);

    expect(across.pins_differ).toEqual(['scenario_hash']);
    expect(across).not.toHaveProperty('m_r1');
    expect(across).not.toHaveProperty('m_r2');
  });

  it('gives no value when a side has no run that reached its final snapshot', () => {
    const across = mRAcross([a1], [NOT_REACHED]);

    expect(across.newer.n).toBe(0);
    expect(across).not.toHaveProperty('m_r1');
  });
});
