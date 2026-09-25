import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';

import {
  campaignConsistency,
  campaignSchema,
  canonicalJson,
  fail,
  ok,
  parseWith,
  readYamlFile,
} from '../core/index.js';
import type { CampaignFile, Result } from '../core/index.js';

/** REQ-ARC-03: campaign files live in `campaigns/`, beside `scenarios/` and `results/`. */
const CAMPAIGNS_DIR = 'campaigns';

/** A validated campaign file and its identity. */
export interface Campaign {
  /** REQ-FMT-02: the campaign's identity. */
  readonly id: string;
  /** Absolute path of the campaign file. */
  readonly file: string;
  /** The campaign file as validated (REQ-FMT-01). */
  readonly spec: CampaignFile;
  /** The repository the campaign belongs to: the parent of its `campaigns/` directory (REQ-ARC-03). */
  readonly repoRoot: string;
  /** `scenarios/` next to the campaign's `campaigns/` directory (REQ-ARC-03). */
  readonly scenariosRoot: string;
  /** `arms/` next to the campaign's `campaigns/` directory (REQ-ARC-03). */
  readonly armsRoot: string;
  /** `results/` next to the campaign's `campaigns/` directory (REQ-ARC-03). */
  readonly resultsRoot: string;
}

/**
 * REQ-FMT-02: the first 12 hex characters of the SHA-256 of the campaign's canonical JSON. It is
 * computed on the file as parsed, so formatting, comments and key order never change it.
 */
export function campaignId(data: unknown): string {
  return createHash('sha256').update(canonicalJson(data)).digest('hex').slice(0, 12);
}

/**
 * Load and validate the campaign file `file` (REQ-FMT-01, REQ-FMT-03, REQ-RUN-16). Whether the
 * scenarios it names exist is checked by the caller: `campaign` may not import `scenario` (REQ-ARC-02).
 */
export function loadCampaign(file: string): Result<Campaign> {
  const path = resolve(file);
  const read = readYamlFile(path);
  if (!read.ok) return read;
  const parsed = parseWith(campaignSchema, read.value, basename(path));
  if (!parsed.ok) return parsed;
  const inconsistent = campaignConsistency(parsed.value);
  if (inconsistent.length > 0) return fail(inconsistent);

  const directory = dirname(path);
  if (basename(directory) !== CAMPAIGNS_DIR) {
    return fail([
      { path: basename(path), message: `must live in a '${CAMPAIGNS_DIR}' directory, next to 'scenarios'` },
    ]);
  }

  const repoRoot = dirname(directory);
  return ok({
    id: campaignId(read.value),
    file: path,
    spec: parsed.value,
    repoRoot,
    scenariosRoot: join(repoRoot, 'scenarios'),
    armsRoot: join(repoRoot, 'arms'),
    resultsRoot: join(repoRoot, 'results'),
  });
}
