import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { recordedHashes } from '../../../src/results/index.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A run.json at results/<campaign>/<n>/runs/<scenario>@<version>/<arm>/m/r1/. */
function run(root: string, at: string, record: Record<string, unknown>): string {
  const dir = join(root, at);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'run.json'), JSON.stringify(record));
  return join(dir, 'run.json');
}

describe('recordedHashes (REQ-FMT-09)', () => {
  it('collects the hashes stored results recorded for a version, one run each as evidence', () => {
    const root = tempDir('bench-results-');
    const first = run(root, 'c1/1/runs/S1@1.0/baseline/m/r1', { scenario: 'S1', version: '1.0', scenario_hash: 'sha256:a' });
    run(root, 'c1/2/runs/S1@1.0/wingfoil/m/r1', { scenario: 'S1', version: '1.0', scenario_hash: 'sha256:a' });
    const other = run(root, 'c2/1/runs/S1@1.0/baseline/m/r1', { scenario: 'S1', version: '1.0', scenario_hash: 'sha256:b' });
    run(root, 'c2/1/runs/S1@1.1/baseline/m/r1', { scenario: 'S1', version: '1.1', scenario_hash: 'sha256:c' });
    run(root, 'c2/1/runs/S2@1.0/baseline/m/r1', { scenario: 'S2', version: '1.0', scenario_hash: 'sha256:d' });

    expect(recordedHashes(root, 'S1', '1.0')).toEqual([
      { hash: 'sha256:a', run: first },
      { hash: 'sha256:b', run: other },
    ]);
  });

  it('skips a run recorded before hashes existed, and a record that is not JSON', () => {
    const root = tempDir('bench-results-');
    run(root, 'c1/1/runs/S1@1.0/baseline/m/r1', { scenario: 'S1', version: '1.0' });
    const broken = join(root, 'c1/1/runs/S1@1.0/wingfoil/m/r1');
    mkdirSync(broken, { recursive: true });
    writeFileSync(join(broken, 'run.json'), 'not json');
    expect(recordedHashes(root, 'S1', '1.0')).toEqual([]);
  });

  it('never reads a dry run: a dry run does not freeze a version (task-021)', () => {
    const root = tempDir('bench-results-');
    run(root, 'dry-runs/1/runs/S1@1.0/baseline/m/r1', {
      dry_run: true,
      scenario: 'S1',
      version: '1.0',
      scenario_hash: 'sha256:a',
    });
    expect(recordedHashes(root, 'S1', '1.0')).toEqual([]);
  });

  it('has none when there are no results at all', () => {
    expect(recordedHashes(join(tempDir('bench-results-'), 'results'), 'S1', '1.0')).toEqual([]);
  });
});
