import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { fail, ok } from '../core/index.js';
import type { Result } from '../core/index.js';

import { AGGREGATE_FILE } from './aggregate.js';
import type { AggregateFile, BreakEven, Group, Tally, Value } from './aggregate.js';

/** The metrics a finding note reads (REQ-CLI-07 as amended in 1.19), each from one place of the aggregate. */
export const METRICS = [
  'M-Q1',
  'M-Q1-holdout',
  'M-Q2',
  'M-D3',
  'M-F1',
  'M-F2',
  'M-K1',
  'M-K2',
  'M-K3',
  'M-K4',
  'M-E1',
  'M-R',
] as const;

export type Metric = (typeof METRICS)[number];

/** The WingFoil element a finding is shaped for (task-044, the approver's choice 1). */
export type FindingShape = 'bug' | 'decision-log';

/** What a finding note is made from: an aggregated execution, a scenario version, a metric, and arms. */
export interface FindingRequest {
  readonly executionDir: string;
  readonly scenario: string;
  readonly version: string;
  readonly metric: string;
  readonly arms: readonly string[];
  readonly as: FindingShape;
}

/** The note: its id, which names `findings/<id>.md`, and its Markdown. */
export interface FindingNote {
  readonly id: string;
  readonly text: string;
}

/**
 * The WingFoil commit the finding's WingFoil section follows the templates of: the pinned v0.2
 * pre-release (sequencer decision 3, amended in 1.1), `docs/self/.wingfoil/memory/templates/` there.
 */
const TEMPLATE_COMMIT = '3df305e';

/** The harness tool whose commit the note names (REQ-RUN-14). */
const WINGFOIL = 'wingfoil';

const BASELINE = 'baseline';

/** A run's short name in a list of values: its repetition directory. */
const short = (run: string) => run.split('/').at(-1) ?? run;

const tally = (t: Tally) => `${t.passed}/${t.total}`;
const pair = <K extends string>(a: K, b: K) => (t: Readonly<Record<K, number>>) => `${t[a]}/${t[b]}`;
const eur = (n: number) => `${n.toFixed(4)} EUR`;
const count = (n: number) => String(n);
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** A `Value` as one line's text: each run's figure, then the range from two runs; or that there is none. */
function valueText<T>(value: Value<T> | undefined, format: (t: T) => string): string {
  if (value === undefined || value.n === 0) return 'no value';
  const figures = value.values.map((figure, index) => `${format(figure)} (${short(value.runs[index] ?? '')})`);
  const range =
    value.min === undefined || value.max === undefined ? '' : `; range ${format(value.min)}–${format(value.max)}`;
  return `${figures.join(', ')}${range}`;
}

const NOT_MEASURED = '- not measured for this scenario';

