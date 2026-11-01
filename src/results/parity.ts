import { compare } from './compare.js';
import type { Certainty, Figures, Outcome } from './compare.js';

/**
 * The weak model with a harness against the strong model without it (dl-032, REQ-SCO-15, task-121): within one
 * execution, the campaign's default model against each slice's model, on every scenario version and harness arm both
 * ran. A comparison across models, kept apart from the same-model ones (T14).
 */

/** What the comparison reads of one scored run: its group's keys and its figures. */
export interface ParityRun {
  readonly name: string;
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
  readonly model: string;
  /** The run's arm has a harness (its run.json records a harness commit). */
  readonly harness: boolean;
  /** The harness arm a docs control was generated from. */
  readonly docsOf?: string;
  /** M-Q1 on the final snapshot, as a share; a final not reached is 0. */
  readonly mQ1: number;
  /** The hold-out on the final snapshot, as a share; absent when the run's hold-out was not scored. */
  readonly holdout?: number;
  /** The share of the check-steps the run scored that passed; absent when it scored none. */
  readonly checks?: number;
  readonly costEur: number;
  readonly wallTimeMs: number;
  readonly tokens: {
    readonly input: number;
    readonly output: number;
    readonly cacheCreation: number;
    readonly cacheRead: number;
  };
}

/** A local machine's speeds, in tokens a second: an assumption, not a measurement (dl-032 item 4). */
export interface LocalProfile {
  readonly id: string;
  readonly prefill: number;
  readonly decode: number;
}

/** dl-032's three profiles, slowest first. */
export const LOCAL_PROFILES: readonly LocalProfile[] = [
  { id: 'slow', prefill: 300, decode: 15 },
  { id: 'mid', prefill: 1500, decode: 40 },
  { id: 'fast', prefill: 5000, decode: 100 },
];

/** The sentence the aggregate carries beside the profiles. */
export const LOCAL_ASSUMPTION =
  'The profiles are assumptions, not measurements: a local model would read every token processed (without a prefix ' +
  'cache) or only the fresh ones (with one) at the prefill speed, and write the output at the decode speed; tool ' +
  'time is left out. They are replaced by measurements once a local model runs.';

/** A cell's model time on one profile, in seconds, without and with a prefix cache. */
export interface LocalTime {
  readonly no_cache_s: number;
  readonly prefix_cache_s: number;
}

/** One cell of the comparison: an arm on a model, over the matched sample, with the means of its runs' figures. */
export interface ParityCell {
  readonly arm: string;
  readonly model: string;
  readonly runs: readonly string[];
  readonly n: number;
  readonly m_q1: number;
  readonly holdout?: number;
  readonly checks?: number;
  readonly cost_eur: number;
  readonly time_ms: number;
  readonly tokens: { readonly fresh: number; readonly cached: number; readonly output: number };
  readonly local: Readonly<Record<string, LocalTime>>;
}

/** One quality metric of the weak harness against the strong baseline: worse only when worse beyond the variance. */
export interface ParityQuality {
  readonly metric: 'M-Q1' | 'hold-out' | 'checks';
  readonly verdict: 'not worse' | 'worse';
  readonly outcome: Outcome;
  /** The weak harness's mean less the strong baseline's. */
  readonly delta: number;
  readonly certainty: Certainty;
}

/** The weak harness's figure over the strong baseline's, kept to a millionth; absent when the strong one is 0. */
export interface ParityRatios {
  readonly cost?: number;
  readonly time?: number;
  readonly tokens_fresh?: number;
  readonly tokens_cached?: number;
  readonly tokens_output?: number;
}

export interface ParityEntry {
  readonly scenario: string;
  readonly version: string;
  readonly harness: string;
  readonly weak_model: string;
  readonly strong_model: string;
  /** The matched sample: the runs each cell of the pair contributes. */
  readonly k: number;
  /** Below three runs a side (dl-012): every verdict is preliminary. */
  readonly preliminary: boolean;
  readonly cells: {
    readonly weak_harness: ParityCell;
    readonly strong_baseline: ParityCell;
    readonly weak_baseline?: ParityCell;
    readonly weak_control?: ParityCell;
    readonly strong_harness?: ParityCell;
  };
  readonly quality: readonly ParityQuality[];
  readonly ratios: ParityRatios;
  /** dl-032's H-W: every quality metric not worse, and both the cost and the time lower. */
  readonly h_w: 'holds' | 'fails';
  /** The slowest profile (or `none`) at which the weak harness's local time is within the strong baseline's agent time. */
  readonly break_even: { readonly no_cache: string; readonly prefix_cache: string };
}

export interface ParityUnmatched {
  readonly scenario: string;
  readonly version: string;
  readonly harness: string;
  readonly weak_model: string;
  readonly strong_model: string;
  readonly reason: string;
}

export interface ParitySummary {
  readonly weak_model: string;
  readonly strong_model: string;
  readonly harness: string;
  readonly holds: number;
  readonly fails: number;
  /** Of the holds and fails, those below three runs a side: no quality metric can be judged worse there. */
  readonly preliminary: number;
  readonly unmatched: number;
}

