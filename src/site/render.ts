import type { Category } from '../core/index.js';
import type { Group, Tally } from '../results/index.js';

import type { CategoryRow, MetricRow, ScenarioRow, SiteModel } from './model.js';
import { CATEGORY_MAP, formatDelta, formatFigure, headlineSentence, notCoveredSentence } from './rules.js';
import type { ArmValue } from './model.js';
import type { Comparison, MetricId, Summary } from './rules.js';

/**
 * The site's pages as text (REQ-RES-02 and REQ-RES-03 as amended in 1.20, task-045): static HTML and one
 * stylesheet, no script. Every value from the aggregate or a scenario is escaped. No date: the same
 * model gives the same bytes (REQ-NFR-05).
 */

/** The goals of experiment design §1, by category: the name, the question, and the release that covers it. */
export const CATEGORY_GOALS: Readonly<Record<Category, { name: string; question: string; release: string }>> =
  {
    A: {
      name: 'Inception & Specification',
      question: 'Does the harness improve turning ambiguous input into requirements?',
      release: 'v0.3',
    },
    B: {
      name: 'Planning & Management',
      question: 'Does the harness produce plans that another session can execute?',
      release: 'v0.3',
    },
    C: {
      name: 'Development',
      question: 'Does the harness improve how well an agent implements a specification?',
      release: 'v0.1',
    },
    D: {
      name: 'Maintenance & Quality',
      question: 'Does the harness improve finding and fixing defects without regressions?',
      release: 'v0.1',
    },
    E: {
      name: 'Governance & Compliance',
      question: 'Does the harness keep the work within declared rules?',
      release: 'v0.1',
    },
    F: {
      name: 'Knowledge & Continuity',
      question: 'Does the harness carry decisions and domain knowledge across fresh sessions?',
      release: 'v0.1',
    },
    G: {
      name: 'Collaboration',
      question: 'Does the harness reduce conflicts between parallel agents?',
      release: 'v1.0',
    },
  };

const NOT_COVERED = 'not covered in this campaign';

/** Escape every character HTML gives a meaning to. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const e = escapeHtml;

/** A page: its title, its body, and how far it sits below `site/` (for the stylesheet's path). */
function page(title: string, body: string, depth: number): string {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    `<title>${e(title)}</title>\n<link rel="stylesheet" href="${'../'.repeat(depth)}style.css">\n</head>\n` +
    `<body>\n<main>\n${body}</main>\n</body>\n</html>\n`
  );
}

/** The page's file name of a category. */
export function categoryFile(category: Category): string {
  return `category-${category.toLowerCase()}.html`;
}

function title(model: SiteModel): string {
  return `WingFoil Benchmark — campaign ${model.campaign}, execution ${model.execution}`;
}

/** A value's `n`, its `preliminary` badge at n = 1, and its range from n = 3 (experiment design §4.6). */
function nOf(metric: MetricId, summary: Summary): string {
  const badge = summary.n === 1 ? ' <span class="badge">preliminary</span>' : '';
  const range =
    summary.n >= 3
      ? ` <span class="range">range ${e(`${formatFigure(metric, summary.min)}–${formatFigure(metric, summary.max)}`)}</span>`
      : '';
  return `<span class="n">n = ${summary.n}</span>${badge}${range}`;
}

function valueHtml(metric: MetricId, value: ArmValue): string {
  if (value.summary === undefined) return '<div class="value">not measured</div>';
  const figure = `${e(formatFigure(metric, value.summary.mean))} ${nOf(metric, value.summary)}`;
  const comparison = value.comparison;
  if (comparison === undefined) return `<div class="value">${figure}</div>`;
  const certainty =
    comparison.certainty === 'preliminary' ? '' : ` <span class="certainty">${comparison.certainty}</span>`;
  return (
    `<div class="value">${figure} <span class="delta">${e(formatDelta(metric, comparison.delta))}</span> ` +
    `${outcomeHtml(comparison)}${certainty}</div>`
  );
}

/** Wins, losses and ties in one markup: the same element and class, told apart by a word and a symbol. */
function outcomeHtml(comparison: Comparison): string {
  const symbol = { better: '▲', worse: '▼', same: '=' }[comparison.outcome];
  return `<span class="outcome" data-outcome="${comparison.outcome}">${symbol} ${comparison.outcome}</span>`;
}

function tallies(values: readonly Tally[]): string {
  return values.map((tally) => `${tally.passed}/${tally.total}`).join(', ');
}

