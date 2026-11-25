import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { parse } from 'yaml';

import { REPO_ROOT } from './paths.js';

/**
 * The sibling repositories the tests read (task-179): the WingFoil clone the WingFoil under test is built from, and
 * the hold-out. No folder name of a sibling project is guessed: each comes from its variable, else from the main
 * checkout's git-ignored local file, else (the hold-out only) from the folder that moves with this repository. The
 * local file only hands paths to the tests that ask: it never feeds `process.env`, which the CLI and its tests read.
 */

/** The git-ignored local file, relative to the main checkout. */
export const LOCAL_FILE = 'config/siblings.local.yaml';
/** The hold-out's folder beside the main checkout: it moves with this repository. */
export const HOLDOUT_DEFAULT = 'wingfoil-benchmark-holdout';

/** Where a sibling was found, or why it was not: no path and a reason when the test that needs it must skip. */
export interface Sibling {
  path: string | undefined;
  source: 'env' | 'local' | 'default' | 'none';
  reason: string | undefined;
}

const KINDS = {
  wingfoil: { variable: 'BENCH_WINGFOIL_REPO', what: 'WingFoil clone' },
  holdout: { variable: 'BENCH_HOLDOUT_PATH', what: 'hold-out' },
} as const;
type Kind = keyof typeof KINDS;

/** The main checkout of the repository `root` is in: the parent of the git common directory (a worktree's too). */
export function mainCheckout(root: string = REPO_ROOT): string {
  const common = execFileSync(
    'git',
    ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
    {
      encoding: 'utf8',
    },
  ).trim();
  return basename(common) === '.git' ? dirname(common) : resolve(root);
}

/** The local file's values, `~/` read against the home folder and a relative path against the main checkout. */
function localValues(main: string): Partial<Record<Kind, string>> {
  const file = join(main, LOCAL_FILE);
  if (!existsSync(file)) return {};
  const data: unknown = parse(readFileSync(file, 'utf8')) ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error(`${LOCAL_FILE}: not a mapping`);
  const values: Partial<Record<Kind, string>> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (!(key in KINDS)) throw new Error(`${LOCAL_FILE}: unknown key ${key} (only wingfoil and holdout)`);
    if (typeof value !== 'string' || value === '') throw new Error(`${LOCAL_FILE}: ${key} is not a path`);
    values[key as Kind] = value.startsWith('~/') ? join(homedir(), value.slice(2)) : resolve(main, value);
  }
  return values;
}

function found(path: string, source: Sibling['source'], label: string): Sibling {
  return existsSync(path)
    ? { path, source, reason: undefined }
    : { path: undefined, source, reason: `${label}: ${path} does not exist` };
}

/** Both siblings, from `env` (default `process.env`) and the main checkout `main` (default this repository's). */
export function siblings(options: { env?: NodeJS.ProcessEnv; main?: string } = {}): Record<Kind, Sibling> {
  const env = options.env ?? process.env;
  const main = options.main ?? mainCheckout();
  const local = localValues(main);
  const one = (kind: Kind): Sibling => {
    const { variable, what } = KINDS[kind];
    const fromEnv = env[variable];
    if (fromEnv !== undefined && fromEnv !== '') return found(fromEnv, 'env', variable);
    const fromFile = local[kind];
    if (fromFile !== undefined) return found(fromFile, 'local', `${LOCAL_FILE}: ${kind}`);
    const unset = `no ${what}: set ${variable} or ${kind}: in ${LOCAL_FILE} (see config/siblings.local.example.yaml)`;
    if (kind === 'holdout') {
      const fallback = join(dirname(main), HOLDOUT_DEFAULT);
      if (existsSync(fallback)) return { path: fallback, source: 'default', reason: undefined };
      return {
        path: undefined,
        source: 'none',
        reason: `${unset}; ${fallback} (the default) does not exist`,
      };
    }
    return { path: undefined, source: 'none', reason: unset };
  };
  return { wingfoil: one('wingfoil'), holdout: one('holdout') };
}

/** A test's title that says why it is skipped, since vitest prints nothing else for a skipped test. */
export function titled(title: string, skipped: boolean, reason: string | undefined): string {
  return skipped && reason !== undefined ? `${title} [skipped: ${reason}]` : title;
}

/** The hold-out's folder of one scenario version, whether it exists, and why not. */
export function holdoutScenario(
  id: string,
  version = '1.0',
  holdout: Sibling = siblings().holdout,
): { root: string; dir: string; present: boolean; reason: string | undefined } {
  if (holdout.path === undefined) return { root: '', dir: '', present: false, reason: holdout.reason };
  const dir = join(holdout.path, 'scenarios', id, version);
  const present = existsSync(dir);
  return { root: holdout.path, dir, present, reason: present ? undefined : `${dir} does not exist` };
}
