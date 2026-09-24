import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { z } from 'zod';

import { fail, parseWith } from '../core/index.js';
import type { ProcessResult, Result } from '../core/index.js';

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
  /** Runs a command inside the run's container. */
  readonly run: (command: readonly string[]) => Promise<ProcessResult>;
}

/**
 * What the agent did in a step. The session is reported rather than assumed, so the runner can check
 * that the agent used the one it was given. Usage and the transcript join it in task-006 (F2.3).
 */
export interface StepOutcome {
  readonly sessionId: string;
}

/** REQ-ARC-04: the agent behind one interface, so a run never depends on a real agent. */
export interface AgentPort {
  runStep(request: StepRequest): Promise<StepOutcome>;
}

const scriptedStep = z.strictObject({
  /** The session the fake answers with. Absent means "the one the runner gave me", the ordinary case. */
  session: z.string().min(1).optional(),
  commands: z.array(z.string().min(1)).min(1),
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

/** A scripted stand-in for an agent: it runs the commands its script declares, and nothing else. */
export function fakeAgent(script: FakeScript): AgentPort {
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
      return { sessionId: scripted.session ?? sessionId };
    },
  };
}
