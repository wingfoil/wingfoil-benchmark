import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { campaignSchema, fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { CampaignFile, Issue, Result } from '../core/index.js';

import { renderMarkdown } from './markdown.js';
import type { SiteModel } from './model.js';
import { escapeHtml, materialPage, methodShell } from './render.js';

/**
 * The method page (F5.8, task-046): `site-content/method.md`, the benchmark's method in plain language,
 * with the execution's pins, budget and spending generated from its files, and the published material —
 * the arms' manuals, each scenario's directives, licence notices and licence texts — as pages of their
 * own under `material/`. Nothing else of a scenario's oracle, and nothing of the hold-out, is read.
 */

/** Where the method's prose is versioned, in the repository. */
export const METHOD_FILE = 'site-content/method.md';

/** The pages of the method: `method.html`, and each material page by its file name under `material/`. */
export interface MethodPages {
  readonly method: string;
  readonly material: ReadonlyMap<string, string>;
}

const e = escapeHtml;

function sha256(text: Buffer | string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * The method page and its material for the execution `results/<execution>` in `root`, whose site model is
 * `model`. Refused: a campaign file that is not one, a method file missing, a manual changed since its runs
 * recorded it.
 */
export function methodPages(root: string, execution: string, model: SiteModel): Result<MethodPages> {
  const executionDir = join(root, 'results', execution);
  const campaignFile = `results/${execution}/campaign.yaml`;
  const read = readYamlFile(join(executionDir, 'campaign.yaml'));
  if (!read.ok) return fail(read.issues.map((issue) => ({ ...issue, path: campaignFile })));
  const parsed = parseWith(campaignSchema, read.value, 'campaign.yaml');
  if (!parsed.ok) {
    return fail(
      parsed.issues.map((issue) => ({ path: campaignFile, message: `${issue.path}: ${issue.message}` })),
    );
  }
  const prose = join(root, METHOD_FILE);
  if (!existsSync(prose))
    return fail([{ path: METHOD_FILE, message: 'not found: the method page has no text' }]);

  const material = new Map<string, string>();
  const issues: Issue[] = [];
  const manuals: string[] = [];
  for (const arm of model.arms) {
    const file = `arms/${arm}/manual.md`;
    if (!existsSync(join(root, file))) {
      issues.push({ path: file, message: 'not found: its arm ran in this execution' });
      continue;
    }
    const text = readFileSync(join(root, file), 'utf8');
    const hash = sha256(text);
    const records = model.records.filter((record) => record.arm === arm);
    const recorded = [...new Set(records.flatMap((record) => record.manual?.sha256 ?? []))].sort();
    const other = recorded.filter((value) => value !== hash);
    if (other.length > 0) {
      issues.push({
        path: file,
        message: `(sha256:${hash}) differs from the manual its runs recorded (sha256:${other.join(', sha256:')})`,
      });
      continue;
    }
    const tokens = [...new Set(records.flatMap((record) => record.manual?.tokens ?? []))].sort(
      (a, b) => a - b,
    );
    const missing = records.filter((record) => record.manual === undefined).length;
    manuals.push(
      `${e(arm)}: sha256:${hash}${tokens.length === 0 ? '' : `, ${tokens.join(', ')} tokens`}` +
        (missing === 0 ? '' : ` (${missing} run${missing === 1 ? '' : 's'} recorded none)`),
    );
    material.set(`manual-${arm}.html`, materialPage(`Operating manual: ${arm}`, renderMarkdown(text).html));
  }
  if (issues.length > 0) return fail(issues);
  for (const [name, page] of publishedMaterial(
    root,
    model.categories.flatMap((row) => row.scenarios.map((s) => s.scenario)),
  )) {
    material.set(name, page);
  }

  const executionHtml = executionSection(executionDir, model, parsed.value, manuals);
  const links = [...material.keys()]
    .sort()
    .map((name) => `<li><a href="material/${e(name)}">${e(materialTitle(name))}</a></li>\n`)
    .join('');
  const rendered = renderMarkdown(readFileSync(prose, 'utf8'), {
    blocks: { execution: executionHtml, material: `<ul>\n${links}</ul>` },
  });
  return ok({ method: methodShell(model, rendered.html), material });
}

/** A material page's title, from its file name. */
function materialTitle(name: string): string {
  const base = name.replace(/\.html$/, '');
  if (base.startsWith('manual-')) return `Operating manual of the ${base.slice('manual-'.length)} arm`;
  if (base.startsWith('directives-'))
    return `The directives of ${base.slice('directives-'.length).toUpperCase()}`;
  if (base.startsWith('notice-'))
    return `Third-party material of ${base.slice('notice-'.length).toUpperCase()}`;
  return `Licence: ${base.slice('licence-'.length)}`;
}

/**
 * The material a scenario version publishes (task-046): its arms' directives
 * (`arms/<arm>/.wingfoil/directives/custom/*.md`) and its oracle's licence notice and texts
 * (`oracle/licenses/`). Nothing else of its oracle is read, so a hold-out answer key never is.
 */
export function publishedMaterial(
  root: string,
  scenarios: readonly { readonly id: string; readonly version: string }[],
): Map<string, string> {
  const pages = new Map<string, string>();
  for (const { id, version } of [...scenarios].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const dir = join(root, 'scenarios', id, version);
    const lower = id.toLowerCase();
    const directives = listFiles(join(dir, 'arms'))
      .flatMap((arm) =>
        listFiles(join(dir, 'arms', arm, '.wingfoil', 'directives', 'custom')).map((file) =>
          join(dir, 'arms', arm, '.wingfoil', 'directives', 'custom', file),
        ),
      )
      .filter((file) => file.endsWith('.md'));
    if (directives.length > 0) {
      const body = directives.map((file) => renderMarkdown(readFileSync(file, 'utf8')).html).join('<hr>\n');
      pages.set(`directives-${lower}.html`, materialPage(`The directives of ${id}@${version}`, body));
    }
    const licences = join(dir, 'oracle', 'licenses');
    const texts = listFiles(licences).filter((file) => file.endsWith('.txt'));
    const rename = Object.fromEntries(texts.map((file) => [file, licencePage(file)]));
    if (existsSync(join(licences, 'NOTICE.md'))) {
      const notice = renderMarkdown(readFileSync(join(licences, 'NOTICE.md'), 'utf8'), { links: rename });
      pages.set(
        `notice-${lower}.html`,
        materialPage(`Third-party material of ${id}@${version}`, notice.html),
      );
    }
    for (const file of texts) {
      const text = readFileSync(join(licences, file), 'utf8');
      pages.set(licencePage(file), materialPage(`Licence: ${file}`, `<pre>${e(text)}</pre>\n`));
    }
  }
  return pages;
}

function licencePage(file: string): string {
  return `licence-${file.replace(/\.txt$/, '').toLowerCase()}.html`;
}

/** A directory's entries, sorted; none when it does not exist. */
function listFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

function row(label: string, value: string): string {
  return `<tr><th scope="row">${e(label)}</th><td>${value}</td></tr>\n`;
}

/** "This execution": its pins, its budget and its spending, read from its files (task-046). */
function executionSection(
  executionDir: string,
  model: SiteModel,
  campaign: CampaignFile,
  manuals: readonly string[],
): string {
  const harnesses = Object.entries(campaign.harnesses)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, harness]) => {
      const commits = [
        ...new Set(
          model.records.flatMap((record) =>
            record.harness?.tool === harness.tool ? [record.harness.commit] : [],
          ),
        ),
      ].sort();
      return `${e(name)} ${e(harness.version)}; ${commits.length === 0 ? 'no run recorded a commit' : `commits recorded by its runs: ${commits.map(e).join(', ')}`}`;
    });
  const scenarios = model.categories
    .flatMap((category) => category.scenarios.map((scenario) => scenario.scenario))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((info) => `${e(`${info.id}@${info.version}`)} ${e(info.hash)}`);
  const scorers = [
    ...new Set(
      model.records.flatMap((record) => {
        const file = join(executionDir, ...record.run.split('/').slice(2), 'score.json');
        if (!existsSync(file)) return [];
        try {
          const scorer = (JSON.parse(readFileSync(file, 'utf8')) as { scorer?: Record<string, unknown> })
            .scorer;
          return scorer === undefined
            ? []
            : [
                Object.entries(scorer)
                  .map(([key, value]) => `${key} ${String(value)}`)
                  .join(', '),
              ];
        } catch {
          return [];
        }
      }),
    ),
  ].sort();
  const slices = campaign.models.slices ?? [];
  const groups = [...modelGroups(model)];
  const total = groups.reduce(
    (sum, group) => sum + group.metrics.cost.cost_eur.values.reduce((a, b) => a + b, 0),
    0,
  );
  const bound = groups.flatMap((group) => group.metrics.cost.bound);
  const runs = model.runs + model.sliceRuns;
  const spending =
    `${runs} run${runs === 1 ? '' : 's'} of ${e(model.model)}${model.sliceRuns === 0 ? '' : ' and its slices'} ` +
    `cost ${total.toFixed(4)} EUR in all.` +
    (bound.length === 0
      ? ''
      : ` For ${bound.length} of them the cost is a bound, not a report: ${bound.map(e).join(', ')}.`);
  return (
    '<h3 id="pins">Pins</h3>\n<table>\n<tbody>\n' +
    row('Agent', `${e(campaign.agent.name)} ${e(campaign.agent.version)}`) +
    row('Model', e(campaign.models.default)) +
    row(
      'Other models (slices)',
      slices.length === 0 ? 'none' : slices.map((slice) => e(JSON.stringify(slice))).join('<br>'),
    ) +
    row('Harnesses', harnesses.length === 0 ? 'none' : harnesses.join('<br>')) +
    row('Harness capabilities', capabilities(model)) +
    row('Approver policy', e(campaign.approver_policy)) +
    row('Scenarios', scenarios.join('<br>')) +
    row('Scoring image', scorers.length === 0 ? 'not recorded' : scorers.map(e).join('<br>')) +
    row('Manuals', manuals.join('<br>')) +
    '</tbody>\n</table>\n<h3 id="budget">Budget</h3>\n<table>\n<tbody>\n' +
    row('Step time cap', `${campaign.caps.step_time_s} s`) +
    row('Step token cap', `${campaign.caps.step_tokens} tokens`) +
    row('Run cost cap', `${campaign.caps.run_cost_eur} EUR`) +
    row('Budget warning', `${campaign.budget.warn_eur} EUR`) +
    row('Budget ceiling', `${campaign.budget.ceiling_eur} EUR`) +
    row('Rate', `${campaign.currency.usd_to_eur} EUR per USD`) +
    '</tbody>\n</table>\n<h3>Spending</h3>\n' +
    `<p id="spending">${spending}</p>\n`
  );
}

/**
 * Each arm's declared harness capabilities (REQ-FMT-10), as its runs recorded them: every distinct
 * declaration, arms in the site's order, capabilities by name.
 */
function capabilities(model: SiteModel): string {
  const lines = model.arms.flatMap((arm) => {
    const declared = [
      ...new Set(
        model.records
          .filter((record) => record.arm === arm && record.provides !== undefined)
          .map((record) =>
            Object.entries(record.provides ?? {})
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([name, offered]) => `${name} ${offered ? 'offered' : 'not offered'}`)
              .join('; '),
          ),
      ),
    ];
    return declared.map((text) => `${e(arm)}: ${e(text)}`);
  });
  return lines.length === 0 ? 'none declared by the runs' : lines.join('<br>');
}

/** The model's groups and slices. */
function* modelGroups(model: SiteModel) {
  for (const row of model.categories) for (const scenario of row.scenarios) yield* scenario.groups;
  yield* model.slices;
}
