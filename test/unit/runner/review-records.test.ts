// The review loop's records come from one writer (bug-052): what it writes, `readLoop` reads, and the format is the one
// the stored v0.3 dry runs hold.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { SessionUsage } from '../../../src/agents/index.js';
import type { Finding } from '../../../src/core/index.js';
import { readLoop } from '../../../src/results/review.js';
import {
  findingsRecord,
  fixerUsageRecord,
  loopRecord,
  reviewerUsageRecord,
} from '../../../src/runner/review-records.js';
import type { LoopPins, RoundRecord } from '../../../src/runner/review-records.js';

const STORED = join(
  __dirname,
  '../../../results/dry-runs/261/runs/S1@1.1/wingfoil/claude-haiku-5-5/r1/review',
);

const STORED_ROUND = join(
  __dirname,
  '../../../results/dry-runs/251/runs/S8@1.1/speckit-docs/claude-sonnet-5-5/r1/review/1',
);

const LOOP: LoopPins = {
  agent: { name: 'claude-code', version: '2.1.300' },
  model: 'claude-sonnet-5-5',
  effort: 'medium',
  prompt: { sha256: 'c8bce4bd9083d33c7953fb6f4cba77da07661f4952d900bbe98bf79a86991983' },
  fixer_prompt: { sha256: '47fcee47291cde67557ee717b7817c3721dadde8410001b0b26bcc446a9ec223' },
  max_rounds: 5,
};

/** Dry run 251's reviewer session, as the runner holds it before it writes it. */
const STORED_USAGE: SessionUsage = {
  inputTokens: 8,
  outputTokens: 1440,
  cacheCreationInputTokens: 14887,
  cacheReadInputTokens: 77858,
  costUsd: 0.05941930000000001,
  costEur: 0.05298418981000001,
  turns: 4,
  durationMs: 18050,
};

const USAGE: SessionUsage = {
  inputTokens: 8,
  outputTokens: 1440,
  cacheCreationInputTokens: 14887,
  cacheReadInputTokens: 77858,
  costUsd: 0.1,
  costEur: 0.05,
  turns: 4,
  durationMs: 18050,
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function runDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'review-records-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'review', '1'), { recursive: true });
  return dir;
}

const rate = () => ({ ok: true as const, value: 0.5 });

describe('the review loop writer', () => {
  it('writes loop.json as the stored v0.3 loop holds it', () => {
    const rounds: RoundRecord[] = [{ n: 1, findings: { blocker: 0, 'should-fix': 0, nit: 1 }, fixed: false }];
    const written = loopRecord(LOOP, { outcome: 'clean', costEur: 0.08016115489999999 }, rounds, []);
    expect(written).toBe(readFileSync(join(STORED, 'loop.json'), 'utf8'));
  });

  it('writes reviewer-usage.json as the stored v0.3 round holds it', () => {
    expect(reviewerUsageRecord(STORED_USAGE, undefined, [])).toBe(
      readFileSync(join(STORED_ROUND, 'reviewer-usage.json'), 'utf8'),
    );
  });

  it('writes findings.json scrubbed of credentials, and readLoop reads the findings back', () => {
    const dir = runDir();
    const finding: Finding = {
      severity: 'should-fix',
      file: 'src/a.ts',
      line: 3,
      title: 'A title',
      why: 'token sk-secret leaked',
    };
    writeFileSync(
      join(dir, 'review', 'loop.json'),
      loopRecord(
        LOOP,
        { outcome: 'clean', costEur: 0.1 },
        [{ n: 1, findings: { blocker: 0, 'should-fix': 1, nit: 0 }, fixed: false }],
        [],
      ),
    );
    const written = findingsRecord([finding], ['sk-secret']);
    expect(written).not.toContain('sk-secret');
    writeFileSync(join(dir, 'review', '1', 'findings.json'), written);
    const read = readLoop(dir, rate);
    if (!read.ok || read.value === undefined) throw new Error(JSON.stringify(read));
    expect(read.value.rounds[0]?.findings).toEqual([
      { severity: 'should-fix', file: 'src/a.ts', line: 3, title: 'A title' },
    ]);
  });

  it('round-trips a loop through the writer and readLoop', () => {
    const dir = runDir();
    const rounds: RoundRecord[] = [
      { n: 1, findings: { blocker: 1, 'should-fix': 0, nit: 0 }, fixed: true },
      { n: 2, findings: null, fixed: false },
    ];
    writeFileSync(
      join(dir, 'review', 'loop.json'),
      loopRecord(LOOP, { outcome: 'failed', reason: 'token sk-secret leaked', costEur: 0.2 }, rounds, [
        'sk-secret',
      ]),
    );
    writeFileSync(join(dir, 'review', '1', 'findings.json'), findingsRecord([], []));
    writeFileSync(
      join(dir, 'review', '1', 'reviewer-usage.json'),
      reviewerUsageRecord(USAGE, 0.3, [60, 120]),
    );
    writeFileSync(
      join(dir, 'review', '1', 'fixer-usage.json'),
      fixerUsageRecord({ usage: USAGE, interventions: [], outcome: 'completed' }, []),
    );
    const read = readLoop(dir, rate);
    if (!read.ok || read.value === undefined) throw new Error(JSON.stringify(read));
    expect(read.value.outcome).toBe('failed');
    expect(read.value.reason).not.toContain('sk-secret');
    expect(read.value.maxRounds).toBe(5);
    expect(read.value.promptSha256).toBe(LOOP.prompt.sha256);
    expect(read.value.reviewer).toMatchObject({ agent: 'claude-code', version: '2.1.300', effort: 'medium' });
    expect(read.value.rounds.map((round) => round.n)).toEqual([1, 2]);
    expect(read.value.reviewers).toHaveLength(1);
    expect(read.value.reviewers[0]).toMatchObject({ cost_eur: 0.3, bounded: true });
    expect(read.value.fixers).toHaveLength(1);
  });

  it('records a reviewer round at its bound and its rate-limit waits only when it has them', () => {
    expect(JSON.parse(reviewerUsageRecord(USAGE, 0.3, [60]))).toMatchObject({
      cost_bound_eur: 0.3,
      rate_limit_waits_s: [60],
    });
    const plain = JSON.parse(reviewerUsageRecord(USAGE, undefined, [])) as Record<string, unknown>;
    expect(plain).not.toHaveProperty('cost_bound_eur');
    expect(plain).not.toHaveProperty('rate_limit_waits_s');
  });
});
