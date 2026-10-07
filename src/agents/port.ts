import type { ModelsUsage, SessionUsage } from './claude-code.js';
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
  /**
   * The effort the campaign pins for the model (dl-015, REQ-RUN-16 as amended in 1.27): a level the agent takes, or
   * `none` for no flag. Absent when nothing is pinned, as for the fake agent.
   */
  readonly effort?: string;
  /** The arm's MCP configuration, as a path inside the container; absent when the arm has none. */
  readonly mcpConfig?: string;
  /** Runs a command inside the run's container. */
  readonly run: (command: readonly string[]) => Promise<ProcessResult>;
}

/**
 * A reply of the neutral approver to a session that ended waiting for input (REQ-RUN-07). It is not a
 * step: it continues the step's own session, so it carries that session's id and the reply, and
 * nothing of the step's prompt.
 */
export interface ResumeRequest {
  readonly scenarioId: string;
  readonly step: number;
  /**
   * Which resume of the step this is, 1-based, whatever prompted it: an approver's reply or a rate limit's wait
   * (task-051). Without a rate limit it is the approver's intervention number: 1, 2, 3.
   */
  readonly intervention: number;
  /** The session to resume: the step's own. */
  readonly sessionId: string;
  /** The policy's reply, or the rate limit's fixed message, sent as the prompt of the resumed session. */
  readonly reply: string;
  /** What is left of the run's cost cap, in USD, after the step so far (REQ-RUN-04). */
  readonly remainingCostUsd: number;
  /**
   * The effort the campaign pins for the model (dl-015, REQ-RUN-16 as amended in 1.27): a level the agent takes, or
   * `none` for no flag. Absent when nothing is pinned, as for the fake agent.
   */
  readonly effort?: string;
  /** The arm's MCP configuration, as on the step's first command line: a resume must keep it. */
  readonly mcpConfig?: string;
  /** Runs a command inside the run's container. */
  readonly run: (command: readonly string[]) => Promise<ProcessResult>;
}

/**
 * What the agent did in a step, or in one resume of it. The session is reported rather than assumed, so the runner can check
 * that the agent used the one it was given. Usage and the transcript join it in task-006 (F2.3).
 */
export interface StepOutcome {
  readonly sessionId: string;
  /**
   * How much work this invocation did, and what its **session** has cost so far (REQ-RUN-09). Tokens,
   * turns and wall time are the invocation's own; the cost is the session's running total, which is
   * what the agent reports on a resume. A fresh session's total is its own cost.
   */
  readonly usage: SessionUsage;
  /**
   * The models the session reported using, by the key the agent gives them, each at the session's running total
   * (task-054). Absent when the agent reported none.
   */
  readonly models?: ModelsUsage;
  /** Every event of the step's stream, already scrubbed (REQ-NFR-01). */
  readonly transcript: readonly string[];
  /**
   * Why the session failed, if it did. An agent **reports** a failed session rather than throwing:
   * the money was spent either way, and the usage and the transcript are the only evidence of what
   * it went on and of why it stopped. The runner stores them, then fails the run.
   */
  readonly error?: string;
  /**
   * How the session stopped short, when the agent says so (task-024): at its cost cap
   * (`--max-budget-usd`), at the subscription's quota (REQ-RUN-13), or at its rate limit, which the runner waits
   * out (REQ-RUN-13 as amended in 1.24, task-051). Not a failure.
   */
  readonly stop?: 'cap reached' | 'quota exhausted' | 'rate limited';
  /**
   * The session's final assistant message, which the neutral approver classifies (REQ-RUN-06).
   * Whether it is waiting is the approver's reading, not the agent's: no field of the protocol says so.
   */
  readonly finalMessage?: string;
}

/** REQ-ARC-04: the agent behind one interface, so a run never depends on a real agent. */
export interface AgentPort {
  runStep(request: StepRequest): Promise<StepOutcome>;
  /** Continue a step's session with the approver's reply (REQ-RUN-07). */
  resume(request: ResumeRequest): Promise<StepOutcome>;
}
