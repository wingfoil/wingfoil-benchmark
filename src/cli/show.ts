import { readableTranscript } from '../agents/index.js';
import { readRunDetail, resolveRun } from '../results/index.js';
import type { RunDetail, ScoreView, StepDetail } from '../results/index.js';

import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

const FULL_FLAG = '--full';

/** `bench run show <run> [--full]` and `bench run compare <run> <run>` (REQ-CLI-08, F5.3): they only read. */
export function runCommand(argv: readonly string[], io: Io, root: string): number {
  const [verb, ...rest] = argv;
  if (verb === 'show') {
    const full = rest.includes(FULL_FLAG);
    const runs = rest.filter((argument) => argument !== FULL_FLAG);
    if (runs.length !== 1 || rest.length - runs.length > 1) return usage(io);
    const detail = open(root, runs[0] as string);
    if (!detail.ok) return report(detail.issues, io);
    io.stdout(showRun(detail.value, full));
    return EXIT.ok;
  }
  if (verb === 'compare') {
    if (rest.length !== 2) return usage(io);
    const [a, b] = rest.map((argument) => open(root, argument));
    if (!a?.ok) return report(a?.issues ?? [], io);
    if (!b?.ok) return report(b?.issues ?? [], io);
    const [left, right] = [a.value, b.value];
    if (
      left.scenario !== right.scenario ||
      left.version !== right.version ||
      left.scenarioHash !== right.scenarioHash
    ) {
      return report(
        [
          {
            path: left.name,
            message: `is ${versionOf(left)} and ${right.name} is ${versionOf(right)}: not the same scenario version`,
          },
        ],
        io,
      );
    }
    io.stdout(compareRuns(left, right));
    return EXIT.ok;
  }
  return usage(io);
}

function usage(io: Io): number {
  io.stderr(USAGE);
  return EXIT.usage;
}

function open(root: string, argument: string) {
  const dir = resolveRun(root, argument);
  return dir.ok ? readRunDetail(dir.value) : dir;
}

function versionOf(run: RunDetail): string {
  return `${run.scenario}@${run.version}`;
}

const usd = (value: number) => `${value.toFixed(4)} USD`;
const eur = (value: number) => `${value.toFixed(4)} EUR`;
const pad = (n: number) => String(n).padStart(2, '0');
const ratio = (t: { passed: number; total: number } | undefined) =>
  t === undefined ? '—' : `${t.passed}/${t.total}`;

/** Every step number of the run: those it recorded, and those its score says it never reached. */
function stepNumbers(...runs: readonly RunDetail[]): number[] {
  const numbers = new Set<number>();
  for (const run of runs) {
    for (const step of run.steps) numbers.add(step.n);
    for (const step of run.score?.steps ?? []) if (step.n !== undefined) numbers.add(step.n);
  }
  return [...numbers].sort((x, y) => x - y);
}

function stepCostEur(score: ScoreView | undefined, n: number): number | undefined {
  return score?.cost?.steps?.find((step) => step.n === n)?.cost_eur;
}

/** The run detail as Markdown (REQ-CLI-08 as amended in 1.18). */
export function showRun(run: RunDetail, full: boolean): string {
  const out: string[] = [`# Run ${run.name}`, ''];
  if (run.origin.campaign !== undefined)
    out.push(`- campaign: ${run.origin.campaign}, execution ${run.origin.execution}`);
  if (run.origin.dryRun === true) out.push(`- dry run: execution ${run.origin.execution}`);
  out.push(`- scenario: ${versionOf(run)} (${run.scenarioHash})`);
  out.push(`- arm: ${run.arm}, model: ${run.model}, repetition: ${run.repetition}`);
  out.push(`- outcome: ${run.outcome}${run.error === undefined ? '' : ` (${run.error})`}`);
  if (run.agent !== undefined || run.approverPolicy !== undefined) {
    out.push(`- agent: ${run.agent ?? '—'}, approver policy: ${run.approverPolicy ?? '—'}`);
  }
  if (run.harness !== undefined) out.push(`- harness: ${run.harness.tool} ${run.harness.commit}`);
  if (run.manualTokens !== undefined) out.push(`- manual: ${run.manualTokens} tokens`);
  if (run.setup !== undefined) {
    out.push(
      `- setup: ${run.setup.durationMs ?? '?'} ms, ${run.setup.costUsd === undefined ? '? USD' : usd(run.setup.costUsd)}`,
    );
  }
  for (const n of stepNumbers(run)) {
    out.push('', `## Step ${pad(n)}`, '');
    const step = run.steps.find((candidate) => candidate.n === n);
    if (step === undefined) out.push('not reached');
    else out.push(...showStep(run, step, full));
  }
  out.push('', '## Test results', '', ...(run.score === undefined ? ['not scored'] : testResults(run.score)));
  return `${out.join('\n')}\n`;
}

