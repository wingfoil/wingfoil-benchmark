// task-144 — scripts/ledger-lines.mjs: the spending ledger's lines generated from the stored records (dl-006).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/ledger-lines.mjs');
const AGENT = { name: 'claude-code', version: '2.1.300' };
const COMMON = ['--element', 'E', '--consent', 'C', '--ceiling', 'X'];

const run = (args: string[]) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

describe('scripts/ledger-lines.mjs (task-144)', () => {
  it('prints one line per configuring record, its cost in USD and EUR, and says when no secret scan ran', () => {
    const root = tempDir('bench-ledger-lines-');
    const configured = join(root, 'scenarios', 'S1', '1.1', 'configured');
    mkdirSync(configured, { recursive: true });
    const record = {
      agent: AGENT,
      model: 'claude-sonnet-5-5',
      usage: { costUsd: 0.5, turns: 1 },
      cost_eur: 0.25,
      date: '2026-11-08T10:00:00.000Z',
      outcome: 'written',
      files: [{ path: 'a.md' }],
    };
    writeFileSync(join(configured, 'speckit-configured.json'), JSON.stringify([record]));
    const result = run(['configuring', root, ...COMMON]);
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n')).toEqual([
      '| 2026-11-08 | E | configuring session of S1@1.1, speckit-configured arm ' +
        '(written, 1 file written, 1 turn) | C | Sonnet 5.5, effort medium (Claude Code 2.1.300) | X | 0.5000 USD (0.2500 €) API-equivalent; nothing billed ' +
        'per token | `scenarios/S1/1.1/configured/speckit-configured.json`; transcript under ' +
        '`results/configuring/S1@1.1/speckit/`; secret scan not run |',
      '',
    ]);
  });

  it('prints one line per dry run above --after, steps and interventions counted, and its secret scan', () => {
    const root = tempDir('bench-ledger-lines-');
    const step = { usage: { costUsd: 1, costEur: 0.5 } };
    for (const n of ['3', '4']) {
      const dir = join(
        root,
        'results',
        'dry-runs',
        n,
        'runs',
        'S2@1.1',
        'wingfoil',
        'claude-sonnet-5-5',
        'r1',
      );
      mkdirSync(dir, { recursive: true });
      const body = { agent: AGENT, model: 'claude-sonnet-5-5', effort: 'medium', outcome: 'completed' };
      writeFileSync(
        join(dir, 'run.json'),
        JSON.stringify({ ...body, steps: [step, step], interventions: [{}] }),
      );
    }
    writeFileSync(join(root, 'results', 'dry-runs', '4', 'leak.txt'), 'xx not-a-secret-value xx');
    const token = join(root, 'token');
    writeFileSync(join(root, 'token'), 'not-a-secret-value');
    const result = run(['dry-runs', root, ...COMMON, '--after', '3', '--token-file', token]);
    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(
      '| dry run of S2@1.1, wingfoil arm (`dry-runs/4`, 2 steps, 1 intervention; completed) |',
    );
    expect(lines[0]).toContain('| 2.0000 USD (1.0000 €) API-equivalent; nothing billed per token |');
    expect(lines[0]).toMatch(
      /`results\/dry-runs\/4\/runs\/S2@1\.1\/wingfoil\/claude-sonnet-5-5\/r1\/`; secret scan: 1 file\(s\) to check \|$/,
    );
  });

  it('refuses a call without its kind, root, element or consent', () => {
    expect(run(['dry-runs']).status).toBe(2);
  });
});
