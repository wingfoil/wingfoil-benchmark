import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { z } from 'zod';

import { fail, ok, parseWith } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';

import { executionRuns } from './runs.js';

/** Where an execution's judgements lie, beside its runs (REQ-SCO-06 as amended in 1.49, task-128). */
export const JUDGEMENTS_FILE = 'judgements.json';

const judgementSchema = z.strictObject({
  run: z.string().min(1),
  check: z.string().min(1),
  step: z.number().int().min(1),
  verdict: z.enum(['pass', 'fail']),
  note: z.string().min(1).optional(),
});
const judgementsSchema = z.strictObject({ judgements: z.array(judgementSchema) });

/** The maintainer's judgement of a v2 content check at a step of a run, beside the automatic verdict it is read with. */
export interface Judgement {
  /** The run's path in the execution, `runs/<scenario>@<version>/<arm>/<model>/r<k>`. */
  readonly run: string;
  readonly check: string;
  readonly step: number;
  readonly verdict: 'pass' | 'fail';
  readonly note?: string;
  /** What scoring found, from the run's `score.json`. */
  readonly automatic: 'pass' | 'fail';
}

/** The content checks of a run's `score.json`, as far as a judgement reads them. */
const scoreChecksSchema = z.object({
  checks: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        match: z.string().optional(),
        steps: z.array(z.object({ n: z.number(), passed: z.boolean().optional() })),
      }),
    )
    .optional(),
});

/**
 * An execution's `judgements.json` (REQ-SCO-06 as amended in 1.49, task-128), each judgement with the automatic
 * verdict it is set beside, in the file's order; `undefined` when the execution has none. Written by hand by the
 * maintainer, and refused when a key names no run, no v2 content check of it (a v1 check, every 1.0 version's under
 * K7, is not judged), or no step the check scored, or when a key repeats.
 */
export function readJudgements(executionDir: string): Result<readonly Judgement[] | undefined> {
  const file = join(executionDir, JUDGEMENTS_FILE);
  if (!existsSync(file)) return ok(undefined);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([{ path: JUDGEMENTS_FILE, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(judgementsSchema, data, JUDGEMENTS_FILE);
  if (!parsed.ok) return parsed;
  const runs = new Set(executionRuns(executionDir).map((dir) => relative(executionDir, dir).split(sep).join('/')));
  const issues: Issue[] = [];
  const seen = new Set<string>();
  const judged: Judgement[] = [];
  for (const [index, entry] of parsed.value.judgements.entries()) {
    const at = `${JUDGEMENTS_FILE}.judgements[${index}]`;
    const found = judged1(executionDir, runs, seen, entry);
    if (typeof found === 'string') issues.push({ path: at, message: found });
    else if ('field' in found) issues.push({ path: `${at}.${found.field}`, message: found.message });
    else judged.push(found);
  }
  return issues.length > 0 ? fail(issues) : ok(judged);
}

/** One judgement with its automatic verdict, or what is wrong with it: a message, on a field or on the entry. */
function judged1(
  executionDir: string,
  runs: ReadonlySet<string>,
  seen: Set<string>,
  entry: z.infer<typeof judgementSchema>,
): Judgement | string | { readonly field: string; readonly message: string } {
  const key = `${entry.run}#${entry.check}#${entry.step}`;
  if (seen.has(key)) return 'repeats the key of an earlier judgement';
  seen.add(key);
  if (!runs.has(entry.run)) return { field: 'run', message: `'${entry.run}' is no run of the execution` };
  const score = readScore(join(executionDir, entry.run, 'score.json'));
  if (score === undefined) return { field: 'run', message: `'${entry.run}' has no readable score.json` };
  const check = (score.checks ?? []).find((candidate) => candidate.id === entry.check);
  if (check === undefined || check.kind !== 'content' || check.match !== 'words') {
    return { field: 'check', message: `'${entry.check}' is no v2 content check of the run` };
  }
  const step = check.steps.find((candidate) => candidate.n === entry.step);
  if (step?.passed === undefined) return { field: 'step', message: `the check scored no step ${entry.step} of the run` };
  return { ...entry, automatic: step.passed ? 'pass' : 'fail' };
}

function readScore(file: string): z.infer<typeof scoreChecksSchema> | undefined {
  try {
    const parsed = scoreChecksSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
