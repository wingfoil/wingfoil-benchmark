import type { ParityCell, ParityEntry, ParitySection } from '../results/index.js';

import { escapeHtml as e, page, PARITY_HEADING } from './render.js';

/**
 * The parity page (REQ-RES-12, dl-032, task-121): the weak model with a harness against the strong model without it,
 * from the aggregate's `parity`; a page of its own, linked from the landing page, never mixed with the same-model
 * results (T14).
 */

/** An integer with a comma every three digits, the same on every machine. */
const grouped = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const percent = (share: number) => `${(share * 100).toFixed(1)} %`;
const euro = (value: number) => `${value.toFixed(4)} €`;
const minutes = (ms: number) => `${(ms / 60_000).toFixed(1)} min`;
const times = (value: number | undefined) => (value === undefined ? '—' : `${value.toFixed(2)}×`);
const seconds = (value: number | undefined) =>
  value === undefined
    ? '—'
    : value >= 3600
      ? `${(value / 3600).toFixed(1)} h`
      : `${(value / 60).toFixed(1)} min`;

function qualityCell(
  entry: ParityEntry,
  metric: string,
  pick: (cell: ParityCell) => number | undefined,
): string {
  const verdict = entry.quality.find((q) => q.metric === metric);
  const weak = pick(entry.cells.weak_harness);
  const strong = pick(entry.cells.strong_baseline);
  if (verdict === undefined || weak === undefined || strong === undefined) return '<td>—</td>';
  // The verdict in words: worse beyond the variance is the only "worse"; a lower mean short of it says so.
  const mark =
    verdict.verdict === 'worse'
      ? 'worse'
      : verdict.outcome === 'worse'
        ? 'lower, not beyond the variance'
        : verdict.outcome;
  return `<td>${percent(weak)} against ${percent(strong)}<br><span class="verdict">${e(mark)}, ${e(verdict.certainty)}</span></td>`;
}

function entryRow(entry: ParityEntry): string {
  const r = entry.ratios;
  return (
    `<tr><th scope="row">${e(entry.scenario)}@${e(entry.version)}</th><td>${entry.k}${entry.preliminary ? ' (preliminary)' : ''}</td>` +
    qualityCell(entry, 'M-Q1', (cell) => cell.m_q1) +
    qualityCell(entry, 'hold-out', (cell) => cell.holdout) +
    qualityCell(entry, 'checks', (cell) => cell.checks) +
    `<td>${times(r.cost)}</td><td>${times(r.time)}</td>` +
    `<td>${times(r.tokens_fresh)} · ${times(r.tokens_cached)} · ${times(r.tokens_output)}</td>` +
    `<td><strong>${e(entry.h_w)}</strong></td></tr>\n`
  );
}

const CELL_LABELS: readonly [keyof ParityEntry['cells'], string][] = [
  ['weak_harness', 'weak model, harness'],
  ['strong_baseline', 'strong model, baseline'],
  ['weak_baseline', 'weak model, baseline'],
  ['weak_control', 'weak model, docs control'],
  ['strong_harness', 'strong model, harness'],
];

function cellsRows(entry: ParityEntry): string {
  return CELL_LABELS.flatMap(([key, label]) => {
    const cell = entry.cells[key];
    if (cell === undefined) return [];
    return [
      `<tr><th scope="row">${e(entry.scenario)}@${e(entry.version)}</th><td>${e(label)} (${e(cell.arm)}, ${e(cell.model)})</td>` +
        `<td>${cell.n}</td><td>${percent(cell.m_q1)}</td><td>${cell.holdout === undefined ? '—' : percent(cell.holdout)}</td>` +
        `<td>${euro(cell.cost_eur)}</td><td>${minutes(cell.time_ms)}</td>` +
        `<td>${grouped(cell.tokens.fresh + cell.tokens.cached)} · ${grouped(cell.tokens.output)}</td></tr>\n`,
    ];
  }).join('');
}

function localRows(entry: ParityEntry, profiles: readonly string[]): string {
  const weak = entry.cells.weak_harness.local;
  const strong = entry.cells.strong_baseline;
  return (
    `<tr><th scope="row">${e(entry.scenario)}@${e(entry.version)}</th>` +
    profiles
      .map((id) => `<td>${seconds(weak[id]?.no_cache_s)} · ${seconds(weak[id]?.prefix_cache_s)}</td>`)
      .join('') +
    `<td>${minutes(strong.time_ms)}</td><td>${e(entry.break_even.no_cache)} · ${e(entry.break_even.prefix_cache)}</td></tr>\n`
  );
}

