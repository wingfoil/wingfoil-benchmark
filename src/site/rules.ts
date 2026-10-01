import type { Group, Tally } from '../results/index.js';

/**
 * The site's reporting rules (REQ-RES-03 as amended in 1.20, task-045): which metrics stand for each
 * category, how an arm compares with the baseline on one, and the headline those comparisons make. Fixed
 * rules and nothing else (W11 decision 3): no sentence on the site is written by hand.
 */

/** The metrics the category map reads. */
export type MetricId = 'M-Q1' | 'M-K1' | 'M-D3' | 'M-E1' | 'M-F1';

/** Which way a metric is better. */
export type Better = 'higher' | 'lower';

/** One metric of a category's row. */
export interface MapEntry {
  readonly id: MetricId;
  readonly label: string;
  readonly better: Better;
}

/** The categories v0.1 can cover: those with a goal measured in v0.1 (experiment design §1). */
export type MappedCategory = 'C' | 'D' | 'E' | 'F';

/**
 * The category map (the approver's choices of 2026-09-30 and 2026-10-01): each category's metrics, in
 * order, from its goal in experiment design §1. D reads M-Q1 for M-D1: S2's defect tests are among its
 * public suites, and nothing in the scenario says which (task-045, the approver's choice 1).
 */
export const CATEGORY_MAP: Readonly<Record<MappedCategory, readonly MapEntry[]>> = {
  C: [
    { id: 'M-Q1', label: 'hidden tests passed on the final snapshot', better: 'higher' },
    { id: 'M-K1', label: 'cost of a run', better: 'lower' },
  ],
  D: [
    {
      id: 'M-Q1',
      label: 'hidden tests passed on the final snapshot, the defect tests among them',
      better: 'higher',
    },
    { id: 'M-D3', label: 'regressions of tests that passed on the seed', better: 'lower' },
  ],
  E: [{ id: 'M-E1', label: 'directive violations', better: 'lower' }],
  F: [{ id: 'M-F1', label: 'earlier decisions respected or explicitly revised', better: 'higher' }],
};

/**
 * Each run's figure of one metric, in the order of `runs`; and, for M-E1, the runs that did not reach a
 * step a directive check scores, which make the metric not comparable (the approver's choice of
 * 2026-10-01, task-045's review).
 */
export interface Figures {
  readonly runs: readonly string[];
  readonly values: readonly number[];
  /** A run with no `step` is one no directive check step lists: scored before the check existed. */
  readonly unreached?: readonly { readonly run: string; readonly step?: number }[];
}

/** The check kinds that count violations (REQ-SCO-05 and -06, task-037): M-E1's. */
const DIRECTIVE_KINDS: readonly string[] = ['ast', 'dependencies'];

/** One side of a comparison: its `n`, the mean of its runs' figures, their range, and the runs. */
export interface Summary {
  readonly n: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly runs: readonly string[];
}

export type Outcome = 'better' | 'worse' | 'same';

/**
 * How sure a difference is (experiment design §4.6): `beyond variance` only from n ≥ 3 on both sides
 * with ranges apart; `preliminary` when either side is a single run; otherwise `within variance`.
 */
export type Certainty = 'beyond variance' | 'within variance' | 'preliminary';

/** One arm against the baseline, on one metric of one category's scenario. */
export interface Comparison {
  readonly category: string;
  readonly metric: MetricId;
  readonly arm: string;
  readonly outcome: Outcome;
  /** The arm's mean less the baseline's. */
  readonly delta: number;
  readonly certainty: Certainty;
  readonly baseline: Summary;
  readonly other: Summary;
}

/** A tally as a share; 0 of 0 is 0, as a final not reached counts as nothing passed. */
function share(tally: Tally): number {
  return tally.total === 0 ? 0 : tally.passed / tally.total;
}

/**
 * Each run's figure of `id` in `group`, or undefined when the group does not measure it ("not
 * measured"): M-Q1 and M-F1 as shares, M-K1 in EUR, M-D3 and M-E1 as counts. M-E1 sums each run's
 * violations over every directive check's steps it reached.
 */
export function readMetric(id: MetricId, group: Group): Figures | undefined {
  const metrics = group.metrics;
  switch (id) {
    case 'M-Q1': {
      const value = metrics.m_q1.final.m_q1;
      return { runs: value.runs, values: value.values.map(share) };
    }
    case 'M-K1':
      return { runs: metrics.cost.cost_eur.runs, values: metrics.cost.cost_eur.values };
    case 'M-D3':
      return metrics.m_d3 === undefined
        ? undefined
        : { runs: metrics.m_d3.value.runs, values: metrics.m_d3.value.values };
    case 'M-F1': {
      const value = metrics.m_f1?.share;
      return value === undefined ? undefined : { runs: value.runs, values: value.values.map(share) };
    }
    case 'M-E1': {
      const directives = (metrics.checks ?? []).filter((check) => DIRECTIVE_KINDS.includes(check.kind));
      if (directives.length === 0) return undefined;
      const sums = new Map<string, number>();
      const unreached: { run: string; step: number }[] = [];
      // A run must be listed by every directive check: one a check never lists was scored without it.
      const listedByAll = new Set<string>(group.runs);
      for (const check of directives) {
        const listed = new Set<string>();
        for (const step of check.steps) {
          step.violations?.runs.forEach((run, index) => {
            listed.add(run);
            sums.set(run, (sums.get(run) ?? 0) + (step.violations?.values[index] ?? 0));
          });
          for (const run of step.not_reached) {
            listed.add(run);
            unreached.push({ run, step: step.step });
          }
        }
        for (const run of [...listedByAll]) if (!listed.has(run)) listedByAll.delete(run);
      }
      // Each run once, in the order of the group's runs: at the first step it did not reach, or with no
      // step when no directive check step lists it (task-045's second review). Either way it is not counted.
      const lost = group.runs.flatMap((run) => {
        if (!listedByAll.has(run)) return [{ run }];
        const steps = unreached.filter((entry) => entry.run === run).map((entry) => entry.step);
        return steps.length === 0 ? [] : [{ run, step: Math.min(...steps) }];
      });
      const out = new Set(lost.map((entry) => entry.run));
      const runs = group.runs.filter((run) => !out.has(run));
      const figures = { runs, values: runs.map((run) => sums.get(run) ?? 0) };
      return lost.length === 0 ? figures : { ...figures, unreached: lost };
    }
  }
}

