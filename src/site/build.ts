import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, historyCli, ok, systemProcess } from '../core/index.js';
import type { HistoryPort, Result } from '../core/index.js';

import { acrossAgents, acrossAgentsFile, acrossAgentsPage } from './across-agents.js';
import type { AggregateView } from './across-agents.js';
import { comparisonFile, comparisonPage, crossModel, executionName, readComparisons } from './comparisons.js';
import { eligibilityPage } from './eligibility.js';
import { methodPages } from './method.js';
import { siteModel } from './model.js';
import { builtExecutions, loadCatalog, loadProfiles, profileFile, rootIndex } from './profiles.js';
import { categoryFile, categoryPage, landingPage, plainHeadlines, profilePage, STYLE } from './render.js';

/** Where the site is written, in the repository (REQ-ARC-03). */
export const SITE = 'site';

/** What a build wrote: the execution's directory under `site/`, its pages, and the headline. */
export interface SiteBuild {
  readonly directory: string;
  readonly pages: number;
  readonly headlines: readonly string[];
}

/**
 * Build the site of the aggregated execution `<campaign-id>/<n>` into `site/` of `root` (REQ-CLI-09 and
 * REQ-RES-02 as amended in 1.20 and 1.21, task-045 and task-046): `site/<campaign-id>/<n>/` is replaced whole, and
 * `site/index.html` and `site/style.css` are rewritten; another execution's directory is left as it is,
 * so its permanent URL keeps its pages. Nothing is written when the model refuses. `siteDir` is `site/` of
 * `root`, or another directory to build into (task-047: publishing compares `site/` with a fresh build).
 */
export async function buildSite(
  root: string,
  execution: string,
  siteDir: string = join(root, SITE),
  history: HistoryPort = historyCli(systemProcess),
): Promise<Result<SiteBuild>> {
  const model = siteModel(root, execution);
  if (!model.ok) return model;
  const method = await methodPages(root, execution, model.value, history);
  if (!method.ok) return method;
  const eligibility = eligibilityPage(root, model.value);
  if (!eligibility.ok) return eligibility;
  // The comparisons whose newer side is this execution (REQ-RES-07, task-084): a page each, linked from the landing page.
  const comparisons = readComparisons(root, model.value.campaign, model.value.execution);
  if (!comparisons.ok) return comparisons;
  // The result profiles (REQ-RES-08, task-085): a page each, linked from the landing page.
  const profiles = loadProfiles(root);
  if (!profiles.ok) return profiles;
  // An across-agents comparison (REQ-RES-07 as amended in 1.36, task-104) reads the two aggregates and the catalogue's
  // notes; any other comparison its rows alone.
  const catalog = loadCatalog(root);
  if (!catalog.ok) return catalog;
  const self = `${model.value.campaign}/${model.value.execution}`;
  const aggregateOf = (campaign: string, n: number): Result<AggregateView> => {
    const file = join(root, 'results', campaign, String(n), 'aggregate.json');
    try {
      return ok(JSON.parse(readFileSync(file, 'utf8')) as AggregateView);
    } catch (error) {
      return fail([
        {
          path: `results/${campaign}/${n}/aggregate.json`,
          message: `cannot be read: ${(error as Error).message}`,
        },
      ]);
    }
  };
  const comparisonPages: [string, string][] = [];
  for (const comparison of comparisons.value) {
    if (!acrossAgents(comparison)) {
      comparisonPages.push([comparisonFile(comparison), comparisonPage(comparison)]);
      continue;
    }
    const earlier = aggregateOf(comparison.earlier.campaign, comparison.earlier.execution);
    if (!earlier.ok) return earlier;
    const newer = aggregateOf(comparison.newer.campaign, comparison.newer.execution);
    if (!newer.ok) return newer;
    const notes = catalog.value.get(self)?.notes ?? [];
    comparisonPages.push([
      acrossAgentsFile(comparison),
      acrossAgentsPage(comparison, earlier.value, newer.value, notes),
    ]);
  }
  const pages: [string, string][] = [
    [
      'index.html',
      landingPage(
        model.value,
        comparisons.value.map((comparison) => ({
          file: acrossAgents(comparison) ? acrossAgentsFile(comparison) : comparisonFile(comparison),
          label: executionName(comparison.earlier),
          crossModel: crossModel(comparison),
          acrossAgents: acrossAgents(comparison),
        })),
        profiles.value.map((profile) => ({ ...profile, file: profileFile(profile) })),
      ),
    ],
    ...profiles.value.map((profile): [string, string] => [
      profileFile(profile),
      profilePage(model.value, profile),
    ]),
    ...model.value.categories.map((row): [string, string] => [
      categoryFile(row.category),
      categoryPage(model.value, row),
    ]),
    ['method.html', method.value.method],
    ['eligibility.html', eligibility.value],
    ...comparisonPages,
    ...[...method.value.material].map(([name, text]): [string, string] => [`material/${name}`, text]),
  ];
  const directory = `${SITE}/${model.value.campaign}/${model.value.execution}/`;
  // Every execution built under site/, this one included, with the day each ended (REQ-RES-02 as amended,
  // task-085): read before anything is written, so that a record that cannot be read leaves site/ as it was.
  const index = rootIndex(root, [...new Set([...builtExecutions(siteDir), self])]);
  if (!index.ok) return index;
  const target = join(siteDir, model.value.campaign, String(model.value.execution));
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(target, 'material'), { recursive: true });
  for (const [name, text] of pages) writeFileSync(join(target, name), text);
  writeFileSync(join(siteDir, 'index.html'), index.value);
  writeFileSync(join(siteDir, 'style.css'), STYLE);
  return ok({ directory, pages: pages.length, headlines: plainHeadlines(model.value) });
}
