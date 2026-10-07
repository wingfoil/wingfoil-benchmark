import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { AgentPort, ResumeRequest, StepOutcome, StepRequest } from './port.js';
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

/** What one model did in a session, as the `result` event's `modelUsage` reports it (task-054). */
export interface ModelUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly costUsd: number;
  /**
   * How the agent priced it (bug-016): `list` when it knows the model's list price; anything else, such as
   * `unknown`, means `costUsd` is not that model's price. Absent in sessions recorded before Claude Code reported it.
   */
  readonly costBasis?: string;
}

/** The models a session used, by the key the agent reports them under: its own model and any it calls. */
export type ModelsUsage = Readonly<Record<string, ModelUsage>>;

/**
 * Two readings of one session's models, folded: **field by field, the largest**. `modelUsage` is the session's
 * running total, as `total_cost_usd` is, so a resume reports what earlier invocations did again; summing it would
 * count them twice (task-054). The keys come out sorted (REQ-NFR-05).
 */
export function foldModels(a: ModelsUsage, b: ModelsUsage): ModelsUsage {
  const out: Record<string, ModelUsage> = {};
  for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = a[key];
    const y = b[key];
    if (x === undefined || y === undefined) {
      const only = x ?? y;
      if (only !== undefined) out[key] = only;
      continue;
    }
    out[key] = {
      inputTokens: Math.max(x.inputTokens, y.inputTokens),
      outputTokens: Math.max(x.outputTokens, y.outputTokens),
      cacheCreationInputTokens: Math.max(x.cacheCreationInputTokens, y.cacheCreationInputTokens),
      cacheReadInputTokens: Math.max(x.cacheReadInputTokens, y.cacheReadInputTokens),
      costUsd: Math.max(x.costUsd, y.costUsd),
      ...basisOf(x.costBasis, y.costBasis),
    };
  }
  return out;
}

/** Two readings' price basis: one that is not `list` wins, so a step is flagged when any invocation was (bug-016). */
function basisOf(a: string | undefined, b: string | undefined): { costBasis?: string } {
  const basis = [a, b].find((value) => value !== undefined && value !== 'list') ?? a ?? b;
  return basis === undefined ? {} : { costBasis: basis };
}