function showStep(run: RunDetail, step: StepDetail, full: boolean): string[] {
  const u = step.usage;
  const costEur = stepCostEur(run.score, step.n);
  const out = [
    `- session: ${step.session ?? '—'}, outcome: ${step.outcome}`,
    `- tokens: input ${u.inputTokens}, output ${u.outputTokens}, cache creation ${u.cacheCreationInputTokens}, cache read ${u.cacheReadInputTokens}`,
    `- cost: ${usd(u.costUsd)}${costEur === undefined ? '' : `, ${eur(costEur)}`}, ${u.turns} turns, ${(u.durationMs / 1000).toFixed(1)} s`,
  ];
  const replies = run.interventions.filter((intervention) => intervention.step === step.n);
  out.push(`- interventions: ${step.interventions === 0 ? 'none' : step.interventions}`);
  for (const reply of replies) out.push(`  - ${reply.kind}: ${reply.reply}`);
  if (step.messages !== undefined) {
    out.push(`- commits: ${step.messages.length === 0 ? 'none' : step.messages.join('; ')}`);
  }
  out.push('', '### Transcript', '');
  if (step.transcript === undefined) out.push('transcript not on disk');
  else out.push(...readableTranscript(step.transcript, { full }));
  out.push('', '### Diff', '');
  if (step.patch === undefined || step.patch === '') out.push('no change');
  else out.push('```diff', step.patch.replace(/\n$/, ''), '```');
  return out;
}

function testResults(score: ScoreView): string[] {
  const out: string[] = [];
  const suites = (list: ScoreView['final']['suites']) =>
    list === undefined || list.length === 0
      ? ''
      : ` (${list.map((s) => `${s.id} ${s.passed}/${s.total}`).join(', ')})`;
  const failing = (list: ScoreView['final']['suites']) =>
    (list ?? []).flatMap((s) => (s.failed ?? []).map((test) => `  - failing: ${test}`));
  for (const step of score.steps) {
    const label = `- step ${pad(step.n ?? 0)}`;
    if (step.not_reached === true) out.push(`${label}: not reached`);
    else if (step.m_q1 === undefined) out.push(`${label}: no suite`);
    else out.push(`${label}: M-Q1 ${ratio(step.m_q1)}${suites(step.suites)}`, ...failing(step.suites));
  }
  const final = score.final;
  if (final.not_reached === true) out.push('- final: not reached');
  else out.push(`- final: M-Q1 ${ratio(final.m_q1)}${suites(final.suites)}`, ...failing(final.suites));
  const holdout = score.holdout;
  if (holdout !== undefined) {
    if (!holdout.scored) out.push(`- hold-out: not scored (${holdout.reason ?? '—'})`);
    else if (holdout.final?.not_reached === true) out.push('- hold-out: final not reached');
    else out.push(`- hold-out: final ${ratio(holdout.final?.m_q1)}`);
  }
  for (const check of score.checks ?? []) {
    const steps = check.steps.map((step) =>
      step.not_reached === true
        ? `step ${pad(step.n)} not reached`
        : `step ${pad(step.n)} ${step.passed === true ? 'passed' : 'failed'}${step.violations === undefined ? '' : ` (${step.violations} violations)`}`,
    );
    out.push(`- check ${check.id} (${check.kind}): ${steps.join(', ')}`);
  }
  if (score.m_f1 !== undefined) {
    out.push(
      `- M-F1: ${score.m_f1.consistent === undefined ? 'not reached' : `${score.m_f1.consistent}/${score.m_f1.total}`}`,
    );
  }
  if (score.m_d3 !== undefined) out.push(`- M-D3: ${score.m_d3.count ?? 'not reached'}`);
  if (score.m_q2 !== undefined) out.push(`- M-Q2: ${qualityOf(score.m_q2)}`);
  return out;
}

