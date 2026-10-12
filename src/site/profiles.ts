import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { CATEGORIES, fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Category, Issue, Result } from '../core/index.js';
import { readExecutionRecord } from '../results/index.js';

import { escapeHtml as e, page } from './render.js';

/** A result profile (REQ-RES-08): the kind of user it is, and the categories that matter to it. */
export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly categories: readonly Category[];
}

/** Where the profiles are versioned, in the repository (REQ-RES-08). */
export const PROFILES_FILE = 'site-content/profiles.yaml';

const profilesSchema = z.object({
  profiles: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be kebab-case'),
        name: z.string().min(1),
        categories: z.array(z.enum(CATEGORIES as unknown as [Category, ...Category[]])).min(1),
      }),
    )
    .min(1)
    .refine((profiles) => new Set(profiles.map((profile) => profile.id)).size === profiles.length, {
      message: 'must not name a profile twice',
    }),
});

/**
 * The result profiles of `root`'s `site-content/profiles.yaml` (REQ-RES-08, task-085), in the file's order: personas
 * §2's table, copied and versioned. A file that cannot be read, a category that is not A–G, or an id twice is refused,
 * naming the file.
 */
export function loadProfiles(root: string): Result<Profile[]> {
  const read = readYamlFile(join(root, PROFILES_FILE));
  if (!read.ok) return fail(read.issues.map((issue) => ({ path: PROFILES_FILE, message: issue.message })));
  const parsed = parseWith(profilesSchema, read.value, PROFILES_FILE);
  if (!parsed.ok) {
    return fail(
      parsed.issues.map((issue) => ({ path: PROFILES_FILE, message: `${issue.path} ${issue.message}` })),
    );
  }
  return ok(parsed.value.profiles);
}

/** A profile page's name, beside its execution's pages (REQ-RES-08). */
export function profileFile(profile: Pick<Profile, 'id'>): string {
  return `profile-${profile.id}.html`;
}

/** A campaign's directory under `site/`: its identity, 12 hex characters (REQ-FMT-02). */
const CAMPAIGN_DIR = /^[0-9a-f]{12}$/;

/** Every execution built under `site`, as `<campaign-id>/<n>`, by campaign then by number. */
export function builtExecutions(site: string): string[] {
  if (!existsSync(site)) return [];
  return readdirSync(site)
    .filter((name) => CAMPAIGN_DIR.test(name) && lstatSync(join(site, name)).isDirectory())
    .sort()
    .flatMap((campaign) =>
      readdirSync(join(site, campaign))
        .filter((n) => /^[1-9]\d*$/.test(n) && lstatSync(join(site, campaign, n)).isDirectory())
        .sort((a, b) => Number(a) - Number(b))
        .map((n) => `${campaign}/${n}`),
    );
}

/**
 * `site/index.html` (REQ-RES-02 as amended in 1.26, task-085): every built execution, by campaign then number, linking
 * its permanent URL, with the day it ended read from its `results/<campaign-id>/<n>/execution.json` — never the
 * build's — or that none was recorded (v0.1's executions have none). The only page that holds a date. A record that
 * cannot be read, an end that is not a date, or a built execution whose results are gone is refused, naming it.
 */
export function rootIndex(root: string, executions: readonly string[]): Result<string> {
  const sorted = [...executions].sort((a, b) => {
    const [ca, na] = a.split('/') as [string, string];
    const [cb, nb] = b.split('/') as [string, string];
    return ca === cb ? Number(na) - Number(nb) : ca < cb ? -1 : 1;
  });
  const issues: Issue[] = [];
  const items = sorted.map((execution) => {
    const [campaign, n] = execution.split('/') as [string, string];
    const dir = join(root, 'results', campaign, n);
    if (!existsSync(dir)) {
      issues.push({
        path: `site/${execution}`,
        message: `is built, but results/${execution} is gone: remove it from site/, or restore its results`,
      });
      return '';
    }
    const record = readExecutionRecord(dir);
    if (!record.ok) {
      issues.push(...record.issues);
      return '';
    }
    const ended = record.value?.ended;
    // A day that exists: an ISO timestamp whose own date is the one it names.
    const real =
      ended === undefined ||
      (/^\d{4}-\d{2}-\d{2}T/.test(ended) &&
        !Number.isNaN(Date.parse(ended)) &&
        new Date(ended).toISOString().slice(0, 10) === ended.slice(0, 10));
    if (!real) {
      issues.push({
        path: `results/${execution}/execution.json`,
        message: `records an end that is not a date: ${ended}`,
      });
      return '';
    }
    return (
      `<li><a href="${e(`${execution}/`)}">${e(`campaign ${campaign}, execution ${n}`)}</a>, ` +
      `${ended === undefined ? 'end date not recorded' : e(`ended ${ended.slice(0, 10)}`)}</li>\n`
    );
  });
  if (issues.length > 0) return fail(issues);
  return ok(
    page(
      'WingFoil Benchmark',
      '<h1>WingFoil Benchmark</h1>\n<p>Every published campaign execution, each at a permanent address:</p>\n' +
        `<ul>\n${items.join('')}</ul>\n`,
      0,
    ),
  );
}
