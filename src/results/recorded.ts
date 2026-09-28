import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A content hash a stored run recorded for a scenario version, and one such run as evidence. */
export interface RecordedHash {
  readonly hash: string;
  readonly run: string;
}

/**
 * The distinct `scenario_hash` values stored results recorded for scenario `id@version` (REQ-FMT-09),
 * each with the first run that recorded it, in path order: every
 * `<resultsRoot>/<campaign-id>/<n>/runs/<id>@<version>/**∕run.json`. A run recorded before hashes
 * existed, or a record that cannot be read as JSON, cannot be compared and is skipped.
 */
export function recordedHashes(resultsRoot: string, id: string, version: string): RecordedHash[] {
  const found = new Map<string, string>();
  for (const campaign of directories(resultsRoot)) {
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
