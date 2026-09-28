import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { DRY_RUNS } from './dry-runs.js';

/** A content hash a stored run recorded for a scenario version, and one such run as evidence. */
export interface RecordedHash {
  readonly hash: string;
  readonly run: string;
}

/**
 * The distinct `scenario_hash` values stored results recorded for scenario `id@version` (REQ-FMT-09),
 * each with the first run that recorded it, in path order: every
 * `<resultsRoot>/<campaign-id>/<n>/runs/<id>@<version>/**∕run.json`. A run recorded before hashes
 * existed, or a record that cannot be read as JSON, cannot be compared and is skipped. Dry runs,
 * under `results/dry-runs/`, are not results of a campaign and are not read.
 */
export function recordedHashes(resultsRoot: string, id: string, version: string): RecordedHash[] {
  const found = new Map<string, string>();
  // Dry runs never freeze a version (task-021 Design): scenario authoring changes what it dry-ran.
  for (const campaign of directories(resultsRoot).filter((name) => name !== DRY_RUNS)) {
    for (const execution of directories(join(resultsRoot, campaign))) {
      for (const file of runRecords(join(resultsRoot, campaign, execution, 'runs', `${id}@${version}`))) {
        const hash = hashOf(file);
        if (hash !== undefined && !found.has(hash)) found.set(hash, file);
      }
    }
  }
  return [...found].map(([hash, run]) => ({ hash, run }));
}

function hashOf(file: string): string | undefined {
  try {
    const record = JSON.parse(readFileSync(file, 'utf8')) as { scenario_hash?: unknown };
    return typeof record.scenario_hash === 'string' ? record.scenario_hash : undefined;
  } catch {
    return undefined;
  }
}

/** Every `run.json` below `dir`, in path order. */
function runRecords(dir: string): string[] {
  return directories(dir).flatMap((name) => runRecords(join(dir, name))).concat(
    existsSync(join(dir, 'run.json')) ? [join(dir, 'run.json')] : [],
  ).sort();
}

/** The directories directly in `dir`, sorted; none when it does not exist. */
function directories(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort();
}

/**
 * Why scenario `id@version`, whose content now hashes to `hash`, may not run under that name
 * (REQ-FMT-09): a stored run recorded another hash for it. `undefined` when no stored run disagrees.
 * The run is named relative to `root`, the repository.
 */
export function versionChange(
  resultsRoot: string,
  root: string,
  scenario: { readonly id: string; readonly version: string; readonly hash: string },
): string | undefined {
  const { id, version, hash } = scenario;
  const other = recordedHashes(resultsRoot, id, version).find((recorded) => recorded.hash !== hash);
  return other === undefined
    ? undefined
    : `${id}@${version} has changed since ${relative(root, other.run)} ran it: register the change as a new version`;
}
