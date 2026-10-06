import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { campaignSchema, fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Arm, CampaignFile, Issue, Result } from '../core/index.js';

import { DOCS_GENERATORS, loadArm, RULES_GENERATORS } from '../arms/index.js';
import type { Group } from '../results/index.js';

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
  const setups = setupPages(root, model.arms);
  if (!setups.ok) return setups;
  for (const [name, page] of setups.value) material.set(name, page);
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
  // A page the text links to that this execution does not publish (an arm or a scenario it did not run)
  // is named, not linked (task-046's review).
  const text = readFileSync(prose, 'utf8');
  const rendered = renderMarkdown(text, {
    blocks: { execution: executionHtml, material: `<ul>\n${links}</ul>` },
    resolve: (target) => {
      const page = /^(?:\.\/)?material\/([^#]*)/.exec(target)?.[1];
      return page !== undefined && !material.has(page) ? null : undefined;
    },
  });
  return ok({ method: methodShell(model, rendered.html), material });
}

/** A material page's title, from its file name. */
function materialTitle(name: string): string {
  const base = name.replace(/\.html$/, '');
  if (base.startsWith('setup-')) return `The setup of the ${base.slice('setup-'.length)} arm`;
  if (base.startsWith('manual-')) return `Operating manual of the ${base.slice('manual-'.length)} arm`;
  if (base.startsWith('directives-'))
    return `The directives of ${base.slice('directives-'.length).toUpperCase()}`;
  if (base.startsWith('notice-'))
    return `Third-party material of ${base.slice('notice-'.length).toUpperCase()}`;
  return `Licence: ${base.slice('licence-'.length)}`;
}

/**
 * The setup page of each harness arm of the execution (REQ-RES-09, task-067), from the repository's `arms/<arm>/` as
 * the manual pages are: its setup script, its telemetry setting, its manual, its rules generator, its docs control and
 * what that control's generator renders. An arm without a harness (a control) has none.
 */
function setupPages(root: string, names: readonly string[]): Result<ReadonlyMap<string, string>> {
  const armsRoot = join(root, 'arms');
  const pages = new Map<string, string>();
  const issues: Issue[] = [];
  const controls: Arm[] = [];
  for (const name of listDirectories(armsRoot)) {
    const loaded = loadArm(armsRoot, name);
    if (loaded.ok && loaded.value.docsOf !== undefined) controls.push(loaded.value);
  }
  for (const name of names) {
    const loaded = loadArm(armsRoot, name);
    if (!loaded.ok) {
      issues.push(...loaded.issues.map((issue) => ({ ...issue, path: `arms/${name}/${issue.path}` })));
      continue;
    }
    const arm = loaded.value;
    if (arm.requires === undefined) continue;
    pages.set(
      `setup-${arm.name}.html`,
      materialPage(
        `Setup: ${arm.name}`,
        setupHtml(
          arm,
          readFileSync(arm.setupPath, 'utf8'),
          controls.filter((control) => control.docsOf === arm.name).map((control) => control.name),
        ),
      ),
    );
  }
  return issues.length > 0 ? fail(issues) : ok(pages);
}

function setupHtml(arm: Arm, script: string, controls: readonly string[]): string {
  const tool = arm.requires ?? '';
  const telemetry = arm.telemetryOff ?? [];
  const rules = RULES_GENERATORS[tool];
  const docs = DOCS_GENERATORS[tool];
  const parts = [
    `<p>How the ${e(arm.name)} arm is set up, before its agent starts: the ${e(tool)} harness at the campaign's pin, ` +
      `from the repository's <code>arms/${e(arm.name)}/</code>.</p>`,
    `<h2 id="setup-script">Setup script</h2>\n<pre><code>${e(script)}</code></pre>`,
    `<h2 id="telemetry">Telemetry</h2>\n` +
      (telemetry.length === 0
        ? `<p>The pinned ${e(tool)} sends no telemetry: nothing is turned off.</p>`
        : `<p>Turned off in the agent's environment:</p>\n<ul>\n${telemetry
            .map((setting) => `<li><code>${e(setting)}</code></li>\n`)
            .join('')}</ul>`),
    `<h2 id="manual">Operating manual</h2>\n<p><a href="manual-${e(arm.name)}.html">The operating manual of the ` +
      `${e(arm.name)} arm</a>, given to its agent.</p>`,
    `<h2 id="rules">Rules</h2>\n` +
      (rules === undefined
        ? `<p>The scenario's rules are ${e(tool)}'s own configuration, applied by the setup: no rules generator.</p>`
        : `<p>Written to <code>${e(rules.path)}</code>: ${e(rules.description)}.</p>`),
    `<h2 id="docs-control">Docs control</h2>\n` +
      (controls.length === 0 || docs === undefined
        ? `<p>The ${e(arm.name)} arm has no docs control.</p>`
        : `<p>${controls.map((control) => `<code>${e(control)}</code>`).join(', ')}: the same agent with the ` +
          `${e(arm.name)} arm's configuration rendered as documentation, without the harness. Kept from the ` +
          `configuration: ${docs.kept.map((path) => `<code>${e(path)}/</code>`).join(', ')}.</p>\n` +
          '<table>\n<thead><tr><th>Content</th><th>Rendered</th><th>Why</th></tr></thead>\n<tbody>\n' +
          docs.declaration
            .map(
              (row) =>
                `<tr><td>${renderMarkdown(row.kind).html.replace(/^<p>|<\/p>\n?$/g, '')}</td>` +
                `<td>${row.rendered ? 'yes' : 'no'}</td><td>${e(row.why)}</td></tr>\n`,
            )
            .join('') +
          '</tbody>\n</table>'),
    `<h2 id="identity">Git identity</h2>\n<p>Every arm commits as the same git identity, “Benchmark Approver” ` +
      `(adr-003, decision 7). In a competitor arm it carries no approval authority: it is only a name.</p>`,
  ];
  if (tool === 'speckit') {
    parts.push(
      `<h2 id="bundle">Bundle</h2>\n<p>The Spec Kit bundle resolves its dependencies when it is built; their ` +
        `digests are in its <code>SHA256SUMS</code>, and the run installs only from the bundle.</p>`,
    );
  }
  return parts.join('\n') + '\n';
}

function listDirectories(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => isDirectory(join(dir, name)))
        .sort()
    : [];
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
      .filter((arm) => isDirectory(join(dir, 'arms', arm)))
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
      const notice = renderMarkdown(readFileSync(join(licences, 'NOTICE.md'), 'utf8'), {
        resolve: (target) => (Object.hasOwn(rename, target) ? rename[target] : undefined),
      });
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

/** Whether `path` is a directory: false for a file, and for a link that leads nowhere. */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
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
          // `harnesses` is keyed by arm (REQ-FMT-01): each arm's own runs' commits (task-046's review).
          model.records.flatMap((record) =>
            record.arm === name && record.harness?.tool === harness.tool ? [record.harness.commit] : [],
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
  const cost = (groups: readonly Group[]) =>
    groups.reduce((sum, group) => sum + group.metrics.cost.cost_eur.values.reduce((a, b) => a + b, 0), 0);
  const main = model.categories.flatMap((category) =>
    category.scenarios.flatMap((scenario) => scenario.groups),
  );
  const bound = [...main, ...model.slices].flatMap((group) => group.metrics.cost.bound);
  const runs = (count: number) => `${count} aggregated run${count === 1 ? '' : 's'}`;
  const spending =
    `${runs(model.runs)} of ${e(model.model)} cost ${cost(main).toFixed(4)} EUR in all.` +
    (model.sliceRuns === 0
      ? ''
      : ` ${runs(model.sliceRuns)} of other models, reported apart, cost ${cost(model.slices).toFixed(4)} EUR.`) +
    ' Setup costs (M-K3) are not included.' +
    (bound.length === 0
      ? ''
      : ` For ${bound.length} run${bound.length === 1 ? '' : 's'} the cost is a bound, not a report: ${bound.map(e).join(', ')}.`);
  return (
    '<h3 id="pins">Pins</h3>\n<table>\n<tbody>\n' +
    row('Agent', `${e(campaign.agent.name)} ${e(campaign.agent.version)}`) +
    row('Model', e(campaign.models.default)) +
    row(
      'Other models (slices)',
      slices.length === 0
        ? 'none'
        : slices
            .map(
              (slice) =>
                `${e(slice.model)} on ${slice.scenarios.map(e).join(', ')}, in ${slice.arms.map(e).join(', ')}, ` +
                `${slice.repetitions} repetition${slice.repetitions === 1 ? '' : 's'} each`,
            )
            .join('<br>'),
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
