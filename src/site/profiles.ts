import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
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

/** Where the site's catalogue is versioned (REQ-RES-11, task-104). */
export const CATALOG_FILE = 'site-content/catalog.yaml';

/** The kinds of execution the home groups, in its order, with each group's heading and line (REQ-RES-11). */
export const KINDS = [
  {
    id: 'reference',
    heading: 'Reference campaigns',
    line: 'Every harness against the baseline, on one agent and its models.',
  },
  { id: 'bridge', heading: 'Bridges', line: 'One change at a time between two reference campaigns.' },
  {
    id: 'across-agents',
    heading: 'Across agents',
    line: 'The same baseline arm under another agent; never mixed with the headlines above.',
  },
] as const;

/** An execution `<campaign-id>/<n>`, as the catalogue and `compared_with` name it. */
const EXECUTION_ID = /^[0-9a-f]{12}\/[1-9]\d*$/;

const catalogSchema = z.strictObject({
  executions: z.record(
    z.string().regex(EXECUTION_ID, 'must be <campaign-id>/<n>'),
    z.strictObject({
      title: z.string().min(1),
      kind: z.enum(KINDS.map((kind) => kind.id) as [string, ...string[]]),
      release: z.string().min(1),
      agent: z.string().min(1),
      arms: z.string().min(1),
      notes: z.array(z.string().min(1)).optional(),
      erratum: z
        .string()
        .regex(/^https:\/\/\S+$/, 'must be an https:// link')
        .optional(),
      compared_with: z.array(z.string().regex(EXECUTION_ID, 'must be <campaign-id>/<n>')).optional(),
    }),
  ),
});

/** A published execution as the catalogue presents it (REQ-RES-11). */
export type CatalogEntry = z.infer<typeof catalogSchema>['executions'][string];

/** The catalogue of `root`'s `site-content/catalog.yaml` (REQ-RES-11, task-104), by execution. */
export function loadCatalog(root: string): Result<ReadonlyMap<string, CatalogEntry>> {
  const read = readYamlFile(join(root, CATALOG_FILE));
  if (!read.ok) return fail(read.issues.map((issue) => ({ path: CATALOG_FILE, message: issue.message })));
  const parsed = parseWith(catalogSchema, read.value, CATALOG_FILE);
  if (!parsed.ok) {
    return fail(
      parsed.issues.map((issue) => ({ path: `${CATALOG_FILE}.${issue.path}`, message: issue.message })),
    );
  }
  return ok(new Map(Object.entries(parsed.value.executions)));
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
 * The home, `site/index.html` (REQ-RES-11, task-104): the built `executions` grouped by the catalogue's kind, in
 * {@link KINDS}' order, each newest first by the end its `execution.json` records (an execution with none last), with
 * its title, end date, agent, arms, comparison pages and erratum. An execution with no catalogue entry, or whose
 * results are gone or whose record is unreadable or not a date, refuses it, naming it.
 */
export function rootIndex(root: string, executions: readonly string[]): Result<string> {
  const catalog = loadCatalog(root);
  if (!catalog.ok) return catalog;
  const issues: Issue[] = [];
  const listed: {
    execution: string;
    entry: CatalogEntry;
    links: { file: string; label: string }[];
    ended?: string;
  }[] = [];
  for (const execution of executions) {
    const [campaign, n] = execution.split('/') as [string, string];
    const dir = join(root, 'results', campaign, n);
    if (!existsSync(dir)) {
      issues.push({
        path: `site/${execution}`,
        message: `is built, but results/${execution} is gone: remove it from site/, or restore its results`,
      });
      continue;
    }
    const record = readExecutionRecord(dir);
    if (!record.ok) {
      issues.push(...record.issues);
      continue;
    }
    const ended = record.value?.ended;
    // A day that exists: a UTC ISO timestamp, as the runner writes it, whose own date is the one it names.
    const real =
      ended === undefined ||
      (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(ended) &&
        !Number.isNaN(Date.parse(ended)) &&
        new Date(ended).toISOString().slice(0, 10) === ended.slice(0, 10));
    if (!real) {
      issues.push({
        path: `results/${execution}/execution.json`,
        message: `records an end that is not a date: ${ended}`,
      });
      continue;
    }
    const entry = catalog.value.get(execution);
    if (entry === undefined) {
      issues.push({
        path: CATALOG_FILE,
        message: `has no entry for ${execution}, which is built under site/`,
      });
      continue;
    }
    // Each comparison the entry names must be written (REQ-RES-11): its page's kind is the comparison's, by its agents.
    const links: { file: string; label: string }[] = [];
    for (const other of entry.compared_with ?? []) {
      const path = `results/comparisons/${execution.replace('/', '-')}/${other.replace('/', '-')}.json`;
      let comparison: { pins_differ?: { pin?: unknown }[] };
      try {
        comparison = JSON.parse(readFileSync(join(root, path), 'utf8')) as typeof comparison;
      } catch {
        issues.push({
          path: CATALOG_FILE,
          message: `${execution} is compared_with ${other}, but ${path} is not written: run bench campaign compare ${other} ${execution} first`,
        });
        continue;
      }
      const across = (comparison.pins_differ ?? []).some((pin) => pin.pin === 'agent.name');
      links.push({
        file: `${across ? 'across-agents' : 'compare'}-${other.replace('/', '-')}.html`,
        label: across ? `compared across agents with ${other}` : `compared with ${other}`,
      });
    }
    listed.push({ execution, entry, links, ...(ended === undefined ? {} : { ended }) });
  }
  if (issues.length > 0) return fail(issues);

  const item = ({ execution, entry, links: compared, ended }: (typeof listed)[number]) => {
    const links = compared.map((link) => `<a href="${e(`${execution}/${link.file}`)}">${e(link.label)}</a>`);
    const parts = [
      `<a href="${e(`${execution}/`)}">${e(entry.title)}</a>, ${ended === undefined ? 'end date not recorded' : e(`ended ${ended.slice(0, 10)}`)}`,
      e(entry.agent),
      e(entry.arms),
      ...links,
      ...(entry.erratum === undefined ? [] : [`<a href="${e(entry.erratum)}">erratum</a>`]),
    ];
    return `<li>${parts.join(' · ')}</li>\n`;
  };
  // Newest first; an execution whose end is not recorded after those that have one, then by its address.
  const newestFirst = (a: (typeof listed)[number], b: (typeof listed)[number]) =>
    (b.ended ?? '').localeCompare(a.ended ?? '') || a.execution.localeCompare(b.execution);
  const groups = KINDS.flatMap((kind) => {
    const members = listed.filter((one) => one.entry.kind === kind.id).sort(newestFirst);
    return members.length === 0
      ? []
      : [`<h2>${e(kind.heading)}</h2>\n<p>${e(kind.line)}</p>\n<ul>\n${members.map(item).join('')}</ul>\n`];
  });
  return ok(
    page(
      'WingFoil Benchmark',
      '<h1>WingFoil Benchmark</h1>\n' +
        '<p>Every published campaign execution, each at a permanent address. Results are preliminary unless marked ' +
        "otherwise, and the benchmark is built by WingFoil's maintainer (validity threat T1).</p>\n" +
        groups.join(''),
      0,
    ),
  );
}
