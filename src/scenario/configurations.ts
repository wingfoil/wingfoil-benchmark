import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ARM_NAME, configuredRecordsSchema, fail, ok, parseWith } from '../core/index.js';
import type { Configuration, ConfiguredRecord, Issue, Result } from '../core/index.js';

/** Where a version keeps the configuring sessions' records and patches (REQ-ARC-03 as amended in 1.50). */
export const CONFIGURED_DIR = 'configured';
/** The suffix of a configured arm's name, and of its configuration's directory under `arms/`. */
export const CONFIGURED_SUFFIX = '-configured';

const RECORD_FILE = new RegExp(`^([a-z][a-z0-9]*(?:-[a-z0-9]+)*${CONFIGURED_SUFFIX})\\.(json|patch)$`);

/**
 * The configurations a scenario version holds (REQ-FMT-04 as amended in 1.50), from its `arms/<harness>-configured/`
 * directories (`configured`, their names) and its `configured/` records. A version 1.0 holds neither; `configured/`
 * holds record files and patches only; each record file parses; a directory has a `written` record and holds exactly
 * the newest one's files, with their SHA-256; a `written` record has its directory and its patch. Links were refused
 * before this runs (REQ-FMT-04 as amended in 1.51).
 */
export function loadConfigurations(
  dir: string,
  version: string,
  configured: readonly string[],
): Result<Record<string, Configuration>> {
  const recordsDir = resolve(dir, CONFIGURED_DIR);
  const hasRecords = existsSync(recordsDir);
  if (version === '1.0') {
    const held = [
      ...configured.map((name) => ({ path: `arms.${name}`, held: `arms/${name}` })),
      ...(hasRecords ? [{ path: CONFIGURED_DIR, held: CONFIGURED_DIR }] : []),
    ];
    return held.length === 0
      ? ok({})
      : fail(
          held.map(({ path, held: name }) => ({
            path,
            message: `a version 1.0 holds no configuration: '${name}' (the approver's choice of 2026-11-06)`,
          })),
        );
  }
  const issues: Issue[] = [];
  const records = new Map<string, readonly ConfiguredRecord[]>();
  const patches = new Set<string>();
  for (const entry of hasRecords ? readdirSync(recordsDir, { withFileTypes: true }).sort(byName) : []) {
    const match = RECORD_FILE.exec(entry.name);
    if (!entry.isFile() || match === null || !ARM_NAME.test(match[1] as string)) {
      issues.push({
        path: CONFIGURED_DIR,
        message: `'${CONFIGURED_DIR}/${entry.name}' is not a configuring record or patch`,
      });
      continue;
    }
    const name = match[1] as string;
    if (match[2] === 'patch') {
      patches.add(name);
      continue;
    }
    const parsed = readRecords(join(recordsDir, entry.name), `${CONFIGURED_DIR}/${entry.name}`);
    if (parsed.ok) records.set(name, parsed.value);
    else issues.push(...parsed.issues);
  }
  if (issues.length > 0) return fail(issues);

  const configurations: Record<string, Configuration> = {};
  for (const name of configured) {
    const record = newestWritten(records.get(name) ?? []);
    if (record === undefined) {
      issues.push({
        path: `arms.${name}`,
        message: `'arms/${name}' has no written record in '${CONFIGURED_DIR}/${name}.json'`,
      });
      continue;
    }
    const configurationDir = resolve(dir, 'arms', name);
    issues.push(
      ...fileIssues(configurationDir, record).map((message) => ({ path: `arms.${name}`, message })),
    );
    configurations[name] = {
      dir: configurationDir,
      record,
      records: records.get(name) ?? [],
      patchPath: join(recordsDir, `${name}.patch`),
    };
  }
  for (const [name, list] of records) {
    if (newestWritten(list) === undefined) continue;
    const file = `'${CONFIGURED_DIR}/${name}.json' has a written record, and no`;
    if (!configured.includes(name)) issues.push({ path: CONFIGURED_DIR, message: `${file} 'arms/${name}'` });
    if (!patches.has(name))
      issues.push({ path: CONFIGURED_DIR, message: `${file} '${CONFIGURED_DIR}/${name}.patch'` });
  }
  return issues.length > 0 ? fail(issues) : ok(configurations);
}

/** A record file, parsed; a finding's path is the file's, then the record's index and field. */
function readRecords(file: string, label: string): Result<ConfiguredRecord[]> {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([{ path: label, message: `is not valid JSON: ${(error as Error).message}` }]);
  }
  const parsed = parseWith(configuredRecordsSchema, value, '');
  if (parsed.ok) return parsed;
  return fail(parsed.issues.map((issue) => ({ path: `${label}${issue.path}`, message: issue.message })));
}

/** The configuration's record: the newest `written` one (REQ-FMT-04 as amended in 1.50). */
function newestWritten(records: readonly ConfiguredRecord[]): ConfiguredRecord | undefined {
  return records.findLast((record) => record.outcome === 'written');
}

/** The directory against its record: each file missing, extra or changed, in the paths' code-unit order. */
function fileIssues(directory: string, record: ConfiguredRecord): string[] {
  const listed = new Map((record.files ?? []).map((file) => [file.path, file.sha256]));
  const held = existsSync(directory) ? filesUnder(directory) : [];
  const paths = [...new Set([...listed.keys(), ...held])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return paths.flatMap((path) => {
    const expected = listed.get(path);
    if (expected === undefined) return [`'${path}' is not in its record`];
    if (!held.includes(path)) return [`'${path}' is in its record and missing`];
    const actual = createHash('sha256')
      .update(readFileSync(join(directory, path)))
      .digest('hex');
    return actual === expected ? [] : [`'${path}' differs from its record's SHA-256`];
  });
}

function filesUnder(directory: string, prefix = ''): string[] {
  return readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(directory, path) : [path];
  });
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}
