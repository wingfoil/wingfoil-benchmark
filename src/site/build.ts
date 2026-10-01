import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ok } from '../core/index.js';
import type { Result } from '../core/index.js';

import { methodPages } from './method.js';
import { siteModel } from './model.js';
import { categoryFile, categoryPage, landingPage, plainHeadlines, rootPage, STYLE } from './render.js';

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
export function buildSite(
  root: string,
  execution: string,
  siteDir: string = join(root, SITE),
): Result<SiteBuild> {
  const model = siteModel(root, execution);
  if (!model.ok) return model;
  const method = methodPages(root, execution, model.value);
  if (!method.ok) return method;
  const pages: [string, string][] = [
    ['index.html', landingPage(model.value)],
    ...model.value.categories.map((row): [string, string] => [
      categoryFile(row.category),
      categoryPage(model.value, row),
    ]),
    ['method.html', method.value.method],
    ...[...method.value.material].map(([name, text]): [string, string] => [`material/${name}`, text]),
  ];
  const directory = `${SITE}/${model.value.campaign}/${model.value.execution}/`;
  const target = join(siteDir, model.value.campaign, String(model.value.execution));
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(target, 'material'), { recursive: true });
  for (const [name, text] of pages) writeFileSync(join(target, name), text);
  writeFileSync(join(siteDir, 'index.html'), rootPage(model.value));
  writeFileSync(join(siteDir, 'style.css'), STYLE);
  return ok({ directory, pages: pages.length, headlines: plainHeadlines(model.value) });
}