/** A `result` event's `modelUsage`, read loosely: a model with a field missing counts it as zero. */
function modelsOf(event: Record<string, unknown>): ModelsUsage {
  const reported = event.modelUsage;
  if (typeof reported !== 'object' || reported === null) return {};
  const out: Record<string, ModelUsage> = {};
  for (const [key, value] of Object.entries(reported as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const usage = value as Record<string, unknown>;
    out[key] = {
      inputTokens: numberOf(usage.inputTokens),
      outputTokens: numberOf(usage.outputTokens),
      cacheCreationInputTokens: numberOf(usage.cacheCreationInputTokens),
      cacheReadInputTokens: numberOf(usage.cacheReadInputTokens),
      costUsd: numberOf(usage.costUSD),
      ...(typeof usage.costBasis === 'string' ? { costBasis: usage.costBasis } : {}),
    };
  }
  return out;
}

/** What one session, or one step's worth of sessions, amounted to. */
export interface Session {
  readonly sessionId: string;
  readonly usage: SessionUsage;
  /** The models the session reported using, with what each did (task-054); empty when none was reported. */
  readonly models: ModelsUsage;
  readonly transcript: readonly string[];
  /**
   * `cap reached`: the session stopped at its `--max-budget-usd` (task-024, C1); `quota exhausted`: at
   * the subscription's usage limit (REQ-RUN-13); `rate limited`: rejected by the account's rate limit, which the
   * runner waits out (REQ-RUN-13 as amended in 1.24, task-051). None is a failure: all are stops the runner reads.
   */
  readonly outcome: 'completed' | 'failed' | 'cap reached' | 'quota exhausted' | 'rate limited';
  readonly error?: string;
  /**
   * The final assistant message: the `result` field of the last result event. In every untrimmed
   * stream of the W2 spike it is byte-identical to the last assistant text, and it is the one place
   * the agent writes that text for a reader. Absent when no result event carries one.
   */
  readonly finalMessage?: string;
}

/** The only `terminal_reason` that means the session finished the work it was given. */
const COMPLETED = 'completed';

/** What Claude Code 2.1.280 says when `--max-budget-usd` stopped a session (task-024, C1). */
const BUDGET_EXHAUSTED = 'budget_exhausted';

/** Which of the subscription's limits stopped a session (REQ-RUN-13 as amended in 1.24). */
export type SubscriptionLimit = 'usage limit' | 'rate limit';

/**
 * Which of the subscription's limits a failed `result` event says stopped the session, if any.
 *
 * - **The usage limit** — "usage limit" in its text: the documented shape (task-024), **not observed**, since
 *   provoking it would take the subscription's whole limit.
 * - **A rate limit** — HTTP status 429, "rate limit" in its text, or a `rate_limit` error in its `errors` or in the
 *   `assistant` event before it (`assistantError`). The shape Claude Code 2.1.280 wrote in calibration's dry run 2
 *   (bug-010): an `assistant` event with `error: rate_limit`, then a `result` with `api_error_status` 429, "This
 *   request would exceed your account's rate limit. Please try again later." and `terminal_reason: api_error`.
 */
export function subscriptionLimitOf(
  event: Readonly<Record<string, unknown>>,
  assistantError?: string,
): SubscriptionLimit | undefined {
  if (event.is_error !== true) return undefined;
  const errors = Array.isArray(event.errors) ? event.errors.map(String) : [];
  const text = [typeof event.result === 'string' ? event.result : '', ...errors].join('\n');
  if (/usage limit/i.test(text)) return 'usage limit';
  if (event.api_error_status === 429) return 'rate limit';
  // The text and the assistant's error count only for an API error: a tool's or a scenario's "rate limit" is not
  // the account's (task-051's review).
  const apiError = event.terminal_reason === 'api_error' || event.api_error_status !== undefined;
  if (apiError && (/rate[ _]limit/i.test(text) || assistantError === 'rate_limit')) return 'rate limit';
  return undefined;
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
  // A session's running total, not this invocation's: a resume reports what the whole session has
  // cost so far (the spike's P6 = P4's cost + its own). Taking the largest is right for one session
  // and never counts an earlier invocation twice.
  const costUsd = Math.max(total.costUsd, numberOf(event.total_cost_usd));
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
 *   `"subtype": "success"` on a session that failed to authenticate and did nothing. A session
 *   counts as completed only when `is_error` is not `true` **and** `terminal_reason` says
 *   `completed`: a session cut off by `--max-budget-usd` reports neither an error nor completion,
 *   and scoring it as a finished step would score truncated work as finished work;
 * - **a stream with no `result` event is a failed step**, not a step that used nothing. It is what a
 *   step killed by its cap leaves behind;
 * - **work is summed over the events seen; cost is not.** A resumed invocation (REQ-RUN-07) reports
 *   its own tokens, turns and wall time, so reading only the last would under-report exactly the
 *   steps that needed an intervention; but its `total_cost_usd` is the session's running total, so
 *   summing it would count every earlier invocation again. The cost is the latest total.
 */
export function readSession(lines: readonly string[], usdToEur: number): Session {
  let usage = ZERO;
  let models: ModelsUsage = {};
  let sessionId = '';
  let results = 0;
  let finalMessage: string | undefined;
  const failures: string[] = [];
  let stop: 'cap reached' | 'quota exhausted' | 'rate limited' | undefined;
  /** The latest `assistant` event's `error`, which a `result` that follows it may only echo (bug-010). */
  let assistantError: string | undefined;

  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch (error) {
      return {
        sessionId,
        usage,
        models,
        transcript: lines,
        outcome: 'failed',
        error: `a line of the session is not valid JSON: ${(error as Error).message}`,
      };
    }
    if (typeof event !== 'object' || event === null) {
      return {
        sessionId,
        usage,
        models,
        transcript: lines,
        outcome: 'failed',
        error: 'a line of the session is not an object',
      };
    }
    if (event.type === 'assistant') {
      assistantError = typeof event.error === 'string' ? event.error : undefined;
      continue;
    }
    if (event.type !== 'result') continue;
    results += 1;
    usage = add(usage, event, usdToEur);
    models = foldModels(models, modelsOf(event));
    // The session the agent *ended in*, not the one it was asked for: the init event echoes the
    // `--session-id` the runner passed, so reading that would compare an id with itself.
    if (typeof event.session_id === 'string') sessionId = event.session_id;
    finalMessage = typeof event.result === 'string' ? event.result : undefined;
    const reason = typeof event.terminal_reason === 'string' ? event.terminal_reason : 'unknown';
    const limit = subscriptionLimitOf(event, assistantError);
    // An error echoed by this result is not the next invocation's to read.
    assistantError = undefined;
    if (reason === BUDGET_EXHAUSTED) {
      stop = 'cap reached';
    } else if (limit === 'usage limit') {
      stop = 'quota exhausted';
    } else if (limit === 'rate limit') {
      stop = 'rate limited';
    } else if (event.is_error !== false || reason !== COMPLETED) {
      failures.push(
        event.is_error !== false && reason === COMPLETED ? `is_error ${String(event.is_error)}` : reason,
      );
    }
  }

  if (results === 0) {
    return {
      sessionId,
      usage,
      models,
      transcript: lines,
      outcome: 'failed',
      error: 'the session ended with no result event',
    };
  }
  const message = finalMessage === undefined ? {} : { finalMessage };
  if (failures.length > 0) {
    return {
      sessionId,
      usage,
      models,
      transcript: lines,
      outcome: 'failed',
      error: failures.join(', '),
      ...message,
    };
  }
  return { sessionId, usage, models, transcript: lines, outcome: stop ?? 'completed', ...message };
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
 * container is isolated (REQ-RUN-02).
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
    ...mcpFlags(request.mcpConfig),
  ];
}

