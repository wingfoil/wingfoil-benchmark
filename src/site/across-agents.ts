import type { CampaignComparison } from '../results/index.js';

import { executionName } from './comparisons.js';
import { escapeHtml as e, page } from './render.js';

/** A value an aggregate records per run: its runs' count and each run's figure (REQ-SCO-*). */
interface PerRun<T> {
  readonly n: number;
  readonly runs?: readonly string[];
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
    readonly cost?: { readonly cost_usd?: PerRun<number>; readonly unpriced?: readonly string[] };
    readonly checks?: readonly { readonly steps?: readonly { readonly passed?: PerRun<Fraction> }[] }[];
    readonly m_f1?: { readonly share?: PerRun<Fraction> };
    readonly m_r?: {
      readonly n?: number;
      readonly m_r1?: { agree: number; total: number };
      readonly m_r2?: { mean: number };
    };
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

/**
 * Each run's checks summed over every step each check scores, as campaign elements tabulate them (review round 1):
 * a fraction per run, aligned by the run's id, so that a step a run did not reach adds nothing to it.
 */
function checksOf(group: GroupView): PerRun<Fraction> | undefined {
  const scored = (group.metrics?.checks ?? []).flatMap((check) =>
    (check.steps ?? []).flatMap((step) => (step.passed === undefined ? [] : [step.passed])),
  );
  if (scored.length === 0) return undefined;
  const runs = [...new Set(scored.flatMap((value) => value.runs ?? []))];
  const values = runs.map((run) =>
    scored.reduce(
      (sum, value) => {
        const at = (value.runs ?? []).indexOf(run);
        const one = at === -1 ? undefined : value.values[at];
        return one === undefined ? sum : { passed: sum.passed + one.passed, total: sum.total + one.total };
      },
      { passed: 0, total: 0 },
    ),
  );
  return { n: runs.length, runs, values };
}

/** The preliminary badge, below 3 runs (experiment design §4.6). */
function badge(n: number): string {
  return n < 3 ? ' <span class="preliminary">preliminary</span>' : '';
}

/** A cell: its text and, when there is a value, that value's own n and its badge. */
function cell(text: string, n: number | undefined): string {
  return `<td>${e(text)}${text === '—' || n === undefined ? '' : ` <span class="n">n = ${n}</span>${badge(n)}`}</td>`;
}

/** One row: the agent, the model, and its values, each with its own n; the cost with its basis. */
function rowHtml(agent: string, group: GroupView): string {
  const metrics = group.metrics ?? {};
  const final = metrics.m_q1?.final?.m_q1;
  const holdout = metrics.holdout?.scored === true ? metrics.holdout.final?.m_q1 : undefined;
  const checks = checksOf(group);
  const share = metrics.m_f1?.share;
  const cost = metrics.cost?.cost_usd;
  // The cost's basis (bug-016): a run the agent could not price is priced from the pinned price table.
  const unpriced = new Set(metrics.cost?.unpriced ?? []);
  const priced = (cost?.runs ?? []).filter((run) => unpriced.has(run)).length;
  const basis =
    cost === undefined || cost.values.length === 0
      ? ''
      : priced === 0
        ? ' (reported by the agent)'
        : priced === cost.values.length
          ? ' (price table)'
          : ` (price table for ${priced} of ${cost.values.length})`;
  const mR = metrics.m_r;
  return (
    `<tr><td>${e(agent)}</td><td>${e(group.model)}</td>` +
    cell(fractions(final), final?.n) +
    cell(fractions(holdout), holdout?.n) +
    cell(fractions(checks), checks?.n) +
    cell(fractions(share), share?.n) +
    cell(mean(cost, 4) === '—' ? '—' : `${mean(cost, 4)}${basis}`, cost?.n) +
    cell(mR?.m_r1 === undefined ? '—' : `${mR.m_r1.agree}/${mR.m_r1.total}`, mR?.n) +
    cell(mR?.m_r2 === undefined ? '—' : mR.m_r2.mean.toFixed(2), mR?.n) +
    '</tr>\n'
  );
}

/**
 * The across-agents page (REQ-RES-07 as amended in 1.36, task-104): the baseline arm of two executions whose agents
 * differ, scenario by scenario, one row per model of each agent (no turns: each agent counts them its own way), then
 * each group's M-R across (REQ-SCO-07); `notes`,
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
    '<th scope="col">Hold-out tests</th><th scope="col">Checks (every scored step)</th><th scope="col">M-F1</th>' +
    '<th scope="col">Cost (USD, API-equivalent, mean, and its basis)</th>' +
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
        if (entry.note !== undefined) return `<li>${e(entry.model)}: ${e(entry.note)}</li>\n`;
        const parts = [
          entry.m_r1 === undefined ? undefined : `M-R1 ${entry.m_r1.agree}/${entry.m_r1.total}`,
          entry.m_r2 === undefined ? undefined : `M-R2 ${entry.m_r2.mean.toFixed(2)}`,
        ].filter((part): part is string => part !== undefined);
        if (parts.length === 0) return `<li>${e(entry.model)}: not measured</li>\n`;
        const [n1, n2] = [entry.earlier?.n ?? 0, entry.newer?.n ?? 0];
        return `<li>${e(entry.model)}: ${e(`${parts.join(', ')} (n = ${n1} and ${n2})`)}${badge(Math.min(n1, n2))}</li>\n`;
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
      'are not one harness and these runs are few. Turns are not shown: each agent counts them its own way (Codex one ' +
      'a request, Claude Code one an assistant message).</p>\n' +
      (notes.length === 0
        ? ''
        : `<ul class="notes">\n${notes.map((note) => `<li>${e(note)}</li>\n`).join('')}</ul>\n`) +
      sections.join(''),
    2,
  );
}
