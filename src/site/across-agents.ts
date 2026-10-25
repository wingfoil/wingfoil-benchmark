import type { CampaignComparison } from '../results/index.js';

import { executionName } from './comparisons.js';
import { escapeHtml as e, page } from './render.js';

/** A value an aggregate records per run: its runs' count and each run's figure (REQ-SCO-*). */
interface PerRun<T> {
  readonly n: number;
  readonly values: readonly T[];
}

/** A fraction one run scored: tests or checks passed of their total. */
interface Fraction {
  readonly passed: number;
  readonly total: number;
}

/** The part of an aggregate group the across-agents page reads (`aggregate.json`). */
interface GroupView {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  readonly n: number;
  readonly preliminary?: boolean;
  readonly metrics?: {
    readonly m_q1?: { readonly final?: { readonly m_q1?: PerRun<Fraction> } };
    readonly holdout?: { readonly scored?: boolean; readonly final?: { readonly m_q1?: PerRun<Fraction> } };
    readonly cost?: { readonly cost_usd?: PerRun<number>; readonly turns?: PerRun<number> };
    readonly checks?: readonly { readonly steps?: readonly { readonly passed?: PerRun<Fraction> }[] }[];
    readonly m_f1?: { readonly share?: PerRun<Fraction> };
    readonly m_r?: { readonly m_r1?: { agree: number; total: number }; readonly m_r2?: { mean: number } };
  };
}

/** The part of an `aggregate.json` the page reads: its groups and its slices. */
export interface AggregateView {
  readonly model: string;
  readonly groups: readonly unknown[];
  readonly slices?: readonly unknown[];
}

/** Whether a comparison is across two agents (REQ-RES-07 as amended in 1.36): its sides' `agent.name` differ. */
export function acrossAgents(comparison: CampaignComparison): boolean {
  return comparison.pins_differ.some((pin) => pin.pin === 'agent.name');
}

/** The page of an across-agents comparison, beside its newer execution's pages: named after the earlier execution. */
export function acrossAgentsFile(comparison: CampaignComparison): string {
  return `across-agents-${comparison.earlier.campaign}-${comparison.earlier.execution}.html`;
}

/** The baseline groups of an aggregate, its default model's and its slices', in their files' order. */
function baselineGroups(aggregate: AggregateView): GroupView[] {
  return [...aggregate.groups, ...(aggregate.slices ?? [])]
    .map((group) => group as GroupView)
    .filter((group) => group.arm === 'baseline');
}

/** A fraction per run, as one figure when every run scored the same, or as its range: `9–10/10`. */
function fractions(value: PerRun<Fraction> | undefined): string {
  if (value === undefined || value.values.length === 0) return '—';
  const passed = value.values.map((one) => one.passed);
  const totals = new Set(value.values.map((one) => one.total));
  const [low, high] = [Math.min(...passed), Math.max(...passed)];
  const total = totals.size === 1 ? String(value.values[0]?.total) : 'varies';
  return `${low === high ? low : `${low}–${high}`}/${total}`;
}

/** The mean of a figure per run, to `digits`; `—` when none was recorded. */
function mean(value: PerRun<number> | undefined, digits: number): string {
  if (value === undefined || value.values.length === 0) return '—';
  return (value.values.reduce((sum, one) => sum + one, 0) / value.values.length).toFixed(digits);
}

/** Each run's checks summed over the last step each check scores, as a fraction per run. */
function checksOf(group: GroupView): PerRun<Fraction> | undefined {
  const lasts = (group.metrics?.checks ?? [])
    .map((check) => check.steps?.[check.steps.length - 1]?.passed)
    .filter((value): value is PerRun<Fraction> => value !== undefined);
  if (lasts.length === 0) return undefined;
  const n = Math.max(...lasts.map((value) => value.values.length));
  const values = Array.from({ length: n }, (_, run) =>
    lasts.reduce(
      (sum, value) => ({
        passed: sum.passed + (value.values[run]?.passed ?? 0),
        total: sum.total + (value.values[run]?.total ?? 0),
      }),
      { passed: 0, total: 0 },
    ),
  );
  return { n, values };
}

