import { isAbsolute } from 'node:path';
import { z } from 'zod';

/** An arm's name: its directory under `arms/` (REQ-ARC-03). */
export const ARM_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** A path relative to the arm's directory that cannot leave it. */
const relativePath = z
  .string()
  .min(1)
  .refine((path) => !isAbsolute(path) && !path.split(/[\\/]/).includes('..'), {
    message: 'must be a relative path inside the arm directory',
  });

/** REQ-FMT-05: the `arm.yaml` of `arms/<arm>/`. Unknown keys are rejected. */
export const armSchema = z.strictObject({
  name: z.string().regex(ARM_NAME, 'must be kebab-case, such as baseline-docs'),
  /** The script the runner runs in the container before step 1 (REQ-RUN-03). */
  setup: relativePath,
  /** The operating manual (F2.7). */
  manual: relativePath,
  /** Files copied into the workspace before the setup. */
  environment: relativePath.optional(),
  /** The arm's MCP configuration, for Claude Code's `--mcp-config`. */
  mcp: relativePath.optional(),
  /** The harness tool the arm needs; absent for an arm that runs the plain agent. */
  requires: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, 'must be a lower-case tool name')
    .optional(),
  /**
   * The harness capabilities the arm offers (REQ-FMT-10, F3.6): `true` provided, `false` a known gap;
   * an undeclared capability is not provided. Only an arm with a harness is checked against a scenario's
   * `capabilities` (task-030).
   */
  provides: z
    .record(z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'must be kebab-case'), z.boolean())
    .default({}),
  /** REQ-FMT-05 as amended: a docs control names the harness arm it is generated from, and requires no tool. */
  docs_of: z.string().regex(ARM_NAME, 'must be an arm name').optional(),
  /**
   * REQ-FMT-05 as amended, REQ-RUN-18: the environment settings, `NAME=value`, that turn a harness's telemetry off,
   * set in the arm's container; `[]` states the tool has none. Required of an arm that requires a harness.
   */
  telemetry_off: z.array(z.string().regex(/^[A-Z_][A-Z0-9_]*=.*$/, 'must be NAME=value')).optional(),
});

/** An `arm.yaml` as parsed, with relative paths. */
export type ArmFile = z.infer<typeof armSchema>;

/** A loaded arm, with every path resolved to an absolute one. */
export interface Arm {
  readonly name: string;
  readonly dir: string;
  /** The setup script, relative to {@link dir}: where it sits once the directory is copied. */
  readonly setup: string;
  readonly setupPath: string;
  readonly manualPath: string;
  readonly environmentDir?: string;
  readonly mcpPath?: string;
  readonly requires?: string;
  /** The harness capabilities the arm offers, by name (REQ-FMT-10). */
  readonly provides: Readonly<Record<string, boolean>>;
  /** The harness arm a docs control is generated from (REQ-FMT-05 as amended). */
  readonly docsOf?: string;
  /** The settings that turn the arm's tool's telemetry off, `NAME=value` (REQ-RUN-18). */
  readonly telemetryOff?: readonly string[];
}
