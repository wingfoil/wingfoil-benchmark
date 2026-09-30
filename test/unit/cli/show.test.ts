import { chmodSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AgentPort } from '../../../src/agents/index.js';
import { main } from '../../../src/cli/index.js';
import { gitCli, systemProcess } from '../../../src/core/index.js';
import { CANCEL, EXECUTION, scoringDocker, storedRun, usageOf } from '../../support/score-fixture.js';
import { repoPath } from '../../support/paths.js';

const NO_AGENT: AgentPort = {
  runStep: () => Promise.reject(new Error('run detail runs no agent')),
  resume: () => Promise.reject(new Error('run detail runs no agent')),
};

async function bench(root: string, ...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await main(
    argv,
    { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
    { docker: scoringDocker().docker, git: gitCli(systemProcess), agent: NO_AGENT },
    root,
  );
  return { code, stdout, stderr };
}

/** Every file under `dir` with its bytes: what a read-only command must leave as it was. */
function snapshotOf(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at)) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out[path] = readFileSync(path, 'base64');
    }
  };
  walk(dir);
  return out;
}

describe('bench run show (REQ-CLI-08, F5.3, task-043)', () => {
  it('shows an unscored run: every step with its usage, commits and diff, a transcript not on disk stated', async () => {
    const fixture = await storedRun({ steps: [{}, [{ 'src/orders.ts': CANCEL['src/orders.ts'] ?? '' }]] });

    const { code, stdout, stderr } = await bench(fixture.root, 'run', 'show', fixture.runDir);

    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toMatch(/^# Run abcdef012345\/1\/runs\/T3@1\.0\/baseline\/fake-model\/r1\n/);
    expect(stdout).toContain('- scenario: T3@1.0');
    expect(stdout).toContain('## Step 01');
    expect(stdout).toContain('## Step 02');
    expect(stdout).toContain('- tokens: input 20, output 200, cache creation 2000, cache read 20000');
    expect(stdout).toContain('- commits: agent 02.1');
    expect(stdout).toContain('transcript not on disk');
    expect(stdout).toContain('```diff\ndiff --git a/src/orders.ts b/src/orders.ts');
    expect(stdout).toContain('## Test results\n\nnot scored\n');
  });

  it('shows a scored run that stopped early: the steps it never reached, and its test results', async () => {
    const fixture = await storedRun({ steps: [CANCEL] });
    expect((await bench(fixture.root, 'score', EXECUTION)).code).toBe(0);

    const { code, stdout } = await bench(fixture.root, 'run', 'show', fixture.runDir);

    expect(code).toBe(0);
    expect(stdout).toContain('## Step 02\n\nnot reached\n');
    expect(stdout).toContain('- step 01: M-Q1 1/1');
    expect(stdout).toContain('- final: not reached');
  });

  it('is a usage error without exactly one run, and refuses a path that holds no run', async () => {
    const fixture = await storedRun({ steps: [{}, CANCEL] });
    expect((await bench(fixture.root, 'run', 'show')).code).toBe(2);
    expect((await bench(fixture.root, 'run', 'show', 'a', 'b')).code).toBe(2);
    const missing = await bench(fixture.root, 'run', 'show', 'nowhere/1/runs/x');
    expect(missing).toMatchObject({ code: 1, stderr: 'nowhere/1/runs/x: is not a stored run\n' });
  });
});

describe('bench run compare (REQ-CLI-08, F5.3, task-043)', () => {
  it('shows two runs step by step, a step one of them never reached said so', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    const other = await storedRun({ steps: [CANCEL], into: { root: base.root, arm: 'wingfoil' } });

    const { code, stdout } = await bench(base.root, 'run', 'compare', base.runDir, other.runDir);

    expect(code).toBe(0);
    expect(stdout).toContain('| step | baseline r1 cost | baseline r1 M-Q1 | baseline r1 interventions |');
    expect(stdout).toMatch(/\| 02 \| 0\.2000 USD \| — \| 1 \| not reached \|/);
    expect(stdout).toContain('not scored');
  });

  it('refuses two runs of different scenario versions, naming both', async () => {
    const t3 = await storedRun({ steps: [{}, CANCEL] });
    const s1 = await storedRun({ scenario: 'S1', steps: [{}], into: { root: t3.root, arm: 'wingfoil' } });
    const { code, stderr } = await bench(t3.root, 'run', 'compare', t3.runDir, s1.runDir);
    expect(code).toBe(1);
    expect(stderr).toContain('T3@1.0');
    expect(stderr).toContain('S1@1.0');
    expect(stderr).toContain('not the same scenario version');
  });

  it('only reads: nothing under results/ changes', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    const other = await storedRun({ steps: [{}, CANCEL], into: { root: base.root, repetition: 2 } });
    writeFileSync(
      join(base.runDir, 'steps', '01', 'transcript.jsonl'),
      readFileSync(repoPath('test/fixtures/sessions/completed.jsonl')),
    );
    const before = snapshotOf(join(base.root, 'results'));
    await bench(base.root, 'run', 'show', base.runDir, '--full');
    await bench(base.root, 'run', 'compare', base.runDir, other.runDir);
    expect(snapshotOf(join(base.root, 'results'))).toEqual(before);
  });

  it('is a usage error without exactly two runs', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    expect((await bench(base.root, 'run', 'compare', base.runDir)).code).toBe(2);
  });

  it("reads a run that stopped early, unscored, as not having reached the scenario's other steps", async () => {
    const base = await storedRun({ steps: [CANCEL] });
    const other = await storedRun({ steps: [CANCEL], into: { root: base.root, repetition: 2 } });
    const shown = await bench(base.root, 'run', 'show', base.runDir);
    expect(shown.stdout).toContain('## Step 02\n\nnot reached\n');
    const compared = await bench(base.root, 'run', 'compare', base.runDir, other.runDir);
    expect(compared.stdout).toContain('| 02 | not reached | — | — | not reached | — | — |');
  });

  it("totals each run's tokens, turns and time under the table", async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    const other = await storedRun({ steps: [{}, CANCEL], into: { root: base.root, repetition: 2 } });
    const { stdout } = await bench(base.root, 'run', 'compare', base.runDir, other.runDir);
    expect(stdout).toContain(
      '- baseline r1 totals: tokens input 30, output 300, cache creation 3000, cache read 30000; 9 turns; 3.0 s',
    );
  });

  it('counts a step killed at its time cap at the bound the budget counted, and says so', async () => {
    const base = await storedRun({
      steps: [{}, CANCEL],
      record: (n) => ({
        usage: { ...usageOf(n), costUsd: 0, costEur: 0 },
        ...(n === 2 ? { costBoundUsd: 0.3 } : {}),
      }),
    });
    const other = await storedRun({ steps: [{}, CANCEL], into: { root: base.root, repetition: 2 } });
    const shown = await bench(base.root, 'run', 'show', base.runDir);
    expect(shown.stdout).toContain('- cost: not reported, at most 0.3000 USD');
    const compared = await bench(base.root, 'run', 'compare', base.runDir, other.runDir);
    expect(compared.stdout).toContain('| 02 | ≤ 0.3000 USD |');
    expect(compared.stdout).toContain('| total | ≤ 0.3000 USD |');
  });

  it('tells two runs apart that share arm, model and repetition, and says when the costs mix units', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    const other = await storedRun({
      steps: [{}, CANCEL],
      into: { root: base.root, execution: 'abcdef012345/2' },
    });
    expect((await bench(base.root, 'score', EXECUTION)).code).toBe(0);
    const { stdout } = await bench(base.root, 'run', 'compare', base.runDir, other.runDir);
    expect(stdout).toContain('| step | baseline r1 (A) cost |');
    expect(stdout).toContain('| baseline r1 (B) cost |');
    expect(stdout).toContain('costs are in EUR where a run is scored and in USD where it is not');
  });

  it('is a usage error with a flag it does not know', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    expect((await bench(base.root, 'run', 'show', '--foo', base.runDir)).code).toBe(2);
    expect((await bench(base.root, 'run', 'compare', '--full', base.runDir, base.runDir)).code).toBe(2);
  });

  it('shows a run whose score cannot be read, or scores another version, as unscored and says why', async () => {
    const base = await storedRun({ steps: [{}, CANCEL] });
    writeFileSync(join(base.runDir, 'score.json'), '{"steps": "no"}');
    const broken = await bench(base.root, 'run', 'show', base.runDir);
    expect(broken.code).toBe(0);
    expect(broken.stdout).toMatch(/## Test results\n\nnot scored: score\.json /);
    writeFileSync(
      join(base.runDir, 'score.json'),
      JSON.stringify({ scenario_hash: 'sha256:other', steps: [], final: { not_reached: true } }),
    );
    const stale = await bench(base.root, 'run', 'show', base.runDir);
    expect(stale.stdout).toContain('not scored: score.json scores another version of the scenario');
    writeFileSync(join(base.runDir, 'steps', '01', 'commits.json'), '{"messages": "x"}');
    expect((await bench(base.root, 'run', 'show', base.runDir)).stdout).toContain('- commits: unreadable');
  });

  it("marks a scored bounded step with ≤ too, and says a stale score's reason in compare", async () => {
    const base = await storedRun({
      steps: [{}, CANCEL],
      record: (n) => ({ usage: usageOf(n), ...(n === 2 ? { costBoundUsd: 0.5 } : {}) }),
    });
    expect((await bench(base.root, 'score', EXECUTION)).code).toBe(0);
    const other = await storedRun({ steps: [{}, CANCEL], into: { root: base.root, repetition: 2 } });
    writeFileSync(join(other.runDir, 'score.json'), '{"steps": "no"}');
    const { stdout } = await bench(base.root, 'run', 'compare', base.runDir, other.runDir);
    expect(stdout).toMatch(/\| 02 \| ≤ \d+\.\d{4} EUR \|/);
    expect(stdout).toMatch(/\| total \| ≤ \d+\.\d{4} EUR \|/);
    expect(stdout).toContain(', not scored: score.json steps: ');
    const shown = await bench(base.root, 'run', 'show', other.runDir);
    expect(shown.stdout).not.toContain('score.json score.json');
  });

  it('shows what a resumed step reported before its bound, and a run whose scenario cannot be read', async () => {
    const base = await storedRun({
      steps: [{}, CANCEL],
      record: (n) => ({ usage: usageOf(n), ...(n === 2 ? { costBoundUsd: 1 } : {}) }),
    });
    const shown = await bench(base.root, 'run', 'show', base.runDir);
    expect(shown.stdout).toContain('- cost: 0.2000 USD reported, at most 1.0000 USD');
    chmodSync(join(base.root, 'scenarios', 'T3', '1.0', 'seed', 'README.md'), 0o000);
    try {
      const unreadable = await bench(base.root, 'run', 'show', base.runDir);
      expect(unreadable.code).toBe(0);
      expect(unreadable.stdout).toContain('## Step 02');
    } finally {
      chmodSync(join(base.root, 'scenarios', 'T3', '1.0', 'seed', 'README.md'), 0o644);
    }
  });
});
