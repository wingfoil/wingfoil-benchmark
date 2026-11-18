// task-154 — scripts/budget-reading.mjs: the budget's table and the loops' count, read from the files and the dry runs.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/budget-reading.mjs');

/** A fixture: a campaign extending a preset, an estimate, and two dry runs, the second with a loop not clean. */
function fixture(): string {
  const root = tempDir('bench-budget-');
  mkdirSync(join(root, 'campaigns', 'presets'), { recursive: true });
  writeFileSync(
    join(root, 'campaigns', 'presets', 'p.yaml'),
    [
      'caps: { step_time_s: 1800, step_tokens: 100, run_cost_eur: 3 }',
      'budget: { warn_eur: 1, ceiling_eur: 2 }',
      'fail_fast: { same_error: 3 }',
      'currency: { usd_to_eur: 0.9 }',
      'review_loop: { caps: { session_cost_eur: 2 } }',
    ].join('\n'),
  );
  writeFileSync(
    join(root, 'campaigns', 'c.yaml'),
    'extends: presets/p.yaml\nbudget: { warn_eur: 15, ceiling_eur: 20 }\n',
  );
  writeFileSync(join(root, 'estimate.txt'), 'estimate: low 1 USD; high 10.0000 EUR at 0.9 EUR/USD\n');
  const usage = (eur: number, ms: number, tokens: number) => ({
    costEur: eur,
    durationMs: ms,
    inputTokens: tokens,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  });
  const dryRun = (n: number, eur: number, ms: number, tokens: number, outcome: string, loopEur: number) => {
    const dir = join(root, 'results', 'dry-runs', String(n), 'runs', 'S1@1.1', 'wingfoil', 'm', 'r1');
    mkdirSync(join(dir, 'review'), { recursive: true });
    writeFileSync(
      join(dir, 'run.json'),
      JSON.stringify({ steps: [{ n: 1, usage: usage(eur, ms, tokens) }] }),
    );
    writeFileSync(join(dir, 'review', 'loop.json'), JSON.stringify({ outcome, cost_eur: loopEur }));
  };
  dryRun(1, 0.5, 9000, 40, 'clean', 0.1);
  dryRun(2, 1.5, 2000, 70, 'not clean at 5', 0.4);
  dryRun(3, 9, 99000, 99, 'clean', 9);
  return root;
}

const run = (root: string, kind: string) =>
  spawnSync(
    'node',
    [
      SCRIPT,
      kind,
      root,
      '--campaign',
      'campaigns/c.yaml',
      '--estimate',
      join(root, 'estimate.txt'),
      '--skip',
      '3',
    ],
    { encoding: 'utf8' },
  );

describe('scripts/budget-reading.mjs (task-154)', () => {
  it("sets the campaign's own budget against the estimate and the dry runs' largest figures", () => {
    const result = run(fixture(), 'budget');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "| `budget.warn_eur` | 15 | 1.50 times the estimate's high (10.0000 EUR) |",
    );
    expect(result.stdout).toContain("| `budget.ceiling_eur` | 20 | 2.00 times the estimate's high |");
    expect(result.stdout).toContain("the dearest dry run's steps 1.5000 EUR (`2`, S1@1.1 wingfoil)");
    expect(result.stdout).toContain('the longest step 9 s (`1`, step 1); a guard');
    expect(result.stdout).toContain('the largest step 70 tokens (`2`, step 1); a guard');
    expect(result.stdout).toContain('the dearest whole loop 0.4000 EUR (`2`)');
  });

  it('merges a partial override as the campaign loader does, and leaves a slept dry run out of the durations', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'campaigns', 'c.yaml'),
      'extends: presets/p.yaml\nbudget: { warn_eur: 15 }\ncaps: { run_cost_eur: 5 }\n',
    );
    const result = spawnSync(
      'node',
      [
        SCRIPT,
        'budget',
        root,
        '--campaign',
        'campaigns/c.yaml',
        '--estimate',
        'estimate.txt',
        '--skip',
        '3',
        '--slept',
        '1',
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("| `budget.ceiling_eur` | 2 | 0.20 times the estimate's high |");
    expect(result.stdout).toContain(
      '| `caps.step_time_s` | 1800 | the longest step 2 s (`2`, step 1; `1` left out, the machine slept through it); a guard |',
    );
  });

  it('stops with a message when no dry run is read', () => {
    const result = spawnSync(
      'node',
      [
        SCRIPT,
        'budget',
        fixture(),
        '--campaign',
        'campaigns/c.yaml',
        '--estimate',
        'estimate.txt',
        '--after',
        '99',
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('no dry run read');
  });

  it('counts how the loops ended and names the ones that did not close clean', () => {
    const result = run(fixture(), 'loops');
    expect(result.stdout.trim()).toBe(
      'Of the 2 loops, 1 closed clean; the others: `2` not clean at 5 (S1@1.1 wingfoil).',
    );
  });
});
