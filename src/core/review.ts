import { z } from 'zod';

import { fail, ok } from './result.js';
import type { Result } from './result.js';
import { parseWith } from './yaml-file.js';

/**
 * The review loop's findings (REQ-RUN-21, REQ-FMT-06 as amended in 1.58, task-148): what the reviewer returns as its
 * final result, and what each round's `findings.json` holds. A finding names a file of the reviewer's copy by its
 * relative path, and a line of it as that round's reviewer saw it, or none (a missing file, a design remark).
 */

/**
 * One spelling per file, so that rounds compare: repeated `/` collapsed, `.` segments dropped, so that `./src//a.ts`
 * is `src/a.ts`; nothing left is the project, `.`. A leading `/` survives, for the check after it to refuse.
 */
function normalizedPath(path: string): string {
  const absolute = path.startsWith('/');
  const segments = path.split('/').filter((segment) => segment !== '' && segment !== '.');
  if (segments.length === 0) return absolute ? '/' : '.';
  return `${absolute ? '/' : ''}${segments.join('/')}`;
}

/** A path inside the copy: relative, `/`-separated, with no `..` segment, never the copy's git directory. */
const copyPath = z
  .string()
  .trim()
  .min(1)
  .refine((path) => !path.includes('\\'), "must separate its segments with '/'")
  .transform(normalizedPath)
  .pipe(
    z
      .string()
      .refine(
        (path) => !path.startsWith('/') && !/^[A-Za-z]:/.test(path),
        'must be a path relative to the copy',
      )
      .refine((path) => !path.split('/').includes('..'), 'must not leave the copy')
      .refine(
        (path) => path !== '.git' && !path.startsWith('.git/'),
        "must not name the copy's git directory",
      ),
  );

export const findingSchema = z.strictObject({
  severity: z.enum(['blocker', 'should-fix', 'nit']),
  file: copyPath,
  line: z.number().int().min(1).nullable(),
  title: z.string().trim().min(1),
  why: z.string().trim().min(1),
});

/** One finding of a review round. */
export type Finding = z.infer<typeof findingSchema>;

export const findingsSchema = z.strictObject({ findings: z.array(findingSchema) });

const FENCE = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/gi;

/**
 * The findings a reviewer's final message holds: the message itself as JSON, or the one fenced `json` block in it.
 * Anything else (no JSON, two blocks, a finding out of the format) is an issue, so the loop ends as `failed`.
 */
export function parseFindings(message: string): Result<readonly Finding[]> {
  const trimmed = message.trim();
  let text = trimmed;
  if (!trimmed.startsWith('{')) {
    const blocks = [...trimmed.matchAll(FENCE)].map((match) => match[1] ?? '');
    if (blocks.length !== 1) {
      return fail([
        {
          path: 'findings',
          message:
            blocks.length === 0
              ? 'the final message holds no findings: neither JSON alone nor a fenced json block'
              : `the final message holds ${blocks.length} fenced json blocks, not one`,
        },
      ]);
    }
    text = blocks[0] as string;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return fail([
      { path: 'findings', message: `not JSON: ${error instanceof Error ? error.message : String(error)}` },
    ]);
  }
  const parsed = parseWith(findingsSchema, data, 'findings');
  return parsed.ok ? ok(parsed.value.findings) : parsed;
}