/** Figures as one side of a comparison: their `n`, mean and range. */
export function summarize(figures: Figures): Summary {
  const { values } = figures;
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    n: values.length,
    mean: values.length === 0 ? 0 : total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    runs: figures.runs,
  };
}

/** A difference this small is rounding, not a result. */
const EPSILON = 1e-12;

/** `other` against `baseline` on a metric that is better `better`. */
export function compare(
  better: Better,
  baseline: Figures,
  other: Figures,
): Omit<Comparison, 'category' | 'metric' | 'arm'> {
  const base = summarize(baseline);
  const arm = summarize(other);
  const raw = arm.mean - base.mean;
  const delta = Math.abs(raw) < EPSILON ? 0 : raw;
  const outcome: Outcome = delta === 0 ? 'same' : delta > 0 === (better === 'higher') ? 'better' : 'worse';
  const apart = arm.min > base.max || arm.max < base.min;
  const certainty: Certainty =
    base.n === 1 || arm.n === 1
      ? 'preliminary'
      : outcome !== 'same' && base.n >= 3 && arm.n >= 3 && apart
        ? 'beyond variance'
        : 'within variance';
  return { outcome, delta, certainty, baseline: base, other: arm };
}

/** `a`, `a and b`, `a, b and c`. */
export function listed(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`;
}

function unique(items: readonly string[]): string[] {
  return [...new Set(items)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * The headline for one arm (the approver's choice 2): its better, worse and same comparisons counted
 * with the same weight, the categories they span, and those where a side is a single run. `emphasis`
 * marks the arm's name (the page's `<strong>`).
 */
export function headlineSentence(
  arm: string,
  comparisons: readonly Comparison[],
  emphasis: (text: string) => string = (text) => text,
): string {
  const name = emphasis(arm);
  if (comparisons.length === 0) {
    return `Against the baseline, ${name} has no comparison: no metric of the category map was measured in both.`;
  }
  const count = (outcome: Outcome) =>
    comparisons.filter((comparison) => comparison.outcome === outcome).length;
  const categories = unique(comparisons.map((comparison) => comparison.category));
  const preliminary = unique(
    comparisons
      .filter((comparison) => comparison.certainty === 'preliminary')
      .map((comparison) => comparison.category),
  );
  const total = comparisons.length;
  return (
    `Against the baseline, ${name} is better in ${count('better')}, worse in ${count('worse')} and the same in ` +
    `${count('same')} of ${total} comparison${total === 1 ? '' : 's'} across ` +
    `${categories.length === 1 ? 'category' : 'categories'} ${listed(categories)}` +
    (preliminary.length === 0 ? '' : ` (preliminary: n = 1 in ${listed(preliminary)})`) +
    '.'
  );
}

/** The categories the campaign does not cover, named after the headline. */
export function notCoveredSentence(categories: readonly string[]): string {
  if (categories.length === 0) return '';
  return `${listed(categories)} ${categories.length === 1 ? 'is' : 'are'} not covered in this campaign.`;
}

const SHARES: readonly MetricId[] = ['M-Q1', 'M-F1'];

/** A figure of `id`, in its unit: a share to one decimal place, EUR to four, a count as it is. */
export function formatFigure(id: MetricId, value: number): string {
  if (SHARES.includes(id)) return `${(value * 100).toFixed(1)}%`;
  if (id === 'M-K1') return `${value.toFixed(4)} EUR`;
  return String(Math.round(value * 100) / 100);
}

/**
 * A delta of `id`: signed (`+`, `−`, or `±` for none), shares in percentage points. A difference that would
 * round to nothing keeps two significant digits, so that "better" never sits beside a zero.
 */
export function formatDelta(id: MetricId, delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const size = Math.abs(delta);
  if (SHARES.includes(id)) return `${sign}${fixed(size * 100, 1)} pp`;
  if (id === 'M-K1') return `${sign}${fixed(size, 4)} EUR`;
  // A count to two places, without trailing zeros; one that would show as zero keeps its digits.
  const shown = Number(size.toFixed(2));
  return `${sign}${shown === 0 && size !== 0 ? fixed(size, 2) : String(shown)}`;
}

/**
 * `value` to `digits` decimal places; a value that would show as zero gets the places its first two
 * significant digits need, in fixed notation, never an exponent (task-045's second review).
 */
function fixed(value: number, digits: number): string {
  const text = value.toFixed(digits);
  if (value === 0 || Number(text) !== 0) return text;
  return value.toFixed(Math.min(100, 1 - Math.floor(Math.log10(value))));
}
