import { join } from 'node:path';

import { readableTranscript } from '../agents/index.js';
import { readRunDetail, resolveRun } from '../results/index.js';
import { loadScenario } from '../scenario/index.js';
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
    if (runs.length !== 1 || rest.length - runs.length > 1 || runs.some(isFlag)) return usage(io);
    const detail = open(root, runs[0] as string);
    if (!detail.ok) return report(detail.issues, io);
    io.stdout(showRun(detail.value, full, stepCountOf(root, detail.value)));
    return EXIT.ok;
  }
  if (verb === 'compare') {
    if (rest.length !== 2 || rest.some(isFlag)) return usage(io);
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
    io.stdout(compareRuns(left, right, stepCountOf(root, left)));
    return EXIT.ok;
  }
  return usage(io);
}

const isFlag = (argument: string) => argument.startsWith('--');

/**
 * How many steps the run's scenario version has, from `scenarios/` when it is there and is the version
 * the run ran: what tells an unscored run's unreached steps (task-043's review). Otherwise unknown.
 */
function stepCountOf(root: string, run: RunDetail): number | undefined {
  try {
    const scenario = loadScenario(join(root, 'scenarios'), run.scenario, run.version);
    return scenario.ok && scenario.value.hash === run.scenarioHash ? scenario.value.steps.length : undefined;
  } catch {
    // A scenario that cannot be read (a file the hash cannot open) leaves the steps the run recorded.
    return undefined;
  }
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

/**
 * Every step number of the runs: the scenario's, when known, those they recorded, and those their scores
 * say they never reached.
 */
function stepNumbers(count: number | undefined, ...runs: readonly RunDetail[]): number[] {
  const numbers = new Set<number>(Array.from({ length: count ?? 0 }, (_, index) => index + 1));
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
export function showRun(run: RunDetail, full: boolean, stepCount?: number): string {
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
  if (run.expectedFailure !== undefined) {
    out.push(`- expected failure: missing ${run.expectedFailure.join(', ')}`);
  }
  if (run.manualTokens !== undefined) out.push(`- manual: ${run.manualTokens} tokens`);
  if (run.setup !== undefined) {
    out.push(
      `- setup: ${run.setup.durationMs ?? '?'} ms, ${run.setup.costUsd === undefined ? '? USD' : usd(run.setup.costUsd)}`,
    );
  }
  for (const n of stepNumbers(stepCount, run)) {
    out.push('', `## Step ${pad(n)}`, '');
    const step = run.steps.find((candidate) => candidate.n === n);
    if (step === undefined) out.push('not reached');
    else out.push(...showStep(run, step, full));
  }
  const unscored = run.scoreIssue === undefined ? 'not scored' : `not scored: ${run.scoreIssue}`;
  out.push('', '## Test results', '', ...(run.score === undefined ? [unscored] : testResults(run.score)));
  return `${out.join('\n')}\n`;
}

/**
 * What a step's session reported it cost; for a step killed at its time cap (task-024), what it
 * reported before, if anything, and the most it can have cost.
 */
function reportedCost(step: StepDetail): string {
  const reported = step.usage.costUsd;
  if (step.costBoundUsd === undefined) return usd(reported);
  return `${reported > 0 ? `${usd(reported)} reported` : 'not reported'}, at most ${usd(step.costBoundUsd)}`;
}

function showStep(run: RunDetail, step: StepDetail, full: boolean): string[] {
  const u = step.usage;
  const costEur = stepCostEur(run.score, step.n);
  const out = [
    `- session: ${step.session ?? '—'}, outcome: ${step.outcome}`,
    `- tokens: input ${u.inputTokens}, output ${u.outputTokens}, cache creation ${u.cacheCreationInputTokens}, cache read ${u.cacheReadInputTokens}`,
    `- cost: ${reportedCost(step)}${costEur === undefined ? '' : `, ${eur(costEur)}`}, ${u.turns} turns, ${(u.durationMs / 1000).toFixed(1)} s`,
  ];
  // The models the agent reported using (task-054): the run's own, and any it called for its own work.
  const models = Object.entries(step.models ?? {});
  if (models.length > 0) {
    const listed = models.map(
      ([key, m]) =>
        `${key} (output ${m.outputTokens}, cache read ${m.cacheReadInputTokens}, ${usd(m.costUsd)})`,
    );
    out.push(`- models: ${listed.join(', ')}`);
  }
  const replies = run.interventions.filter((intervention) => intervention.step === step.n);
  out.push(`- interventions: ${step.interventions === 0 ? 'none' : step.interventions}`);
  for (const reply of replies) out.push(`  - ${reply.kind}: ${reply.reply}`);
  // A rate limit's waits (task-051), apart from the approver's interventions.
  for (const wait of step.rateLimitWaits ?? []) {
    out.push(`- rate-limit wait: ${wait.waitedS} s after invocation ${wait.afterInvocation}`);
  }
  if (step.messages === 'unreadable') out.push('- commits: unreadable');
  else if (step.messages !== undefined) {
    out.push(`- commits: ${step.messages.length === 0 ? 'none' : step.messages.join('; ')}`);
  }
  out.push('', '### Transcript', '');
  if (step.transcript === undefined) {
    const asset = run.transcriptsAsset;
    out.push(
      asset === undefined
        ? 'transcript not on disk'
        : `transcript not on disk; in release ${asset.release}, asset ${asset.asset}`,
    );
  } else out.push(...readableTranscript(step.transcript, { full }));
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
export function compareRuns(a: RunDetail, b: RunDetail, stepCount?: number): string {
  const runs = [a, b];
  const labels = runs.map((run) => `${run.arm} r${run.repetition}`);
  if (labels[0] === labels[1]) {
    // The same arm and repetition: the model tells them apart, or else A and B do (two executions).
    runs.forEach((run, index) => {
      labels[index] =
        a.model === b.model
          ? `${run.arm} r${run.repetition} (${index === 0 ? 'A' : 'B'})`
          : `${run.arm} ${run.model} r${run.repetition}`;
    });
  }
  const out = ['# Compare', ''];
  runs.forEach((run, index) => {
    out.push(
      `- ${labels[index]}: ${run.name}, ${run.model}, ${run.outcome}${run.score === undefined ? `, not scored${run.scoreIssue === undefined ? '' : `: ${run.scoreIssue}`}` : ''}`,
    );
  });
  const header = labels.flatMap((label) => [`${label} cost`, `${label} M-Q1`, `${label} interventions`]);
  out.push('', `| step | ${header.join(' | ')} |`, `|${' --- |'.repeat(header.length + 1)}`);
  for (const n of stepNumbers(stepCount, a, b)) {
    const cells = runs.flatMap((run) => {
      const step = run.steps.find((candidate) => candidate.n === n);
      if (step === undefined) return ['not reached', '—', '—'];
      const scored = run.score?.steps.find((candidate) => candidate.n === n);
      const costEur = stepCostEur(run.score, n);
      return [
        costEur !== undefined
          ? `${step.costBoundUsd === undefined ? '' : '≤ '}${eur(costEur)}`
          : step.costBoundUsd === undefined
            ? usd(step.usage.costUsd)
            : `≤ ${usd(step.costBoundUsd)}`,
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
    const bounded = run.steps.some((step) => step.costBoundUsd !== undefined);
    const usdTotal = run.steps.reduce((sum, step) => sum + (step.costBoundUsd ?? step.usage.costUsd), 0);
    const cost = `${bounded ? '≤ ' : ''}${eurTotal !== undefined ? eur(eurTotal) : usd(usdTotal)}`;
    return [cost, '—', String(run.steps.reduce((sum, step) => sum + step.interventions, 0))];
  });
  out.push(`| total | ${totals.join(' | ')} |`, '');
  if ((a.score === undefined) !== (b.score === undefined)) {
    out.push('costs are in EUR where a run is scored and in USD where it is not', '');
  }
  runs.forEach((run, index) => {
    const sum = (pick: (step: StepDetail) => number) =>
      run.steps.reduce((total, step) => total + pick(step), 0);
    out.push(
      `- ${labels[index]} totals: tokens input ${sum((step) => step.usage.inputTokens)}, output ${sum((step) => step.usage.outputTokens)}, ` +
        `cache creation ${sum((step) => step.usage.cacheCreationInputTokens)}, cache read ${sum((step) => step.usage.cacheReadInputTokens)}; ` +
        `${sum((step) => step.usage.turns)} turns; ${(sum((step) => step.usage.durationMs) / 1000).toFixed(1)} s`,
    );
  });
  return `${out.join('\n')}\n`;
}
