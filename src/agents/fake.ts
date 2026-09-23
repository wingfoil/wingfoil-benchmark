import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { z } from 'zod';

import { fail, ok, parseWith } from '../core/index.js';
import type { ProcessResult, Result } from '../core/index.js';

/** What the agent is asked to do for one step of a run. */
export interface StepRequest {
  readonly scenarioId: string;
  readonly step: number;
  /** Runs a command inside the run's container. */
  readonly run: (command: readonly string[]) => Promise<ProcessResult>;
}

/** What the agent did in a step. In W1 that is the list of commands it ran (F2.2 adds sessions). */
export interface StepOutcome {
  readonly commands: readonly string[];
}

/** REQ-ARC-04: the agent behind one interface, so a run never depends on a real agent. */
export interface AgentPort {
  runStep(request: StepRequest): Promise<StepOutcome>;
}

const scriptSchema = z.record(
  z.string(),
  z.record(z.string().regex(/^[1-9]\d*$/, 'must be a step number'), z.array(z.string().min(1)).min(1)),
);

/** Commands per scenario and step: `{ "<scenario id>": { "<step>": ["<shell command>", …] } }`. */
export type FakeScript = z.infer<typeof scriptSchema>;

/**
 * Read the fake agent's script (the W1 seam; W2 replaces it with recorded sessions, F2.2). Every
 * failure is an issue against the file's name.
 */
export function loadFakeScript(file: string): Result<FakeScript> {
  const label = basename(file);
  let text: string;
  try {
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
    async runStep({ scenarioId, step, run }) {
      const commands = script[scenarioId]?.[String(step)];
      if (commands === undefined) {
        throw new Error(`the fake agent has no scripted commands for ${scenarioId} step ${step}`);
      }
      for (const command of commands) {
        const result = await run(['sh', '-c', command]);
        if (result.code !== 0) {
          throw new Error(`'${command}' failed with code ${result.code}:\n${result.stderr.trim()}`);
        }
      }
      return { commands };
    },
  };
}
