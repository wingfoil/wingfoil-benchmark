import { readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';

import { readSession } from './claude-code.js';
import type { Session, SessionUsage } from './claude-code.js';
import type { AgentPort, StepOutcome } from './port.js';
import { fail, parseWith } from '../core/index.js';
import type { Result } from '../core/index.js';

/** One reply of the neutral approver, as the fake answers it: a recorded resumed session (REQ-RUN-07). */
const scriptedResume = z.strictObject({
  /** The session the fake answers from. Absent means "the one it was asked to resume". */
  session: z.string().min(1).optional(),
  commands: z.array(z.string().min(1)).optional(),
  events: z.string().min(1),
});

const scriptedStep = z.strictObject({
  /** The session the fake answers with. Absent means "the one the runner gave me", the ordinary case. */
  session: z.string().min(1).optional(),
  commands: z.array(z.string().min(1)).min(1),
  /**
   * A recorded stream-json session to replay, named relative to the script (adr-002 decision 13).
   * Absent means the step reports no usage, which is what the trivial fixtures want.
   */
  events: z.string().min(1).optional(),
  /** One recorded session per intervention the step is expected to receive, in order. */
  resumes: z.array(scriptedResume).optional(),
});

const scriptSchema = z.record(
  z.string(),
  z.record(z.string().regex(/^[1-9]\d*$/, 'must be a step number'), scriptedStep),
);

/** A script declares commands, not data: anything larger is a mistake. */
const MAX_SCRIPT_BYTES = 1024 * 1024;

/** A session per scenario and step: `{ "<id>": { "<step>": { session?, commands: […] } } }`. */
export type FakeScript = z.infer<typeof scriptSchema>;

/**
 * Read the fake agent's script. Every failure is an issue against the file's name. Recorded
 * stream-json events join a scripted step in task-006, where usage and transcripts are read.
 */
export function loadFakeScript(file: string): Result<FakeScript> {
  const label = basename(file);
  let text: string;
  try {
    const size = statSync(file).size;
    if (size > MAX_SCRIPT_BYTES) {
      return fail([{ path: label, message: `is larger than ${MAX_SCRIPT_BYTES} bytes: ${size}` }]);
    }
    text = readFileSync(file, 'utf8');
  } catch (error) {
    return fail([{ path: label, message: `cannot be read: ${(error as Error).message}` }]);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return fail([{ path: label, message: `is not valid JSON: ${(error as Error).message}` }]);
  }
  return parseWith(scriptSchema, data, label);
}

/** What the fake needs beyond its script: where the script is, and the campaign's currency rate. */
export interface FakeOptions {
  /** The script's own directory: a recorded session is named relative to it. */
  readonly dir: string;
  readonly usdToEur: number;
}

/** A step that replays nothing reports no usage; it is a stand-in, not a measurement. */
const NO_USAGE: SessionUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costUsd: 0,
  costEur: 0,
  turns: 0,
  durationMs: 0,
};

/** Run a scripted invocation's commands in the container; a failing command fails the invocation. */
async function runCommands(
  commands: readonly string[],
  run: (command: readonly string[]) => Promise<{ code: number; stderr: string }>,
): Promise<void> {
  for (const command of commands) {
    const result = await run(['sh', '-c', command]);
    if (result.code !== 0) {
      throw new Error(`'${command}' failed with code ${result.code}:\n${result.stderr.trim()}`);
    }
  }
}

/** What an invocation reports from the session it replays, if any, in the session it answers from. */
function outcomeOf(replayed: Session | undefined, sessionId: string): StepOutcome {
  return {
    sessionId,
    usage: replayed?.usage ?? NO_USAGE,
    transcript: replayed?.transcript ?? [],
    // A replayed failure is a failure. Without this every acceptance test runs through an agent
    // that cannot report one, and a failing step is untestable in every wave that uses the fake.
    ...(replayed?.outcome === 'failed' ? { error: replayed.error ?? 'the session failed' } : {}),
    // A replayed stop is a stop (task-024): a recorded cut-off session plays the same in every test.
    ...(replayed?.outcome === 'cap reached' ||
    replayed?.outcome === 'quota exhausted' ||
    replayed?.outcome === 'rate limited'
      ? { stop: replayed.outcome }
      : {}),
    // What the approver reads is what the recorded agent wrote.
    ...(replayed?.finalMessage === undefined ? {} : { finalMessage: replayed.finalMessage }),
  };
}

/** A scripted stand-in for an agent: it runs the commands its script declares, and nothing else. */
export function fakeAgent(script: FakeScript, options: FakeOptions): AgentPort {
  return {
    async runStep({ scenarioId, step, sessionId, run }) {
      const scripted = script[scenarioId]?.[String(step)];
      if (scripted === undefined) {
        throw new Error(`the fake agent has no scripted commands for ${scenarioId} step ${step}`);
      }
      await runCommands(scripted.commands, run);
      return outcomeOf(replay(scripted.events, options), scripted.session ?? sessionId);
    },
    // A resume the script does not foresee is an error, as an unscripted step is: a runner that
    // replies once too often must be heard, not answered with an empty session.
    async resume({ scenarioId, step, intervention, sessionId, run }) {
      const scripted = script[scenarioId]?.[String(step)]?.resumes?.[intervention - 1];
      if (scripted === undefined) {
        throw new Error(
          `the fake agent has no scripted resume ${intervention} for ${scenarioId} step ${step}`,
        );
      }
      await runCommands(scripted.commands ?? [], run);
      return outcomeOf(replay(scripted.events, options), scripted.session ?? sessionId);
    },
  };
}

/** Read the recorded session a scripted step names, if it names one. */
function replay(events: string | undefined, options: FakeOptions): Session | undefined {
  if (events === undefined) return undefined;
  const file = join(options.dir, events);
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(
      `the fake agent cannot read the recorded session ${events}: ${(error as Error).message}`,
      { cause: error },
    );
  }
  return readSession(
    text.split('\n').filter((line) => line !== ''),
    options.usdToEur,
  );
}
