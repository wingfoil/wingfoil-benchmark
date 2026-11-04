// task-134 — scripts/rescore.mjs: the catalogue's executions read again under W16's method, nothing written.
import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

import { repoPath } from '../support/paths.js';

interface Rescore {
  rescoreChecks(
    results: string,
    scenarios: string,
    execution: string,
  ): Promise<{ v1: boolean; v2: boolean }[]>;
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
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.v1 && !row.v2)).toBe(true);
  });

  it('reads a group whose M-R2 v2, from the entry point, differs from the published v1', async () => {
    const rows = await rescore.rescoreMR2(RESULTS, SCENARIOS, EXECUTION);
    expect(rows.some((row) => row.v2 !== undefined && row.v2 !== row.v1)).toBe(true);
  });

  it('reads an M-K4 entry whose outcome changes under REQ-SCO-08 1.49', () => {
    const rows = rescore.rescoreMK4(RESULTS, EXECUTION);
    expect(rows.some((row) => String(row.v1) !== String(row.v2))).toBe(true);
  });

  it('writes nothing under results/', () => {
    expect(status()).toBe(before);
  });
});