/** A group's hold-out final counts, marked; or that the hold-out was not scored. */
function holdoutHtml(group: Group | undefined): string {
  if (group === undefined) return '';
  const holdout = group.metrics.holdout;
  if (!holdout.scored) return '<div class="value"><span class="holdout">hold-out</span> not scored</div>';
  return `<div class="value"><span class="holdout">hold-out</span> ${e(tallies(holdout.final.m_q1.values))}</div>`;
}

/** A group's losses (REQ-SCO-10): each run, and why — an expected failure names the missing capability. */
function lossesHtml(group: Group | undefined): string {
  if (group === undefined || group.losses.length === 0) return '';
  const items = group.losses.map((loss) => `${e(shortRun(loss.run))}: ${e(loss.reason)}`).join('; ');
  return `<div class="value losses">loss${group.losses.length === 1 ? '' : 'es'}: ${items}</div>`;
}

function shortRun(run: string): string {
  return run.split('/').at(-1) ?? run;
}

function categoryHeading(category: Category): string {
  return `${category} — ${CATEGORY_GOALS[category].name}`;
}

/** One category's row of the landing page: all of it in one `<tr>`. */
function rowHtml(model: SiteModel, row: CategoryRow): string {
  const head = `<th scope="row"><a href="${categoryFile(row.category)}">${e(categoryHeading(row.category))}</a></th>`;
  if (row.scenarios.length === 0) {
    return `<tr id="category-${row.category}" class="not-covered">${head}<td colspan="${model.arms.length + 2}">${NOT_COVERED}</td></tr>\n`;
  }
  const scenarios = row.scenarios
    .map(
      (scenario) => `<div class="value">${e(`${scenario.scenario.id}@${scenario.scenario.version}`)}</div>`,
    )
    .join('');
  const metricNames = row.scenarios
    .map((scenario) =>
      scenario.metrics.length === 0
        ? '<div class="value">no metric of the category map yet</div>'
        : scenario.metrics.map((metric) => `<div class="value">${metric.entry.id}</div>`).join('') +
          '<div class="value">hold-out M-Q1</div>',
    )
    .join('');
  const cells = model.arms
    .map((arm) => {
      const content = row.scenarios.map((scenario) => armCell(scenario, arm)).join('');
      return `<td>${content}</td>`;
    })
    .join('');
  return `<tr id="category-${row.category}">${head}<td>${scenarios}</td><td>${metricNames}</td>${cells}</tr>\n`;
}

function armCell(scenario: ScenarioRow, arm: string): string {
  const group = scenario.groups.find((candidate) => candidate.arm === arm);
  const metrics = scenario.metrics
    .map((metric: MetricRow) =>
      valueHtml(metric.entry.id, metric.values.find((v) => v.arm === arm) ?? { arm }),
    )
    .join('');
  return metrics + (scenario.metrics.length === 0 ? '' : holdoutHtml(group)) + lossesHtml(group);
}

function headlines(model: SiteModel, emphasis: (text: string) => string): string[] {
  return model.arms
    .filter((arm) => arm !== 'baseline')
    .map((arm) =>
      headlineSentence(
        arm,
        model.comparisons.filter((comparison) => comparison.arm === arm),
        emphasis,
      ),
    );
}

/** The headline sentences in plain text, one per arm but the baseline, then the categories not covered. */
export function plainHeadlines(model: SiteModel): string[] {
  const gaps = notCoveredSentence(notCovered(model));
  return [...headlines(model, (text) => text), ...(gaps === '' ? [] : [gaps])];
}

function notCovered(model: SiteModel): Category[] {
  return model.categories.filter((row) => row.scenarios.length === 0).map((row) => row.category);
}

const CHART = { width: 640, height: 220, top: 20, bottom: 50, left: 40, bar: 28, gap: 6, groupGap: 28 };

/**
 * The landing page's one chart (the approver's choice 3): M-Q1 on the final snapshot, per covered
 * category's scenario, a bar per arm with its range as a whisker, its value as text and its `n` beneath.
 * The arms are told apart by label and pattern as well as colour.
 */
