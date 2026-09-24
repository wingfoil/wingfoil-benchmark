import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { AgentPort, StepOutcome, StepRequest } from './fake.js';
import { fail, ok } from '../core/index.js';
import type { Result } from '../core/index.js';

/** What a session cost and how much work it did (REQ-RUN-09, M-K1 and M-K2). */
export interface SessionUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  /** The API-equivalent cost, recorded whatever the billing (sequencer decision 1). */
  readonly costUsd: number;
  /** The same cost at the campaign's rate, which is what the budget is expressed in. */
  readonly costEur: number;
  readonly turns: number;
  readonly durationMs: number;
}

/** What one session, or one step's worth of sessions, amounted to. */
export interface Session {
  readonly sessionId: string;
  readonly usage: SessionUsage;
  readonly transcript: readonly string[];
  readonly outcome: 'completed' | 'failed';
  readonly error?: string;
}

const ZERO: SessionUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costUsd: 0,
  costEur: 0,
  turns: 0,
  durationMs: 0,
};

/** A number the agent reported, or zero: a missing field is not a reason to lose a whole session. */
function numberOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function add(total: SessionUsage, event: Record<string, unknown>, usdToEur: number): SessionUsage {
  const usage = (event.usage ?? {}) as Record<string, unknown>;
  const costUsd = total.costUsd + numberOf(event.total_cost_usd);
  return {
    inputTokens: total.inputTokens + numberOf(usage.input_tokens),
    outputTokens: total.outputTokens + numberOf(usage.output_tokens),
    cacheCreationInputTokens: total.cacheCreationInputTokens + numberOf(usage.cache_creation_input_tokens),
    cacheReadInputTokens: total.cacheReadInputTokens + numberOf(usage.cache_read_input_tokens),
    costUsd,
    costEur: costUsd * usdToEur,
    turns: total.turns + numberOf(event.num_turns),
    durationMs: total.durationMs + numberOf(event.duration_ms),
  };
}

/**
 * Read one step's stream-json output: its usage, its transcript and whether it worked.
 *
 * Three things the W2 spike proved, and which this function exists to honour:
 *
 * - **the outcome is `is_error` and `terminal_reason`, never `subtype`.** The spike recorded
 *   `"subtype": "success"` on a session that failed to authenticate and did nothing;
 * - **a stream with no `result` event is a failed step**, not a step that used nothing. It is what a
 *   step killed by its cap leaves behind;
 * - **usage is summed over the events seen**, not taken from the last one: a step resumed by the
 *   neutral approver (REQ-RUN-07) reports its own usage per invocation, and reading only the last
 *   would under-report exactly the steps that needed an intervention.
 */
export function readSession(lines: readonly string[], usdToEur: number): Session {
  let usage = ZERO;
  let sessionId = '';
  let results = 0;
  const failures: string[] = [];

  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch (error) {
      return {
        sessionId,
        usage,
        transcript: lines,
        outcome: 'failed',
        error: `a line of the session is not valid JSON: ${(error as Error).message}`,
      };
    }
    if (typeof event.session_id === 'string' && sessionId === '') sessionId = event.session_id;
    if (event.type !== 'result') continue;
    results += 1;
    usage = add(usage, event, usdToEur);
    if (event.is_error === true) {
      failures.push(String(event.terminal_reason ?? event.subtype ?? 'unknown'));
    }
  }

  if (results === 0) {
    return {
      sessionId,
      usage,
      transcript: lines,
      outcome: 'failed',
      error: 'the session ended with no result event',
    };
  }
  if (failures.length > 0) {
    return { sessionId, usage, transcript: lines, outcome: 'failed', error: failures.join(', ') };
  }
  return { sessionId, usage, transcript: lines, outcome: 'completed' };
}

/** What a scrubbed secret is replaced with, so that its absence is visible rather than silent. */
const REDACTED = '[redacted]';

/**
 * Replace every known secret value in `text` (REQ-NFR-01). **Known** is the whole promise: the
 * scrubber removes the values it is given — the token the runner passed, and the agent variables of
 * the runner's own environment — and nothing else. It is not a detector.
 */
export function scrub(text: string, secrets: readonly string[]): string {
  let scrubbed = text;
  for (const secret of secrets) {
    if (secret.trim() === '') continue;
    scrubbed = scrubbed.split(secret).join(REDACTED);
  }
  return scrubbed;
}

/**
 * Read the agent's long-lived token (REQ-RUN-15, requirements 1.3). Every space and line break is
 * removed: the spike lost a session to a token a paste had wrapped across two lines, and the only
 * sign was an opaque header error from the agent, after the session had already started.
 */
export function loadAgentToken(file: string): Result<string> {
  const label = basename(file);
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    return fail([{ path: label, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const token = text.replaceAll(/\s/gu, '');
  if (token === '') return fail([{ path: label, message: 'is empty: it holds no agent token' }]);
  return ok(token);
}

/** What the adapter needs that the step's request does not carry. */
export interface AdapterOptions {
  /** The long-lived token, held only so that it can be scrubbed out of what is stored. */
  readonly token: string;
  readonly usdToEur: number;
}

/**
 * The agent's command line (REQ-RUN-04). Bypassing permissions is acceptable only because the
 * container is isolated (REQ-RUN-02). The wingfoil arm's `--mcp-config` and `--strict-mcp-config`
 * arrive with the arms in W3.
 */
function commandLine(request: StepRequest): string[] {
  return [
    'claude',
    '-p',
    request.prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    request.model,
    '--session-id',
    request.sessionId,
    '--permission-mode',
    'bypassPermissions',
    '--setting-sources',
    'project',
    '--max-budget-usd',
    String(request.remainingCostUsd),
  ];
}

/**
 * Claude Code behind the agent port (F2.3, REQ-ARC-04). It runs inside the run's container, which
 * already holds the credential in its environment (REQ-RUN-15): the token is kept here only to be
 * removed from the transcript before it is stored (REQ-NFR-01).
 */
export function claudeCodeAgent(options: AdapterOptions): AgentPort {
  return {
    async runStep(request: StepRequest): Promise<StepOutcome> {
      const result = await request.run(commandLine(request));
      const lines = scrub(result.stdout, [options.token])
        .split('\n')
        .filter((line) => line.trim() !== '');
      const session = readSession(lines, options.usdToEur);
      if (session.outcome === 'failed') {
        throw new Error(`step ${request.step} of ${request.scenarioId} failed: ${session.error}`);
      }
      return { sessionId: session.sessionId, usage: session.usage, transcript: session.transcript };
    },
  };
}
