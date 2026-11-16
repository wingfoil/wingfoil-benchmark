// The review loop in the estimate (task-151, REQ-CLI-02 and REQ-CLI-03 as amended in 1.58): each key's loop priced at
// the dry runs whose loop pins are the campaign's, by the step keys' rule; stopped loops left out; the guard counting it.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { main } from '../../../src/cli/index.js';
import { estimateCampaign, formatEstimate } from '../../../src/runner/index.js';
import { writeStoredDryRun } from '../../support/dry-run-fixture.js';
import { cleanAt, writeReviewLoop } from '../../support/loop-records.js';
import type { LoopSpec } from '../../support/loop-records.js';
import { FIXER_PROMPT, loopCampaign, REVIEW_PROMPT } from '../../support/review-fixture.js';
import { doubles } from '../../support/runner-doubles.js';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

/** The pins `reviewLoopYaml` gives a campaign, as a loop record writes them. */
const PINS = {
  agent: { name: 'fake', version: '1.0.0' },
  effort: 'medium',
  prompt: sha(REVIEW_PROMPT),
  fixerPrompt: sha(FIXER_PROMPT),
};

/**
 * A campaign of S1 in `baseline` pinning task-149's loop (or none), and a way to store its dry runs: each costs
 * `stepUsd` for its steps and records `loop` (with the campaign's pins unless the spec overrides them), at 0.5 EUR/USD.
 */
function setup(options: { loop?: null; repetitions?: number } = {}) {
  const { checked, root } = loopCampaign({
    ...(options.loop === null ? { loop: null } : {}),
    ...(options.repetitions === undefined ? {} : { repetitions: options.repetitions }),
  });
  const [scenario] = checked.scenarios;
  if (scenario === undefined) throw new Error('no scenario');
  const dryRun = (execution: number, stepUsd: number, loop?: LoopSpec) => {
    const dir = writeStoredDryRun(root, execution, {
      id: scenario.id,
      version: scenario.version,
      hash: scenario.hash,
      arm: 'baseline',
      stepCostsUsd: [stepUsd],
    });
    writeFileSync(join(dir, 'dry-run.yaml'), 'currency:\n  usd_to_eur: 0.5\n');
    if (loop === undefined) return;
    const runDir = join(dir, 'runs', `${scenario.id}@${scenario.version}`, 'baseline', 'fake-model', 'r1');
    writeReviewLoop(runDir, { model: 'fake-reviewer', ...loop, pins: { ...PINS, ...loop.pins } });
  };
  return { checked, root, dryRun };
}

