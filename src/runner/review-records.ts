import { scrub } from '../agents/index.js';
import type { SessionUsage } from '../agents/index.js';
import type { Finding, ReviewLoop } from '../core/index.js';
import type { LoopSummary } from './review-loop.js';
import type { StepResult } from './run.js';

/**
 * The review loop's records (REQ-FMT-06 as amended in 1.58), each built here and nowhere else: the runner writes what
 * these functions return, and the tests of `readLoop` write through them too, so a change of shape here fails a reader
 * test (bug-051, bug-052).
 */

/** One round as `loop.json` records it. */
export interface RoundRecord {
  readonly n: number;
  /** The round's findings by severity; `null` for a round whose reviewer session ran and ended the loop. */
  readonly findings: Readonly<Record<Finding['severity'], number>> | null;
  /** Whether a fixer session followed the round. */
  readonly fixed: boolean;
}

/** The fields of the loop's pins that `loop.json` records. */
export interface LoopPins {
  readonly agent: { readonly name: string; readonly version: string };
  readonly model: string;
  readonly effort: string;
  readonly prompt: Pick<ReviewLoop['prompt'], 'sha256'>;
  readonly fixer_prompt: Pick<ReviewLoop['fixer_prompt'], 'sha256'>;
  readonly max_rounds: number;
}

/** `review/loop.json`: the reviewer's pins, the outcome, its reason scrubbed of credentials, its cost, the rounds. */
export function loopRecord(
  loop: LoopPins,
  summary: Pick<LoopSummary, 'reason' | 'costEur'> & { readonly outcome: string },
  rounds: readonly RoundRecord[],
  secrets: readonly string[],
): string {
  return `${JSON.stringify(
    {
      reviewer: { agent: loop.agent, model: loop.model, effort: loop.effort },
      prompt_sha256: loop.prompt.sha256,
      fixer_prompt_sha256: loop.fixer_prompt.sha256,
      max_rounds: loop.max_rounds,
      outcome: summary.outcome,
      ...(summary.reason === undefined ? {} : { reason: scrub(summary.reason, secrets) }),
      cost_eur: summary.costEur,
      rounds,
    },
    undefined,
    2,
  )}\n`;
}

/** `review/<n>/findings.json`: the round's findings, scrubbed of credentials. `readLoop` reads it back (bug-052). */
export function findingsRecord(findings: readonly Finding[], secrets: readonly string[]): string {
  return `${scrub(JSON.stringify({ findings }, undefined, 2), secrets)}\n`;
}

/**
 * `review/<n>/reviewer-usage.json`: the session's usage, its bound in EUR when the round counts at it, and the
 * rate-limit waits it sat out, in seconds.
 */
export function reviewerUsageRecord(
  usage: SessionUsage,
  boundEur: number | undefined,
  waitsS: readonly number[],
): string {
  return `${JSON.stringify(
    {
      ...usage,
      ...(boundEur === undefined ? {} : { cost_bound_eur: boundEur }),
      ...(waitsS.length === 0 ? {} : { rate_limit_waits_s: waitsS }),
    },
    undefined,
    2,
  )}\n`;
}

/**
 * `review/<n>/fixer-usage.json`: the session's usage, its bound when it reported none, its interventions as the list of
 * the approver's replies (a step's are counted by that list's length), its outcome, and its error scrubbed of
 * credentials. `readLoop` reads it back (bug-051).
 */
export function fixerUsageRecord(
  result: Pick<StepResult, 'usage' | 'costBoundUsd' | 'interventions' | 'outcome' | 'error'>,
  secrets: readonly string[],
): string {
  return `${JSON.stringify(
    {
      usage: result.usage,
      ...(result.costBoundUsd === undefined ? {} : { cost_bound_usd: result.costBoundUsd }),
      interventions: result.interventions,
      outcome: result.outcome,
      ...(result.error === undefined ? {} : { error: scrub(result.error, secrets) }),
    },
    undefined,
    2,
  )}\n`;
}