/** The parity page of the execution `title`, from its aggregate's `parity`. */
export function parityPage(title: string, parity: ParitySection): string {
  const profiles = parity.local_profiles.profiles;
  const sections = parity.summary.map((line) => {
    const entries = parity.entries.filter(
      (entry) =>
        entry.harness === line.harness &&
        entry.weak_model === line.weak_model &&
        entry.strong_model === line.strong_model,
    );
    const unmatched = parity.unmatched.filter(
      (entry) =>
        entry.harness === line.harness &&
        entry.weak_model === line.weak_model &&
        entry.strong_model === line.strong_model,
    );
    return (
      `<h2>${e(line.harness)} on ${e(line.weak_model)} against the baseline on ${e(line.strong_model)}</h2>\n` +
      `<p class="headline">H-W holds in ${line.holds} and fails in ${line.fails} of ${line.holds + line.fails} ` +
      `scenarios${line.unmatched === 0 ? '' : `; ${line.unmatched} not matched`}.</p>\n` +
      '<div class="scroll">\n<table>\n<thead><tr><th scope="col">Scenario</th><th scope="col">Runs a side</th>' +
      '<th scope="col">M-Q1</th><th scope="col">Hold-out</th><th scope="col">Checks</th><th scope="col">Cost</th>' +
      '<th scope="col">Agent time</th><th scope="col">Tokens: fresh · cached · output</th><th scope="col">H-W</th></tr></thead>\n<tbody>\n' +
      entries.map(entryRow).join('') +
      '</tbody>\n</table>\n</div>\n' +
      '<p class="legend">Quality: the weak model with the harness against the strong model\'s baseline, worse only when ' +
      "worse beyond the variance. Cost, time and tokens: the weak harness's figure over the strong baseline's.</p>\n" +
      '<h3>Every cell</h3>\n<div class="scroll">\n<table>\n<thead><tr><th scope="col">Scenario</th><th scope="col">Cell</th>' +
      '<th scope="col">n</th><th scope="col">M-Q1</th><th scope="col">Hold-out</th><th scope="col">Cost</th>' +
      '<th scope="col">Agent time</th><th scope="col">Tokens: processed · output</th></tr></thead>\n<tbody>\n' +
      entries.map(cellsRows).join('') +
      '</tbody>\n</table>\n</div>\n' +
      '<h3>A local model\'s time, estimated</h3>\n<div class="scroll">\n<table>\n<thead><tr><th scope="col">Scenario</th>' +
      profiles
        .map(
          (p) =>
            `<th scope="col">${e(p.id)} (${p.prefill} · ${p.decode} tokens/s): no cache · prefix cache</th>`,
        )
        .join('') +
      '<th scope="col">Strong baseline\'s agent time</th><th scope="col">Slowest profile that keeps up: no cache · prefix cache</th></tr></thead>\n<tbody>\n' +
      entries
        .map((entry) =>
          localRows(
            entry,
            profiles.map((p) => p.id),
          ),
        )
        .join('') +
      '</tbody>\n</table>\n</div>\n' +
      (unmatched.length === 0
        ? ''
        : `<p class="meta">Not matched: ${unmatched.map((u) => `${e(u.scenario)}@${e(u.version)} (${e(u.reason)})`).join('; ')}.</p>\n`)
    );
  });
  return page(
    `${PARITY_HEADING} — ${title}`,
    `<p><a href="index.html">← ${e(title)}</a></p>\n<h1>${e(PARITY_HEADING)}</h1>\n` +
      '<p class="framing">Across models: these figures compare different models and are never mixed with the ' +
      'same-model results of the landing page (T14). H-W (dl-032): a weak model with the harness reaches the quality ' +
      'of a strong model without it at a lower cost and in less time. It holds for a scenario when no quality metric ' +
      'is worse beyond the variance and both the cost and the agent time are lower. The weak model of each pair is the ' +
      'one whose baselines cost less in this execution; each scenario is read over the runs both cells have, and below ' +
      'three runs a side it is preliminary. <a href="method.html#weak-against-strong">How it is read</a>.</p>\n' +
      sections.join('') +
      `<p class="legend">${e(parity.local_profiles.assumption)}</p>\n`,
    2,
  );
}