describe("the review loop's keys in the estimate (REQ-CLI-02 as amended in 1.58)", () => {
  it('prices each key’s loop apart, at its dry runs, low, mean and high', () => {
    const { checked, root, dryRun } = setup();
    // A loop of two rounds: two reviews at 0.02 USD and a fix at 0.04 USD; one of one round: 0.02 USD.
    dryRun(1, 0.1, cleanAt(2));
    dryRun(2, 0.1, cleanAt(1));
    const estimate = estimateCampaign(checked);
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    const review = estimate.value.lines.find((line) => line.kind === 'review');
    expect(review).toMatchObject({
      scenario: 'S1',
      arm: 'baseline',
      model: 'fake-model',
      unit: { lowUsd: 0.02, highUsd: 0.08 },
      margin: false,
    });
    expect(review?.unit.meanUsd).toBeCloseTo(0.05, 9);
    expect(estimate.value.highUsd).toBeCloseTo(0.1 + 0.08, 9);
    expect(formatEstimate(estimate.value, root)).toContain(
      'review/S1@1.0/baseline/fake-model: low 0.0200, mean 0.0500, high 0.0800 USD × 1 = 0.0800 USD ' +
        '(2 dry runs: results/dry-runs/2, results/dry-runs/1)',
    );
  });

  it('adds the margin to a loop priced at one dry run, and prices the runs left on resume', () => {
    const { checked, dryRun } = setup({ repetitions: 3 });
    dryRun(1, 0.1, cleanAt(2));
    const estimate = estimateCampaign(checked, new Map([['S1@1.0/baseline/fake-model', 2]]));
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    const review = estimate.value.lines.find((line) => line.kind === 'review');
    expect(review).toMatchObject({ repetitions: 2, margin: true });
    expect(review?.unit.highUsd).toBeCloseTo(0.08 * 1.35, 9);
    expect(review?.highUsd).toBeCloseTo(0.08 * 1.35 * 2, 9);
  });

  it('counts a session at its bound, converted at the dry run’s rate', () => {
    const { checked, dryRun } = setup();
    dryRun(1, 0.1, {
      outcome: 'failed',
      reason: 'killed',
      rounds: [{ findings: null, reviewerBoundEur: 0.5 }],
    });
    const estimate = estimateCampaign(checked);
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    // 0.5 EUR at 0.5 EUR/USD: 1 USD; a loop that failed ran its course, so it prices the key.
    expect(estimate.value.lines.find((line) => line.kind === 'review')?.unit.lowUsd).toBeCloseTo(1, 9);
  });

  it('leaves out a loop stopped from outside, interrupted or at the quota', () => {
    const { checked, dryRun } = setup();
    dryRun(1, 0.1, cleanAt(1));
    dryRun(2, 0.1, { outcome: 'interrupted', reason: 'stopped', rounds: [{ findings: null }] });
    dryRun(3, 0.1, { outcome: 'quota exhausted', reason: 'quota', rounds: [{ findings: null }] });
    const estimate = estimateCampaign(checked);
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    const review = estimate.value.lines.find((line) => line.kind === 'review');
    expect(review?.dryRuns.map((run) => run.execution)).toEqual([1]);
  });

  it.each([
    [
      'the reviewer model',
      { model: 'another-model' },
      'model another-model, the campaign pins fake-reviewer',
    ],
    ['the agent version', { pins: { agent: { name: 'fake', version: '2.0.0' } } }, 'agent fake 2.0.0'],
    ['the effort', { pins: { effort: 'high' } }, 'effort high, the campaign pins medium'],
    ['the prompt', { pins: { prompt: 'c'.repeat(64) } }, 'prompt sha256:cccccccccccc'],
    ['the fixer prompt', { pins: { fixerPrompt: 'd'.repeat(64) } }, 'fixer prompt sha256:dddddddddddd'],
    ['the round cap', { maxRounds: 3 }, 'max_rounds 3, the campaign pins 5'],
  ])('reads no dry run whose loop ran with another %s, and says so', (_, override, why) => {
    const { checked, dryRun } = setup();
    dryRun(1, 0.1, { ...cleanAt(1), ...(override as Partial<LoopSpec>) });
    const estimate = estimateCampaign(checked);
    expect(estimate.ok).toBe(false);
    if (estimate.ok) return;
    const [issue] = estimate.issues;
    expect(issue?.path).toBe('scenarios[0]');
    expect(issue?.message).toContain(
      "review/S1@1.0/baseline/fake-model has no completed dry run with the campaign's review loop",
    );
    expect(issue?.message).toContain(`dry run 1 ran the review loop with ${why}`);
  });

  it('leaves out a loop that never ran, or whose reviewer never ran (task-151 review round 1)', () => {
    const { checked, dryRun } = setup();
    dryRun(1, 0.1, cleanAt(1));
    dryRun(2, 0.1, { outcome: 'no loop', reason: 'no container' });
    dryRun(3, 0.1, { outcome: 'failed', reason: 'the runner was given no reviewer agent' });
    const estimate = estimateCampaign(checked);
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    expect(
      estimate.value.lines.find((line) => line.kind === 'review')?.dryRuns.map((run) => run.execution),
    ).toEqual([1]);
    // Alone, each is named as why the key has no loop dry run.
    const alone = setup();
    alone.dryRun(1, 0.1, { outcome: 'failed', reason: 'a git error' });
    const refused = estimateCampaign(alone.checked);
    expect(refused.ok ? '' : refused.issues[0]?.message).toContain(
      'dry run 1 has a loop whose reviewer never ran (failed)',
    );
  });

  it('says so when a dry run recorded no loop', () => {
    const { checked, dryRun } = setup();
    dryRun(1, 0.1);
    const estimate = estimateCampaign(checked);
    expect(estimate.ok).toBe(false);
    if (!estimate.ok) expect(estimate.issues[0]?.message).toContain('dry run 1 recorded no review loop');
  });

  it('estimates a campaign without a loop as before, whatever its dry runs recorded', () => {
    const { checked, dryRun } = setup({ loop: null });
    dryRun(1, 0.1, cleanAt(2));
    const estimate = estimateCampaign(checked);
    if (!estimate.ok) throw new Error(JSON.stringify(estimate.issues));
    expect(estimate.value.lines).toHaveLength(1);
    expect(Object.keys(estimate.value.lines[0] ?? {})).not.toContain('kind');
    expect(estimate.value.highUsd).toBeCloseTo(0.1 * 1.35, 9);
  });
});

describe("the budget guard counts the loops (REQ-CLI-03 as amended in 1.58, task-151's review)", () => {
  it('refuses a campaign whose steps fit under the ceiling and whose loops do not', async () => {
    const { checked, root } = loopCampaign({
      yaml: (yaml) => {
        yaml.budget = { warn_eur: 0.5, ceiling_eur: 1 };
      },
    });
    const [scenario] = checked.scenarios;
    if (scenario === undefined) throw new Error('no scenario');
    const dir = writeStoredDryRun(root, 1, {
      id: scenario.id,
      version: scenario.version,
      hash: scenario.hash,
      arm: 'baseline',
      stepCostsUsd: [0.5],
    });
    // The steps: 0.5 USD + 35 % = 0.675 USD, 0.621 EUR at 0.92, under the ceiling; the loop: 1 USD + 35 % = 1.35 USD.
    writeReviewLoop(join(dir, 'runs', `${scenario.id}@${scenario.version}`, 'baseline', 'fake-model', 'r1'), {
      outcome: 'clean',
      model: 'fake-reviewer',
      pins: PINS,
      rounds: [{ findings: [], reviewerEur: 0.5 }],
    });
    let stdout = '';
    let stderr = '';
    const io = { stdout: (text: string) => (stdout += text), stderr: (text: string) => (stderr += text) };
    const ports = doubles();
    expect(await main(['campaign', 'estimate', checked.campaign.file], io, ports)).toBe(0);
    expect(stdout).toContain('budget guard: 0.0000 + 1.8630 = 1.8630 EUR (warn 0.5 EUR, ceiling 1 EUR)');
    expect(await main(['campaign', 'run', checked.campaign.file], io, ports)).toBe(1);
    expect(stderr).toContain('the budget guard, 0.0000 + 1.8630 = 1.8630 EUR, is above the ceiling, 1 EUR');
    expect(ports.recorded.builds).toEqual([]);
  });
});