/** `aggregate.json`'s `parity` (REQ-SCO-15). */
export interface ParitySection {
  readonly local_profiles: { readonly assumption: string; readonly profiles: readonly LocalProfile[] };
  readonly entries: readonly ParityEntry[];
  readonly unmatched: readonly ParityUnmatched[];
  readonly summary: readonly ParitySummary[];
}

const BASELINE = 'baseline';

/** Natural order: digit runs compared as numbers, so that S2 comes before S10 and r2 before r10. */
function natural(a: string, b: string): number {
  const parts = (text: string) => text.split(/(\d+)/);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const [p, q] = [x[i] as string, y[i] as string];
    if (p === q) continue;
    if (i % 2 === 1) return Number(p) - Number(q) || (p < q ? -1 : 1);
    return p < q ? -1 : 1;
  }
  return x.length - y.length;
}

/** Kept to `places` decimals, so that float noise never reaches the aggregate's bytes. */
function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function meanOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** A run's model time on `profile`: every token processed at the prefill speed, or only the fresh ones. */
function localTime(run: ParityRun, profile: LocalProfile): { none: number; prefix: number } {
  const fresh = run.tokens.input + run.tokens.cacheCreation;
  const decode = run.tokens.output / profile.decode;
  return { none: (fresh + run.tokens.cacheRead) / profile.prefill + decode, prefix: fresh / profile.prefill + decode };
}

function cellOf(runs: readonly ParityRun[]): ParityCell {
  const first = runs[0] as ParityRun;
  const all = <T>(pick: (run: ParityRun) => T | undefined): T[] | undefined => {
    const values = runs.map(pick);
    return values.every((value) => value !== undefined) ? (values as T[]) : undefined;
  };
  const holdout = all((run) => run.holdout);
  const checks = all((run) => run.checks);
  const local: Record<string, LocalTime> = {};
  for (const profile of LOCAL_PROFILES) {
    const times = runs.map((run) => localTime(run, profile));
    local[profile.id] = {
      no_cache_s: round(meanOf(times.map((time) => time.none)), 3),
      prefix_cache_s: round(meanOf(times.map((time) => time.prefix)), 3),
    };
  }
  return {
    arm: first.arm,
    model: first.model,
    runs: runs.map((run) => run.name),
    n: runs.length,
    m_q1: round(meanOf(runs.map((run) => run.mQ1)), 6),
    ...(holdout === undefined ? {} : { holdout: round(meanOf(holdout), 6) }),
    ...(checks === undefined ? {} : { checks: round(meanOf(checks), 6) }),
    cost_eur: round(meanOf(runs.map((run) => run.costEur)), 6),
    time_ms: round(meanOf(runs.map((run) => run.wallTimeMs)), 0),
    tokens: {
      fresh: round(meanOf(runs.map((run) => run.tokens.input + run.tokens.cacheCreation)), 1),
      cached: round(meanOf(runs.map((run) => run.tokens.cacheRead)), 1),
      output: round(meanOf(runs.map((run) => run.tokens.output)), 1),
    },
    local,
  };
}

function quality(
  metric: ParityQuality['metric'],
  weak: readonly ParityRun[],
  strong: readonly ParityRun[],
  pick: (run: ParityRun) => number | undefined,
): ParityQuality[] {
  const figures = (runs: readonly ParityRun[]): Figures | undefined => {
    const values = runs.map(pick);
    return values.every((value) => value !== undefined)
      ? { runs: runs.map((run) => run.name), values: values as number[] }
      : undefined;
  };
  const w = figures(weak);
  const s = figures(strong);
  if (w === undefined || s === undefined) return [];
  const result = compare('higher', s, w);
  const worse = result.outcome === 'worse' && result.certainty === 'beyond variance';
  return [
    {
      metric,
      verdict: worse ? 'worse' : 'not worse',
      outcome: result.outcome,
      delta: round(result.delta, 6),
      certainty: result.certainty,
    },
  ];
}

function ratio(weak: number, strong: number): number | undefined {
  return strong === 0 ? undefined : round(weak / strong, 6);
}

/**
 * The parity section of an execution whose runs are `runs` and whose default model is `model` (REQ-SCO-15), or
 * undefined when no pair of models ran a harness arm with both baselines.
 */
