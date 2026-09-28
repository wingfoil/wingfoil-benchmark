import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { fail, parseWith } from '../core/index.js';
import type { Result } from '../core/index.js';

const RUN_FILE = 'run.json';

/**
 * The runs of one execution (REQ-FMT-06): every `runs/<scenario>@<ver>/<arm>/<model>/r<k>/` holding a
 * `run.json`, in path order — by UTF-16 code unit, whatever the locale — so that scoring them always
 * goes the same way.
 */
export function executionRuns(executionDir: string): string[] {
  const root = join(executionDir, 'runs');
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const walk = (directory: string, depth: number): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (!statSync(path).isDirectory()) continue;
      if (depth === 3) {
        if (existsSync(join(path, RUN_FILE))) found.push(path);
      } else walk(path, depth + 1);
    }
  };
  walk(root, 0);
  return found;
}

/** What scoring reads from a `run.json` (task-027): the rest of the record is not its business. */
const storedRunSchema = z.object({
  scenario: z.string(),
  version: z.string(),
  scenario_hash: z.string(),
  arm: z.string(),
  model: z.string(),
  repetition: z.number().int(),
  outcome: z.string(),
  setup: z.object({ tree: z.string().optional() }).optional(),
  steps: z.array(z.object({ n: z.number().int(), tree: z.string().optional() })),
});

/** A stored run as scoring sees it. A tree is absent in a run stored before trees were recorded. */
export interface StoredRun {
  readonly scenario: string;
  readonly version: string;
  readonly scenarioHash: string;
  readonly arm: string;
  readonly model: string;
  readonly repetition: number;
  readonly outcome: string;
  readonly setupTree?: string;
  readonly steps: readonly { readonly n: number; readonly tree?: string }[];
}

/** Read the `run.json` of the run in `runDir`; every issue is named against the file. */
export function readStoredRun(runDir: string): Result<StoredRun> {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(runDir, RUN_FILE), 'utf8'));
  } catch (error) {
    return fail([{ path: RUN_FILE, message: `is not JSON: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(storedRunSchema, data, RUN_FILE);
  if (!parsed.ok) {
    return fail(parsed.issues.map((issue) => ({ ...issue, path: `${RUN_FILE}.${issue.path}` })));
  }
  const run = parsed.value;
  return {
    ok: true,
    value: {
      scenario: run.scenario,
      version: run.version,
      scenarioHash: run.scenario_hash,
      arm: run.arm,
      model: run.model,
      repetition: run.repetition,
      outcome: run.outcome,
      ...(run.setup?.tree === undefined ? {} : { setupTree: run.setup.tree }),
      steps: run.steps.map((step) => ({ n: step.n, ...(step.tree === undefined ? {} : { tree: step.tree }) })),
    },
  };
}
