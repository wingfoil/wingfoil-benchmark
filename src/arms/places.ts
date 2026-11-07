import { matchesGlob } from '../core/index.js';
import type { Arm } from '../core/index.js';

/**
 * The workspace paths an agent's manual is written to (REQ-RUN-12): each agent profile's `manualFile`, Claude Code's
 * and Codex's. No configuration glob may match one (REQ-FMT-05 as amended in 1.50).
 */
export const MANUAL_PATHS: readonly string[] = ['CLAUDE.md', 'AGENTS.md'];

/** An arm's places, as {@link isConfigurationPath} and {@link seedClashes} read them. */
export type ArmPlaces = Pick<Arm, 'name' | 'configuration' | 'state'>;

/**
 * Whether the workspace path `path` is configuration for `arm` (REQ-FMT-05 as amended in 1.50): in one of its
 * configuration places and in none of its state places, since state wins inside a configuration place.
 */
export function isConfigurationPath(arm: ArmPlaces, path: string): boolean {
  return (
    (arm.configuration ?? []).some((place) => matchesGlob(place.glob, path)) &&
    !(arm.state ?? []).some((place) => matchesGlob(place.glob, path))
  );
}

/** A configuration glob that matches a seed file. */
export interface SeedClash {
  readonly glob: string;
  readonly file: string;
}

/**
 * Every configuration glob of `arm` that matches one of `seedFiles` (paths relative to the seed, which is the
 * workspace's root), each with the file, in declaration order and then the files' code-unit order: such a glob is
 * refused for that scenario version (REQ-FMT-05 as amended in 1.50), by `bench scenario configure` before any session
 * and by `campaign validate`.
 */
export function seedClashes(arm: ArmPlaces, seedFiles: readonly string[]): SeedClash[] {
  const files = [...seedFiles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return (arm.configuration ?? []).flatMap((place) =>
    files.filter((file) => matchesGlob(place.glob, file)).map((file) => ({ glob: place.glob, file })),
  );
}
