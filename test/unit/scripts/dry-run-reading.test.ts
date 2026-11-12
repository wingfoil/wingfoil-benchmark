// task-144 — scripts/dry-run-reading.mjs: the 1.1 dry runs read from their records, each configured arm beside its
// base arm, the superseded runs, the pins against the profile and the sum against the ceiling.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/dry-run-reading.mjs');
const PROFILE = [
  'harnesses:',
  '  wingfoil: { tool: wingfoil, version: v0.3.1 }',
  'agent: { name: claude-code, version: 2.1.300, effort: { claude-sonnet-5-5: medium } }',
  'models: { default: claude-sonnet-5-5 }',
  'approver_policy: v5',
  'arm_digests: { wingfoil: aaaa, wingfoil-configured: bbbb, baseline: cccc }',
  '',
].join('\n');

/** A dry run's record under `root`: `steps` steps of 0.25 EUR and 10 s each. */
function dryRun(root: string, n: number, scenario: string, arm: string, extra: object = {}): void {
  const dir = join(root, 'results', 'dry-runs', String(n), 'runs', scenario, arm, 'claude-sonnet-5-5', 'r1');
  mkdirSync(dir, { recursive: true });
  const step = { usage: { costEur: 0.25, durationMs: 10000 } };
  const run = {
    dry_run: true,
    agent: { name: 'claude-code', version: '2.1.300' },
    model: 'claude-sonnet-5-5',
    effort: 'medium',
    approver_policy: 'v5',
    arm_digest: { wingfoil: 'aaaa1', 'wingfoil-configured': 'bbbb2', baseline: 'cccc3' }[arm],
    outcome: 'completed',
    steps: [step, step],
    interventions: [{ kind: 'approval' }],
    ...extra,
  };
  writeFileSync(join(dir, 'run.json'), JSON.stringify(run));
}

const run = (args: string[]) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

describe('scripts/dry-run-reading.mjs (task-144)', () => {
  it('puts each configured arm beside its base arm, from the newest dry run, and sums them against the ceiling', () => {
    const root = tempDir('bench-dry-run-reading-');
    writeFileSync(join(root, 'profile.yaml'), PROFILE);
    dryRun(root, 1, 'S2@1.0', 'wingfoil');
    dryRun(root, 2, 'S2@1.1', 'wingfoil');
    dryRun(root, 3, 'S2@1.1', 'wingfoil-configured', { outcome: 'failed' });
    dryRun(root, 4, 'S2@1.1', 'baseline');
    dryRun(root, 5, 'S2@1.1', 'wingfoil-configured', { harness: { tool: 'wingfoil', version: 'v0.3.1' } });
    const result = run([root, '--profile', 'profile.yaml', '--ceiling', '10', '--after', '1']);
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n')).toEqual([
      '| Version | Arm | Dry run | Outcome | Cost (EUR) | Steps | Interventions | Time (s) | ' +
        'Configured: dry run | Outcome | Cost (EUR) | Steps | Interventions | Time (s) |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
      '| S2@1.1 | baseline | `4` | completed | 0.5000 | 2 | 1 | 20 | — | — | — | — | — | — |',
      '| S2@1.1 | wingfoil | `2` | completed | 0.5000 | 2 | 1 | 20 | `5` | completed | 0.5000 | 2 | 1 | 20 |',
      '',
      'Dry runs: 4, 3 measured (3 completed), 1 superseded; their cost: 2.0000 EUR against the 10.00 EUR ' +
        'ceiling (20.0%).',
      'The configured arms: 0.5000 EUR; their base arms on the same versions: 0.5000 EUR.',
      'Superseded: `3` (S2@1.1, wingfoil-configured) by `5`.',
      'Pins: every dry run matches `profile.yaml`.',
      '',
    ]);
  });

  it('names every pin a dry run breaks against the profile', () => {
    const root = tempDir('bench-dry-run-reading-');
    writeFileSync(join(root, 'profile.yaml'), PROFILE);
    dryRun(root, 7, 'S1@1.1', 'wingfoil', {
      effort: 'high',
      arm_digest: 'ffff9',
      harness: { tool: 'wingfoil', version: 'v0.3.0' },
    });
    const result = run([root, '--profile', 'profile.yaml', '--ceiling', '10']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Pins broken by `7`: effort high, arm_digest ffff9, harness wingfoil v0.3.0.\n',
    );
  });

  it('refuses a call without its root, profile or ceiling', () => {
    expect(run([]).status).toBe(2);
    expect(run(['.', '--profile', 'p.yaml']).status).toBe(2);
  });
});
