import { z } from 'zod';

import { campaignSchema, modelId } from './campaign.js';

/**
 * `scenarios/dry-run.yaml` (F3.3, task-021 Design): what a dry run pins in place of a campaign file.
 * Its fields are the campaign's own, so a pin means the same in both files; there is no `budget` — a
 * dry run is one run, bounded by `caps.run_cost_eur` — and no scenarios, arms or repetitions, which the
 * command line names. Unknown keys are rejected.
 */
export const dryRunProfileSchema = campaignSchema
  .pick({ harnesses: true, agent: true, approver_policy: true, caps: true, currency: true })
  .extend({ models: z.strictObject({ default: modelId }) });

/** A dry-run profile as parsed. */
export type DryRunProfile = z.infer<typeof dryRunProfileSchema>;