/** The lines of one arm's group for `metric`: what the aggregate holds, or what it lacks, said so. */
function metricLines(metric: Metric, group: Group, aggregate: AggregateFile): string[] {
  const m = group.metrics;
  switch (metric) {
    case 'M-Q1': {
      const lines = [`- final M-Q1: ${valueText(m.m_q1.final.m_q1, tally)}`];
      if (m.m_q1.final.not_reached.length > 0) lines.push(`- final not reached: ${m.m_q1.final.not_reached.join(', ')}`);
      return lines;
    }
    case 'M-Q1-holdout':
      return m.holdout.scored
        ? [
            `- hold-out final M-Q1: ${valueText(m.holdout.final.m_q1, tally)}`,
            ...m.holdout.not_scored.map((entry) => `- hold-out not scored: ${entry.run} (${entry.reason})`),
          ]
        : [`- hold-out: not scored (${m.holdout.reason})`];
    case 'M-Q2': {
      const q = m.m_q2;
      if (q === undefined) return [NOT_MEASURED];
      return [
        `- lint (findings/lines): ${valueText(q.lint, pair('findings', 'lines'))}`,
        `- complexity (sum/functions): ${valueText(q.complexity_mean, pair('sum', 'functions'))}`,
        `- complexity max: ${valueText(q.complexity_max, count)}`,
        `- duplication (duplicated lines/lines): ${valueText(q.duplication, pair('duplicated_lines', 'lines'))}`,
        `- coverage (covered/total): ${valueText(q.coverage, pair('covered', 'total'))}`,
        ...(q.not_reached.length === 0 ? [] : [`- not reached: ${q.not_reached.join(', ')}`]),
        ...(q.not_applicable.length === 0 ? [] : [`- not applicable: ${q.not_applicable.join(', ')}`]),
      ];
    }
    case 'M-D3':
      return m.m_d3 === undefined
        ? [NOT_MEASURED]
        : [
            `- M-D3: ${valueText(m.m_d3.value, count)}`,
            // A final not reached loses every test the seed passed (task-039): said, not a plain figure.
            ...(m.m_d3.not_reached.length === 0
              ? []
              : [`- final not reached, a loss of every test the seed passed: ${m.m_d3.not_reached.join(', ')}`]),
          ];
    case 'M-F1':
      if (m.m_f1 === undefined) return [NOT_MEASURED];
      return [
        `- share consistent: ${valueText(m.m_f1.share, tally)}`,
        ...m.m_f1.decisions.map(
          (d) =>
            `- ${d.id}: ${valueText(d.consistent, tally)}; respected ${d.outcomes.respected}, revised ${d.outcomes.revised}, failed ${d.outcomes.failed}`,
        ),
        ...(m.m_f1.not_reached.length === 0
          ? []
          : [`- final not reached, nothing consistent: ${m.m_f1.not_reached.join(', ')}`]),
      ];
    case 'M-F2':
      if (m.m_f2 === undefined) return [NOT_MEASURED];
      return m.m_f2.steps.map(
        (step) =>
          `- step ${String(step.step).padStart(2, '0')}: cost ${valueText(step.cost_eur, eur)}; M-Q1 ${valueText(step.m_q1, tally)}` +
          (step.not_reached.length === 0 ? '' : `; not reached: ${step.not_reached.join(', ')}`),
      );
    case 'M-K1':
      return [
        `- cost: ${valueText(m.cost.cost_eur, eur)}`,
        `- tokens input: ${valueText(m.cost.tokens_input, count)}`,
        `- tokens output: ${valueText(m.cost.tokens_output, count)}`,
        `- tokens cache creation: ${valueText(m.cost.tokens_cache_creation, count)}`,
        `- tokens cache read: ${valueText(m.cost.tokens_cache_read, count)}`,
        ...(m.cost.bound.length === 0 ? [] : [`- cost is a bound for: ${m.cost.bound.join(', ')}`]),
      ];
    case 'M-K2':
      return [
        `- interventions: ${valueText(m.cost.interventions, count)}`,
        `- turns: ${valueText(m.cost.turns, count)}`,
        `- wall time: ${valueText(m.cost.wall_time_ms, seconds)}`,
      ];
    case 'M-K3':
      if (m.cost.setup_cost_eur === undefined) return ['- setup not recorded for this arm'];
      return [
        `- setup cost: ${valueText(m.cost.setup_cost_eur, eur)}`,
        `- setup time: ${valueText(m.cost.setup_wall_time_ms, seconds)}`,
        `- manual tokens: ${valueText(m.cost.manual_tokens, count)}`,
      ];
    case 'M-K4':
      return [breakEvenLine(group, aggregate.break_even)];
    case 'M-E1': {
      const directive = m.checks.filter((check) => check.steps.some((step) => step.violations !== undefined));
      if (m.checks.length === 0) return ['- no check in this scenario'];
      if (directive.length === 0) return ['- no directive check in this scenario'];
      return directive.flatMap((check) =>
        check.steps.map(
          (step) =>
            `- ${check.id}, step ${String(step.step).padStart(2, '0')}: violations ${valueText(step.violations, count)}`,
        ),
      );
    }
    case 'M-R':
      return determinismLines(group);
  }
}

function breakEvenLine(group: Group, entries: readonly BreakEven[]): string {
  if (group.arm === BASELINE) return `- ${BASELINE}: the arm the others are compared with`;
  const entry = entries.find(
    (e) => e.scenario === group.scenario && e.version === group.version && e.model === group.model && e.arm === group.arm,
  );
  if (entry === undefined) return `- ${group.arm}: no break-even (no baseline, or a setup cost not recorded)`;
  const value = typeof entry.value === 'number' ? `${entry.value} runs` : entry.value;
  return (
    `- ${group.arm}: ${value}; setup ${eur(entry.setup_cost_eur.arm)}; mean step cost ` +
    `${eur(entry.mean_step_cost_eur.arm)} against ${eur(entry.mean_step_cost_eur.baseline)}; ` +
    `n ${entry.n.arm} against ${entry.n.baseline}`
  );
}

function determinismLines(group: Group): string[] {
  const r = group.metrics.m_r;
  const notReached = r.not_reached.length === 0 ? [] : [`- not reached, left out: ${r.not_reached.join(', ')}`];
  if (r.n < 2) return [`- ${group.arm}: n = ${r.n}: no value`, ...notReached];
  if (r.pins_differ !== undefined) return [`- ${group.arm}: pins differ (${r.pins_differ.join(', ')}): no value`, ...notReached];
  const over = r.runs.join(', ');
  const similarity = (name: string, s: typeof r.m_r2) =>
    s === undefined
      ? `- ${name}: not measured (scored before task-042)`
      : `- ${name}: mean ${s.mean}; ${s.pairs.map((p) => `${short(p.runs[0])}–${short(p.runs[1])} ${p.intersection}/${p.union}`).join(', ')}`;
  return [
    r.m_r1 === undefined ? '- M-R1: not measured' : `- M-R1: ${r.m_r1.agree}/${r.m_r1.total} over ${over}`,
    similarity('M-R2', r.m_r2),
    similarity('M-R3', r.m_r3),
    ...notReached,
  ];
}

