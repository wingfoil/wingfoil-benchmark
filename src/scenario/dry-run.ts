import { basename } from 'node:path';

import { dryRunProfileSchema, parseWith, readYamlFile } from '../core/index.js';
import type { DryRunProfile, Result } from '../core/index.js';

/** Where the dry-run profile lives, beside `leak-scan.yaml` (task-021 Design). */
export const DRY_RUN_PROFILE = 'dry-run.yaml';

/** Load and validate the dry-run profile `file` (F3.3): a missing or malformed file is an issue. */
export function loadDryRunProfile(file: string): Result<DryRunProfile> {
  const read = readYamlFile(file);
  if (!read.ok) return read;
  return parseWith(dryRunProfileSchema, read.value, basename(file));
}
