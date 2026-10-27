import { readFileSync } from 'node:fs';

import { scrub } from './claude-code.js';
import type { ModelsUsage, SessionUsage } from './claude-code.js';
import { OPENAI_PRICES } from './openai-prices.js';
import type { OpenAiPrice } from './openai-prices.js';
import type { AgentPort, ResumeRequest, StepOutcome, StepRequest } from './port.js';

/**
 * A Codex thread's token totals, as `turn.completed` reports them (Codex 0.162.1's
 * `event_processor_with_jsonl_output.rs`): the **thread's** running total, not the turn's. `input` includes `cached`
 * and `written`; `output` includes the reasoning tokens.
 */
export interface CodexTotals {
  readonly input: number;
  readonly cached: number;
  readonly written: number;
  readonly output: number;
}

const NO_TOTALS: CodexTotals = { input: 0, cached: 0, written: 0, output: 0 };

/** What one Codex invocation amounted to (REQ-RUN-09 as amended in 1.32). */
export interface CodexSession {
  /** Codex's own id of the thread, from `thread.started`; empty when it never started one. */
  readonly threadId: string;
  /** The invocation's own tokens and turns; the cost is the thread's running total, as the port asks. */
  readonly usage: SessionUsage;
  /** The thread's totals after this invocation, which the next invocation of the thread is read against. */
  readonly totals: CodexTotals;
  readonly models: ModelsUsage;
  readonly transcript: readonly string[];
  readonly outcome: 'completed' | 'failed' | 'quota exhausted' | 'rate limited';
  readonly error?: string;
  readonly finalMessage?: string;
}

export interface CodexReading {
  readonly model: string;
  readonly usdToEur: number;
  /** The thread's totals before this invocation: absent for a fresh thread. */
  readonly before?: CodexTotals;
  /** The thread a resume continues, in case its stream does not start with `thread.started` again. */
  readonly threadId?: string;
  readonly durationMs?: number;
  /** The price table; OpenAI's pinned list prices unless a test gives its own. */
  readonly prices?: Readonly<Record<string, OpenAiPrice>>;
}

function numberOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Fresh input is what is left of `input_tokens` once the cached and the written tokens are taken out. */
function freshOf(totals: CodexTotals): number {
  return Math.max(0, totals.input - totals.cached - totals.written);
}

function priced(totals: CodexTotals, price: OpenAiPrice | undefined): number {
  if (price === undefined) return 0;
  return (
    (freshOf(totals) * price.input +
      totals.cached * price.cachedInput +
      totals.written * price.cacheWrite +
      totals.output * price.output) /
    1e6
  );
}

/**
 * Which of the plan's limits a failure's message names (REQ-RUN-13 as amended in 1.32), from Codex 0.162.1's
 * `protocol/src/error.rs`: documented, not observed.
 */
function limitOf(message: string): 'quota exhausted' | 'rate limited' | undefined {
  if (/hit your usage limit|^Quota exceeded|hit your spend cap|out of credits/i.test(message))
    return 'quota exhausted';
  // A rate limit Codex retries, and the retries' end once the limit outlasted them (`RetryLimit`, status 429).
  if (/^rate limit exceeded|exceeded retry limit, last status: 429/i.test(message)) return 'rate limited';
  return undefined;
}

