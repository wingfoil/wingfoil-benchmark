import { readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';

import { readSession } from './claude-code.js';
import type { Session, SessionUsage } from './claude-code.js';
import type { AgentPort } from './port.js';
import { fail, parseWith } from '../core/index.js';
import type { Result } from '../core/index.js';

const scriptedStep = z.strictObject({
  /** The session the fake answers with. Absent means "the one the runner gave me", the ordinary case. */
  session: z.string().min(1).optional(),
  commands: z.array(z.string().min(1)).min(1),
  /**
   * A recorded stream-json session to replay, named relative to the script (adr-002 decision 13).
   * Absent means the step reports no usage, which is what the trivial fixtures want.
   */
  events: z.string().min(1).optional(),
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

/** A scripted stand-in for an agent: it runs the commands its script declares, and nothing else. */
export function fakeAgent(script: FakeScript, options: FakeOptions): AgentPort {
  return {
    async runStep({ scenarioId, step, sessionId, run }) {
      const scripted = script[scenarioId]?.[String(step)];
      if (scripted === undefined) {
        throw new Error(`the fake agent has no scripted commands for ${scenarioId} step ${step}`);
      }
      for (const command of scripted.commands) {
        const result = await run(['sh', '-c', command]);
        if (result.code !== 0) {
          throw new Error(`'${command}' failed with code ${result.code}:\n${result.stderr.trim()}`);
        }
      }
      const replayed = replay(scripted.events, options);
      return {
        sessionId: scripted.session ?? sessionId,
        usage: replayed?.usage ?? NO_USAGE,
        transcript: replayed?.transcript ?? [],
      };
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
