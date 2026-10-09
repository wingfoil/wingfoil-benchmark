import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { campaignSchema, fail, ok, parseWith, readYamlFile } from '../core/index.js';
import type { Arm, CampaignFile, HistoryPort, Issue, Result } from '../core/index.js';

import { docsGeneratorOf, loadArm, rulesGeneratorOf } from '../arms/index.js';
import type { DocsGenerator } from '../arms/index.js';
import type { Group } from '../results/index.js';

import { renderMarkdown } from './markdown.js';
import { recordedArm, recordedManual } from './recorded.js';
import type { RecordedArm } from './recorded.js';
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
export async function methodPages(
  root: string,
  execution: string,
  model: SiteModel,
  history: HistoryPort,
): Promise<Result<MethodPages>> {
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
    const records = model.records.filter((record) => record.arm === arm);
    const recorded = [...new Set(records.flatMap((record) => record.manual?.sha256 ?? []))].sort();
    const present = existsSync(join(root, file));
    let text = present ? readFileSync(join(root, file), 'utf8') : undefined;
    // A manual changed or removed since its runs (an accepted contest, task-073): the one they ran with, from the
    // history. Runs that recorded two manuals (a change mid-execution) are refused, as before.
    if (recorded.length === 1 && (text === undefined || sha256(text) !== recorded[0])) {
      text = await recordedManual(root, arm, recorded[0] as string, history);
      if (text === undefined) {
        issues.push({
          path: file,
          message: present
            ? `differs from the manual its runs recorded (sha256:${recorded[0]}), and no commit of the repository holds it`
            : 'not found: its arm ran in this execution, and no commit of the repository holds the manual it ran with',
        });
        continue;
      }
    }
    if (text === undefined) {
      issues.push({ path: file, message: 'not found: its arm ran in this execution' });
      continue;
    }
    const hash = sha256(text);
    const other = recorded.filter((value) => value !== hash);
    if (other.length > 0) {
      issues.push({
        path: file,
        message: `(sha256:${hash}) differs from the manuals its runs recorded (sha256:${recorded.join(', sha256:')}): they recorded more than one`,
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
  const contests = readContests(root);
  if (!contests.ok) return contests;
  const setups = await setupPages(root, model, history, contests.value);
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

/** Where the contests are kept: written by the maintainer, read by the site (REQ-RES-02, REQ-RES-10). */
export const CONTESTS_FILE = 'site-content/contests.yaml';

const contestsSchema = z.strictObject({
  repository: z
    .string()
    .regex(/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/, 'must be https://github.com/<owner>/<repo>'),
  contests: z.array(
    z.strictObject({
      campaign: z.string().regex(/^[0-9a-f]{12}$/, 'must be a campaign id, 12 hex digits'),
      arm: z.string().min(1),
      issue: z.string().regex(/^https:\/\//, 'must be the https URL of its issue'),
      followed_by: z.string().regex(/^[0-9a-f]{12}\/[1-9]\d*$/, 'must be <campaign id>/<execution>'),
    }),
  ),
});

/** The contests file, read; none at all is no form and no contest, and one that is not one is refused, naming it. */
export type Contests = z.infer<typeof contestsSchema>;

function readContests(root: string): Result<Contests | undefined> {
  if (!existsSync(join(root, CONTESTS_FILE))) return ok(undefined);
  const read = readYamlFile(join(root, CONTESTS_FILE));
  if (!read.ok) return fail(read.issues.map((issue) => ({ ...issue, path: CONTESTS_FILE })));
  const parsed = parseWith(contestsSchema, read.value, CONTESTS_FILE);
  if (!parsed.ok) {
    return fail(
      parsed.issues.map((issue) => ({ path: CONTESTS_FILE, message: `${issue.path}: ${issue.message}` })),
    );
  }
  return ok(parsed.value);
}

/** What a setup page says of contests: where the form is, and the accepted contest of this campaign's arm, if any. */
export interface SetupContest {
  readonly form?: string;
  /** `linked`: this repository holds the followed execution's aggregated results, so the site can hold its pages. */
  readonly contested?: { readonly issue: string; readonly followedBy: string; readonly linked: boolean };
  /** The commit of the repository's history the arm was read from, when the working tree no longer holds it. */
  readonly asRanAt?: string;
}

/**
 * The setup page of each harness arm of the execution (REQ-RES-09, task-067), from the repository's `arms/<arm>/` as
 * the manual pages are, as its runs recorded it (their `arm_digest`, REQ-FMT-13): the working tree when it still is,
 * otherwise the newest commit of the history whose arm is (task-073), so that a rebuild after an accepted contest shows
 * the setup that ran (REQ-RES-02). An arm whose runs recorded no digest (before v0.2) has none; an arm that neither
 * holds is refused. A control (an arm without a harness) has none either. Each page links the contest form and, for a
 * contested arm, its contest and the campaign that followed (REQ-RES-10).
 */
async function setupPages(
  root: string,
  model: SiteModel,
  history: HistoryPort,
  contests: Contests | undefined,
): Promise<Result<ReadonlyMap<string, string>>> {
  const armsRoot = join(root, 'arms');
  const pages = new Map<string, string>();
  const issues: Issue[] = [];
  const digestsOf = (arm: string) =>
    [...new Set(model.records.filter((r) => r.arm === arm).flatMap((r) => r.armDigest ?? []))].sort();
  // Each arm as it ran: the working tree's when it loads and digests to the recorded value, otherwise the history's.
  const arms = new Map<string, { arm: Arm; found?: RecordedArm }>();
  for (const name of model.arms) {
    const recorded = digestsOf(name);
    const loaded = loadArm(armsRoot, name);
    if (recorded.length !== 1) {
      if (loaded.ok) arms.set(name, { arm: loaded.value });
      else issues.push(...loaded.issues.map((issue) => ({ ...issue, path: `arms/${name}/${issue.path}` })));
      continue;
    }
    const found = await recordedArm(root, name, recorded[0] as string, history);
    if (found === undefined) {
      if (loaded.ok && loaded.value.requires === undefined) arms.set(name, { arm: loaded.value });
      else
        issues.push({
          path: `arms/${name}`,
          message: `differs from the arm its runs recorded (${recorded[0] ?? ''}), and no commit of the repository holds it`,
        });
      continue;
    }
    const fromFound = found.source === 'tree' && loaded.ok ? loaded : loadArm(join(found.dir, '..'), name);
    if (fromFound.ok) arms.set(name, { arm: fromFound.value, found });
    else issues.push(...fromFound.issues.map((issue) => ({ ...issue, path: `arms/${name}/${issue.path}` })));
  }
  const form =
    contests === undefined ? undefined : `${contests.repository}/issues/new?template=contest-setup.yml`;
  for (const { arm, found } of arms.values()) {
    if (arm.requires === undefined) continue;
    if (digestsOf(arm.name).length === 0) continue;
    if (digestsOf(arm.name).length > 1) {
      issues.push({
        path: `arms/${arm.name}`,
        message: `its runs recorded more than one digest (${digestsOf(arm.name).join(', ')}): the setup that ran is not one`,
      });
      continue;
    }
    const contest = contests?.contests.find((c) => c.campaign === model.campaign && c.arm === arm.name);
    const followed =
      contest !== undefined && existsSync(join(root, 'results', contest.followed_by, 'aggregate.json'));
    try {
      pages.set(
        `setup-${arm.name}.html`,
        materialPage(
          `Setup: ${arm.name}`,
          setupHtml(
            arm,
            readFileSync(arm.setupPath, 'utf8'),
            [...arms.values()]
              .filter(({ arm: control }) => control.docsOf === arm.name)
              .map(({ arm: c }) => c.name),
            {
              ...(form === undefined ? {} : { form }),
              ...(contest === undefined
                ? {}
                : { contested: { issue: contest.issue, followedBy: contest.followed_by, linked: followed } }),
              ...(found?.source === 'history' ? { asRanAt: found.commit } : {}),
            },
          ),
        ),
      );
    } finally {
      if (found?.source === 'history') found.cleanup();
    }
  }
  return issues.length > 0 ? fail(issues) : ok(pages);
}

/** The body of an arm's setup page: `script` is its setup script, `controls` the docs controls of it that ran. */
export function setupHtml(
  arm: Arm,
  script: string,
  controls: readonly string[],
  contest: SetupContest = {},
): string {
  const tool = arm.requires ?? '';
  const telemetry = arm.telemetryOff ?? [];
  const rules = rulesGeneratorOf(tool);
  const docs = docsGeneratorOf(tool);
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
    `<h2 id="docs-control">Docs control</h2>\n` + docsControlHtml(arm, controls, docs),
    `<h2 id="identity">Git identity</h2>\n<p>Every arm commits as the same git identity, “Benchmark Approver” ` +
      `(adr-003, decision 7). ` +
      (tool === 'wingfoil'
        ? `In the wingfoil arm it is the approver member the setup adds to the project's team: WingFoil accepts the ` +
          `agent's approvals under it, once the neutral approver has replied (REQ-RUN-17). In a competitor arm it ` +
          `carries no approval authority.</p>`
        : `In the ${e(arm.name)} arm, a competitor arm, it carries no approval authority: it is only a name.</p>`),
  ];
  parts.push(contestHtml(contest));
  if (tool === 'speckit') {
    parts.push(
      `<h2 id="bundle">Bundle</h2>\n<p>The Spec Kit bundle resolves its dependencies when it is built; their ` +
        `digests are in its <code>SHA256SUMS</code>, and the run installs only from the bundle.</p>`,
    );
  }
  return parts.join('\n') + '\n';
}

/** The contest section (REQ-RES-10): the form, and for a contested arm its issue and the campaign that followed. */
function contestHtml(contest: SetupContest): string {
  const asRan =
    contest.asRanAt === undefined
      ? ''
      : `<p>This is the setup as it ran, read from commit <code>${e(contest.asRanAt.slice(0, 12))}</code> of the ` +
        "repository: the arm's files have changed since.</p>\n";
  const contested =
    contest.contested === undefined
      ? ''
      : `<p>This setup was contested in <a href="${e(contest.contested.issue)}">${e(contest.contested.issue)}</a>, ` +
        'and the correction ran as campaign ' +
        (contest.contested.linked
          ? `<a href="../../../${e(contest.contested.followedBy)}/index.html">${e(contest.contested.followedBy)}</a>`
          : `<code>${e(contest.contested.followedBy)}</code>`) +
        '.</p>\n';
  const form =
    contest.form === undefined
      ? '<p>This site names no repository to contest this setup in.</p>'
      : `<p><a href="${e(contest.form)}">Contest this setup</a>: say which step is not as the tool's official ` +
        'documentation says, and how to correct it. An accepted correction runs as a new campaign; this one stays ' +
        'published.</p>';
  return `<h2 id="contest">Contest</h2>\n${asRan}${contested}${form}`;
}

function docsControlHtml(arm: Arm, controls: readonly string[], docs: DocsGenerator | undefined): string {
  if (docs === undefined) return `<p>The ${e(arm.requires ?? '')} harness has no docs generator yet.</p>`;
  const named =
    controls.length === 0
      ? `<p>No docs control of the ${e(arm.name)} arm ran in this execution. Its docs control would get the ` +
        `${e(arm.name)} arm's configuration rendered as documentation, without the harness.`
      : `<p>${controls.map((control) => `<code>${e(control)}</code>`).join(', ')}: the same agent with the ` +
        `${e(arm.name)} arm's configuration rendered as documentation, without the harness.`;
  return (
    `${named} Kept from the configuration: ${docs.kept.map((path) => `<code>${e(path)}/</code>`).join(', ')}.</p>\n` +
    '<table>\n<thead><tr><th>Content</th><th>Rendered</th><th>Why</th></tr></thead>\n<tbody>\n' +
    docs.declaration
      .map(
        (row) =>
          `<tr><td>${renderMarkdown(row.kind).html.replace(/^<p>|<\/p>\n?$/g, '')}</td>` +
          `<td>${row.rendered ? 'yes' : 'no'}</td><td>${e(row.why)}</td></tr>\n`,
      )
      .join('') +
    '</tbody>\n</table>'
  );
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
  const unpriced = [...main, ...model.slices].flatMap((group) => group.metrics.cost.unpriced ?? []);
  const runs = (count: number) => `${count} aggregated run${count === 1 ? '' : 's'}`;
  const spending =
    `${runs(model.runs)} of ${e(model.model)} cost ${cost(main).toFixed(4)} EUR in all.` +
    (model.sliceRuns === 0
      ? ''
      : ` ${runs(model.sliceRuns)} of other models, reported apart, cost ${cost(model.slices).toFixed(4)} EUR.`) +
    ' Setup costs (M-K3) are not included.' +
    (bound.length === 0
      ? ''
      : ` For ${bound.length} run${bound.length === 1 ? '' : 's'} the cost is a bound, not a report: ${bound.map(e).join(', ')}.`) +
    // bug-016: a cost the agent could not price is not the model's list price.
    (unpriced.length === 0
      ? ''
      : ` For ${unpriced.length} run${unpriced.length === 1 ? '' : 's'} the agent could not price the cost, so it is ` +
        `not the model's list price: ${unpriced.map(e).join(', ')}.`);
  return (
    '<h3 id="pins">Pins</h3>\n<table>\n<tbody>\n' +
    row('Agent', `${e(campaign.agent.name)} ${e(campaign.agent.version)}`) +
    row('Model', e(campaign.models.default)) +
    // dl-015: the effort each model ran at, as the campaign pinned it.
    row(
      'Effort',
      campaign.agent.effort === undefined || Object.keys(campaign.agent.effort).length === 0
        ? 'not pinned'
        : Object.entries(campaign.agent.effort)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([model, level]) => `${e(model)}: ${e(level)}`)
            .join(', '),
    ) +
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
