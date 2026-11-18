#!/usr/bin/env node
// The hypotheses read on the scored dry runs (task-154, plan-005 step 3): per scenario version and arm, the mean over
// every completed and scored dry run of that key (n stated) of its run's cost, turns, final M-Q1, hold-out final,
// checks and M-F1; then the readings of v0.1.md §11's hypotheses (H1-H6, H8, H10, H11), each arm against its
// comparison, the configured arms beside their base arms. Every value is n-small and preliminary: calibration's, to be
// replaced by the reference campaign's.
// It runs no agent, spends nothing and writes nothing; it prints Markdown for docs/calibration/v0.3.md.
//
// Usage: node scripts/hypotheses-reading.mjs <root> [--version <v>] [--after <n>] [--through <n>]
//   --version  the scenario version read (default 1.1)
//   --after    the dry runs numbered above <n> (default 0)
//   --through  the dry runs numbered up to <n> (default: every one)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [root, ...rest] = process.argv.slice(2);
const options = {};
for (let index = 0; index < rest.length; index += 2)
  options[rest[index].replace(/^--/, '')] = rest[index + 1];
if (root === undefined) {
  console.error('usage: hypotheses-reading.mjs <root> [--version <v>] [--after <n>] [--through <n>]');
  process.exit(2);
}
const version = options.version ?? '1.1';
const after = Number(options.after ?? 0);
const through = options.through === undefined ? Infinity : Number(options.through);

const directories = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()) : [];
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Every scored, completed dry run of a key: `<scenario> <arm> <model>` → its figures, one per dry run. */
const keys = new Map();
const base = join(root, 'results', 'dry-runs');
for (const n of directories(base)
  .map(Number)
  .filter((n) => n > after && n <= through)
  .sort((a, b) => a - b)) {
  for (const scenario of directories(join(base, String(n), 'runs')).filter((name) =>
    name.endsWith(`@${version}`),
  )) {
    for (const arm of directories(join(base, String(n), 'runs', scenario))) {
      for (const model of directories(join(base, String(n), 'runs', scenario, arm))) {
        const dir = join(base, String(n), 'runs', scenario, arm, model, 'r1');
        if (!existsSync(join(dir, 'score.json')) || !existsSync(join(dir, 'run.json'))) continue;
        if (read(join(dir, 'run.json')).outcome !== 'completed') continue;
        const score = read(join(dir, 'score.json'));
        const checkSteps = (score.checks ?? []).flatMap((check) => check.steps ?? []);
        const key = `${scenario} ${arm} ${model}`;
        if (!keys.has(key)) keys.set(key, { scenario, arm, model, runs: [] });
        keys.get(key).runs.push({
          n,
          eur: score.cost.run.cost_eur,
          turns: score.cost.run.turns,
          q1: score.final.m_q1,
          holdout: score.holdout?.scored ? score.holdout.final.m_q1 : undefined,
          checks: { passed: checkSteps.filter((step) => step.passed).length, total: checkSteps.length },
          f1: score.m_f1 === undefined || score.m_f1 === null ? undefined : score.m_f1,
        });
      }
    }
  }
}

const fraction = (values) => {
  const defined = values.filter((value) => value !== undefined && value.total > 0);
  if (defined.length === 0) return '—';
  const field = 'passed' in defined[0] ? 'passed' : 'consistent';
  const top = defined.map((value) => value[field]);
  const total = defined[0].total;
  return defined.length === 1 ? `${top[0]}/${total}` : `${round(mean(top), 1)}/${total}`;
};
const round = (value, digits) => Number(value.toFixed(digits));
const figures = (key) => {
  const entry = keys.get(key);
  if (entry === undefined) return undefined;
  const { runs } = entry;
  return {
    n: runs.length,
    eur: mean(runs.map((run) => run.eur)),
    turns: mean(runs.map((run) => run.turns)),
    q1: fraction(runs.map((run) => run.q1)),
    holdout: fraction(runs.map((run) => run.holdout)),
    checks: fraction(runs.map((run) => run.checks)),
    f1: fraction(runs.map((run) => run.f1)),
    dryRuns: runs.map((run) => run.n),
  };
};

const scenarios = [...new Set([...keys.values()].map((entry) => entry.scenario))].sort();
const models = [...new Set([...keys.values()].map((entry) => entry.model))].sort();
const arms = [...new Set([...keys.values()].map((entry) => entry.arm))].sort(
  (a, b) => Number(a.endsWith('-configured')) - Number(b.endsWith('-configured')) || a.localeCompare(b),
);