/** One row: the agent, the model, and its values, each with the group's n and, below 3 runs, the preliminary badge. */
function rowHtml(agent: string, group: GroupView): string {
  const badge = group.preliminary === true ? ' <span class="preliminary">preliminary</span>' : '';
  const cell = (text: string) =>
    `<td>${e(text)}${text === '—' ? '' : ` <span class="n">n = ${group.n}</span>${badge}`}</td>`;
  const metrics = group.metrics ?? {};
  const mR1 = metrics.m_r?.m_r1;
  const mR2 = metrics.m_r?.m_r2;
  return (
    `<tr><td>${e(agent)}</td><td>${e(group.model)}</td>` +
    cell(fractions(metrics.m_q1?.final?.m_q1)) +
    cell(metrics.holdout?.scored === true ? fractions(metrics.holdout.final?.m_q1) : '—') +
    cell(fractions(checksOf(group))) +
    cell(fractions(metrics.m_f1?.share)) +
    cell(mean(metrics.cost?.cost_usd, 4)) +
    cell(mean(metrics.cost?.turns, 1)) +
    `<td>${mR1 === undefined ? '—' : e(`${mR1.agree}/${mR1.total}`)}</td>` +
    `<td>${mR2 === undefined ? '—' : e(mR2.mean.toFixed(2))}</td></tr>\n`
  );
}

/**
 * The across-agents page (REQ-RES-07 as amended in 1.36, task-104): the baseline arm of two executions whose agents
 * differ, scenario by scenario, one row per model of each agent, then each group's M-R across (REQ-SCO-07); `notes`,
 * the catalogue's, at its top. No headline and no better/worse mark: two agents are not one harness, and these runs
 * are few.
 */
export function acrossAgentsPage(
  comparison: CampaignComparison,
  earlier: AggregateView,
  newer: AggregateView,
  notes: readonly string[],
): string {
  const agentOf = (side: 'earlier' | 'newer') =>
    String(comparison.pins_differ.find((pin) => pin.pin === 'agent.name')?.[side] ?? 'the agent');
  const [earlierAgent, newerAgent] = [agentOf('earlier'), agentOf('newer')];
  const sides = [
    { agent: earlierAgent, groups: baselineGroups(earlier) },
    { agent: newerAgent, groups: baselineGroups(newer) },
  ];
  const scenarios = [
    ...new Set(sides.flatMap((side) => side.groups.map((group) => `${group.scenario}@${group.version}`))),
  ].sort();
  const header =
    '<thead><tr><th scope="col">Agent</th><th scope="col">Model</th><th scope="col">Final public tests</th>' +
    '<th scope="col">Hold-out tests</th><th scope="col">Checks</th><th scope="col">M-F1</th>' +
    '<th scope="col">Cost (USD, API-equivalent, mean)</th><th scope="col">Turns (mean)</th>' +
    '<th scope="col">M-R1</th><th scope="col">M-R2</th></tr></thead>\n';
  const sections = scenarios.map((name) => {
    const rows = sides
      .flatMap((side) =>
        side.groups
          .filter((group) => `${group.scenario}@${group.version}` === name)
          .map((group) => rowHtml(side.agent, group)),
      )
      .join('');
    const across = comparison.m_r_across
      .filter((entry) => `${entry.scenario}@${entry.version}` === name && entry.arm === 'baseline')
      .map((entry) => {
        const measured =
          entry.note !== undefined
            ? entry.note
            : [
                entry.m_r1 === undefined ? undefined : `M-R1 ${entry.m_r1.agree}/${entry.m_r1.total}`,
                entry.m_r2 === undefined ? undefined : `M-R2 ${entry.m_r2.mean.toFixed(2)}`,
              ]
                .filter((part): part is string => part !== undefined)
                .join(', ') + ` (n = ${entry.earlier?.n ?? 0} and ${entry.newer?.n ?? 0})`;
        return `<li>${e(entry.model)}: ${e(measured)}</li>\n`;
      })
      .join('');
    return (
      `<h2>${e(name)}</h2>\n<div class="scroll">\n<table class="across-agents">\n${header}<tbody>\n${rows}</tbody>\n</table>\n</div>\n` +
      (across === ''
        ? ''
        : `<p>M-R across the two agents, each default model against the other's:</p>\n<ul>\n${across}</ul>\n`)
    );
  });
  return page(
    `Across agents: ${executionName(comparison.newer)} against ${executionName(comparison.earlier)}`,
    '<p><a href="index.html">Back to this execution</a></p>\n' +
      `<h1>Across agents: ${e(executionName(comparison.newer))} against ${e(executionName(comparison.earlier))}</h1>\n` +
      `<p class="meta">The baseline arm of each execution, scenario by scenario: ${e(earlierAgent)} in ` +
      `${e(executionName(comparison.earlier))}, ${e(newerAgent)} in ${e(executionName(comparison.newer))}. Values are ` +
      'means or ranges of their runs, with their n; there is no headline and no better or worse mark, since two agents ' +
      'are not one harness and these runs are few.</p>\n' +
      (notes.length === 0
        ? ''
        : `<ul class="notes">\n${notes.map((note) => `<li>${e(note)}</li>\n`).join('')}</ul>\n`) +
      sections.join(''),
    2,
  );
}
