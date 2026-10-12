import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { benchSite, STAND_INS } from '../support/site-fixture.js';
import { CANCEL, storedRun } from '../support/score-fixture.js';
import { tempDir } from '../support/scenario-fixture.js';

const EARLIER = '0123456789ab/1';
const NEWER = 'abcdef012345/1';

/** A campaign file's pins for one side: the agent's version, the default model and the wingfoil harness. */
function pins(agentVersion: string, model: string, wingfoil: string): string {
  return stringify({
    harnesses: { wingfoil: { tool: 'wingfoil', version: wingfoil } },
    scenarios: [{ id: 'TC', version: '1.0' }],
    arms: ['baseline', 'wingfoil'],
    agent: { name: 'claude-code', version: agentVersion },
    models: { default: model },
    repetitions: { TC: 1 },
    currency: { usd_to_eur: 0.5 },
  });
}

/**
 * Two scored executions of TC — standing in for S1, category C — in the baseline and wingfoil arms: the earlier with
 * one run a side, the baseline failing the hidden test and wingfoil passing it; the newer with three runs a side, all
 * passing. `newer` overrides the newer side's model and pins.
 */
async function twoExecutions(newer: { model?: string; agent?: string; wingfoil?: string } = {}) {
  const variant = STAND_INS[0];
  // The earlier execution: baseline r1 fails, wingfoil r1 passes.
  const { root } = await storedRun({
    variant,
    steps: [{}, {}],
    into: { root: tempDir('bench-compare-'), execution: EARLIER },
  });
  await storedRun({ variant, steps: [{}, CANCEL], into: { root, execution: EARLIER, arm: 'wingfoil' } });
  // The newer execution: three passing runs a side.
  const model = newer.model ?? 'fake-model';
  for (const arm of ['baseline', 'wingfoil']) {
    for (const repetition of [1, 2, 3]) {
      await storedRun({
        variant,
        steps: [{}, CANCEL],
        into: { root, execution: NEWER, arm, model, repetition },
      });
    }
  }
  writeFileSync(join(root, 'results', EARLIER, 'campaign.yaml'), pins('2.1.221', 'fake-model', 'v0.2.2'));
  writeFileSync(
    join(root, 'results', NEWER, 'campaign.yaml'),
    pins(newer.agent ?? '2.1.291', model, newer.wingfoil ?? 'v0.2.3'),
  );
  for (const target of [EARLIER, NEWER]) {
    const scored = await benchSite(root, 'score', target);
    if (scored.code !== 0) throw new Error(scored.stdout + scored.stderr);
  }
  return root;
}