console.log(
  '| Scenario | Model | Arm | n | Cost € (mean) | Turns | M-Q1 final | Hold-out final | Checks | M-F1 | Dry runs |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const scenario of scenarios)
  for (const model of models)
    for (const arm of arms) {
      const f = figures(`${scenario} ${arm} ${model}`);
      if (f === undefined) continue;
      console.log(
        `| ${scenario} | ${model} | ${arm} | ${f.n} | ${f.eur.toFixed(4)} | ${round(f.turns, 1)} | ${f.q1} | ` +
          `${f.holdout} | ${f.checks} | ${f.f1} | ${f.dryRuns.map((n) => `\`${n}\``).join(', ')} |`,
      );
    }

/** A ratio of two keys' means, with each side's n; `—` when a side is missing. */
const ratio = (field, top, bottom) => {
  const a = figures(top);
  const b = figures(bottom);
  if (a === undefined || b === undefined) return '—';
  return `${round(a[field] / b[field], 2)}× (n ${a.n}/${b.n})`;
};
const ratios = (field, model, arm, other) => {
  const parts = [];
  const values = [];
  for (const scenario of scenarios) {
    const a = figures(`${scenario} ${arm} ${model}`);
    const b = figures(`${scenario} ${other} ${model}`);
    if (a === undefined || b === undefined) continue;
    values.push(a[field] / b[field]);
    parts.push(`${scenario.split('@')[0]} ${round(a[field] / b[field], 2)}×`);
  }
  if (parts.length === 0) return '—';
  return `${parts.join(', ')}; mean ${round(mean(values), 2)}×`;
};
const value = (scenario, arm, model, field) => figures(`${scenario} ${arm} ${model}`)?.[field] ?? '—';

console.log('');
const at = (id) => scenarios.find((scenario) => scenario.startsWith(`${id}@`)) ?? `${id}@${version}`;
for (const model of models) {
  console.log(`**${model}**`);
  console.log('');
  console.log('| # | Reads | wingfoil | wingfoil-configured |');
  console.log('|---|---|---|---|');
  const pair = (render) => `| ${render('wingfoil')} | ${render('wingfoil-configured')} |`;
  console.log(`| H1 | cost ÷ baseline, per scenario ${pair((arm) => ratios('eur', model, arm, 'baseline'))}`);
  console.log(
    `| H2 | turns ÷ baseline on S1 ${pair((arm) => ratio('turns', `${at('S1')} ${arm} ${model}`, `${at('S1')} baseline ${model}`))}`,
  );
  console.log(`| H3 | M-F1 on S3 ${pair((arm) => value(at('S3'), arm, model, 'f1'))}`);
  console.log(`| H4 | S2's checks ${pair((arm) => value(at('S2'), arm, model, 'checks'))}`);
  console.log(
    `| H5 | S8's checks; hold-out final ${pair((arm) => `${value(at('S8'), arm, model, 'checks')}; ${value(at('S8'), arm, model, 'holdout')}`)}`,
  );
  console.log(
    `| H6 | M-Q1 final; hold-out final, per scenario ${pair(
      (arm) =>
        scenarios
          .filter((scenario) => keys.has(`${scenario} ${arm} ${model}`))
          .map(
            (scenario) =>
              `${scenario.split('@')[0]} ${value(scenario, arm, model, 'q1')}; ${value(scenario, arm, model, 'holdout')}`,
          )
          .join(', ') || '—',
    )}`,
  );
  console.log(
    `| H8 | cost ÷ its docs control ${pair((arm) => ratios('eur', model, arm, arm === 'wingfoil' ? 'baseline-docs' : 'baseline-docs-configured'))}`,
  );
  console.log('');
  const unsaturated = scenarios.flatMap((scenario) => {
    const entries = arms
      .map((arm) => keys.get(`${scenario} ${arm} ${model}`))
      .filter((entry) => entry !== undefined && entry.runs.some((run) => run.checks.total > 0));
    if (entries.length === 0) return [];
    const below = entries.filter(
      (entry) => mean(entry.runs.map((run) => run.checks.passed)) < entry.runs[0].checks.total,
    );
    return [`${scenario.split('@')[0]} ${below.length} of ${entries.length}`];
  });
  console.log(`H10 on ${model}, arms whose checks are not saturated: ${unsaturated.join(', ') || '—'}`);
  console.log('');
}

/** The mean of one figure of a key's dry runs; undefined when the key or the figure is missing. */
const meanOf = (scenario, arm, model, pick) => {
  const picked =
    keys
      .get(`${scenario} ${arm} ${model}`)
      ?.runs.map(pick)
      .filter((item) => item !== undefined) ?? [];
  return picked.length === 0 ? undefined : mean(picked);
};
/** The wingfoil arm's gain over the baseline on one figure, signed; `—` when a side is missing. */
const gain = (scenario, model, pick) => {
  const wingfoil = meanOf(scenario, 'wingfoil', model, pick);
  const baseline = meanOf(scenario, 'baseline', model, pick);
  if (wingfoil === undefined || baseline === undefined) return '—';
  const difference = round(wingfoil - baseline, 1);
  return `${difference > 0 ? '+' : ''}${difference}`;
};
console.log('**H11** (the wingfoil arm minus the baseline, per model)');
console.log('');
console.log('| Model | S1 M-Q1 (tests) | S3 M-Q1 (tests) | S3 M-F1 |');
console.log('|---|---|---|---|');
for (const model of models)
  console.log(
    `| ${model} | ${gain(at('S1'), model, (run) => run.q1.passed)} | ${gain(at('S3'), model, (run) => run.q1.passed)} | ` +
      `${gain(at('S3'), model, (run) => run.f1?.consistent)} |`,
  );