function qualityOf(m: Readonly<Record<string, unknown>>): string {
  if (m.not_reached === true) return 'not reached';
  if (m.not_applicable === true) return 'not applicable';
  const pair = (key: string, a: string, b: string) => {
    const value = m[key] as Record<string, number> | undefined;
    return value === undefined ? `${key} —` : `${key} ${value[a]}/${value[b]}`;
  };
  return [
    pair('lint', 'findings', 'lines'),
    pair('complexity', 'sum', 'functions'),
    pair('duplication', 'duplicated_lines', 'lines'),
    pair('coverage', 'covered', 'total'),
  ].join(', ');
}

/** Two runs of one scenario version side by side (REQ-CLI-08): a row per step, the final and the totals. */
export function compareRuns(a: RunDetail, b: RunDetail): string {
  const runs = [a, b];
  const labels = runs.map((run) => `${run.arm} r${run.repetition}`);
  if (labels[0] === labels[1])
    runs.forEach((run, index) => (labels[index] = `${run.arm} ${run.model} r${run.repetition}`));
  const out = ['# Compare', ''];
  runs.forEach((run, index) => {
    out.push(
      `- ${labels[index]}: ${run.name}, ${run.model}, ${run.outcome}${run.score === undefined ? ', not scored' : ''}`,
    );
  });
  const header = labels.flatMap((label) => [`${label} cost`, `${label} M-Q1`, `${label} interventions`]);
  out.push('', `| step | ${header.join(' | ')} |`, `|${' --- |'.repeat(header.length + 1)}`);
  for (const n of stepNumbers(a, b)) {
    const cells = runs.flatMap((run) => {
      const step = run.steps.find((candidate) => candidate.n === n);
      if (step === undefined) return ['not reached', '—', '—'];
      const scored = run.score?.steps.find((candidate) => candidate.n === n);
      const costEur = stepCostEur(run.score, n);
      return [
        costEur === undefined ? usd(step.usage.costUsd) : eur(costEur),
        ratio(scored?.m_q1),
        String(step.interventions),
      ];
    });
    out.push(`| ${pad(n)} | ${cells.join(' | ')} |`);
  }
  const row = (label: string, cell: (run: RunDetail) => string) =>
    `| ${label} | ${runs.flatMap((run) => ['—', cell(run), '—']).join(' | ')} |`;
  const notScored = (run: RunDetail, text: () => string) => (run.score === undefined ? 'not scored' : text());
  out.push(
    row('final', (run) =>
      notScored(run, () =>
        run.score?.final.not_reached === true ? 'not reached' : ratio(run.score?.final.m_q1),
      ),
    ),
  );
  out.push(
    row('hold-out final', (run) =>
      notScored(run, () => {
        const holdout = run.score?.holdout;
        if (holdout === undefined || !holdout.scored) return 'not scored';
        return holdout.final?.not_reached === true ? 'not reached' : ratio(holdout.final?.m_q1);
      }),
    ),
  );
  out.push(
    row('checks', (run) =>
      notScored(run, () => {
        const steps = (run.score?.checks ?? []).flatMap((check) =>
          check.steps.filter((step) => step.not_reached !== true),
        );
        return steps.length === 0
          ? '—'
          : `${steps.filter((step) => step.passed === true).length}/${steps.length}`;
      }),
    ),
  );
  const totals = runs.flatMap((run) => {
    const eurTotal = run.score?.cost?.run?.cost_eur;
    const cost =
      eurTotal === undefined
        ? usd(run.steps.reduce((sum, step) => sum + step.usage.costUsd, 0))
        : eur(eurTotal);
    return [cost, '—', String(run.steps.reduce((sum, step) => sum + step.interventions, 0))];
  });
  out.push(`| total | ${totals.join(' | ')} |`);
  return `${out.join('\n')}\n`;
}