const recordSchema = z.object({
  scenario_hash: z.string(),
  harness: z.object({ tool: z.string(), commit: z.string() }).optional(),
});

/** What a note reads of a run's `run.json`: its scenario hash and its harness; or why it cannot. */
function readRecord(file: string, label: string): Result<z.infer<typeof recordSchema>> {
  try {
    const parsed = recordSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (parsed.success) return ok(parsed.data);
    return fail([{ path: label, message: `does not record ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}` }]);
  } catch (error) {
    return fail([{ path: label, message: `cannot be read: ${(error as Error).message}` }]);
  }
}

/** The note's file name, from its inputs (the approver's choice 2): the same finding, the same name. */
function idOf(campaign: string, execution: string, request: FindingRequest): string {
  // The arms sorted: the same finding has one name whatever the order it was asked in.
  const arms = [...request.arms].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [campaign, execution, request.scenario, request.version, request.metric, arms.join('+')]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9.+-]/g, '-');
}

/**
 * A finding note (F5.4, REQ-RES-05 as amended in 1.19) from the aggregated execution in `executionDir`:
 * the campaign, the WingFoil commit its runs record, the scenario version, the runs, the metric's values
 * per arm, links to the run details, and a section shaped as WingFoil's `bug` or `decision-log`
 * template, its facts filled and its judgement left to the maintainer. No date: the same inputs give
 * the same bytes. It reads only; writing it is the caller's.
 */
