import { z } from 'zod';

import { approverPolicy, approverPolicyVersions } from './approver.js';
import { formatPath } from './result.js';
import type { Issue } from './result.js';
import { SCENARIO_ID, SCENARIO_VERSION } from './scenario.js';

/** REQ-FMT-03: a released version (semver, optionally `v`-prefixed) or a commit SHA (7–40 hex). */
const PINNED =
  /^(v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?|[0-9a-f]{7,40})$/;
/** A released version, as the agent must be pinned (REQ-RUN-16). */
const RELEASE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/**
 * A model id becomes part of a run's path and of its container's name, so it may hold only what is
 * safe in both: letters, digits, dots and dashes, starting with a letter or a digit.
 */
const MODEL_ID = /^[a-z0-9]([a-z0-9]|[.-](?![.-]))*[a-z0-9]$|^[a-z0-9]$/;
/** Long enough for any model name, short enough to keep paths and container names within limits. */
const MODEL_ID_MAX = 64;
const FULL_SHA = /^[0-9a-f]{40}$/;

/** The arm every campaign runs, so that each campaign reruns its own baseline (threat T7). */
const BASELINE_ARM = 'baseline';

/** The agent adapters a campaign may name. Until W2 only `fake` can run (adr-001, default 7). */
const AGENT_NAMES = ['claude-code', 'fake'] as const;

/**
 * REQ-FMT-03. A version YAML read as a number (unquoted `0000000` or `12`) is reported as unpinned
 * too, with the same message, rather than as a type error.
 */
const pinnedVersion = z
  .unknown()
  .superRefine((version, ctx) => {
    if (typeof version === 'string' && PINNED.test(version)) return;
    if (version === undefined) {
      ctx.addIssue({ code: 'custom', message: 'is required' });
      return;
    }
    const quoted = typeof version === 'string' ? '' : ', quoted';
    ctx.addIssue({
      code: 'custom',
      message: `'${String(version)}' is not pinned: use a released version or a commit SHA${quoted}`,
    });
  })
  // The value is a pinned string once the check above passes; say so, so that callers read a string.
  .transform((version) => version as string);

const harness = z
  .strictObject({
    tool: z.string().min(1),
    version: pinnedVersion,
    commit: z.string().regex(FULL_SHA, 'must be a 40-character commit SHA').optional(),
  })
  .superRefine((entry, ctx) => {
    // `version` is typed string by the transform, but this check also runs when the version failed
    // its own check, so the value may be anything the file held.
    const version: unknown = entry.version;
    if (typeof version !== 'string' || entry.commit === undefined || !FULL_SHA.test(entry.commit)) return;
    if (FULL_SHA.test(version.padEnd(40, '0')) && !entry.commit.startsWith(version)) {
      ctx.addIssue({ code: 'custom', path: ['commit'], message: `must start with the version '${version}'` });
    }
  });

const modelId = z
  .string()
  .max(MODEL_ID_MAX)
  .regex(MODEL_ID, 'must be a model id: lower-case letters, digits, single dots and dashes');

const positive = z.number().positive();

function uniqueBy<T>(key: (item: T) => string) {
  return (list: readonly T[]) => new Set(list.map(key)).size === list.length;
}

const scenarioRef = z.strictObject({
  id: z.string().regex(SCENARIO_ID, 'must look like S1, M2 or T0'),
  version: z.string().regex(SCENARIO_VERSION, 'must look like 1.0'),
});

const slice = z.strictObject({
  model: modelId,
  scenarios: z
    .array(z.string())
    .min(1)
    .refine(
      uniqueBy((id: string) => id),
      'must not contain duplicates',
    ),
  arms: z
    .array(z.string())
    .min(1)
    .refine(
      uniqueBy((arm: string) => arm),
      'must not contain duplicates',
    ),
  repetitions: z.number().int().min(1),
});