/** Codex's warning on a resume (bug-036): "… recorded with model `A` but is resuming with `B`" — B, the model it ran. */
const RESUMED_ON = /\bis resuming with `([^`]+)`/;

/**
 * Read one Codex invocation's `--json` stream. As for Claude Code's (`readSession`): the outcome is what the stream
 * says, never assumed; a stream with no `turn.completed` is a failed step, not a step that used nothing; a line that
 * is not JSON fails the session rather than being skipped.
 */
export function readCodexSession(lines: readonly string[], reading: CodexReading): CodexSession {
  const before = reading.before ?? NO_TOTALS;
  let threadId = reading.threadId ?? '';
  let totals = before;
  let turns = 0;
  let finalMessage: string | undefined;
  let failure: string | undefined;
  /**
   * The last `error` event's message. Codex's retries ("Reconnecting…") are not failures; as Codex itself does
   * (`last_critical_error`), it stands for the session's failure only when no `turn.failed` names one.
   */
  let lastError: string | undefined;
  /** Codex's warning that it resumed the thread on another model than the step's (bug-036). */
  let switched: string | undefined;
  /** Whether this invocation's count restarted below the thread's: decided at its first `turn.completed`. */
  let restarted: boolean | undefined;

  const result = (outcome: CodexSession['outcome'], error?: string): CodexSession => {
    const price = (reading.prices ?? OPENAI_PRICES)[reading.model];
    const costUsd = priced(totals, price);
    return {
      threadId,
      usage: {
        inputTokens: Math.max(0, freshOf(totals) - freshOf(before)),
        outputTokens: Math.max(0, totals.output - before.output),
        cacheCreationInputTokens: Math.max(0, totals.written - before.written),
        cacheReadInputTokens: Math.max(0, totals.cached - before.cached),
        costUsd,
        costEur: costUsd * reading.usdToEur,
        turns,
        durationMs: reading.durationMs ?? 0,
      },
      totals,
      models:
        totals === NO_TOTALS
          ? {}
          : {
              [reading.model]: {
                inputTokens: freshOf(totals),
                outputTokens: totals.output,
                cacheCreationInputTokens: totals.written,
                cacheReadInputTokens: totals.cached,
                costUsd,
                costBasis: price === undefined ? 'unknown' : 'price-table',
              },
            },
      transcript: lines,
      outcome,
      ...(error === undefined ? {} : { error }),
      ...(finalMessage === undefined ? {} : { finalMessage }),
    };
  };

  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch (error) {
      return result('failed', `a line of the session is not valid JSON: ${(error as Error).message}`);
    }
    if (typeof event !== 'object' || event === null)
      return result('failed', 'a line of the session is not an object');
    switch (event.type) {
      case 'thread.started':
        if (typeof event.thread_id === 'string') threadId = event.thread_id;
        break;
      case 'turn.completed': {
        const usage = (event.usage ?? {}) as Record<string, unknown>;
        const reported = {
          input: numberOf(usage.input_tokens),
          cached: numberOf(usage.cached_input_tokens),
          written: numberOf(usage.cache_write_input_tokens),
          output: numberOf(usage.output_tokens),
        };
        // The thread's running total: the latest replaces, never adds (REQ-RUN-09 as amended in 1.32). A total below
        // the thread's earlier one (a resume that restarted its count) is this invocation's own, added to it.
        restarted ??= (Object.keys(reported) as (keyof CodexTotals)[]).some(
          (key) => reported[key] < before[key],
        );
        totals = restarted
          ? {
              input: before.input + reported.input,
              cached: before.cached + reported.cached,
              written: before.written + reported.written,
              output: before.output + reported.output,
            }
          : reported;
        turns += 1;
        failure = undefined;
        break;
      }
      case 'turn.failed': {
        const error = (event.error ?? {}) as Record<string, unknown>;
        failure = typeof error.message === 'string' ? error.message : 'the turn failed';
        break;
      }
      case 'error':
        if (typeof event.message === 'string') lastError = event.message;
        break;
      case 'item.completed': {
        const item = (event.item ?? {}) as Record<string, unknown>;
        if (item.type === 'agent_message' && typeof item.text === 'string') finalMessage = item.text;
        // bug-036: a thread resumed on another model than the step's is not the step's work, nor priced as it.
        if (item.type === 'error' && typeof item.message === 'string') {
          const resumedOn = RESUMED_ON.exec(item.message)?.[1];
          if (resumedOn !== undefined && resumedOn !== reading.model) switched = item.message;
        }
        break;
      }
      default:
        break;
    }
  }

  if (switched !== undefined) return result('failed', switched);
  if (failure !== undefined) {
    const limit = limitOf(failure);
    return limit === undefined ? result('failed', failure) : result(limit);
  }
  if (turns === 0) {
    const limit = lastError === undefined ? undefined : limitOf(lastError);
    if (limit !== undefined) return result(limit);
    return result('failed', lastError ?? 'the session ended with no turn.completed event');
  }
  return result('completed');
}

/**
 * The values of a Codex `auth.json` to scrub (REQ-NFR-01 as amended in 1.32): every string of 16 characters or more,
 * wherever it is, but `last_refresh`, a timestamp. Read only to be removed: never logged, never stored. A file that is
 * not JSON names nothing: the closing secret scan is the check, not this.
 */
export function codexSecrets(text: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const found = new Set<string>();
  const walk = (node: unknown, key?: string): void => {
    if (typeof node === 'string') {
      if (key !== 'last_refresh' && node.length >= 16) found.add(node);
    } else if (Array.isArray(node)) {
      for (const item of node) walk(item);
    } else if (typeof node === 'object' && node !== null) {
      for (const [k, v] of Object.entries(node)) walk(v, k);
    }
  };
  walk(parsed);
  return [...found];
}

/** What the Codex adapter needs that a step's request does not carry. */
export interface CodexOptions {
  /** The host's `auth.json` (dl-019), read only for its values to scrub, before and after each invocation. */
  readonly authFile: string;
  readonly usdToEur: number;
  /** The clock the invocation's wall time is read from: Codex does not report it. */
  readonly now?: () => number;
}

/** Codex's options shared by a step and a resume (REQ-RUN-04 as amended in 1.32). */
const BYPASS = ['--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '--strict-config'];

/** The pinned effort as a configuration override (dl-015): none for `none`, or when nothing is pinned. */
function effortFlag(effort: string | undefined): string[] {
  return effort === undefined || effort === 'none' ? [] : ['-c', `model_reasoning_effort="${effort}"`];
}

/** The values to scrub of the Codex credential at `file` now; none when it cannot be read. */
export function codexFileSecrets(file: string): string[] {
  try {
    return codexSecrets(readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Codex behind the agent port (REQ-ARC-04, task-094). Codex picks its thread's id, so the adapter answers for the
 * runner's id once a thread started, and keeps the thread and its totals for the resume.
 */
export function codexAgent(options: CodexOptions): AgentPort {
  const now = options.now ?? Date.now;
  const threads = new Map<
    string,
    { readonly threadId: string; readonly model: string; totals: CodexTotals }
  >();

  async function invoke(
    run: (command: readonly string[]) => Promise<{ stdout: string; outputBounded?: true }>,
    command: readonly string[],
    sessionId: string,
    model: string,
    thread?: { readonly threadId: string; readonly totals: CodexTotals },
  ): Promise<StepOutcome> {
    const secretsBefore = codexFileSecrets(options.authFile);
    const started = now();
    const result = await run(command);
    const durationMs = now() - started;
    // A refresh during the invocation wrote new values: both sets are scrubbed.
    const secrets = [...secretsBefore, ...codexFileSecrets(options.authFile)];
    const lines = scrub(result.stdout, secrets)
      .split('\n')
      .filter((line) => line.trim() !== '');
    const session = readCodexSession(lines, {
      model,
      usdToEur: options.usdToEur,
      ...(thread === undefined ? {} : { before: thread.totals, threadId: thread.threadId }),
      durationMs,
    });
    if (result.outputBounded === true) {
      return {
        sessionId: '',
        usage: { ...session.usage, costUsd: 0, costEur: 0 },
        transcript: lines,
        error: "the agent's output passed the port's output bound; its usage is not known",
      };
    }
    if (session.threadId === '') return outcomeOf(session, '');
    if (thread !== undefined && thread.threadId !== session.threadId) {
      return {
        ...outcomeOf(session, ''),
        error: `Codex resumed thread ${session.threadId}, not ${thread.threadId}`,
      };
    }
    threads.set(sessionId, { threadId: session.threadId, model, totals: session.totals });
    return outcomeOf(session, sessionId);
  }

  return {
    runStep: (request: StepRequest) =>
      invoke(
        request.run,
        [
          'codex',
          'exec',
          '--json',
          '--model',
          request.model,
          ...effortFlag(request.effort),
          ...BYPASS,
          '--',
          request.prompt,
        ],
        request.sessionId,
        request.model,
      ),
    resume: (request: ResumeRequest) => {
      const thread = threads.get(request.sessionId);
      if (thread === undefined) {
        return Promise.resolve({
          sessionId: '',
          usage: readCodexSession([], { model: '', usdToEur: options.usdToEur }).usage,
          transcript: [],
          error: `no Codex thread for session ${request.sessionId}: it was not started by this adapter`,
        });
      }
      return invoke(
        request.run,
        [
          'codex',
          'exec',
          'resume',
          '--json',
          // bug-036: without it Codex resumes the thread on its default model, not the step's.
          '--model',
          thread.model,
          ...effortFlag(request.effort),
          ...BYPASS,
          '--',
          thread.threadId,
          request.reply,
        ],
        request.sessionId,
        thread.model,
        thread,
      );
    },
    // dl-024: no thread outlives its run.
    endRun: () => threads.clear(),
  };
}

function outcomeOf(session: CodexSession, sessionId: string): StepOutcome {
  return {
    sessionId,
    usage: session.usage,
    ...(Object.keys(session.models).length === 0 ? {} : { models: session.models }),
    transcript: session.transcript,
    ...(session.outcome === 'failed' ? { error: session.error ?? 'the session failed' } : {}),
    // No turn.completed: Codex reported nothing of what the invocation used, whether it failed or stopped at the quota
    // (REQ-RUN-09 as amended in 1.35). A rate limit is the runner's to wait out and resume: not marked.
    ...((session.outcome === 'failed' || session.outcome === 'quota exhausted') && session.usage.turns === 0
      ? { costUnknown: true as const }
      : {}),
    ...(session.outcome === 'quota exhausted' || session.outcome === 'rate limited'
      ? { stop: session.outcome }
      : {}),
    ...(session.finalMessage === undefined ? {} : { finalMessage: session.finalMessage }),
  };
}