/**
 * An arm's MCP configuration (adr-003 decision 12), and no other server: `--strict-mcp-config` keeps
 * any configuration the agent might find elsewhere out of the run. On both command lines — the W3
 * spike saw a resume accept them and reconnect the server; without them it would run without the
 * arm's tools.
 */
function mcpFlags(config: string | undefined): string[] {
  return config === undefined ? [] : ['--mcp-config', config, '--strict-mcp-config'];
}

/**
 * The command line of a resume (REQ-RUN-07), as the W2 spike measured it (P6). It names neither a
 * model nor a session id: the resumed session kept its pinned model without them, and a flag nobody
 * measured together with `--resume` is not one to add by assumption.
 */
function resumeLine(request: ResumeRequest): string[] {
  return [
    'claude',
    '--resume',
    request.sessionId,
    '-p',
    request.reply,
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'bypassPermissions',
    '--setting-sources',
    'project',
    '--max-budget-usd',
    String(request.remainingCostUsd),
    ...mcpFlags(request.mcpConfig),
  ];
}

/**
 * Claude Code behind the agent port (F2.3, REQ-ARC-04). It runs inside the run's container, which
 * already holds the credential in its environment (REQ-RUN-15): the token is kept here only to be
 * removed from the transcript before it is stored (REQ-NFR-01).
 */
export function claudeCodeAgent(options: AdapterOptions): AgentPort {
  async function invoke(
    run: (command: readonly string[]) => Promise<{ stdout: string; outputBounded?: true }>,
    command: readonly string[],
  ): Promise<StepOutcome> {
    const result = await run(command);
    const lines = scrub(result.stdout, [options.token])
      .split('\n')
      .filter((line) => line.trim() !== '');
    // A stream the port stopped reading ends mid-line and has no `result`: its usage is not known, and the
    // step is failed by what happened to it, not by the cut line (bug-011). The lines read are the evidence.
    if (result.outputBounded === true) {
      return {
        sessionId: '',
        usage: ZERO,
        transcript: lines,
        error: "the agent's output passed the port's output bound; its usage is not known",
      };
    }
    const session = readSession(lines, options.usdToEur);
    return {
      sessionId: session.sessionId,
      usage: session.usage,
      ...(Object.keys(session.models).length === 0 ? {} : { models: session.models }),
      transcript: session.transcript,
      ...(session.outcome === 'failed' ? { error: session.error ?? 'the session failed' } : {}),
      ...(session.outcome === 'cap reached' ||
      session.outcome === 'quota exhausted' ||
      session.outcome === 'rate limited'
        ? { stop: session.outcome }
        : {}),
      ...(session.finalMessage === undefined ? {} : { finalMessage: session.finalMessage }),
    };
  }
  return {
    runStep: (request: StepRequest) => invoke(request.run, commandLine(request)),
    resume: (request: ResumeRequest) => invoke(request.run, resumeLine(request)),
  };
}
