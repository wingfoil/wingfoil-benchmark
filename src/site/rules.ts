import type { Comparison, MetricId, Outcome } from '../results/index.js';

/**
 * The site's reporting rules (REQ-RES-03 as amended in 1.20, task-045): the headline the comparisons make, and how a
 * figure reads. Fixed rules and nothing else (W11 decision 3): no sentence on the site is written by hand. The
 * category map and the comparison rules themselves are `results`' (task-068), re-exported here.
 */

export { CATEGORY_MAP, compare, readMetric, summarize } from '../results/index.js';
export type {
  Better,
  Certainty,
  Comparison,
  Figures,
  MapEntry,
  MappedCategory,
  MetricId,
  Outcome,
  Summary,
} from '../results/index.js';

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
