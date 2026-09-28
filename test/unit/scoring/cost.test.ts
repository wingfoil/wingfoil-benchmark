import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readStoredRun } from '../../../src/results/index.js';
import { costMetrics } from '../../../src/scoring/index.js';
import { CANCEL, storedRun, usageOf } from '../../support/score-fixture.js';

async function cost(fixture: Awaited<ReturnType<typeof storedRun>>) {
  const run = readStoredRun(fixture.runDir);
  if (!run.ok) throw new Error(JSON.stringify(run.issues));
  return costMetrics({
    runDir: fixture.runDir,
    executionDir: fixture.executionDir,
    run: run.value,
    scenario: fixture.scenario,
  });
}

describe('costMetrics (F4.3, M-K1, M-K2)', () => {
  it('records M-K1 and M-K2 per step, and their sums for the run', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });

    expect(await cost(fixture)).toEqual({
      ok: true,
      value: {
        usd_to_eur: 0.5,
        steps: [
          {
            n: 1,
            outcome: 'completed',
            tokens: { input: 10, output: 100, cache_creation: 1000, cache_read: 10000 },
            cost_usd: 0.1,
            cost_eur: 0.05,
            cost_reported: true,
            wall_time_ms: 1000,
            turns: 3,
            interventions: 0,
          },
          {
            n: 2,
            outcome: 'completed',
            tokens: { input: 20, output: 200, cache_creation: 2000, cache_read: 20000 },
            cost_usd: 0.2,
            cost_eur: 0.1,
            cost_reported: true,
            wall_time_ms: 2000,
            turns: 6,
            interventions: 1,
          },
        ],
        run: {
          tokens: { input: 30, output: 300, cache_creation: 3000, cache_read: 30000 },
          // 0.1 + 0.2 is 0.30000000000000004 in floating point: rounded to six decimals, it never shows.
          cost_usd: 0.3,
          cost_eur: 0.15,
          cost_reported: true,
          wall_time_ms: 3000,
          turns: 9,
          interventions: 1,
        },
      },
    });
  });

  it('counts a step killed at its time cap at its bound, as the budget did, and says it was not reported', async () => {
    const fixture = await storedRun({
      steps: [{}, CANCEL],
      record: (n) =>
        n === 2
          ? {
              usage: { ...usageOf(2), costUsd: 0.05, costEur: 0.025 },
              outcome: 'time cap reached',
              costBoundUsd: 0.4,
            }
          : { usage: usageOf(1) },
    });

    const result = await cost(fixture);

    expect(result.ok && result.value.steps[1]).toMatchObject({
      outcome: 'time cap reached',
      cost_usd: 0.4,
      cost_eur: 0.2,
      cost_reported: false,
    });
    expect(result.ok && result.value.run).toMatchObject({
      cost_usd: 0.5,
      cost_eur: 0.25,
      cost_reported: false,
    });
  });

  it('keeps what a killed step reported when it is above its bound', async () => {
    const fixture = await storedRun({
      steps: [CANCEL],
      record: () => ({ usage: usageOf(1), outcome: 'time cap reached', costBoundUsd: 0.01 }),
    });
    const result = await cost(fixture);
    expect(result.ok && result.value.steps[0]).toMatchObject({
      cost_usd: 0.1,
      cost_eur: 0.05,
      cost_reported: false,
    });
  });

  it('records the steps a run never reached as costing nothing, outside the sums', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    const result = await cost(fixture);
    expect(result.ok && result.value.steps[1]).toEqual({ n: 2, not_reached: true });
    expect(result.ok && result.value.run).toMatchObject({ cost_usd: 0.1, turns: 3 });
  });

  it("names a reached step's usage.json that is missing, and a missing rate", async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    rmSync(join(fixture.runDir, 'steps', '02', 'usage.json'));
    const missing = await cost(fixture);
    expect(missing.ok || missing.issues[0]?.path).toBe('steps/02/usage.json');

    const again = await storedRun({ steps: [{}, CANCEL] });
    rmSync(join(again.executionDir, 'campaign.yaml'));
    const noRate = await cost(again);
    expect(noRate.ok).toBe(false);
  });

  it('is the same, byte for byte, when read twice (REQ-SCO-03)', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    const first = JSON.stringify(await cost(fixture));
    writeFileSync(join(fixture.runDir, 'unrelated.txt'), readFileSync(join(fixture.runDir, 'run.json')));
    expect(JSON.stringify(await cost(fixture))).toBe(first);
  });
});
