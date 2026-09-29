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

/** A kebab-case name: a capability, or a suite's id (a single path segment, so a hold-out directory name). */
const kebabName = z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'must be kebab-case');

/**
 * A suite of hidden tests and the steps after which it is scored (dl-001, REQ-FMT-04): its `id` names
 * it in scores and is the hold-out's directory for its additions (REQ-ARC-03). Whether each step is one
 * the scenario declares is checked by the loader, which has the steps.
 */
const suite = z.strictObject({
  id: kebabName,
  dir: relativePath,
  after_steps: uniqueList(z.number().int()).min(1),
});

/** Every suite once: no id and no directory twice, each reported on the later entry. */
const suites = z.array(suite).superRefine((list, ctx) => {
  list.forEach((entry, index) => {
    const id = list.findIndex((other) => other.id === entry.id);
    if (id < index) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: `repeats the id of oracle.suites[${id}]`,
      });
    }
    const dir = list.findIndex((other) => samePathKey(other.dir) === samePathKey(entry.dir));
    if (dir < index) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'dir'],
        message: `repeats the directory of oracle.suites[${dir}]`,
      });
    }
  });
});

/** Relative paths with no two spellings of the same one (`a/b`, `./a/b`). */
const distinctPaths = z
  .array(relativePath)
  .refine((paths) => new Set(paths.map(samePathKey)).size === paths.length, 'must not contain duplicates');

/**
 * Third-party material vendored into the oracle (dl-002, REQ-FMT-04): the `files` it vendors, their
 * license — an SPDX expression, a `LicenseRef-` for a license the SPDX list lacks — and exactly one pin:
 * the `commit` of a git source, or else the `sha256` of the one file it vendors, so that `sha256sum`
 * checks it. Where the files lie, and whether they still match their `sha256`, is checked by the loader,
 * which has the directory.
 */
const thirdParty = z
  .strictObject({
    name: z.string().min(1),
    url: z.url({ protocol: SOURCE_PROTOCOL, error: 'must be an http(s), git or ssh URL' }),
    commit: z
      .string()
      .regex(/^[0-9a-f]{40}$/, 'must be a 40-character commit SHA')
      .optional(),
    sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, 'must be a 64-character SHA-256 in lowercase hex')
      .optional(),
    license: z.string().refine(isSpdxExpression, 'must be an SPDX license identifier or expression'),
    files: distinctPaths.min(1),
  })
  .superRefine((entry, ctx) => {
    if (entry.commit === undefined && entry.sha256 === undefined) {
      ctx.addIssue({ code: 'custom', path: [], message: 'must be pinned by commit or by sha256' });
    } else if (entry.commit !== undefined && entry.sha256 !== undefined) {
      ctx.addIssue({ code: 'custom', path: [], message: 'must be pinned by commit or by sha256, not both' });
    } else if (entry.sha256 !== undefined && entry.files.length > 1) {
      ctx.addIssue({ code: 'custom', path: ['files'], message: 'must name one file when pinned by sha256' });
    }
  });

/** Every vendored file under one entry: two licenses for the same bytes cannot both be right. */
const thirdParties = z.array(thirdParty).superRefine((list, ctx) => {
  const owner = new Map<string, number>();
  list.forEach((entry, index) => {
    entry.files.forEach((file, position) => {
      const key = samePathKey(file);
      const earlier = owner.get(key);
      if (earlier === undefined) owner.set(key, index);
      else if (earlier < index) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'files', position],
          message: `is vendored by oracle.third_party[${earlier}] too`,
        });
      }
    });
  });
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
  capabilities: uniqueList(kebabName),
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
    suites,
    checks: z
      .array(relativePath)
      .refine(
        (checks) => new Set(checks.map(samePathKey)).size === checks.length,
        'must not contain duplicates',
      )
      .default([]),
    third_party: thirdParties.default([]),
  }),
  holdout: z.boolean(),
});

/** A `scenario.yaml` as parsed, with relative paths. */
export type ScenarioFile = z.infer<typeof scenarioSchema>;
/** One of the categories A–G. */
export type Category = (typeof CATEGORIES)[number];
/** One of the result profiles. */
export type Profile = (typeof PROFILES)[number];

/** A loaded suite of hidden tests: its id, its absolute directory, and the steps after which it is scored. */
export interface Suite {
  readonly id: string;
  readonly dir: string;
  readonly afterSteps: readonly number[];
}

/**
 * Loaded third-party material (dl-002): its source, its license, the absolute files it vendors, and
 * its one pin — a commit, or the sha256 the loader has checked the file against.
 */
export interface ThirdParty {
  readonly name: string;
  readonly url: string;
  readonly license: string;
  readonly pin: { readonly commit: string } | { readonly sha256: string };
  readonly files: readonly string[];
}

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
    /** The suites of hidden tests (dl-001), in declaration order, each with its steps in ascending order. */
    readonly suites: readonly Suite[];
    readonly checks: readonly string[];
    /** The third-party material vendored into the suites (dl-002), in declaration order. */
    readonly thirdParty: readonly ThirdParty[];
  };
  readonly holdout: boolean;
  /**
   * The scenario's configuration for each arm that has one, by arm name: `arms/<arm>/` beside the
   * seed (dl-005, REQ-FMT-04). Only that arm's setup receives it; the seed and the prompts never do.
   */
  readonly armDirs: Readonly<Record<string, string>>;
  /** The version's content hash (REQ-FMT-09), `sha256:<hex>`: what results record, and what makes it immutable. */
  readonly hash: string;
}
