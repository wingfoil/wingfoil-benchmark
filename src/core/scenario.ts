import { isAbsolute } from 'node:path';
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

const category = z.enum(CATEGORIES);

const categories = z
  .strictObject({ primary: category, secondary: z.array(category) })
  .superRefine((value, ctx) => {
    if (value.secondary.includes(value.primary)) {
      ctx.addIssue({ code: 'custom', path: ['secondary'], message: 'must not repeat the primary category' });
    }
    if (new Set(value.secondary).size !== value.secondary.length) {
      ctx.addIssue({ code: 'custom', path: ['secondary'], message: 'must not contain duplicates' });
    }
  });

const step = z.strictObject({ n: z.number().int(), prompt_file: relativePath });

const thirdParty = z.strictObject({
  name: z.string().min(1),
  url: z.string().min(1),
  commit: z.string().regex(/^[0-9a-f]{40}$/, 'must be a 40-character commit SHA'),
  license: z.string().min(1),
});

/** REQ-FMT-04: the `scenario.yaml` of `scenarios/<id>/<version>/`. Unknown keys are rejected. */
export const scenarioSchema = z.strictObject({
  id: z.string().regex(SCENARIO_ID, 'must look like S1, M2 or T0'),
  version: z.string().regex(SCENARIO_VERSION, 'must look like 1.0'),
  categories,
  profiles: z.array(z.enum(PROFILES)).min(1),
  gqm: z.array(z.string().regex(/^(Q-[A-G]\d+|G-X\d+)$/, 'must look like Q-C1 or G-X1')).min(1),
  capabilities: z.array(z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'must be kebab-case')),
  seed: relativePath,
  steps: z
    .array(step)
    .min(1)
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
    }),
  oracle: z.strictObject({
    public_tests: relativePath,
    checks: z.array(relativePath).default([]),
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
