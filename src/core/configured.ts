import { z } from 'zod';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'must be a SHA-256 in lower-case hex');
const amount = z.number().nonnegative();

/** A configuring session's outcome (REQ-RUN-20): written, refused, or a step's end (REQ-RUN-09, 1.49). */
export const CONFIGURED_OUTCOMES = ['written', 'refused', 'killed', 'failed', 'interrupted'] as const;

/**
 * One configuring session's record (REQ-RUN-20, F7.5), appended to `configured/<harness>-configured.json` and never
 * rewritten: the agent, the model, the prompt's and the profile's SHA-256, the harness pin, the base arm's digest, the
 * generated rules' SHA-256 (or none), the usage, the cost in euros, the wall time, the date, the outcome (a refusal
 * with its reason) and, for a written configuration, each file's path and SHA-256. Never a credential: unknown keys
 * are refused.
 */
export const configuredRecordSchema = z
  .strictObject({
    agent: z.strictObject({ name: z.string().min(1), version: z.string().min(1) }),
    model: z.string().min(1),
    prompt_sha256: sha256,
    profile_sha256: sha256,
    harness: z.strictObject({
      tool: z.string().min(1),
      version: z.string().min(1),
      // A clone's full commit id, or, for a tool fetched from the npm registry, its tarball's SHA-256 (task-071, 1.53).
      commit: z
        .string()
        .regex(
          /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/,
          "must be a full commit id, or a registry tarball's SHA-256",
        ),
    }),
    base_arm_digest: z.string().regex(/^[0-9a-f]{12}$/, 'must be an arm digest'),
    rules_sha256: sha256.nullable(),
    // A step's usage (`SessionUsage` of src/agents/claude-code.ts); a unit test keeps the two the same.
    usage: z.strictObject({
      inputTokens: amount,
      outputTokens: amount,
      cacheCreationInputTokens: amount,
      cacheReadInputTokens: amount,
      costUsd: amount,
      costEur: amount,
      turns: amount,
      durationMs: amount,
    }),
    cost_eur: amount,
    /** A session ended early whose agent reported no cost, counted at its bound (REQ-RUN-09 as amended in 1.49). */
    cost_reported: z.literal(false).optional(),
    wall_time_s: amount,
    date: z.iso.datetime(),
    outcome: z.enum(CONFIGURED_OUTCOMES),
    reason: z.string().min(1).optional(),
    files: z
      .array(
        z.strictObject({
          path: z
            .string()
            .refine(
              (path) =>
                path !== '' &&
                !path.includes('\\') &&
                !path.startsWith('/') &&
                path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..'),
              { message: 'must be a workspace path: relative, /-separated, with no empty, . or .. segment' },
            ),
          sha256,
        }),
      )
      .refine((files) => new Set(files.map((file) => file.path)).size === files.length, {
        message: 'lists a path once',
      })
      .optional(),
  })
  .superRefine((record, context) => {
    const issue = (message: string, path: string) =>
      context.addIssue({ code: 'custom', message, path: [path] });
    if (record.outcome === 'written') {
      if (record.files === undefined || record.files.length === 0)
        issue('a written record lists its files', 'files');
      if (record.cost_reported === false) issue('a written session reported its cost', 'cost_reported');
    } else if (record.files !== undefined) {
      issue('only a written record lists files', 'files');
    }
    if (record.outcome === 'refused' && record.reason === undefined) {
      issue('a refused record states its reason', 'reason');
    }
  });

/** A configuring session's record as parsed. */
export type ConfiguredRecord = z.infer<typeof configuredRecordSchema>;

/** A record file: every session's record, oldest first. */
export const configuredRecordsSchema = z.array(configuredRecordSchema).min(1, 'holds at least one record');
