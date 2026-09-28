import { fail, ok } from '../core/index.js';
import type { Issue, Result, Scenario } from '../core/index.js';
import { executionRate, readStepUsage } from '../results/index.js';
import type { StoredRun } from '../results/index.js';

/** Tokens by kind (M-K1). */
export interface Tokens {
  readonly input: number;
  readonly output: number;
  readonly cache_creation: number;
  readonly cache_read: number;
}

/** M-K1 and M-K2 of a step, or of a run (experiment design §4.2). */
export interface CostFigures {
  readonly tokens: Tokens;
  readonly cost_usd: number;
  readonly cost_eur: number;
  /** False when a step was killed before it could report, and counts at its bound (task-024). */
  readonly cost_reported: boolean;
  readonly wall_time_ms: number;
  readonly turns: number;
  readonly interventions: number;
}

/** A step's cost, with how it ended; or that the run never reached it. */
export type StepCost =
  | ({ readonly n: number; readonly outcome: string } & CostFigures)
  | { readonly n: number; readonly not_reached: true };

/** `score.json`'s `cost` (F4.3, task-029): per step, the run's sums, and the rate a bound is converted at. */
export interface CostScore {
  readonly usd_to_eur: number;
  readonly steps: readonly StepCost[];
  readonly run: CostFigures;
}

/** What reading a run's cost needs. */
export interface CostRequest {
  readonly runDir: string;
  readonly executionDir: string;
  readonly run: StoredRun;
  readonly scenario: Scenario;
}

/** Money is kept to a millionth of a unit: float noise from summing never shows (task-029 Design). */
function money(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

const ZERO: CostFigures = {
  tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0 },
  cost_usd: 0,
  cost_eur: 0,
  cost_reported: true,
  wall_time_ms: 0,
  turns: 0,
  interventions: 0,
};

/**
 * M-K1 and M-K2 of a run (F4.3), from what it stored: each reached step's `usage.json` and what
 * `run.json` says of it. A step killed at its time cap counts at the larger of what it reported and its
 * bound, as the budget counted it (task-024). The run is the sum of its reached steps; a step not
 * reached costs nothing. No container, no clock: the same files give the same figures (REQ-SCO-03).
 */
export function costMetrics(request: CostRequest): Result<CostScore> {
  const rate = executionRate(request.executionDir);
  if (!rate.ok) return rate;
  const recorded = new Map(request.run.steps.map((step) => [step.n, step]));
  const issues: Issue[] = [];
  const steps: StepCost[] = [];
  let run = ZERO;
  for (const { n } of request.scenario.steps) {
    const step = recorded.get(n);
    if (step === undefined) {
      steps.push({ n, not_reached: true });
      continue;
    }
    const usage = readStepUsage(request.runDir, n);
    if (!usage.ok) {
      issues.push(...usage.issues);
      continue;
    }
    const u = usage.value;
    const bounded = step.costBoundUsd !== undefined && step.costBoundUsd > u.costUsd;
    const figures: CostFigures = {
      tokens: {
        input: u.inputTokens,
        output: u.outputTokens,
        cache_creation: u.cacheCreationInputTokens,
        cache_read: u.cacheReadInputTokens,
      },
      cost_usd: money(bounded ? (step.costBoundUsd as number) : u.costUsd),
      cost_eur: money(bounded ? (step.costBoundUsd as number) * rate.value : u.costEur),
      cost_reported: step.costBoundUsd === undefined,
      wall_time_ms: u.durationMs,
      turns: u.turns,
      interventions: step.interventions,
    };
    steps.push({ n, outcome: step.outcome, ...figures });
    run = add(run, figures);
  }
  return issues.length > 0 ? fail(issues) : ok({ usd_to_eur: rate.value, steps, run });
}

function add(a: CostFigures, b: CostFigures): CostFigures {
  return {
    tokens: {
      input: a.tokens.input + b.tokens.input,
      output: a.tokens.output + b.tokens.output,
      cache_creation: a.tokens.cache_creation + b.tokens.cache_creation,
      cache_read: a.tokens.cache_read + b.tokens.cache_read,
    },
    cost_usd: money(a.cost_usd + b.cost_usd),
    cost_eur: money(a.cost_eur + b.cost_eur),
    cost_reported: a.cost_reported && b.cost_reported,
    wall_time_ms: a.wall_time_ms + b.wall_time_ms,
    turns: a.turns + b.turns,
    interventions: a.interventions + b.interventions,
  };
}
