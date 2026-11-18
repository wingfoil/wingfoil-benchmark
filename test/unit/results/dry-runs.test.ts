import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findDryRuns, latestDryRun } from '../../../src/results/index.js';
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

describe('findDryRuns (REQ-CLI-02 as amended in 1.26, task-081)', () => {
  it('returns every dry run that counts, newest first, by the rules latestDryRun applies', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1]));
    dryRun(root, 2, stored([0.2], { outcome: 'failed' }));
    dryRun(root, 3, stored([0.3], { scenario_hash: 'sha256:other' }));
    dryRun(root, 4, stored([0.4]));
    dryRun(root, 5, stored([0.5]), { model: 'other-model' });

    const found = findDryRuns(root, KEY);

    expect(found.records.map((record) => [record.execution, record.costUsd])).toEqual([
      [4, 0.4],
      [1, 0.1],
    ]);
    expect(latestDryRun(root, KEY)?.execution).toBe(4);
  });

  it('never prices a key from another model: none is found', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1]), { model: 'other-model' });
    expect(findDryRuns(root, KEY).records).toEqual([]);
  });
});

describe("findDryRuns: the agent's version (REQ-CLI-02 as amended in 1.59, task-152)", () => {
  const PINNED = { ...KEY, agent: { name: 'claude-code', version: '2.1.280' } };

  it('counts only a dry run of the agent and version the key pins, and names the newest one skipped', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1]));
    dryRun(root, 2, stored([0.2], { agent: { name: 'claude-code', version: '2.1.300' } }));
    dryRun(root, 3, stored([0.3], { agent: { name: 'codex', version: '2.1.280' } }));

    expect(findDryRuns(root, PINNED).records.map((record) => record.execution)).toEqual([1]);

    const none = findDryRuns(root, { ...KEY, agent: { name: 'claude-code', version: '2.1.325' } });
    expect(none.records).toEqual([]);
    expect(none.skipped).toBe('dry run 3 ran agent codex 2.1.280, the campaign pins claude-code 2.1.325');
  });

  it('counts a dry run stored without an agent version, as one stored without an arm digest', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1], { agent: undefined }));
    dryRun(root, 2, stored([0.2], { agent: { name: 'claude-code' } }));

    expect(findDryRuns(root, PINNED).records.map((record) => record.execution)).toEqual([2, 1]);
    expect(findDryRuns(root, PINNED).records[1]).not.toHaveProperty('agent');
  });

  it('never counts a dry run of another agent, whether or not it recorded a version', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1], { agent: { name: 'codex' } }));

    const found = findDryRuns(root, PINNED);
    expect(found.records).toEqual([]);
    expect(found.skipped).toBe('dry run 1 ran agent codex, the campaign pins claude-code 2.1.280');
  });

  it('matches any agent when the key pins none', () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1], { agent: { name: 'claude-code', version: '2.1.300' } }));
    expect(findDryRuns(root, KEY).records.map((record) => record.execution)).toEqual([1]);
  });
});

describe('findDryRuns: why a dry run does not count, for a dry run quoting its own key (bug-033)', () => {
  const QUOTED = { ...KEY, effort: 'medium', pinnedBy: 'the profile' };
  const reason = (extra: Record<string, unknown>) => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1], { effort: 'medium', ...extra }));
    return findDryRuns(root, QUOTED).skipped;
  };

  it.each([
    [{ outcome: 'failed' }, 'dry run 1 ended failed'],
    [{ outcome: undefined }, 'dry run 1 records no outcome'],
    [{ dry_run: false }, 'dry run 1 is not marked a dry run'],
    [{ scenario_hash: 'another' }, 'dry run 1 ran other content of this scenario version'],
    [{ effort: 'low' }, 'dry run 1 ran at effort low, the profile pins medium'],
  ])('names %j', (extra, expected) => {
    expect(reason(extra)).toBe(expected);
  });

  it("leaves an estimate's lookup as it was: no reason for a failed run, none beside a dry run that counts", () => {
    const root = tempDir('bench-results-');
    dryRun(root, 1, stored([0.1]));
    dryRun(root, 2, stored([0.2], { outcome: 'failed' }));
    dryRun(root, 3, stored([0.3], { effort: 'low' }));
    const found = findDryRuns(root, KEY);
    expect(found.records.map((record) => record.execution)).toEqual([1]);
    expect(found).not.toHaveProperty('skipped');
  });
});
