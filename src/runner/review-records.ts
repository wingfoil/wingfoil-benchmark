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

/** `review/loop.json`: the reviewer's pins, the outcome, its reason scrubbed of credentials, its cost, the rounds. */
export function loopRecord(
  loop: ReviewLoop,
  summary: LoopSummary,
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
