import { z } from 'zod';

import { formatPath } from './result.js';
import type { Issue } from './result.js';
import { SCENARIO_ID, SCENARIO_VERSION } from './scenario.js';

/** REQ-FMT-03: a released version (semver, optionally `v`-prefixed) or a commit SHA (7–40 hex). */
const PINNED = /^(v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?|[0-9a-f]{7,40})$/;
/** A released version, as the agent must be pinned (REQ-RUN-16). */
const RELEASE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FULL_SHA = /^[0-9a-f]{40}$/;

/** The arm every campaign runs, so that each campaign reruns its own baseline (threat T7). */
export const BASELINE_ARM = 'baseline';

/** The agent adapters a campaign may name. Until W2 only `fake` can run (adr-001, default 7). */
export const AGENT_NAMES = ['claude-code', 'fake'] as const;

const pinnedVersion = z.string().refine((version) => PINNED.test(version), {
  error: (issue) => `'${String(issue.input)}' is not pinned: use a released version or a commit SHA`,
});

const harness = z.strictObject({
  tool: z.string().min(1),
  version: pinnedVersion,
  commit: z.string().regex(FULL_SHA, 'must be a 40-character commit SHA').optional(),
});

const positive = z.number().positive();

function uniqueBy<T>(key: (item: T) => string) {
  return (list: readonly T[]) => new Set(list.map(key)).size === list.length;
}

const scenarioRef = z.strictObject({
  id: z.string().regex(SCENARIO_ID, 'must look like S1, M2 or T0'),
  version: z.string().regex(SCENARIO_VERSION, 'must look like 1.0'),
});

const slice = z.strictObject({
  model: z.string().min(1),
  scenarios: z.array(z.string()).min(1),
  arms: z.array(z.string()).min(1),
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
  models: z.strictObject({ default: z.string().min(1), slices: z.array(slice).optional() }),
  repetitions: z.record(z.string(), z.number().int().min(1)),
  approver_policy: z.string().regex(/^v\d+$/, 'must look like v1'),
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
 * and slices name the campaign's own arms and scenarios, and every scenario, and only those, has a
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
  campaign.models.slices?.forEach((s, index) => {
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