/** REQ-FMT-01: the campaign file `campaigns/<name>.yaml`. Unknown keys are rejected. */
export const campaignSchema = z.strictObject({
  harnesses: z.record(z.string(), harness),
  scenarios: z
    .array(scenarioRef)
    .min(1)
    .refine(
      uniqueBy((ref: { id: string }) => ref.id),
      'must not name a scenario twice',
    ),
  arms: z
    .array(z.string().regex(KEBAB, 'must be kebab-case'))
    .min(1)
    .refine(
      uniqueBy((arm: string) => arm),
      'must not contain duplicates',
    )
    .refine((arms) => arms.includes(BASELINE_ARM), `must include the ${BASELINE_ARM} arm`),
  agent: z.strictObject({
    name: z.enum(AGENT_NAMES),
    version: z.string().regex(RELEASE, 'must be a released version such as 2.1.221'),
  }),
  models: z.strictObject({
    default: modelId,
    slices: z.array(slice).optional(),
  }),
  repetitions: z.record(z.string(), z.number().int().min(1)),
  approver_policy: z
    .string()
    .regex(/^v\d+$/, { message: 'must look like v1', abort: true })
    // REQ-RUN-06: the version pins the classifier and the replies. A version the runner does not
    // implement would otherwise run as another, and its interventions could not be reconstructed.
    .refine((version) => approverPolicy(version) !== undefined, {
      error: (issue) =>
        `'${String(issue.input)}' is not an approver policy this runner implements: ${approverPolicyVersions().join(', ')}`,
    }),
  caps: z.strictObject({ step_time_s: positive, step_tokens: positive.int(), run_cost_eur: positive }),
  budget: z
    .strictObject({ warn_eur: positive, ceiling_eur: positive })
    .refine((budget) => budget.warn_eur <= budget.ceiling_eur, 'warn_eur must not exceed ceiling_eur'),
  currency: z.strictObject({ usd_to_eur: positive }),
});

/** A campaign file as parsed. */
export type CampaignFile = z.infer<typeof campaignSchema>;

/**
 * Consistency between the fields of a campaign that already matches {@link campaignSchema}: harnesses
 * and slices name the campaign's own arms and scenarios (which arm needs a harness is
 * {@link harnessCoverage}'s, from the arm definitions), and every scenario, and only those, has a
 * repetition count. Checked apart from the schema so that one wrong field does not cascade into
 * issues about the fields that refer to it.
 */
export function campaignConsistency(campaign: CampaignFile): Issue[] {
  const arms = new Set(campaign.arms);
  const scenarios = new Set(campaign.scenarios.map((ref) => ref.id));
  const issues: Issue[] = [];
  const issue = (path: (string | number)[], message: string) =>
    issues.push({ path: formatPath(path), message });

  for (const arm of Object.keys(campaign.harnesses).sort()) {
    if (!arms.has(arm)) issue(['harnesses', arm], "is not one of the campaign's arms");
  }
  const covered = new Set<string>();
  campaign.models.slices?.forEach((s, index) => {
    if (s.model === campaign.models.default) {
      issue(['models', 'slices', index, 'model'], 'is the default model, so the slice repeats the campaign');
    }
    for (const id of s.scenarios.filter((id) => scenarios.has(id))) {
      for (const arm of s.arms.filter((arm) => arms.has(arm))) {
        const key = `${s.model}/${id}/${arm}`;
        if (covered.has(key)) issue(['models', 'slices', index], `covers ${key} twice`);
        covered.add(key);
      }
    }
    s.scenarios.forEach((id, i) => {
      if (!scenarios.has(id))
        issue(['models', 'slices', index, 'scenarios', i], "is not one of the campaign's scenarios");
    });
    s.arms.forEach((arm, i) => {
      if (!arms.has(arm)) issue(['models', 'slices', index, 'arms', i], "is not one of the campaign's arms");
    });
  });
  for (const ref of campaign.scenarios) {
    if (campaign.repetitions[ref.id] === undefined) issue(['repetitions', ref.id], 'is required');
  }
  for (const id of Object.keys(campaign.repetitions).sort()) {
    if (!scenarios.has(id)) issue(['repetitions', id], "is not one of the campaign's scenarios");
  }
  return issues;
}

/** What {@link harnessCoverage} needs of an arm definition (REQ-FMT-05). */
export interface ArmRequirement {
  readonly name: string;
  /** The harness tool the arm needs; absent for an arm that runs the plain agent. */
  readonly requires?: string;
}

/**
 * Harness coverage (REQ-FMT-01, dl-003): an arm whose definition requires a tool pins that tool's
 * harness, and an arm that requires none pins nothing. Read from each arm's `requires`, so that a new
 * arm is covered by its own definition rather than by a list of names; this replaces dl-003's
 * interim rule, as it planned. `arms` are the campaign's arm definitions, in the campaign's order.
 */
export function harnessCoverage(campaign: CampaignFile, arms: readonly ArmRequirement[]): Issue[] {
  const issues: Issue[] = [];
  for (const { name, requires } of arms) {
    const harness = Object.hasOwn(campaign.harnesses, name) ? campaign.harnesses[name] : undefined;
    if (requires === undefined) {
      if (harness !== undefined) {
        issues.push({
          path: formatPath(['harnesses', name]),
          message: 'must not be set: the arm runs the plain agent',
        });
      }
    } else if (harness === undefined) {
      issues.push({
        path: formatPath(['harnesses', name]),
        message: `is required: the arm requires the harness '${requires}'`,
      });
    } else if (harness.tool !== requires) {
      issues.push({
        path: formatPath(['harnesses', name, 'tool']),
        message: `is '${harness.tool}', but the arm requires '${requires}'`,
      });
    }
  }
  return issues;
}
