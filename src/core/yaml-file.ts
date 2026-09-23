import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { parseDocument } from 'yaml';
import type { z } from 'zod';

import { fail, formatPath, ok } from './result.js';
import type { Issue, Result } from './result.js';

/**
 * Read and parse the YAML file `file`. Every failure is an issue against the file's name: not found,
 * unreadable, not YAML, or empty.
 */
export function readYamlFile(file: string): Result<unknown> {
  const label = basename(file);
  if (!existsSync(file)) return fail([{ path: label, message: `not found in ${dirname(file)}` }]);

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    return fail([{ path: label, message: `cannot be read: ${(error as Error).message}` }]);
  }

  const document = parseDocument(text);
  const problem = document.errors[0] ?? document.warnings[0];
  if (problem) return fail([{ path: label, message: `is not valid YAML: ${firstLine(problem.message)}` }]);

  const data: unknown = document.toJS();
  return data === null || data === undefined ? fail([{ path: label, message: 'is empty' }]) : ok(data);
}

/** The first line of a message: an issue is one line, and YAML errors carry a code frame. */
function firstLine(message: string): string {
  return message.split('\n', 1)[0] as string;
}

/**
 * Validate `data` with `schema`. A missing field is reported as "is required", each unknown key at its
 * own path, and an issue with no field path against `label` (the file's name).
 */
export function parseWith<T extends z.ZodType>(schema: T, data: unknown, label: string): Result<z.output<T>> {
  const parsed = schema.safeParse(data, {
    error: (issue) =>
      issue.code === 'invalid_type' && issue.input === undefined ? 'is required' : undefined,
  });
  if (parsed.success) return ok(parsed.data);
  return fail(
    parsed.error.issues.flatMap((issue): Issue[] => {
      if (issue.code === 'unrecognized_keys') {
        return issue.keys.map((key) => ({
          path: formatPath([...issue.path, key]),
          message: 'is not a known field',
        }));
      }
      return [{ path: formatPath(issue.path) || label, message: issue.message }];
    }),
  );
}
