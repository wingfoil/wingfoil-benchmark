import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import { checkCampaign, estimateCampaign, formatEstimate } from '../../../src/runner/index.js';
import type { CheckedCampaign } from '../../../src/runner/index.js';
import { writeArmsNamed } from '../../support/arm-fixture.js';
import { completeCampaignYaml } from '../../support/campaign-fixture.js';
import { writeStoredDryRun } from '../../support/dry-run-fixture.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SHA = '3df305ea198d7e2ca0da73bfb12b14af865e9922';

/** A repository with T3 in the baseline and wingfoil arms, and the campaign `extra` shapes. */
function campaign(extra: Record<string, unknown> = {}): { root: string; checked: CheckedCampaign } {
  const root = tempDir('bench-repo-');
  cpSync(repoPath('test/fixtures/scenarios/T3'), join(root, 'scenarios', 'T3'), { recursive: true });
  copyFileSync(repoPath('scenarios/leak-scan.yaml'), join(root, 'scenarios', 'leak-scan.yaml'));
  writeArmsNamed(root, ['baseline', 'wingfoil']);
  mkdirSync(join(root, 'campaigns'));
  const file = join(root, 'campaigns', 'c.yaml');
  writeFileSync(
    file,
    stringify({
      ...completeCampaignYaml(),
      scenarios: [{ id: 'T3', version: '1.0' }],
      arms: ['baseline', 'wingfoil'],
      repetitions: { T3: 2 },
      agent: { name: 'fake', version: '1.0.0' },
      models: { default: 'fake-model' },
      currency: { usd_to_eur: 0.5 },
      ...extra,
    }),
  );
  const checked = checkCampaign(file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { root, checked: checked.value };
}

function hashOf(checked: CheckedCampaign): string {
  return checked.scenarios[0]?.hash ?? '';
}

describe('estimateCampaign (F1.2, task-022)', () => {
  it('prices every key the campaign runs at its dry-run cost times its repetitions, at the campaign rate', () => {
    const { root, checked } = campaign();
    const hash = hashOf(checked);
    writeStoredDryRun(root, 1, { hash, arm: 'baseline', stepCostsUsd: [0.25, 0.25] });
    writeStoredDryRun(root, 2, { hash, arm: 'wingfoil', stepCostsUsd: [1, 0.5], harnessCommit: SHA });

    const result = estimateCampaign(checked);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.lines.map(({ arm, model, repetitions, unitUsd, costUsd }) => ({
        arm,
        model,
        repetitions,
        unitUsd,
        costUsd,
      })),
    ).toEqual([
      { arm: 'baseline', model: 'fake-model', repetitions: 2, unitUsd: 0.5, costUsd: 1 },
      { arm: 'wingfoil', model: 'fake-model', repetitions: 2, unitUsd: 1.5, costUsd: 3 },
    ]);
    // The campaign's rate, whatever rate the dry run's profile had.
    expect(result.value).toMatchObject({ totalUsd: 4, totalEur: 2, rate: 0.5 });
    expect(formatEstimate(result.value, root)).toEqual([
      'T3@1.0 baseline fake-model: 0.5000 USD × 2 = 1.0000 USD (results/dry-runs/1)',
      'T3@1.0 wingfoil fake-model: 1.5000 USD × 2 = 3.0000 USD (results/dry-runs/2)',
      'estimate: 4.0000 USD, 2.0000 EUR at 0.5 EUR/USD, API-equivalent',
    ]);
  });

  it('counts a slice with its own model and repetitions, although the runner does not run slices yet', () => {
    const { root, checked } = campaign({
      models: {
        default: 'fake-model',
        slices: [{ model: 'other-model', scenarios: ['T3'], arms: ['wingfoil'], repetitions: 1 }],
      },
    });
    const hash = hashOf(checked);
    writeStoredDryRun(root, 1, { hash, arm: 'baseline', stepCostsUsd: [1] });
    writeStoredDryRun(root, 2, { hash, arm: 'wingfoil', stepCostsUsd: [1], harnessCommit: SHA });
    writeStoredDryRun(root, 3, {
      hash,
      arm: 'wingfoil',
      model: 'other-model',
      stepCostsUsd: [5],
      harnessCommit: SHA,
    });

    const result = estimateCampaign(checked);

    expect(
      result.ok && result.value.lines.map((line) => `${line.arm}/${line.model}×${line.repetitions}`),
    ).toEqual(['baseline/fake-model×2', 'wingfoil/fake-model×2', 'wingfoil/other-model×1']);
    expect(result.ok && result.value.totalUsd).toBe(9);
  });

  it('names every key without a completed dry run of the current content, all at once', () => {
    const { root, checked } = campaign();
    writeStoredDryRun(root, 1, {
      hash: hashOf(checked),
      arm: 'baseline',
      stepCostsUsd: [1],
      outcome: 'failed',
    });
    writeStoredDryRun(root, 2, { hash: 'sha256:stale', arm: 'wingfoil', stepCostsUsd: [1] });

    expect(estimateCampaign(checked)).toEqual({
      ok: false,
      issues: ['baseline', 'wingfoil'].map((arm) => ({
        path: 'scenarios[0]',
        message:
          `T3@1.0 has no completed dry run in arm ${arm} on model fake-model: run bench scenario dry-run ` +
          `T3@1.0 --arm ${arm} --model fake-model first`,
      })),
    });
  });

  it('keys a dry run on the effort the campaign pins for its model, and says why the latest did not count (dl-015)', () => {
    const { root, checked } = campaign({
      arms: ['baseline'],
      agent: { name: 'fake', version: '1.0.0', effort: { 'fake-model': 'high' } },
    });
    writeStoredDryRun(root, 1, { hash: hashOf(checked), arm: 'baseline', stepCostsUsd: [1], effort: 'low' });
    expect(estimateCampaign(checked)).toEqual({
      ok: false,
      issues: [
        {
          path: 'scenarios[0]',
          message:
            'T3@1.0 has no completed dry run in arm baseline on model fake-model at effort high: run bench scenario ' +
            'dry-run T3@1.0 --arm baseline --model fake-model first (dry run 1 ran at effort low)',
        },
      ],
    });
    // The same effort counts; a dry run that recorded none counts only for a campaign that pins none.
    writeStoredDryRun(root, 2, { hash: hashOf(checked), arm: 'baseline', stepCostsUsd: [2], effort: 'high' });
    const counted = estimateCampaign(checked);
    expect(counted.ok && counted.value.lines[0]?.dryRun.execution).toBe(2);
    const unpinned = campaign({ arms: ['baseline'] });
    writeStoredDryRun(unpinned.root, 1, {
      hash: hashOf(unpinned.checked),
      arm: 'baseline',
      stepCostsUsd: [1],
    });
    expect(estimateCampaign(unpinned.checked).ok).toBe(true);
  });

  it('refuses a dry run whose cost the agent could not price, as a missing one (bug-016)', () => {
    const { root, checked } = campaign({ arms: ['baseline'] });
    writeStoredDryRun(root, 1, {
      hash: hashOf(checked),
      arm: 'baseline',
      stepCostsUsd: [1],
      unpriced: ['claude-sonnet-5-5', 'unknown'],
    });
    expect(estimateCampaign(checked)).toEqual({
      ok: false,
      issues: [
        {
          path: 'scenarios[0]',
          message:
            'T3@1.0 has no completed dry run in arm baseline on model fake-model: run bench scenario dry-run ' +
            'T3@1.0 --arm baseline --model fake-model first (dry run 1: its cost was not priced by the agent, ' +
            'claude-sonnet-5-5: unknown)',
        },
      ],
    });
  });

  it('says when a dry run ran another agent or harness than the campaign pins, and still counts it', () => {
    const { root, checked } = campaign({
      harnesses: { wingfoil: { tool: 'wingfoil', version: 'abc1234' } },
    });
    const hash = hashOf(checked);
    writeStoredDryRun(root, 1, {
      hash,
      arm: 'baseline',
      stepCostsUsd: [1],
      agent: { name: 'fake', version: '0.9.0' },
    });
    writeStoredDryRun(root, 2, { hash, arm: 'wingfoil', stepCostsUsd: [1], harnessCommit: SHA });

    const result = estimateCampaign(checked);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(formatEstimate(result.value, root).slice(0, 2)).toEqual([
      'T3@1.0 baseline fake-model: 1.0000 USD × 2 = 2.0000 USD (results/dry-runs/1; agent fake 0.9.0, the campaign pins 1.0.0)',
      'T3@1.0 wingfoil fake-model: 1.0000 USD × 2 = 2.0000 USD (results/dry-runs/2; wingfoil 3df305e, the campaign pins abc1234)',
    ]);
  });

  it('does not compare a harness pinned by a released version with a commit', () => {
    const { root, checked } = campaign({ harnesses: { wingfoil: { tool: 'wingfoil', version: '0.2.0' } } });
    const hash = hashOf(checked);
    writeStoredDryRun(root, 1, { hash, arm: 'baseline', stepCostsUsd: [1] });
    writeStoredDryRun(root, 2, { hash, arm: 'wingfoil', stepCostsUsd: [1], harnessCommit: SHA });

    const result = estimateCampaign(checked);
    expect(result.ok && formatEstimate(result.value, root)[1]).toBe(
      'T3@1.0 wingfoil fake-model: 1.0000 USD × 2 = 2.0000 USD (results/dry-runs/2)',
    );
  });
});
