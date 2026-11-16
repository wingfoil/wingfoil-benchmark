// task-151 — scripts/review-loop-figures.mjs: M-V1 to M-V3 of each dry run's review loop, read from its records with
// task-150's reader, so that no figure of the review loop's note is typed by hand.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { writeStoredDryRun } from '../support/dry-run-fixture.js';
import { cleanAt, loopFinding, patchChanging, writeReviewLoop } from '../support/loop-records.js';
import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

interface Row {
  readonly dryRun: string;
  readonly key: string;
  readonly outcome: string;
  readonly rounds: number;
  readonly mV1: number | null;
  readonly mV2: { readonly fix_induced: number; readonly findings: number } | null;
  readonly reviewerEur: number | null;
  readonly fixerEur: number | null;
  readonly totalEur: number | null;
}
interface Module {
  figures(root: string): Row[];
  markdown(rows: readonly Row[]): string;
}

describe('scripts/review-loop-figures.mjs (task-151)', { timeout: 600_000 }, () => {
  let mod: Module;
  beforeAll(async () => {
    execFileSync('npm', ['run', 'build'], { cwd: repoPath('.'), encoding: 'utf8' });
    mod = (await import(repoPath('scripts/review-loop-figures.mjs'))) as Module;
  }, 300_000);

  /** Three dry runs: S2's baseline closed at round 2, its wingfoil not clean at 5 with a fix-induced finding, S1's none. */
  function fixture(): string {
    const root = tempDir('review-loop-figures-');
    const store = (execution: number, id: string, arm: string) => {
      const dir = writeStoredDryRun(root, execution, {
        id,
        version: '1.1',
        hash: `sha256:${id}`,
        arm,
        stepCostsUsd: [1],
      });
      writeFileSync(join(dir, 'dry-run.yaml'), 'currency:\n  usd_to_eur: 0.5\n');
      return join(dir, 'runs', `${id}@1.1`, arm, 'fake-model', 'r1');
    };
    writeReviewLoop(store(1, 'S2', 'baseline'), cleanAt(2));
    writeReviewLoop(store(2, 'S2', 'wingfoil'), {
      outcome: 'not clean at 5',
      rounds: [
        {
          findings: [loopFinding('blocker', 'src/a.ts', 30)],
          fix: { patch: patchChanging('src/a.ts', 10, 12) },
        },
        ...Array.from({ length: 4 }, (_, i) => ({
          findings: [loopFinding('blocker', 'src/a.ts', 11)],
          ...(i < 3 ? { fix: { patch: patchChanging('src/a.ts', 10, 12) } } : {}),
        })),
      ],
    });
    store(3, 'S1', 'baseline');
    // A loop that never ran: no cost, shown as none (task-151's review).
    writeReviewLoop(store(4, 'S3', 'baseline'), { outcome: 'no loop', reason: 'failed' });
    return root;
  }

  it("reads each dry run's loop: its key, outcome, rounds, M-V1, M-V2 and M-V3 apart", () => {
    const rows = mod.figures(fixture());
    expect(rows).toEqual([
      {
        dryRun: 'dry-runs/1',
        key: 'S2@1.1/baseline/fake-model',
        outcome: 'clean',
        rounds: 2,
        mV1: 2,
        mV2: { fix_induced: 0, findings: 1 },
        reviewerEur: 0.02,
        fixerEur: 0.02,
        totalEur: 0.04,
      },
      {
        dryRun: 'dry-runs/2',
        key: 'S2@1.1/wingfoil/fake-model',
        outcome: 'not clean at 5',
        rounds: 5,
        mV1: null,
        mV2: { fix_induced: 4, findings: 4 },
        reviewerEur: 0.05,
        fixerEur: 0.08,
        totalEur: 0.13,
      },
      {
        dryRun: 'dry-runs/4',
        key: 'S3@1.1/baseline/fake-model',
        outcome: 'no loop',
        rounds: 0,
        mV1: null,
        mV2: null,
        reviewerEur: null,
        fixerEur: null,
        totalEur: null,
      },
    ]);
  });

  it('prints the rows as a table, a loop not clean named as such, never as its cap', () => {
    const table = mod.markdown(mod.figures(fixture()));
    expect(table).toContain('| dry-runs/4 | S3@1.1/baseline/fake-model | no loop | 0 | — | — | — | — | — |');
    expect(table).toContain(
      '| dry-runs/1 | S2@1.1/baseline/fake-model | clean | 2 | 2 | 0/1 | 0.0200 | 0.0200 | 0.0400 |',
    );
    expect(table).toContain(
      '| dry-runs/2 | S2@1.1/wingfoil/fake-model | not clean at 5 | 5 | — | 4/4 | 0.0500 | 0.0800 | 0.1300 |',
    );
  });

  it('runs from the command line over a repository root, writing nothing', () => {
    const root = fixture();
    const out = execFileSync('node', [repoPath('scripts/review-loop-figures.mjs'), '--markdown', root], {
      encoding: 'utf8',
    });
    expect(out).toContain(
      '| dry run | key | outcome | rounds | M-V1 | M-V2 | reviewer EUR | fixer EUR | M-V3 EUR |',
    );
  });
});
