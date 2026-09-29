import { fail, ok } from '../core/index.js';
import type { Decision, Result } from '../core/index.js';

import type { CheckScore } from './checks.js';
import type { CostScore } from './cost.js';
import type { FinalScore, SeedScore, StepScore, Tally } from './score.js';

/** How a decision stands on the final snapshot (REQ-SCO-12, experiment design §4.3). */
export type DecisionOutcome = 'respected' | 'revised' | 'failed';

/** One decision on the final snapshot: its outcome, its failing tests, and the check its revision needs. */
export interface DecisionScore {
  readonly id: string;
  readonly outcome: DecisionOutcome;
  readonly failed: readonly string[];
  readonly check?: string;
}

/** M-F1: the decisions respected or revised, over those listed; or that the final snapshot was not reached. */
export type MF1Score =
  | { readonly consistent: number; readonly total: number; readonly decisions: readonly DecisionScore[] }
  | { readonly not_reached: true };

/** M-F2: each step after the first, its cost in euro and its M-Q1 when a suite scores it, or not reached. */
export interface MF2Score {
  readonly steps: readonly (
    | { readonly n: number; readonly cost_eur: number; readonly m_q1?: Tally }
    | { readonly n: number; readonly not_reached: true }
  )[];
}

/** M-D3: the public hidden tests that passed on the seed and fail on the final snapshot, sorted. */
export type MD3Score =
  { readonly count: number; readonly tests: readonly string[] } | { readonly not_reached: true };

/** The last element of a test key (`file > describe > name`): the test's own name. */
function nameOf(key: string): string {
  return key.slice(key.lastIndexOf(' > ') + 3);
}

/** Whether a check passed at the last of its steps: a revision recorded, read where the scenario puts it. */
function recorded(check: CheckScore | undefined): boolean {
  const last = check?.steps[check.steps.length - 1];
  return last !== undefined && 'passed' in last && last.passed;
}

/**
 * M-F1 (REQ-SCO-12): each decision on the final snapshot, from `tests`, the public census's keys. It
 * is respected when all its tests pass; revised when they pass and the check that records its revision
 * passed; otherwise failed — a revision nothing records included, since the scenario revises it by
 * construction. Undefined when the scenario lists no decision; an oracle error when one has no test.
 */
export function mF1(
  decisions: readonly Decision[],
  tests: readonly string[],
  final: FinalScore,
  checks: readonly CheckScore[],
): Result<MF1Score | undefined> {
  if (decisions.length === 0) return ok(undefined);
  const own = (id: string) => tests.filter((key) => nameOf(key).startsWith(`${id}:`));
  const untested = decisions.find((decision) => own(decision.id).length === 0);
  if (untested !== undefined) {
    return fail([
      {
        path: `oracle.decisions[${untested.id}]`,
        message: `has no public hidden test named '${untested.id}: …'`,
      },
    ]);
  }
  if ('not_reached' in final) return ok({ not_reached: true });
  const failing = new Set(final.suites.flatMap((suite) => suite.failed));
  const scored = decisions.map((decision): DecisionScore => {
    const failed = own(decision.id).filter((key) => failing.has(key));
    if (decision.revisedBy === undefined) {
      return { id: decision.id, outcome: failed.length === 0 ? 'respected' : 'failed', failed };
    }
    const check = checks.find((candidate) => candidate.id === decision.revisedBy);
    const outcome = failed.length === 0 && recorded(check) ? 'revised' : 'failed';
    return { id: decision.id, outcome, failed, check: decision.revisedBy };
  });
  return ok({
    consistent: scored.filter((decision) => decision.outcome !== 'failed').length,
    total: scored.length,
    decisions: scored,
  });
}

/**
 * M-F2 (REQ-SCO-12): what `score.json` already holds of each step after the first — its cost in euro
 * and its M-Q1 — attributed to the code the earlier steps left. Undefined for a scenario of one step.
 */
export function mF2(steps: readonly StepScore[], cost: CostScore): MF2Score | undefined {
  if (steps.length < 2) return undefined;
  return {
    steps: steps.slice(1).map((step) => {
      const spent = cost.steps.find((candidate) => candidate.n === step.n);
      if ('not_reached' in step || spent === undefined || 'not_reached' in spent) {
        return { n: step.n, not_reached: true as const };
      }
      return { n: step.n, cost_eur: spent.cost_eur, ...(step.m_q1 === undefined ? {} : { m_q1: step.m_q1 }) };
    }),
  };
}

/**
 * M-D3 (REQ-SCO-12, experiment design §4.1): the public tests failing on the final snapshot that did
 * not fail on the seed. A census test either passed or failed on the seed, so these passed there.
 */
export function mD3(seed: SeedScore, final: FinalScore): MD3Score {
  if ('not_reached' in final) return { not_reached: true };
  const tests = final.suites
    .flatMap((suite) => {
      const before = new Set(seed.suites.find((candidate) => candidate.id === suite.id)?.failed ?? []);
      return suite.failed.filter((key) => !before.has(key));
    })
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { count: tests.length, tests };
}
