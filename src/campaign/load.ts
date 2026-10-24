import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { stringify } from 'yaml';

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

/** REQ-FMT-01 as amended in 1.34 (dl-022): the presets a campaign file may extend, in `campaigns/presets/`. */
export const PRESETS_DIR = 'presets';

/** A validated campaign file and its identity. */
export interface Campaign {
  /** REQ-FMT-02: the campaign's identity. */
  readonly id: string;
  /** Absolute path of the campaign file. */
  readonly file: string;
  /** The campaign file as validated (REQ-FMT-01): the resolved campaign when the file extends a preset. */
  readonly spec: CampaignFile;
  /**
   * The preset the file extends (`presets/<name>.yaml`), the resolved campaign as parsed, which the identity hashes
   * (REQ-FMT-02 as amended in 1.34), and as YAML, which `validate` prints and each execution keeps as its
   * `campaign.yaml` (REQ-FMT-01, REQ-CLI-01 as amended in 1.34); absent for a file that extends nothing, which is
   * its own resolution.
   */
  readonly extended?: { readonly preset: string; readonly resolved: unknown; readonly yaml: string };
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
  const directory = dirname(path);
  const resolution = resolvePreset(read.value, directory);
  if (!resolution.ok) return resolution;
  const { resolved, preset } = resolution.value;
  const parsed = parseWith(campaignSchema, resolved, basename(path));
  if (!parsed.ok) return parsed;
  const inconsistent = campaignConsistency(parsed.value);
  if (inconsistent.length > 0) return fail(inconsistent);

  if (basename(directory) !== CAMPAIGNS_DIR) {
    return fail([
      { path: basename(path), message: `must live in a '${CAMPAIGNS_DIR}' directory, next to 'scenarios'` },
    ]);
  }

  const repoRoot = dirname(directory);
  return ok({
    id: campaignId(resolved),
    file: path,
    spec: parsed.value,
    ...(preset === undefined ? {} : { extended: { preset, resolved, yaml: stringify(resolved) } }),
    repoRoot,
    scenariosRoot: join(repoRoot, 'scenarios'),
    armsRoot: join(repoRoot, 'arms'),
    resultsRoot: join(repoRoot, 'results'),
  });
}

/** A value YAML parses into a map. */
function isMap(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * REQ-FMT-01 as amended in 1.34 (dl-022): `file` laid over `preset`. Maps merge by key at every level, the file's
 * value winning; a list, like any other value, is replaced whole.
 */
export function mergePreset(preset: unknown, file: unknown): unknown {
  if (!isMap(preset) || !isMap(file)) return file;
  const merged: Record<string, unknown> = { ...preset };
  for (const [key, value] of Object.entries(file))
    merged[key] = key in preset ? mergePreset(preset[key], value) : value;
  return merged;
}

/**
 * The campaign file `data`, read in `directory`, resolved against the preset its `extends:` names (REQ-FMT-01 as
 * amended in 1.34): the preset must be a file of `<directory>/presets/` that extends nothing and has a one-line
 * `description:`. `extends:` and the preset's `description:` are not part of the resolved campaign. A file without
 * `extends:` resolves to itself.
 */
function resolvePreset(data: unknown, directory: string): Result<{ resolved: unknown; preset?: string }> {
  if (!isMap(data) || !('extends' in data)) return ok({ resolved: data });
  const { extends: named, ...own } = data;
  const refuse = (message: string) => fail<{ resolved: unknown }>([{ path: 'extends', message }]);
  if (typeof named !== 'string') return refuse(`must name a file in ${CAMPAIGNS_DIR}/${PRESETS_DIR}/`);

  const presets = join(directory, PRESETS_DIR);
  const file = resolve(directory, named);
  const inside = relative(presets, file);
  if (inside === '' || inside.startsWith('..') || inside.includes(sep) || !inside.endsWith('.yaml')) {
    return refuse(`'${named}' must name a file in ${CAMPAIGNS_DIR}/${PRESETS_DIR}/`);
  }
  const preset = `${PRESETS_DIR}/${inside}`;
  const read = readYamlFile(file);
  if (!read.ok)
    return refuse(`'${preset}' cannot be read: ${read.issues.map((issue) => issue.message).join('; ')}`);
  if (!isMap(read.value)) return refuse(`'${preset}' is not a map of campaign fields`);
  const { description, ...pins } = read.value;
  if ('extends' in pins) return refuse(`'${preset}' must not extend another preset`);
  if (typeof description !== 'string' || description.trim() === '' || description.includes('\n')) {
    return refuse(`'${preset}' has no description: a one-line \`description:\` says what it measures`);
  }
  return ok({ resolved: mergePreset(pins, own), preset });
}

/** A preset of `campaigns/presets/` and the line that says what it measures (REQ-CLI-13). */
export interface Preset {
  readonly name: string;
  readonly description: string;
}

/**
 * REQ-CLI-13: the presets of `<root>/campaigns/presets/`, by name; a preset that cannot be read, extends another
 * or has no one-line description is an issue naming it.
 */
export function listPresets(root: string): Result<readonly Preset[]> {
  const directory = join(root, CAMPAIGNS_DIR, PRESETS_DIR);
  if (!existsSync(directory)) return ok([]);
  const names = readdirSync(directory)
    .filter((name) => name.endsWith('.yaml'))
    .sort();
  const presets: Preset[] = [];
  const issues: { path: string; message: string }[] = [];
  for (const name of names) {
    const checked = resolvePreset({ extends: `${PRESETS_DIR}/${name}` }, join(root, CAMPAIGNS_DIR));
    if (!checked.ok) {
      issues.push(...checked.issues);
      continue;
    }
    const read = readYamlFile(join(directory, name));
    const description = read.ok && isMap(read.value) ? String(read.value.description) : '';
    presets.push({ name: name.replace(/\.yaml$/, ''), description });
  }
  return issues.length > 0 ? fail(issues) : ok(presets);
}
