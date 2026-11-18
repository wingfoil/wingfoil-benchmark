// task-154 — scripts/hypotheses-reading.mjs: the hypotheses read on the scored dry runs, means over a key's dry runs.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/hypotheses-reading.mjs');
const MODEL = 'claude-sonnet-5-5';

/** One scored dry run of S1@1.1 in `arm`: its run cost, turns and final M-Q1. */
function dryRun(
  root: string,
  n: number,
  arm: string,
  eur: number,
  turns: number,
  outcome = 'completed',
): void {
  const dir = join(root, 'results', 'dry-runs', String(n), 'runs', 'S1@1.1', arm, MODEL, 'r1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'run.json'), JSON.stringify({ outcome }));
  writeFileSync(
    join(dir, 'score.json'),
    JSON.stringify({
      final: { m_q1: { passed: 10, total: 10 } },
      holdout: { scored: true, final: { m_q1: { passed: 4, total: 5 } } },
      checks: [],
      cost: { run: { cost_eur: eur, turns } },
    }),
  );
}

describe('scripts/hypotheses-reading.mjs (task-154)', () => {
  it("means a key's completed dry runs, states n, and reads H1 and H2 against the baseline", () => {
    const root = tempDir('bench-hypotheses-');
    dryRun(root, 1, 'baseline', 0.2, 20);
    dryRun(root, 2, 'baseline', 0.4, 30);
    dryRun(root, 3, 'wingfoil', 0.6, 50);
    dryRun(root, 4, 'wingfoil', 9, 99, 'failed');
    const result = spawnSync('node', [SCRIPT, root, '--after', '0'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `| S1@1.1 | ${MODEL} | baseline | 2 | 0.3000 | 25 | 10/10 | 4/5 | — | — | \`1\`, \`2\` |`,
    );
    expect(result.stdout).toContain(
      `| S1@1.1 | ${MODEL} | wingfoil | 1 | 0.6000 | 50 | 10/10 | 4/5 | — | — | \`3\` |`,
    );
    expect(result.stdout).toContain('| H1 | cost ÷ baseline, per scenario | S1 2×; mean 2× |');
    expect(result.stdout).toContain('| H2 | turns ÷ baseline on S1 | 2× (n 1/2) |');
  });

  it('reads H6 per scenario, H10 as the arms whose checks are not saturated, and H11 per model', () => {
    const root = tempDir('bench-hypotheses-');
    const scored = (n: number, scenario: string, arm: string, model: string, passed: number, f1: number) => {
      const dir = join(root, 'results', 'dry-runs', String(n), 'runs', `${scenario}@1.1`, arm, model, 'r1');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'run.json'), JSON.stringify({ outcome: 'completed' }));
      writeFileSync(
        join(dir, 'score.json'),
        JSON.stringify({
          final: { m_q1: { passed, total: 37 } },
          holdout: { scored: true, final: { m_q1: { passed: 16, total: 17 } } },
          checks: [{ steps: [{ passed: arm === 'wingfoil' }] }],
          m_f1: { consistent: f1, total: 5 },
          cost: { run: { cost_eur: 0.5, turns: 10 } },
        }),
      );
    };
    scored(1, 'S3', 'baseline', MODEL, 35, 3);
    scored(2, 'S3', 'wingfoil', MODEL, 37, 4);
    scored(3, 'S3', 'baseline', 'claude-haiku-5-5', 33, 2);
    scored(4, 'S3', 'wingfoil', 'claude-haiku-5-5', 37, 5);
    const result = spawnSync('node', [SCRIPT, root], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('| H6 | M-Q1 final; hold-out final, per scenario | S3 37/37; 16/17 |');
    expect(result.stdout).toContain(`H10 on ${MODEL}, arms whose checks are not saturated: S3 1 of 2`);
    expect(result.stdout).toContain(`| ${MODEL} | — | +2 | +1 |`);
    expect(result.stdout).toContain('| claude-haiku-5-5 | — | +4 | +3 |');
  });

  it('reads only the dry runs between --after and --through', () => {
    const root = tempDir('bench-hypotheses-');
    dryRun(root, 1, 'baseline', 0.2, 20);
    dryRun(root, 2, 'baseline', 0.4, 30);
    const result = spawnSync('node', [SCRIPT, root, '--after', '1', '--through', '2'], { encoding: 'utf8' });
    expect(result.stdout).toContain(`| baseline | 1 | 0.4000 | 30 |`);
  });
});