function comparisonOf(root: string): Record<string, unknown> {
  const file = join(root, 'results', 'comparisons', 'abcdef012345-1', '0123456789ab-1.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

describe('comparison.feature', () => {
  it("@F5.2 Two campaigns are compared through each arm's delta against its own baseline", async () => {
    // Given two aggregated executions that share scenario versions and arms
    const root = await twoExecutions();

    // When the maintainer compares them, naming the earlier one first
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);
    expect(compared.stdout).toContain('results/comparisons/abcdef012345-1/0123456789ab-1.json');

    // Then for each category and arm, the comparison shows each execution's delta against its own baseline, and the
    // change of that delta
    const comparison = comparisonOf(root);
    expect(comparison).toMatchObject({
      earlier: { campaign: '0123456789ab', execution: 1, model: 'fake-model' },
      newer: { campaign: 'abcdef012345', execution: 1, model: 'fake-model' },
      order: 'maintainer',
    });
    const rows = comparison.rows as Record<string, unknown>[];
    const q1 = rows.find((row) => row.arm === 'wingfoil' && row.metric === 'M-Q1');
    expect(q1).toMatchObject({
      scenario: 'TC',
      version: '1.0',
      category: 'C',
      arm: 'wingfoil',
      earlier: { delta: 1 },
      newer: { delta: 0 },
      change: -1,
    });
    // And it shows n, and the range from three runs
    expect(q1).toMatchObject({
      earlier: { arm: { n: 1 }, baseline: { n: 1 }, certainty: 'preliminary' },
      newer: {
        arm: { n: 3, min: 1, max: 1 },
        baseline: { n: 3, min: 1, max: 1 },
        certainty: 'within variance',
      },
    });
    // And it lists the pins that differ between the executions
    expect(comparison.pins_differ).toEqual([
      { pin: 'agent.version', earlier: '2.1.221', newer: '2.1.291' },
      { pin: 'harnesses.wingfoil', earlier: 'wingfoil v0.2.2', newer: 'wingfoil v0.2.3' },
    ]);
    expect(compared.stdout).toContain('agent.version: 2.1.221 → 2.1.291');
  }, 240_000);

  it('@F5.2 A comparison across models is marked', async () => {
    // Given two executions run on different models
    const root = await twoExecutions({ model: 'other-model' });

    // When the maintainer compares them
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);

    // Then every row of the comparison is marked cross-model
    const rows = comparisonOf(root).rows as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.cross_model === true)).toBe(true);
    expect(compared.stdout).toContain('cross-model');
  }, 240_000);

  it('@F5.2 A group whose scenario changed is not compared', async () => {
    // Given two executions where a scenario's content hash differs
    const root = await twoExecutions();
    for (const arm of ['baseline', 'wingfoil']) {
      for (const repetition of [1, 2, 3]) {
        const file = join(
          root,
          'results',
          NEWER,
          'runs',
          'TC@1.0',
          arm,
          'fake-model',
          `r${repetition}`,
          'run.json',
        );
        writeFileSync(
          file,
          JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), scenario_hash: 'sha256:changed' }),
        );
      }
    }

    // When the maintainer compares them
    const compared = await benchSite(root, 'campaign', 'compare', EARLIER, NEWER);
    expect(compared.code, compared.stderr).toBe(0);

    // Then that scenario's groups read "not compared", naming the two hashes
    const comparison = comparisonOf(root);
    expect(comparison.rows).toEqual([]);
    const notCompared = comparison.not_compared as { scenario: string; reason: string }[];
    expect(notCompared.map((entry) => entry.scenario)).toEqual(['TC', 'TC']);
    for (const entry of notCompared) {
      expect(entry.reason).toMatch(
        /^not compared: scenario hash sha256:[0-9a-f]+ in 0123456789ab\/1, sha256:changed in abcdef012345\/1$/,
      );
    }
  }, 240_000);

  it('@F5.2 Only aggregated campaign executions can be compared', async () => {
    const root = await twoExecutions();
    await storedRun({
      variant: STAND_INS[0],
      steps: [{}, CANCEL],
      into: { root, execution: 'fedcba987654/1' },
    });
    await storedRun({ variant: STAND_INS[0], steps: [{}, CANCEL], into: { root, execution: 'dry-runs/1' } });

    // When the maintainer compares a dry run, an execution not yet aggregated, or one execution with itself
    const dryRun = await benchSite(root, 'campaign', 'compare', 'dry-runs/1', NEWER);
    const unaggregated = await benchSite(root, 'campaign', 'compare', 'fedcba987654/1', NEWER);
    const itself = await benchSite(root, 'campaign', 'compare', NEWER, NEWER);

    // Then the comparison is refused, naming what was given
    expect(dryRun.code).toBe(1);
    expect(dryRun.stderr).toContain('dry-runs/1: a dry run is never compared');
    expect(unaggregated.code).toBe(1);
    expect(unaggregated.stderr).toContain('results/fedcba987654/1: is not aggregated: score it first');
    expect(itself.code).toBe(1);
    expect(itself.stderr).toContain(`${NEWER}: is the same execution twice`);
    expect(existsSync(join(root, 'results', 'comparisons'))).toBe(false);
  }, 240_000);
});
