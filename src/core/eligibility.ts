import { z } from 'zod';

import type { ArmRequirement } from './campaign.js';
import { formatPath } from './result.js';
import type { Issue } from './result.js';

/**
 * The five eligibility criteria (F7.4, experiment design 1.2 §2), in their published order (REQ-RES-09): the tool
 * runs with the campaign's agent and model id; its version can be pinned and installed reproducibly; it runs headless
 * in a container; it is a workflow harness, not only a standards or prompt pack; it calls no LLM of its own.
 */
export const ELIGIBILITY_CRITERIA = [
  'agent-and-model',
  'pinnable',
  'headless-container',
  'workflow-harness',
  'no-own-llm',
] as const;

/** Where the register lives, from the repository root (REQ-FMT-11). */
export const REGISTER_FILE = 'eligibility/register.yaml';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const assessment = z.strictObject({
  result: z.enum(['pass', 'fail']),
  evidence: z.string().min(1, 'is required: every result names its evidence'),
});

const entrySchema = z.strictObject({
  tool: z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be kebab-case'),
  version: z.string().min(1),
  date: z.string().regex(DATE, 'must be a date, YYYY-MM-DD'),
  criteria: z.strictObject(
    Object.fromEntries(ELIGIBILITY_CRITERIA.map((id) => [id, assessment])) as Record<
      (typeof ELIGIBILITY_CRITERIA)[number],
      typeof assessment
    >,
  ),
  verdict: z.enum(['admitted', 'excluded']),
  reason: z.string().min(1, 'is required: the verdict says why'),
});

/**
 * REQ-FMT-11: the eligibility register, one entry per assessed tool and version, WingFoil included (T1). The verdict
 * follows the criteria — admitted passes all five, excluded fails one at least — so a tool is admitted by the rule,
 * never by choice.
 */
export const registerSchema = z
  .strictObject({
    criteria: z.array(z.string()),
    entries: z.array(entrySchema),
  })
  .superRefine((register, ctx) => {
    if (register.criteria.join() !== ELIGIBILITY_CRITERIA.join()) {
      ctx.addIssue({
        code: 'custom',
        path: ['criteria'],
        message: `must be the five published criteria in order: ${ELIGIBILITY_CRITERIA.join(', ')}`,
      });
    }
    const seen = new Set<string>();
    register.entries.forEach((entry, index) => {
      const failing = failingCriteria(entry);
      if (entry.verdict === 'admitted' && failing.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', index, 'verdict'],
          message: `is 'admitted', but the entry fails ${failing.join(', ')}`,
        });
      }
      if (entry.verdict === 'excluded' && failing.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', index, 'verdict'],
          message: "is 'excluded', but the entry passes every criterion",
        });
      }
      const key = `${entry.tool} ${entry.version}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', index],
          message: `assesses ${key} again: one entry per tool and version`,
        });
      }
      seen.add(key);
    });
  });

export type Register = z.output<typeof registerSchema>;
export type RegisterEntry = Register['entries'][number];

/** The criteria an entry fails, in their published order. */
export function failingCriteria(entry: RegisterEntry): (typeof ELIGIBILITY_CRITERIA)[number][] {
  return ELIGIBILITY_CRITERIA.filter((id) => entry.criteria[id].result === 'fail');
}

/**
 * REQ-FMT-01 as amended in 1.26 (F7.4, T15): every arm that requires a harness pins a tool the register admits at
 * that exact version. A version not assessed is refused until it is; an excluded one is refused naming each criterion
 * it fails. A campaign without a harness arm needs no register; one with a harness arm and no register (`undefined`)
 * is refused. Run after {@link harnessCoverage} found nothing, so that a wrong or missing pin is reported once.
 */
export function eligibilityIssues(
  harnesses: Readonly<Record<string, { readonly tool: string; readonly version: string }>>,
  arms: readonly ArmRequirement[],
  register: Register | undefined,
): Issue[] {
  const pinned = arms.flatMap(({ name, requires }) => {
    const harness = Object.hasOwn(harnesses, name) ? harnesses[name] : undefined;
    return requires === undefined || harness === undefined ? [] : [{ arm: name, ...harness }];
  });
  if (pinned.length === 0) return [];
  if (register === undefined) {
    return [
      {
        path: REGISTER_FILE,
        message: 'not found: a harness arm can pin only a tool the register admits (REQ-FMT-11)',
      },
    ];
  }
  return pinned.flatMap(({ arm, tool, version }) => {
    const entry = register.entries.find(
      (candidate) => candidate.tool === tool && candidate.version === version,
    );
    if (entry === undefined) {
      return [
        {
          path: formatPath(['harnesses', arm, 'version']),
          message: `${tool} ${version} is not assessed in ${REGISTER_FILE}: assess it before a campaign pins it`,
        },
      ];
    }
    return failingCriteria(entry).map((id) => ({
      path: formatPath(['harnesses', arm]),
      message:
        `${tool} ${version} is excluded by the eligibility register: it fails ${id} ` +
        `(${entry.criteria[id].evidence})`,
    }));
  });
}
