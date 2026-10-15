import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { fail, ok } from '../core/index.js';
import type { Issue, Result } from '../core/index.js';
import { COMPARISONS } from '../results/index.js';
import type { CampaignComparison, ComparisonRow, MetricId } from '../results/index.js';

import { escapeHtml as e, page } from './render.js';
import { formatDelta, formatFigure } from './rules.js';

/**
 * A comparison file's shape (REQ-CLI-12, task-083), every field the page reads checked: each execution as a campaign's
 * (`<campaign-id>/<n>`), since the page is named after the earlier one and must stay inside the site (task-084's
 * review).
 */
const executionShape = z
  .object({
    campaign: z.string().regex(/^[0-9a-f]{12}$/),
    execution: z.number().int().positive(),
    model: z.string(),
  })
  .loose();
const valueShape = z.object({ n: z.number(), mean: z.number(), min: z.number(), max: z.number() });
const sideShape = z.union([
  z.object({
    arm: valueShape,
    baseline: valueShape,
    delta: z.number(),
    certainty: z.enum(['beyond variance', 'within variance', 'preliminary']),
  }),
  z.object({ note: z.string(), arm: valueShape.optional() }),
]);
const groupShape = { scenario: z.string(), version: z.string(), arm: z.string(), model: z.string() };
const comparisonShape = z
  .object({
    // 2 adds m_r_across (1.32), which the page does not show; a version-1 comparison still reads.
    comparison_version: z.union([z.literal(1), z.literal(2)]),
    earlier: executionShape,
    newer: executionShape,
    pins_differ: z.array(z.object({ pin: z.string(), earlier: z.string(), newer: z.string() })),
    rows: z.array(
      z.object({
        ...groupShape,
        category: z.string(),
        metric: z.enum(['M-Q1', 'M-K1', 'M-D3', 'M-E1', 'M-F1']),
        cross_model: z.boolean(),
        earlier: sideShape,
        newer: sideShape,
        change: z.number().optional(),
      }),
    ),
    not_compared: z.array(z.object({ ...groupShape, reason: z.string() })),
    only_in: z.array(z.object({ ...groupShape, execution: z.string() })),
  })
  .loose();

/**
 * The comparisons whose newer side is execution `<campaign>/<execution>` (REQ-RES-02 as amended, REQ-CLI-12,
 * task-084): every `results/comparisons/<campaign>-<execution>/*.json`, in file-name order; none when there is none. A
 * file that cannot be read, or that names another newer execution, is refused, naming it.
 */
export function readComparisons(
  root: string,
  campaign: string,
  execution: number,
): Result<CampaignComparison[]> {
  const where = `results/${COMPARISONS}/${campaign}-${execution}`;
  const dir = join(root, where);
  if (!existsSync(dir)) return ok([]);
  const comparisons: CampaignComparison[] = [];
  const issues: Issue[] = [];
  for (const name of readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()) {
    const path = `${where}/${name}`;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    } catch (error) {
      issues.push({ path, message: `cannot be read: ${(error as Error).message}` });
      continue;
    }
    const shape = comparisonShape.safeParse(parsed);
    if (!shape.success) {
      issues.push({ path, message: 'is not a comparison this site reads' });
      continue;
    }
    const { newer, earlier } = shape.data;
    const expected = `${earlier.campaign}-${earlier.execution}.json`;
    if (name !== expected) {
      issues.push({
        path,
        message: `is named for another comparison than ${earlier.campaign}/${earlier.execution}: ${expected}`,
      });
      continue;
    }
    if (newer.campaign !== campaign || newer.execution !== execution) {
      issues.push({
        path,
        message: `compares ${newer.campaign}/${newer.execution} as the newer execution, not ${campaign}/${execution}`,
      });
      continue;
    }
    comparisons.push(parsed as CampaignComparison);
  }
  return issues.length > 0 ? fail(issues) : ok(comparisons);
}

/** The page of a comparison, beside its newer execution's pages: named after the earlier execution (REQ-RES-07). */
export function comparisonFile(comparison: CampaignComparison): string {
  return `compare-${comparison.earlier.campaign}-${comparison.earlier.execution}.html`;
}

/** Whether a comparison's default models differ (T14). */
export function crossModel(comparison: CampaignComparison): boolean {
  return comparison.earlier.model !== comparison.newer.model;
}

/** `campaign <id>, execution <n>`: how the pages name an execution. */
export function executionName(execution: { readonly campaign: string; readonly execution: number }): string {
  return `campaign ${execution.campaign}, execution ${execution.execution}`;
}

/** A value's range from n = 3, as the category pages show a value's (experiment design §4.6); `—` below. */
function range(metric: MetricId, value: { n: number; min: number; max: number }): string {
  return value.n >= 3 ? `${formatFigure(metric, value.min)}–${formatFigure(metric, value.max)}` : '—';
}

