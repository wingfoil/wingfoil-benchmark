import { z } from 'zod';

import { campaignSchema, modelId } from './campaign.js';

/**
 * `configuring/profile.yaml` (REQ-RUN-20, F7.5): what the configuring agent's sessions pin. Exactly `agent`,
 * `models.default`, `harnesses`, `caps` and `currency`, each as a dry-run profile's; any other field, `approver_policy`
 * and `arm_digests` included, is refused: a configuring session reads no verdict and runs no arm by its digest.
 */
export const configuringProfileSchema = campaignSchema
  .pick({ harnesses: true, agent: true, caps: true, currency: true })
  .extend({ models: z.strictObject({ default: modelId }) });

/** The configuring profile as parsed. */
export type ConfiguringProfile = z.infer<typeof configuringProfileSchema>;
