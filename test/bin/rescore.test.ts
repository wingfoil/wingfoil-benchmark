// task-134 — scripts/rescore.mjs: the catalogue's executions read again under W16's method, nothing written.
import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

import { repoPath } from '../support/paths.js';

interface Rescore {
  rescoreChecks(
    results: string,
    scenarios: string,
    execution: string,
  ): Promise<{ run: string; step: number; v1: boolean; v2: boolean; words: string }[]>;
  rescoreMR2(
    results: string,
    scenarios: string,
    execution: string,
  ): Promise<{ group: string; v1: number; v2?: number }[]>;
  rescoreMK4(
    results: string,
    execution: string,
  ): { entry: string; v1: unknown; v2: unknown; reason?: string }[];
}

/** One published execution, read in place: the v0.2 reference campaign. */
const EXECUTION = '81ebb2691f9c/1';
const RESULTS = repoPath('results');
const SCENARIOS = repoPath('scenarios');
const status = () =>
  execFileSync('git', ['status', '--porcelain', '--', 'results'], { cwd: repoPath('.'), encoding: 'utf8' });

describe('scripts/rescore.mjs (task-134)', { timeout: 600_000 }, () => {
  let rescore: Rescore;
  let before: string;
  beforeAll(async () => {
    execFileSync('npm', ['run', 'build'], { cwd: repoPath('.'), encoding: 'utf8' });
    before = status();
    rescore = (await import(repoPath('scripts/rescore.mjs'))) as Rescore;
  }, 300_000);

  it('reads a content check under v2 whose verdict differs from the published v1 one', async () => {
    const rows = await rescore.rescoreChecks(RESULTS, SCENARIOS, EXECUTION);
    const changed = rows.filter((row) => row.v1 !== row.v2);
    // The published runs' three S3 changes (docs/calibration/v0.3-rescore.md): "changed" within "unchanged" twice,
    // "revis" within "revisit"; each passed v1 and fails v2
    expect(changed.map((row) => [row.run.split('/')[4], row.step, row.words])).toEqual([
      ['openspec', 4, '"whole-day" + "changed"'],
      ['speckit', 4, '"whole day" + "changed"'],
      ['wingfoil', 4, '"whole day" + "revis"'],
    ]);
    expect(changed.every((row) => row.v1 && !row.v2)).toBe(true);
  });

  it('reads a group whose M-R2 v2, from the entry point, differs from the published v1', async () => {
    const rows = await rescore.rescoreMR2(RESULTS, SCENARIOS, EXECUTION);
    expect(rows.find((row) => row.group === 'S1@1.0 openspec claude-sonnet-5-5')).toMatchObject({
      v1: 0,
      v2: 0.1852,
    });
    expect(rows.find((row) => row.group === 'S1@1.0 baseline claude-sonnet-5-5')).toMatchObject({
      v1: 0.8667,
      v2: 0.8667,
    });
  });

  it('reads an M-K4 entry whose outcome changes under REQ-SCO-08 1.49', () => {
    const rows = rescore.rescoreMK4(RESULTS, EXECUTION);
    const at = (entry: string) => rows.find((row) => row.entry === entry);
    // The value's kind changes; then one stays not applicable, its reason no longer the quality
    expect(at('S1@1.0 baseline-docs claude-sonnet-5-5')).toMatchObject({ v1: 'not applicable', v2: 'never' });
    expect(at('S1@1.0 openspec-docs claude-sonnet-5-5')).toMatchObject({
      v1: 'not applicable',
      v2: 'not applicable',
      reason: 'saving within variance',
    });
  });

  it('writes nothing under results/', () => {
    expect(status()).toBe(before);
  });
});
