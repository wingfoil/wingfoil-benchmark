// A run's review loop as task-149's runner records it (REQ-FMT-06 as amended in 1.58), written by the tests that read
// it: `review/loop.json`, and each round's `findings.json`, `reviewer-usage.json`, `fix.patch` and `fixer-usage.json`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReviewLoop } from '../../src/core/index.js';
import type { LoopOutcome } from '../../src/runner/review-loop.js';
import { loopRecord, reviewerUsageRecord } from '../../src/runner/review-records.js';

/** One finding as `findings.json` holds it. */
export interface LoopFinding {
  readonly severity: 'blocker' | 'should-fix' | 'nit';
  readonly file: string;
  readonly line: number | null;
  readonly title: string;
}

/** One round: its findings (`null` when the reviewer's session ended the loop), and its fix when one followed. */
export interface RoundSpec {
  readonly findings: readonly LoopFinding[] | null;
  /** The reviewer's cost in EUR (USD twice it); by default 0.01. */
  readonly reviewerEur?: number;
  /** The reviewer's session counted at its bound, in EUR. */
  readonly reviewerBoundEur?: number;
  /** The fix that followed the round: its patch and its cost in EUR (USD twice it). */
  readonly fix?: { readonly patch: string; readonly eur?: number; readonly interventions?: number };
}

export interface LoopSpec {
  readonly outcome: string;
  readonly reason?: string;
  readonly rounds?: readonly RoundSpec[];
  /** The reviewer's model; by default `reviewer-model`. */
  readonly model?: string;
  readonly maxRounds?: number;
  /** The reviewer's agent, its effort and the prompts' SHA-256 the loop records (task-151); task-150's by default. */
  readonly pins?: {
    readonly agent?: { readonly name: string; readonly version: string };
    readonly effort?: string;
    readonly prompt?: string;
    readonly fixerPrompt?: string;
  };
}

/** A patch whose only hunk replaces lines `from` to `to` of `file` (the new side's numbering). */
export function patchChanging(file: string, from: number, to: number): string {
  const count = to - from + 1;
  const removed = Array.from({ length: count }, (_, i) => `-old ${from + i}`);
  const added = Array.from({ length: count }, (_, i) => `+new ${from + i}`);
  return (
    `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n` +
    `@@ -${from - 1},${count + 1} +${from - 1},${count + 1} @@\n context\n${[...removed, ...added].join('\n')}\n`
  );
}

/** A finding at `file` and `line`. */
export function loopFinding(
  severity: LoopFinding['severity'],
  file: string,
  line: number | null,
  title = `A ${severity} in ${file}`,
): LoopFinding {
  return { severity, file, line, title };
}

const usage = (eur: number, turns = 2, durationMs = 1000) => ({
  inputTokens: 100,
  outputTokens: 20,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 10,
  costUsd: eur * 2,
  costEur: eur,
  turns,
  durationMs,
});

/** Write the loop `spec` under `runDir/review/`, as the runner would. */
export function writeReviewLoop(runDir: string, spec: LoopSpec): void {
  const dir = join(runDir, 'review');
  mkdirSync(dir, { recursive: true });
  const rounds = spec.rounds ?? [];
  let cost = 0;
  rounds.forEach((round, index) => {
    const roundDir = join(dir, String(index + 1));
    mkdirSync(roundDir, { recursive: true });
    const reviewerEur = round.reviewerEur ?? 0.01;
    cost += Math.max(reviewerEur, round.reviewerBoundEur ?? 0);
    writeFileSync(
      join(roundDir, 'reviewer-usage.json'),
      reviewerUsageRecord(usage(reviewerEur), round.reviewerBoundEur, []),
    );
    if (round.findings !== null) {
      const findings = round.findings.map((finding) => ({ ...finding, why: `Because of ${finding.title}.` }));
      writeFileSync(join(roundDir, 'findings.json'), JSON.stringify({ findings }));
    }
    if (round.fix !== undefined) {
      const eur = round.fix.eur ?? 0.02;
      cost += eur;
      writeFileSync(join(roundDir, 'fix.patch'), round.fix.patch);
      writeFileSync(
        join(roundDir, 'fixer-usage.json'),
        JSON.stringify({
          usage: usage(eur, 4, 2000),
          // The runner's list of the approver's replies (bug-051), as many as the round asks for.
          interventions: Array.from({ length: round.fix.interventions ?? 0 }, () => ({
            step: 99,
            kind: 'approval',
            reply: 'Approved. Proceed.',
          })),
          outcome: 'completed',
        }),
      );
    }
  });
  const count = (findings: readonly LoopFinding[]) => ({
    blocker: findings.filter((f) => f.severity === 'blocker').length,
    'should-fix': findings.filter((f) => f.severity === 'should-fix').length,
    nit: findings.filter((f) => f.severity === 'nit').length,
  });
  // The pins the loop records; only the fields the record reads are filled.
  const loop = {
    agent: spec.pins?.agent ?? { name: 'claude-code', version: '2.1.0' },
    model: spec.model ?? 'reviewer-model',
    effort: spec.pins?.effort ?? 'high',
    prompt: { sha256: spec.pins?.prompt ?? 'a'.repeat(64) },
    fixer_prompt: { sha256: spec.pins?.fixerPrompt ?? 'b'.repeat(64) },
    max_rounds: spec.maxRounds ?? 5,
  } as ReviewLoop;
  writeFileSync(
    join(dir, 'loop.json'),
    loopRecord(
      loop,
      {
        outcome: spec.outcome as LoopOutcome,
        ...(spec.reason === undefined ? {} : { reason: spec.reason }),
        costEur: Math.round(cost * 1e6) / 1e6,
      },
      rounds.map((round, index) => ({
        n: index + 1,
        findings: round.findings === null ? null : count(round.findings),
        fixed: round.fix !== undefined,
      })),
      [],
    ),
  );
}

/** A loop that closed `clean` at round `n`: a blocker fixed in each round before it, nits only in round `n`. */
export function cleanAt(n: number): LoopSpec {
  return {
    outcome: 'clean',
    rounds: Array.from({ length: n }, (_, i) =>
      i + 1 === n
        ? { findings: [loopFinding('nit', 'src/a.ts', 1)] }
        : {
            findings: [loopFinding('blocker', 'src/a.ts', 50 + i)],
            fix: { patch: patchChanging('src/a.ts', 10, 11) },
          },
    ),
  };
}

/** A loop that did not close by its cap of five rounds. */
export function notCleanAt5(): LoopSpec {
  return {
    outcome: 'not clean at 5',
    rounds: Array.from({ length: 5 }, (_, i) => ({
      findings: [loopFinding('blocker', 'src/a.ts', 50 + i)],
      ...(i < 4 ? { fix: { patch: patchChanging('src/a.ts', 10, 11) } } : {}),
    })),
  };
}
