import { isAbsolute, posix } from 'node:path';
import { z } from 'zod';

/** The benchmark categories A–G (09_experiment-design.md). */
export const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

/** The result profiles of 04_personas.md §2. */
export const PROFILES = [
  'solo-developer',
  'code-reviewer',
  'team-developer',
  'tech-lead',
  'non-technical-manager',
  'architect',
] as const;

/** A scenario id: S1, M2, T0. */
export const SCENARIO_ID = /^[A-Z][A-Z0-9]*$/;
/** A scenario version: 1.0, 1.1. */
export const SCENARIO_VERSION = /^\d+\.\d+$/;

/** A path relative to the scenario version directory that cannot leave it. */
const relativePath = z
  .string()
  .min(1)
  .refine((path) => !isAbsolute(path) && !path.split(/[\\/]/).includes('..'), {
    message: 'must be a relative path inside the scenario directory',
  });

/** A list whose entries are all different. */
function uniqueList<T extends z.ZodType>(item: T) {
  return z.array(item).refine((list) => new Set(list).size === list.length, 'must not contain duplicates');
}

/** Two spellings of the same relative path (`./a/b`, `a/./b`) compare equal. */
function samePathKey(path: string): string {
  return posix.normalize(path.replaceAll('\\', '/'));
}

const SPDX_ID = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;
const SPDX_OPERATORS = new Set(['AND', 'OR', 'WITH']);
/** Deeper nesting than any real license needs; it bounds the parser's recursion. */
const SPDX_MAX_DEPTH = 32;

/**
 * Whether `text` is shaped like an SPDX license expression: identifiers joined by `AND`/`OR`, an
 * identifier `WITH` an exception, and parentheses nested at most {@link SPDX_MAX_DEPTH} deep.
 * Identifiers are not checked against the SPDX list.
 */
function isSpdxExpression(text: string): boolean {
  const tokens = text.match(/\(|\)|[^\s()]+/g) ?? [];
  let position = 0;
  const peek = () => tokens[position];
  const isId = (token: string | undefined) =>
    token !== undefined && SPDX_ID.test(token) && !SPDX_OPERATORS.has(token);
  function term(depth: number): boolean {
    if (peek() === '(') {
      position += 1;
      if (depth >= SPDX_MAX_DEPTH || !expression(depth + 1) || peek() !== ')') return false;
      position += 1;
      return true;
    }
    if (!isId(peek())) return false;
    position += 1;
    if (peek() === 'WITH') {
      position += 1;
      if (!isId(peek())) return false;
      position += 1;
    }
    return true;
  }
  function expression(depth: number): boolean {
    if (!term(depth)) return false;
    while (peek() === 'AND' || peek() === 'OR') {
      position += 1;
      if (!term(depth)) return false;
    }
    return true;
  }
  return expression(0) && position === tokens.length;
}

/** The URL schemes third-party material may be fetched from. */
const SOURCE_PROTOCOL = /^(https?|git|ssh)$/;

const category = z.enum(CATEGORIES);

const categories = z
  .strictObject({ primary: category, secondary: uniqueList(category) })
  .superRefine((value, ctx) => {
    if (value.secondary.includes(value.primary)) {
      ctx.addIssue({ code: 'custom', path: ['secondary'], message: 'must not repeat the primary category' });
    }
  });

const step = z.strictObject({ n: z.number().int(), prompt_file: relativePath });

const thirdParty = z.strictObject({
  name: z.string().min(1),
  url: z.url({ protocol: SOURCE_PROTOCOL, error: 'must be an http(s), git or ssh URL' }),
  commit: z.string().regex(/^[0-9a-f]{40}$/, 'must be a 40-character commit SHA'),
  license: z.string().refine(isSpdxExpression, 'must be an SPDX license identifier or expression'),
});

/** REQ-FMT-04: the `scenario.yaml` of `scenarios/<id>/<version>/`. Unknown keys are rejected. */
export const scenarioSchema = z.strictObject({
  id: z.string().regex(SCENARIO_ID, 'must look like S1, M2 or T0'),
  version: z
    .string({
      error: (issue) =>
        typeof issue.input === 'number'
          ? "must be a quoted string such as '1.0' (unquoted, YAML reads it as a number)"
          : undefined,
    })
    .regex(SCENARIO_VERSION, 'must look like 1.0'),
  categories,
  profiles: uniqueList(z.enum(PROFILES)).min(1),
  gqm: uniqueList(z.string().regex(/^(Q-[A-G]\d+|G-X\d+)$/, 'must look like Q-C1 or G-X1')).min(1),
  capabilities: uniqueList(z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'must be kebab-case')),
  seed: relativePath,
  steps: z
    .array(step)
    .min(1)
    // A step is named with two digits, in its commit message and in `steps/<NN>/` (REQ-RUN-05,
    // REQ-FMT-06). Beyond 99 the two stop agreeing: `steps/100` sorts before `steps/99` in any
    // listing, and `step 100` breaks the message shape mid-run. No scenario of v0.1 comes near it.
    .max(99, 'must not have more steps than two digits can name')
    .superRefine((steps, ctx) => {
      steps.forEach((s, index) => {
        if (s.n !== index + 1) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'n'],
            message: `must be ${index + 1}: steps are numbered 1, 2, 3 … in order`,
          });
        }
      });
      if (new Set(steps.map((s) => samePathKey(s.prompt_file))).size !== steps.length) {
        ctx.addIssue({ code: 'custom', path: [], message: 'must not declare the same prompt_file twice' });
      }
    }),
  oracle: z.strictObject({
    public_tests: relativePath,
    checks: z
      .array(relativePath)
      .refine(
        (checks) => new Set(checks.map(samePathKey)).size === checks.length,
        'must not contain duplicates',
      )
      .default([]),
    third_party: z.array(thirdParty).default([]),
  }),
  holdout: z.boolean(),
});

/** A `scenario.yaml` as parsed, with relative paths. */
export type ScenarioFile = z.infer<typeof scenarioSchema>;
/** One of the categories A–G. */
export type Category = (typeof CATEGORIES)[number];
/** One of the result profiles. */
export type Profile = (typeof PROFILES)[number];

/** A loaded scenario version, with every path resolved to an absolute one. */
export interface Scenario {
  readonly id: string;
  readonly version: string;
  readonly dir: string;
  readonly categories: { readonly primary: Category; readonly secondary: readonly Category[] };
  readonly profiles: readonly Profile[];
  readonly gqm: readonly string[];
  readonly capabilities: readonly string[];
  readonly seedDir: string;
  readonly steps: readonly { readonly n: number; readonly promptPath: string }[];
  readonly oracle: {
    readonly publicTestsDir: string;
    readonly checks: readonly string[];
    readonly thirdParty: readonly ScenarioFile['oracle']['third_party'][number][];
  };
  readonly holdout: boolean;
}