/** One side of a row: its delta, with the arm's and the baseline's n and its certainty; or its note and kept value. */
function sideHtml(metric: MetricId, side: ComparisonRow['earlier']): string {
  if ('note' in side) {
    const kept =
      side.arm === undefined
        ? ''
        : ` <span class="figure">${e(`${formatFigure(metric, side.arm.mean)} (n = ${side.arm.n})`)}</span>`;
    return `<span class="note">${e(side.note)}</span>${kept}`;
  }
  // The arm's n and the baseline's, then their ranges once either has three runs.
  const ranged = side.arm.n >= 3 || side.baseline.n >= 3;
  const n =
    `n = ${side.arm.n} / ${side.baseline.n}` +
    (ranged ? `, range ${range(metric, side.arm)} / ${range(metric, side.baseline)}` : '');
  return (
    `<span class="delta">${e(formatDelta(metric, side.delta))}</span> <span class="n">${e(n)}</span> ` +
    `<span class="certainty">${e(side.certainty)}</span>`
  );
}

/**
 * The comparison page (REQ-RES-07, task-084): the newer execution against the earlier, in the maintainer's order; the
 * pins that differ; one row per category, scenario version, arm and model, and metric, with each side's delta against
 * its own baseline (T7), its `n` and range, the change of the delta, and the cross-model mark (T14); then what was not
 * compared and what is on one side only. Static, escaped, no script (REQ-RES-02).
 */
export function comparisonPage(comparison: CampaignComparison): string {
  const { earlier, newer } = comparison;
  const heading = `${executionName(newer)} against ${executionName(earlier)}`;
  let body =
    `<p><a href="index.html">← ${e(executionName(newer))}</a></p>\n<h1>Comparison: ${e(heading)}</h1>\n` +
    // No date: only site/index.html holds one (REQ-RES-02 as amended; task-084's review).
    `<p class="meta">Newer: ${e(executionName(newer))}, on ${e(newer.model)}. Earlier: ` +
    `${e(executionName(earlier))}, on ${e(earlier.model)}. Compared in the order the maintainer ` +
    `chose. Across campaigns only deltas against each execution's own baseline are compared.</p>\n`;
  if (crossModel(comparison)) {
    body +=
      `<p class="cross-model-note"><strong>Cross-model:</strong> the two executions ran on different default models ` +
      `(${e(earlier.model)}, ${e(newer.model)}); their rows are marked and compare more than the harness.</p>\n`;
  }
  body += '<h2>Pins that differ</h2>\n';
  body +=
    comparison.pins_differ.length === 0
      ? '<p>None.</p>\n'
      : `<ul>\n${comparison.pins_differ.map((pin) => `<li>${e(`${pin.pin}: ${pin.earlier} → ${pin.newer}`)}</li>\n`).join('')}</ul>\n`;
  body += '<h2>Each arm against its own baseline</h2>\n';
  if (comparison.rows.length === 0) body += '<p>No row was compared.</p>\n';
  else {
    body +=
      '<div class="scroll">\n<table class="comparison">\n<thead><tr><th scope="col">Category</th>' +
      '<th scope="col">Scenario</th><th scope="col">Arm</th><th scope="col">Model</th><th scope="col">Metric</th>' +
      `<th scope="col">${e(executionName(earlier))}</th><th scope="col">${e(executionName(newer))}</th>` +
      '<th scope="col">Change</th></tr></thead>\n<tbody>\n';
    // Grouped by category, then scenario version, arm and model; each group's metrics in the category map's order.
    const groupOf = (row: ComparisonRow) => [
      row.category,
      `${row.scenario}@${row.version}`,
      row.arm,
      row.model,
    ];
    const rows = comparison.rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const [x, y] = [groupOf(a.row), groupOf(b.row)];
        const differs = x.findIndex((part, at) => part !== y[at]);
        return differs < 0 ? a.index - b.index : (x[differs] as string) < (y[differs] as string) ? -1 : 1;
      })
      .map(({ row }) => row);
    for (const row of rows) {
      const mark = row.cross_model ? ' <span class="cross-model">cross-model</span>' : '';
      const change =
        row.change === undefined
          ? ''
          : `<span class="change">${e(formatDelta(row.metric, row.change))}</span>`;
      body +=
        `<tr><td>${e(row.category)}</td><td>${e(`${row.scenario}@${row.version}`)}</td><td>${e(row.arm)}</td>` +
        `<td>${e(row.model)}${mark}</td><td>${e(row.metric)}</td><td>${sideHtml(row.metric, row.earlier)}</td>` +
        `<td>${sideHtml(row.metric, row.newer)}</td><td>${change}</td></tr>\n`;
    }
    body += '</tbody>\n</table>\n</div>\n';
  }
  body += '<h2>Not compared</h2>\n';
  body +=
    comparison.not_compared.length === 0
      ? '<p>None.</p>\n'
      : `<ul>\n${comparison.not_compared
          .map(
            (entry) =>
              // Under the heading "Not compared", the reason without its own "not compared: ".
              `<li>${e(`${entry.scenario}@${entry.version} ${entry.arm} (${entry.model}): ${entry.reason.replace(/^not compared: /, '')}`)}</li>\n`,
          )
          .join('')}</ul>\n`;
  body += '<h2>On one side only</h2>\n';
  body +=
    comparison.only_in.length === 0
      ? '<p>None.</p>\n'
      : `<ul>\n${comparison.only_in
          .map(
            (entry) =>
              `<li>${e(`${entry.scenario}@${entry.version} ${entry.arm} (${entry.model}): only in ${entry.execution}`)}</li>\n`,
          )
          .join('')}</ul>\n`;
  return page(`Comparison — ${heading}`, body, 2);
}