export function paritySection(runs: readonly ParityRun[], model: string): ParitySection | undefined {
  const others = [...new Set(runs.map((run) => run.model))].filter((other) => other !== model).sort(natural);
  const entries: ParityEntry[] = [];
  const unmatched: ParityUnmatched[] = [];
  const summary: ParitySummary[] = [];
  const cell = (scenario: string, version: string, arm: string, of: string) =>
    runs
      .filter((run) => run.scenario === scenario && run.version === version && run.arm === arm && run.model === of)
      .sort((a, b) => natural(a.name, b.name));
  for (const other of others) {
    const pair = [model, other];
    // The weak model: the cheaper baselines over the scenario versions both models ran the baseline on, each scenario
    // version weighing the same (the mean of its runs, then the mean of those).
    const versions = (of: string) =>
      new Set(runs.filter((run) => run.arm === BASELINE && run.model === of).map((r) => `${r.scenario}@${r.version}`));
    const shared = [...versions(model)].filter((key) => versions(other).has(key));
    if (shared.length === 0) continue;
    const baselineCost = (of: string) =>
      meanOf(
        shared.map((key) =>
          meanOf(
            runs
              .filter((run) => run.arm === BASELINE && run.model === of && `${run.scenario}@${run.version}` === key)
              .map((run) => run.costEur),
          ),
        ),
      );
    const [costA, costB] = pair.map(baselineCost) as [number, number];
    if (costA === costB) continue;
    const [weak, strong] = costA < costB ? [model, other] : [other, model];
    const harnesses = [
      ...new Set(runs.filter((run) => run.harness && pair.includes(run.model)).map((run) => run.arm)),
    ].sort(natural);
    for (const harness of harnesses) {
      const keys = [
        ...new Set(
          runs
            .filter((run) => run.arm === harness && pair.includes(run.model))
            .map((run) => `${run.scenario}\u0000${run.version}`),
        ),
      ].sort(natural);
      let holds = 0;
      let fails = 0;
      let missing = 0;
      let preliminary = 0;
      for (const key of keys) {
        const [scenario, version] = key.split('\u0000') as [string, string];
        const weakHarness = cell(scenario, version, harness, weak);
        const strongBaseline = cell(scenario, version, BASELINE, strong);
        const lacking =
          weakHarness.length === 0 ? `no ${harness} run on ${weak}` : strongBaseline.length === 0 ? `no baseline run on ${strong}` : undefined;
        if (lacking !== undefined) {
          missing += 1;
          unmatched.push({ scenario, version, harness, weak_model: weak, strong_model: strong, reason: lacking });
          continue;
        }
        const k = Math.min(weakHarness.length, strongBaseline.length);
        const sample = (cellRuns: readonly ParityRun[]) => cellRuns.slice(0, k);
        const w = sample(weakHarness);
        const s = sample(strongBaseline);
        const reference = (cellRuns: readonly ParityRun[]) => (cellRuns.length === 0 ? undefined : cellOf(sample(cellRuns)));
        const control = runs
          .filter(
            (run) =>
              run.docsOf === harness && run.scenario === scenario && run.version === version && run.model === weak,
          )
          .sort((a, b) => natural(a.name, b.name));
        const weakBaseline = reference(cell(scenario, version, BASELINE, weak));
        const weakControl = reference(control);
        const strongHarness = reference(cell(scenario, version, harness, strong));
        const cells = {
          weak_harness: cellOf(w),
          strong_baseline: cellOf(s),
          ...(weakBaseline === undefined ? {} : { weak_baseline: weakBaseline }),
          ...(weakControl === undefined ? {} : { weak_control: weakControl }),
          ...(strongHarness === undefined ? {} : { strong_harness: strongHarness }),
        };
        const qualities = [
          ...quality('M-Q1', w, s, (run) => run.mQ1),
          ...quality('hold-out', w, s, (run) => run.holdout),
          ...quality('checks', w, s, (run) => run.checks),
        ];
        const wc = cells.weak_harness;
        const sc = cells.strong_baseline;
        const ratios: ParityRatios = Object.fromEntries(
          (
            [
              ['cost', ratio(wc.cost_eur, sc.cost_eur)],
              ['time', ratio(wc.time_ms, sc.time_ms)],
              ['tokens_fresh', ratio(wc.tokens.fresh, sc.tokens.fresh)],
              ['tokens_cached', ratio(wc.tokens.cached, sc.tokens.cached)],
              ['tokens_output', ratio(wc.tokens.output, sc.tokens.output)],
            ] as const
          ).filter(([, value]) => value !== undefined),
        );
        const lower = (value: number | undefined) => value !== undefined && value < 1;
        const hW =
          qualities.every((q) => q.verdict === 'not worse') && lower(ratios.cost) && lower(ratios.time)
            ? 'holds'
            : 'fails';
        if (hW === 'holds') holds += 1;
        else fails += 1;
        if (k < 3) preliminary += 1;
        const agentSeconds = sc.time_ms / 1000;
        const breakEven = (mode: keyof LocalTime) =>
          LOCAL_PROFILES.find((profile) => (wc.local[profile.id]?.[mode] ?? Infinity) <= agentSeconds)?.id ?? 'none';
        entries.push({
          scenario,
          version,
          harness,
          weak_model: weak,
          strong_model: strong,
          k,
          preliminary: k < 3,
          cells,
          quality: qualities,
          ratios,
          h_w: hW,
          break_even: { no_cache: breakEven('no_cache_s'), prefix_cache: breakEven('prefix_cache_s') },
        });
      }
      summary.push({ weak_model: weak, strong_model: strong, harness, holds, fails, preliminary, unmatched: missing });
    }
  }
  // With no scenario matched in any pair there is nothing to read, whatever is unmatched: no section.
  if (entries.length === 0) return undefined;
  return { local_profiles: { assumption: LOCAL_ASSUMPTION, profiles: LOCAL_PROFILES }, entries, unmatched, summary };
}
