import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { latestDryRun } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

const KEY = { id: 'S1', version: '1.0', hash: 'sha256:a', arm: 'wingfoil', model: 'm' };

/** A stored dry run's run.json at results/dry-runs/<n>/runs/<id>@<version>/<arm>/<model>/r1/. */
function dryRun(
  root: string,
  execution: number | string,
  record: Record<string, unknown>,
  where: { arm?: string; model?: string; ref?: string } = {},
): string {
  const dir = join(
    root,
    'dry-runs',
    String(execution),
    'runs',
    where.ref ?? 'S1@1.0',
    where.arm ?? 'wingfoil',
    where.model ?? 'm',
    'r1',
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'run.json'), typeof record === 'string' ? record : JSON.stringify(record));
  return join(root, 'dry-runs', String(execution));
}

function stored(costs: readonly number[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    dry_run: true,
    scenario_hash: 'sha256:a',
    outcome: 'completed',
    agent: { name: 'claude-code', version: '2.1.280' },
    steps: costs.map((costUsd, index) => ({ n: index + 1, usage: { costUsd } })),
    ...extra,
  };
}

describe('latestDryRun (task-021)', () => {
  it('reads the latest completed dry run of the key: its cost per step and in total, and what it ran', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 2, stored([0.5, 0.25]));
    const latest = dryRun(root, 10, stored([0.25, 0.125], { harness: { commit: 'c'.repeat(40) } }));
    dryRun(root, 9, stored([9]));

    expect(latestDryRun(root, KEY)).toEqual({
      execution: 10,
      dir: latest,
      costUsd: 0.375,
      stepCostsUsd: [0.25, 0.125],
      agent: { name: 'claude-code', version: '2.1.280' },
      harnessCommit: 'c'.repeat(40),
    });
  });

  it('skips a run that did not complete, ran other content, or is not marked a dry run', () => {
    const root = tempDir('bench-results-');
    const counted = dryRun(root, 1, stored([1]));
    dryRun(root, 2, stored([2], { outcome: 'failed' }));
    dryRun(root, 3, stored([3], { scenario_hash: 'sha256:b' }));
    dryRun(root, 4, stored([4], { dry_run: undefined, campaign: 'abcdef123456' }));
    dryRun(root, 5, 'not json' as unknown as Record<string, unknown>);

    expect(latestDryRun(root, KEY)?.dir).toBe(counted);
  });

  it('never takes another arm, model or version for the key', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([1]), { arm: 'baseline' });
    dryRun(root, 2, stored([1]), { model: 'other-model' });
    dryRun(root, 3, stored([1]), { ref: 'S1@1.1' });
    mkdirSync(join(root, 'dry-runs', 'notes'));

    expect(latestDryRun(root, KEY)).toBeUndefined();
  });

  it('has none when nothing was dry-run', () => {
    expect(latestDryRun(tempDir('bench-results-'), KEY)).toBeUndefined();
  });
});