function chartSvg(model: SiteModel): string {
  const scenarios = model.categories.flatMap((row) =>
    row.scenarios.map((scenario) => ({ category: row.category, scenario })),
  );
  const plot = CHART.height - CHART.top - CHART.bottom;
  const groupWidth = model.arms.length * (CHART.bar + CHART.gap);
  const width = Math.max(CHART.width, CHART.left + scenarios.length * (groupWidth + CHART.groupGap));
  const y = (share: number) => CHART.top + plot * (1 - share);
  const parts: string[] = [
    // Each arm but the first also gets its own hatching: never told apart by colour alone.
    '<defs>',
    ...model.arms
      .slice(1)
      .map(
        (_, index) =>
          `<pattern id="hatch-${index + 1}" width="6" height="6" patternUnits="userSpaceOnUse" ` +
          `patternTransform="rotate(${45 * (index + 1)})"><rect class="arm-${index + 1}" width="6" height="6"/>` +
          '<line class="hatch" x1="0" y1="0" x2="0" y2="6"/></pattern>',
      ),
    '</defs>',
  ];
  parts.push(
    `<line class="axis" x1="${CHART.left}" y1="${y(0)}" x2="${width}" y2="${y(0)}"/>`,
    `<text class="tick" x="${CHART.left - 4}" y="${y(1) + 4}" text-anchor="end">100%</text>`,
    `<text class="tick" x="${CHART.left - 4}" y="${y(0.5) + 4}" text-anchor="end">50%</text>`,
    `<text class="tick" x="${CHART.left - 4}" y="${y(0) + 4}" text-anchor="end">0%</text>`,
  );
  scenarios.forEach(({ category, scenario }, index) => {
    const x0 = CHART.left + CHART.groupGap / 2 + index * (groupWidth + CHART.groupGap);
    const m_q1 = scenario.metrics.find((metric) => metric.entry.id === 'M-Q1');
    model.arms.forEach((arm, armIndex) => {
      const x = x0 + armIndex * (CHART.bar + CHART.gap);
      const summary = m_q1?.values.find((value) => value.arm === arm)?.summary;
      const label = `<text class="arm" x="${x + CHART.bar / 2}" y="${y(0) + 14}" text-anchor="middle">${e(arm)}</text>`;
      if (summary === undefined) {
        parts.push(
          label,
          `<text class="n" x="${x + CHART.bar / 2}" y="${y(0) + 26}" text-anchor="middle">not measured</text>`,
        );
        return;
      }
      const top = y(summary.mean);
      parts.push(
        `<rect class="bar${armIndex === 0 ? ' arm-0' : ''}"${armIndex === 0 ? '' : ` fill="url(#hatch-${armIndex})"`} x="${x}" y="${round(top)}" width="${CHART.bar}" height="${round(y(0) - top)}"/>`,
        ...(summary.n >= 2
          ? [
              `<line class="whisker" x1="${x + CHART.bar / 2}" y1="${round(y(summary.max))}" x2="${x + CHART.bar / 2}" y2="${round(y(summary.min))}"/>`,
            ]
          : []),
        `<text class="figure" x="${x + CHART.bar / 2}" y="${round(top - 4)}" text-anchor="middle">${e(formatFigure('M-Q1', summary.mean))}</text>`,
        label,
        `<text class="n" x="${x + CHART.bar / 2}" y="${y(0) + 26}" text-anchor="middle">n = ${summary.n}</text>`,
      );
    });
    parts.push(
      `<text class="scenario" x="${x0 + groupWidth / 2}" y="${y(0) + 42}" text-anchor="middle">${e(`${category} · ${scenario.scenario.id}@${scenario.scenario.version}`)}</text>`,
    );
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="chart" viewBox="0 0 ${width} ${CHART.height}" role="img" ` +
    `aria-label="M-Q1 on the final snapshot, per arm and scenario">\n${parts.join('\n')}\n</svg>`
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The landing page (REQ-RES-03 as amended in 1.20). */
export function landingPage(model: SiteModel): string {
  const strong = (text: string) => `<strong>${e(text)}</strong>`;
  const gaps = notCoveredSentence(notCovered(model));
  const body =
    `<h1>${e(title(model))}</h1>\n` +
    `<p class="framing">Harness, not model: every arm runs the same agent with the same model, ${strong(model.model)}. ` +
    `Only the harness around it differs: ${e(model.arms.join(', '))}.</p>\n` +
    headlines(model, strong)
      .map((sentence) => `<p class="headline">${sentence}</p>\n`)
      .join('') +
    (gaps === '' ? '' : `<p class="gaps">${e(gaps)}</p>\n`) +
    `<figure>\n${chartSvg(model)}\n<figcaption>M-Q1: the share of public hidden tests passed on the final snapshot, ` +
    `per arm, with the range of its runs and their n.</figcaption>\n</figure>\n` +
    '<table class="categories">\n<thead><tr><th scope="col">Category</th><th scope="col">Scenario</th>' +
    '<th scope="col">Metric</th>' +
    model.arms.map((arm) => `<th scope="col">${e(arm)}</th>`).join('') +
    '</tr></thead>\n<tbody>\n' +
    model.categories.map((row) => rowHtml(model, row)).join('') +
    '</tbody>\n</table>\n' +
    `<p class="legend">Each value is the mean of its runs, with its n; n = 1 is preliminary; a range is shown from ` +
    `n = 3. Deltas are against the baseline. ` +
    `<a href="method.html">How to read these results</a>.</p>\n` +
    `<p class="meta">Campaign ${e(model.campaign)}, execution ${model.execution}: ${model.runs} run${model.runs === 1 ? '' : 's'}.</p>\n`;
  return page(title(model), body, 2);
}

/** One category's page: its goal, its scenarios with each arm's values and runs, or that it is not covered. */
export function categoryPage(model: SiteModel, row: CategoryRow): string {
  const goal = CATEGORY_GOALS[row.category];
  let body =
    `<p><a href="index.html">← ${e(title(model))}</a></p>\n` +
    `<h1>${e(categoryHeading(row.category))}</h1>\n<p class="question">${e(goal.question)}</p>\n`;
  if (row.scenarios.length === 0) {
    body += `<p>${NOT_COVERED}. Planned from release ${e(goal.release)}.</p>\n`;
  }
  for (const scenario of row.scenarios) body += scenarioSection(scenario);
  if (row.secondary.length > 0) {
    body +=
      '<h2>Scenarios that also touch this category</h2>\n<ul>\n' +
      row.secondary
        .map(
          (info) =>
            `<li>${e(`${info.id}@${info.version}`)}: primary category <a href="${categoryFile(info.primary)}">${info.primary}</a></li>\n`,
        )
        .join('') +
      '</ul>\n';
  }
  const slices = model.slices.filter((group) =>
    row.scenarios.some((s) => s.scenario.id === group.scenario && s.scenario.version === group.version),
  );
  if (slices.length > 0) {
    body +=
      '<h2>Other models (slices)</h2>\n<p>Reported apart from the campaign’s model, and never in its comparisons.</p>\n<ul>\n' +
      slices
        .map((group) => {
          const value = group.metrics.m_q1.final.m_q1;
          return `<li>${e(`${group.arm}, ${group.model}`)}: M-Q1 ${e(tallies(value.values))} (n = ${group.n})</li>\n`;
        })
        .join('') +
      '</ul>\n';
  }
  return page(`${categoryHeading(row.category)} — ${title(model)}`, body, 2);
}

function scenarioSection(scenario: ScenarioRow): string {
  const name = `${scenario.scenario.id}@${scenario.scenario.version}`;
  let html = `<h2>${e(name)}</h2>\n`;
  for (const metric of scenario.metrics) {
    html += `<h3>${metric.entry.id}: ${e(metric.entry.label)} (${metric.entry.better} is better)</h3>\n<ul>\n`;
    for (const value of metric.values)
      html += `<li>${e(value.arm)}: ${valueHtml(metric.entry.id, value)}</li>\n`;
    html += '</ul>\n';
  }
  html += '<h3>Each suite on the final snapshot</h3>\n<ul>\n';
  for (const group of scenario.groups) {
    const suites = group.metrics.m_q1.final.suites
      .map((suite) => `${suite.id} ${tallies(suite.value.values)}`)
      .join('; ');
    html += `<li>${e(group.arm)}: ${e(suites)}</li>\n`;
  }
  html += '</ul>\n<h3>Hold-out</h3>\n<ul>\n';
  for (const group of scenario.groups) html += `<li>${e(group.arm)}: ${holdoutHtml(group)}</li>\n`;
  html += '</ul>\n<h3>Runs</h3>\n<ul>\n';
  for (const group of scenario.groups) {
    for (const run of group.runs) {
      const loss = group.losses.find((candidate) => candidate.run === run);
      html +=
        `<li><code>${e(run)}</code> — open with <code>bench run show ${e(run)}</code>` +
        `${loss === undefined ? '' : ` — loss: ${e(loss.reason)}`}</li>\n`;
    }
  }
  html += '</ul>\n';
  return html;
}

/**
 * The method page: what task-045's rules are. task-046 writes the rest of it (F5.8): arms, controls,
 * protocol, approver policy, validity threats, pins and budget.
 */
export function methodPage(model: SiteModel): string {
  const map = (Object.entries(CATEGORY_MAP) as [Category, (typeof CATEGORY_MAP)['C']][])
    .map(
      ([category, entries]) =>
        `<tr><th scope="row">${e(categoryHeading(category))}</th><td>${entries
          .map((entry) => `${entry.id}: ${e(entry.label)} (${entry.better} is better)`)
          .join('<br>')}</td></tr>\n`,
    )
    .join('');
  const body =
    `<p><a href="index.html">← ${e(title(model))}</a></p>\n<h1>How to read the results</h1>\n` +
    `<p>Campaign ${e(model.campaign)}, execution ${model.execution}, model ${e(model.model)}.</p>\n` +
    '<h2>Categories and their metrics</h2>\n' +
    '<p>Each category is measured by fixed metrics, from its goal in the experiment design. A category is ' +
    'covered when a scenario of the campaign has it as its primary category.</p>\n' +
    `<table class="map">\n<tbody>\n${map}</tbody>\n</table>\n` +
    '<p>M-D1 and M-D2 are not reported apart in v0.1: S2’s defect tests are counted in M-Q1, and each ' +
    'suite’s tally is on category D’s page.</p>\n' +
    '<h2>Comparisons</h2>\n<ul>\n' +
    '<li>Each arm is compared with the baseline, on the same scenario version and model, metric by metric.</li>\n' +
    '<li>A value is the mean of its runs’ figures, shown with its n, and with its range from n = 3.</li>\n' +
    '<li>An arm is <em>better</em> or <em>worse</em> when the means differ, in the metric’s direction, and the ' +
    '<em>same</em> when they are equal. Wins, losses and ties are shown alike.</li>\n' +
    '<li>A difference is <em>beyond variance</em> only when both arms have n ≥ 3 and their ranges do not overlap; ' +
    'otherwise it is <em>within variance</em>, or <em>preliminary</em> when either arm has a single run.</li>\n' +
    '<li>A metric an arm did not measure reads “not measured”, and is no comparison.</li>\n' +
    '<li>A run that did not reach its final snapshot, and an expected failure, count as losses.</li>\n' +
    '</ul>\n<h2>The headline</h2>\n' +
    '<p>One sentence per arm, generated from the comparisons alone: how many are better, worse and the same, ' +
    'across which categories, and where a single run makes them preliminary. Nothing on the site is written ' +
    'by hand about a result.</p>\n' +
    '<h2>Hold-out results</h2>\n' +
    '<p>Hidden tests kept outside the public repository are reported as counts only, marked hold-out, apart ' +
    'from the public ones. Their content is never published.</p>\n';
  return page(`Method — ${title(model)}`, body, 2);
}

/** `site/index.html`: a link to the execution built last, without a script. */
export function rootPage(model: SiteModel): string {
  const target = `${model.campaign}/${model.execution}/`;
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    `<meta http-equiv="refresh" content="0; url=${e(target)}">\n<title>WingFoil Benchmark</title>\n` +
    '<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<main>\n' +
    `<p><a href="${e(target)}">${e(title(model))}</a></p>\n</main>\n</body>\n</html>\n`
  );
}

/** The one stylesheet. Nothing in it tells a win from a loss (REQ-RES-03): only the words do. */
export const STYLE = `:root { color-scheme: light dark; --ink: #1d1d1f; --paper: #ffffff; --line: #c7c7cc; --arm-0: #8e8e93; --arm-1: #3a6ea5; --arm-2: #a5673a; --arm-3: #5a8a3a; }
@media (prefers-color-scheme: dark) { :root { --ink: #f2f2f7; --paper: #1c1c1e; --line: #48484a; } }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 72rem; margin: 0 auto; padding: 1rem; }
table { border-collapse: collapse; width: 100%; }
th, td { border-top: 1px solid var(--line); padding: 0.5rem; text-align: left; vertical-align: top; }
.headline { font-size: 1.15rem; }
.value { white-space: nowrap; }
.n, .range, .certainty, .delta, .holdout { font-size: 0.85rem; }
.badge, .holdout { border: 1px solid var(--line); border-radius: 0.25rem; padding: 0 0.25rem; }
.outcome { font-weight: 600; }
.chart { width: 100%; height: auto; }
.chart text { fill: var(--ink); font-size: 11px; }
.axis, .whisker { stroke: var(--ink); stroke-width: 1; }
.bar { stroke: var(--ink); stroke-width: 1; }
.hatch { stroke: var(--paper); stroke-width: 2; }
.arm-0 { fill: var(--arm-0); }
.arm-1 { fill: var(--arm-1); }
.arm-2 { fill: var(--arm-2); }
.arm-3 { fill: var(--arm-3); }
@media (max-width: 40rem) { table, tbody, tr, th, td { display: block; } }
`;