export function findingNote(request: FindingRequest): Result<FindingNote> {
  if (!(METRICS as readonly string[]).includes(request.metric)) {
    return fail([{ path: '--metric', message: `${request.metric} is not one of ${METRICS.join(', ')}` }]);
  }
  const metric = request.metric as Metric;
  const file = join(request.executionDir, AGGREGATE_FILE);
  if (!existsSync(file)) {
    return fail([{ path: request.executionDir, message: `has no ${AGGREGATE_FILE}: score it first (bench score)` }]);
  }
  let aggregate: AggregateFile;
  try {
    aggregate = JSON.parse(readFileSync(file, 'utf8')) as AggregateFile;
  } catch (error) {
    return fail([{ path: file, message: `cannot be read: ${(error as Error).message}` }]);
  }
  const version = `${request.scenario}@${request.version}`;
  const ofVersion = aggregate.groups.filter((g) => g.scenario === request.scenario && g.version === request.version);
  if (ofVersion.length === 0) {
    const known = [...new Set(aggregate.groups.map((g) => `${g.scenario}@${g.version}`))].join(', ');
    return fail([{ path: '--scenario', message: `${version} is not in the execution (${known})` }]);
  }
  const twice = request.arms.find((arm, index) => request.arms.indexOf(arm) !== index);
  if (twice !== undefined) return fail([{ path: '--arms', message: `${twice} is named twice` }]);
  const groups: Group[] = [];
  for (const arm of request.arms) {
    const group = ofVersion.find((g) => g.arm === arm);
    if (group === undefined) {
      const known = ofVersion.map((g) => g.arm).join(', ');
      return fail([{ path: '--arms', message: `${arm} has no run of ${version} (${known})` }]);
    }
    groups.push(group);
  }

  const campaign = aggregate.campaign;
  const execution = String(aggregate.execution);
  const runDir = (run: string) => join(request.executionDir, run.split('/').slice(2).join('/'));
  // The two things the aggregate lacks, from each run's record; a record that cannot be read refuses the
  // note, which would otherwise say WingFoil never ran (task-044's review).
  const hashes = new Set<string>();
  const commits = new Map<string, string[]>();
  for (const run of groups.flatMap((group) => group.runs)) {
    const record = readRecord(join(runDir(run), 'run.json'), `${run}/run.json`);
    if (!record.ok) return record;
    hashes.add(record.value.scenario_hash);
    const harness = record.value.harness;
    if (harness?.tool === WINGFOIL) commits.set(harness.commit, [...(commits.get(harness.commit) ?? []), run]);
  }
  const hash = [...hashes].join(', ');
  const values = groups.flatMap((group) => ['', `### ${group.arm}`, '', ...metricLines(metric, group, aggregate)]);
  // Each arm under a heading of its own: a label after a list would be read as part of its last item.
  const actual = groups.flatMap((group, index) => [
    ...(index === 0 ? [] : ['']),
    `### ${group.arm}`,
    '',
    ...metricLines(metric, group, aggregate),
  ]);
  const aggregatePath = `results/${campaign}/${execution}/${AGGREGATE_FILE}`;
  const preliminary = groups.some((group) => group.preliminary);
  const id = idOf(campaign, execution, request);
  // Rerunning the campaign makes a new execution: its number is the one `bench campaign run` prints.
  const reproduce = [
    `\`bench campaign run results/${campaign}/${execution}/campaign.yaml\``,
    `\`bench score ${campaign}/<n>\``,
    `\`bench finding ${campaign}/<n> --scenario ${version} --metric ${metric} --arms ${request.arms.join(',')} --as ${request.as}\``,
  ];
  const links = [
    ...groups.flatMap((group) => group.runs.map((run) => `- \`bench run show ${run}\``)),
    ...groups.flatMap((a, i) =>
      groups.slice(i + 1).map((b) => `- \`bench run compare ${a.runs[0] ?? ''} ${b.runs[0] ?? ''}\``),
    ),
  ];
  const facts = [
    `- Benchmark campaign ${campaign}, execution ${execution}, model ${aggregate.model}${preliminary ? ' (preliminary: a group of one run)' : ''}.`,
    `- WingFoil commit: ${commits.size === 0 ? 'none of these arms ran WingFoil' : [...commits.keys()].join(', ')}.`,
    `- Finding note: findings/${id}.md; aggregate: ${aggregatePath}.`,
    `- The runs, in the benchmark repository:`,
    ...links.map((link) => `  ${link}`),
  ];

  const lines = [
    `# Finding: ${metric} on ${version} — ${request.arms.join(', ')}`,
    '',
    '## Campaign',
    '',
    `- campaign: ${campaign}, execution ${execution}, model ${aggregate.model}`,
    `- preliminary: ${preliminary ? 'yes, a group of one run' : 'no'}`,
    `- aggregate: ${aggregatePath}`,
    '',
    '## WingFoil commit',
    '',
    ...(commits.size === 0
      ? ['- none: no arm named ran WingFoil']
      : [...commits.entries()].map(([commit, runs]) => `- ${commit}: ${runs.join(', ')}`)),
    '',
    '## Scenario',
    '',
    `- ${version} (${hash})`,
    '',
    '## Runs',
    '',
    ...groups.flatMap((group) => [
      `- ${group.arm}: n = ${group.n}${group.preliminary ? ' (preliminary)' : ''}: ${group.runs.join(', ')}`,
      ...group.losses.map((loss) => `  - loss: ${loss.run} — ${loss.reason}`),
    ]),
    '',
    `## Metric values`,
    ...values,
    '',
    '## Links',
    '',
    ...links,
    `- ${aggregatePath}`,
    '',
    `## For WingFoil: ${request.as}`,
    '',
    `To paste into the element \`wingfoil memory add --type ${request.as} --title "…"\` creates, whose template is that of WingFoil ${TEMPLATE_COMMIT}: the front matter's fields below, then the body. What is marked "to fill" is the maintainer's.`,
    '',
    ...(request.as === 'bug' ? bugBlock(actual, facts, reproduce) : decisionLogBlock(actual, facts)),
  ];
  return ok({ id, text: `${lines.join('\n')}\n` });
}

function bugBlock(actual: readonly string[], facts: readonly string[], reproduce: readonly string[]): string[] {
  return [
    '```yaml',
    'severity: ""           # to fill: critical | high | medium | low',
    '```',
    '',
    '```markdown',
    '## Summary',
    '',
    '<!-- to fill: the defect in one sentence. -->',
    '',
    '## Steps to Reproduce',
    '',
    `1. In the WingFoil benchmark, rerun the campaign: ${reproduce[0]}. It prints its execution, \`<n>\`.`,
    `2. Score that execution: ${reproduce[1]}.`,
    `3. Export this finding from it: ${reproduce[2]}.`,
    '',
    '## Expected Behavior',
    '',
    '<!-- to fill: what WingFoil should have made happen. -->',
    '',
    '## Actual Behavior',
    '',
    ...actual,
    '',
    '## Notes',
    '',
    ...facts,
    '',
    '## Triage & Execution Notes',
    '',
    '<!-- to fill: at triage, as WingFoil\'s template asks. -->',
    '```',
  ];
}

function decisionLogBlock(actual: readonly string[], facts: readonly string[]): string[] {
  return [
    '```yaml',
    'context: "benchmark finding"',
    '```',
    '',
    '```markdown',
    '## Context',
    '',
    ...actual,
    '',
    ...facts,
    '',
    '## Decision',
    '',
    '<!-- to fill: what WingFoil decides about it. -->',
    '',
    '## Rationale',
    '',
    '<!-- to fill: why, and the alternatives weighed. -->',
    '',
    '## Actions',
    '',
    '<!-- to fill: follow-ups, if any. -->',
    '```',
  ];
}
