// task-143 — scripts/configuring-reading.mjs: the configuring sessions read from their records (REQ-RUN-20).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/configuring-reading.mjs');

const usage = {
  inputTokens: 1,
  outputTokens: 20,
  cacheCreationInputTokens: 300,
  cacheReadInputTokens: 4000,
  turns: 3,
};
const record = (outcome: string, cost: number, files?: { path: string }[]) => ({
  usage,
  cost_eur: cost,
  wall_time_s: 12.34,
  outcome,
  ...(files === undefined ? {} : { files }),
});

describe('scripts/configuring-reading.mjs (task-143)', () => {
  it('prints one row per version and configured arm from its newest record, and every record’s cost summed', () => {
    const root = tempDir('bench-configuring-reading-');
    mkdirSync(join(root, 'scenarios', 'S1', '1.0'), { recursive: true });
    const configured = join(root, 'scenarios', 'S1', '1.1', 'configured');
    mkdirSync(configured, { recursive: true });
    writeFileSync(join(root, 'scenarios', 'leak-scan.yaml'), 'literals: []\n');
    writeFileSync(
      join(configured, 'speckit-configured.json'),
      JSON.stringify([
        record('refused', 0.5),
        record('written', 0.25, [{ path: 'a.md' }, { path: 'b/c.yaml' }]),
      ]),
    );
    const run = spawnSync('node', [SCRIPT, root], { encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(run.stdout.split('\n')).toEqual([
      '| Version | Configured arm | Sessions | Outcome | Cost (EUR) | Wall time (s) | Turns | Output tokens | ' +
        'All tokens | Files written |',
      '|---|---|---|---|---|---|---|---|---|---|',
      '| S1@1.1 | speckit-configured | 2 | written | 0.2500 | 12.3 | 3 | 20 | 4321 | `a.md`, `b/c.yaml` |',
      '',
      'Sessions: 2; their cost: 0.7500 EUR.',
      '',
    ]);
  });
});
