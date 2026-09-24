import type { SessionUsage } from './claude-code.js';
import type { ProcessResult } from '../core/index.js';

/**
 * What the agent is asked to do for one step of a run (F2.2). There is nowhere to put a conversation
 * history: each step is a session of its own, and only the repository carries state between them.
 */
export interface StepRequest {
  readonly scenarioId: string;
  readonly step: number;
  /** The text of the step's prompt file, read by the runner so that every arm gets the same bytes. */
  readonly prompt: string;
  readonly model: string;
  /** A fresh session id, one per step. */
  readonly sessionId: string;
  /** What is left of the run's cost cap, in USD: `--max-budget-usd` (REQ-RUN-04). */
  readonly remainingCostUsd: number;
  /** Runs a command inside the run's container. */
  readonly run: (command: readonly string[]) => Promise<ProcessResult>;
}

/**
 * What the agent did in a step. The session is reported rather than assumed, so the runner can check
 * that the agent used the one it was given. Usage and the transcript join it in task-006 (F2.3).
 */
export interface StepOutcome {
  readonly sessionId: string;
  /** What the step cost and how much work it did (REQ-RUN-09). */
  readonly usage: SessionUsage;
  /** Every event of the step's stream, already scrubbed (REQ-NFR-01). */
  readonly transcript: readonly string[];
  /**
   * Why the session failed, if it did. An agent **reports** a failed session rather than throwing:
   * the money was spent either way, and the usage and the transcript are the only evidence of what
   * it went on and of why it stopped. The runner stores them, then fails the run.
   */
  readonly error?: string;
}

/** REQ-ARC-04: the agent behind one interface, so a run never depends on a real agent. */
export interface AgentPort {
  runStep(request: StepRequest): Promise<StepOutcome>;
}
