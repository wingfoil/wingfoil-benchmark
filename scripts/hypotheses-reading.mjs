#!/usr/bin/env node
// The hypotheses read on the scored dry runs (task-154, plan-005 step 3): per scenario version and arm, the mean over
// every completed and scored dry run of that key (n stated) of its run's cost, turns, final M-Q1, hold-out final,
// checks and M-F1; then the readings of v0.1.md §11's hypotheses (H1-H6, H8, H10, H11), each arm against its
// comparison, the configured arms beside their base arms. Every value is n-small and preliminary: calibration's, to be
// replaced by the reference campaign's.
// It runs no agent, spends nothing and writes nothing; it prints Markdown for docs/calibration/v0.3.md.
//
// Usage: node scripts/hypotheses-reading.mjs <root> [--version <v>] [--after <n>] [--through <n>] [--skip <n>]
//   --version  the scenario version read (default 1.1)
//   --after    the dry runs numbered above <n> (default 0)
//   --through  the dry runs numbered up to <n> (default: every one)
//   --skip     a superseded dry run left out
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [root, ...rest] = process.argv.slice(2);
const options = {};
for (let index = 0; index < rest.length; index += 2)
  options[rest[index].replace(/^--/, '')] = rest[index + 1];
const known = ['version', 'after', 'through', 'skip'];
if (root === undefined || Object.keys(options).some((name) => !known.includes(name))) {
  console.error(
    'usage: hypotheses-reading.mjs <root> [--version <v>] [--after <n>] [--through <n>] [--skip <n>]',
  );
  process.exit(2);
}
const version = options.version ?? '1.1';
const after = Number(options.after ?? 0);
const through = options.through === undefined ? Infinity : Number(options.through);
const skip = options.skip === undefined ? undefined : Number(options.skip);

const directories = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()) : [];
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Every scored, completed dry run of a key: `<scenario> <arm> <model>` → its figures, one per dry run. */
const keys = new Map();
const base = join(root, 'results', 'dry-runs');
for (const n of directories(base)
  .map(Number)
  .filter((n) => n > after && n <= through && n !== skip)
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
  if (new Set(defined.map((value) => value.total)).size > 1) return 'mixed totals';
  const field = 'passed' in defined[0] ? 'passed' : 'consistent';
  const top = defined.map((value) => value[field]);
  const total = defined[0].total;
  const text = defined.length === 1 ? `${top[0]}/${total}` : `${round(mean(top), 1)}/${total}`;
  return defined.length < values.length ? `${text} (n ${defined.length})` : text;
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

/** Per scenario, how many arms' checks stay below their maximum on a model, of the arms that have checks. */
const unsaturatedOf = (model) =>
  scenarios.flatMap((scenario) => {
    const entries = arms
      .map((arm) => keys.get(`${scenario} ${arm} ${model}`))
      .filter((entry) => entry !== undefined && entry.runs.some((run) => run.checks.total > 0));
    if (entries.length === 0) return [];
    const below = entries.filter(
      (entry) => mean(entry.runs.map((run) => run.checks.passed)) < entry.runs[0].checks.total,
    );
    return [`${scenario.split('@')[0]} ${below.length} of ${entries.length}`];
  });

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
  const unsaturated = unsaturatedOf(model);
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
/** The wingfoil arm's gain over the baseline on one figure; undefined when a side is missing. */
const gainOf = (scenario, model, pick) => {
  const wingfoil = meanOf(scenario, 'wingfoil', model, pick);
  const baseline = meanOf(scenario, 'baseline', model, pick);
  return wingfoil === undefined || baseline === undefined ? undefined : round(wingfoil - baseline, 1);
};
const gain = (scenario, model, pick) => {
  const difference = gainOf(scenario, model, pick);
  if (difference === undefined) return '—';
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

// The verdicts, each against v0.1.md §11's "Holds when", on Sonnet 5.5, the model every arm ran.
const READ_MODEL = models.includes('claude-sonnet-5-5') ? 'claude-sonnet-5-5' : models.at(-1);
/** v0.2.md §9's bridge (v0.2.2 on Sonnet 5.5, the same model): the ratios H1 and H2 must fall from. */
const TODAY = { S1: 1.81, S2: 1.43, S3: 2.18, S8: 1.87 };
const TODAY_TURNS_S1 = 1.8;
const IDS = ['S1', 'S2', 'S3', 'S8'];
const runsOf = (id, arm) => keys.get(`${at(id)} ${arm} ${READ_MODEL}`)?.runs ?? [];
const keyRatio = (id, arm, other, field) => {
  const top = figures(`${at(id)} ${arm} ${READ_MODEL}`);
  const bottom = figures(`${at(id)} ${other} ${READ_MODEL}`);
  return top === undefined || bottom === undefined ? undefined : top[field] / bottom[field];
};
const verdict = (met, detail) => `${met ? 'met' : 'not met'}: ${detail}`;
const allChecks = (run) => run.checks.total > 0 && run.checks.passed === run.checks.total;
const f1Holds = (run) => run.f1 !== undefined && run.f1.consistent >= 4;
const meanTests = (runs, pick) => mean(runs.map(pick).filter((item) => item !== undefined));
const control = (arm) => (arm === 'wingfoil' ? 'baseline-docs' : 'baseline-docs-configured');

/** The runs more than one test below the baseline's mean, public and hold-out, and the sides that cannot be read. */
const belowBaseline = (arm) => {
  const below = [];
  const unread = [];
  for (const id of IDS) {
    if (runsOf(id, arm).length === 0) continue;
    for (const [label, pick] of [
      ['', (run) => run.q1],
      [' hold-out', (run) => run.holdout],
    ]) {
      const levels = runsOf(id, 'baseline').flatMap((run) => pick(run)?.passed ?? []);
      if (levels.length === 0 || runsOf(id, arm).some((run) => pick(run) === undefined)) {
        unread.push(`${id}${label}`);
        continue;
      }
      const level = mean(levels);
      for (const run of runsOf(id, arm))
        if (pick(run).passed < level - 1)
          below.push(
            `${id}${label} \`${run.n}\` (${pick(run).passed}/${pick(run).total} against ${round(level, 1)})`,
          );
    }
  }
  return { below, unread };
};

const engineDeclared = () => {
  const file = join(root, 'arms', 'wingfoil', 'arm.yaml');
  return existsSync(file) && /^\s*workflow-engine:\s*true\s*$/m.test(readFileSync(file, 'utf8'));
};
/** The scenario versions read whose scenario.yaml names the engine, so that H7's second half can be stated. */
const engineRequired = () =>
  scenarios.filter((scenario) => {
    const [id, number] = scenario.split('@');
    const file = join(root, 'scenarios', id, number, 'scenario.yaml');
    return existsSync(file) && readFileSync(file, 'utf8').includes('workflow-engine');
  });

const H11_PICKS = [
  ['S1', (run) => run.q1.passed],
  ['S3', (run) => run.q1.passed],
  ['S3', (run) => run.f1?.consistent],
];

const rows = [
  [
    'H1',
    'the ratio falls on at least three of the four scenarios, and below 1.5× on S1',
    (arm) => {
      const read = IDS.map((id) => [id, keyRatio(id, arm, 'baseline', 'eur')]).filter(
        ([, r]) => r !== undefined,
      );
      const s1 = read.find(([id]) => id === 'S1')?.[1];
      if (s1 === undefined) return 'not read';
      const falls = read.filter(([id, r]) => r < TODAY[id]).length;
      return verdict(falls >= 3 && s1 < 1.5, `S1 ${round(s1, 2)}×, falls on ${falls} of ${read.length}`);
    },
  ],
  [
    'H2',
    `the ratio falls on S1, from ${TODAY_TURNS_S1}×`,
    (arm) => {
      const ratioS1 = keyRatio('S1', arm, 'baseline', 'turns');
      if (ratioS1 === undefined) return 'not read';
      return verdict(ratioS1 < TODAY_TURNS_S1, `${round(ratioS1, 2)}×`);
    },
  ],
  [
    'H3',
    'M-F1 ≥ 4/5 and D3 recorded, in every wingfoil run',
    (arm) => {
      const runs = runsOf('S3', arm);
      if (runs.length === 0) return 'not read';
      const held = runs.filter((run) => f1Holds(run) && allChecks(run)).length;
      return verdict(held === runs.length, `${held} of ${runs.length} runs`);
    },
  ],
  [
    'H4',
    '3/3 in every wingfoil run',
    (arm) => {
      const runs = runsOf('S2', arm);
      if (runs.length === 0) return 'not read';
      const held = runs.filter(allChecks).length;
      return verdict(held === runs.length, `${held} of ${runs.length} runs`);
    },
  ],
  [
    'H5',
    "16/16 kept, and hidden tests at the docs control's level or above",
    (arm) => {
      const runs = runsOf('S8', arm);
      const other = runsOf('S8', control(arm));
      if (runs.length === 0 || other.length === 0) return 'not read';
      const kept = runs.filter(allChecks).length;
      if ([...runs, ...other].some((run) => run.holdout === undefined)) return 'not read';
      const [publicA, publicB] = [runs, other].map((side) => meanTests(side, (run) => run.q1.passed));
      const [holdA, holdB] = [runs, other].map((side) => meanTests(side, (run) => run.holdout.passed));
      return verdict(
        kept === runs.length && publicA >= publicB && holdA >= holdB,
        `${kept} of ${runs.length} runs keep every rule check; public ${round(publicA, 1)} against ` +
          `${round(publicB, 1)}, hold-out ${round(holdA, 1)} against ${round(holdB, 1)}`,
      );
    },
  ],
  [
    'H6',
    'no scenario falls below its v0.1 wingfoil value by more than one test',
    (arm) => {
      const { below, unread } = belowBaseline(arm);
      return (
        'not read against v0.1 (other scenario versions); more than one test below the baseline: ' +
        (below.length === 0 ? 'none' : below.join(', ')) +
        (unread.length === 0 ? '' : `; not read: ${unread.join(', ')}`)
      );
    },
  ],
  [
    'H7',
    '`workflow-engine: true`, and a scenario that requires it is not an expected failure',
    (arm) => {
      if (arm !== 'wingfoil') return '—';
      const required = engineRequired();
      return verdict(
        engineDeclared(),
        `\`arms/wingfoil/arm.yaml\`; scenarios that require it: ${required.join(', ') || 'none'}`,
      );
    },
  ],
  [
    'H8',
    "the mean at most 1.1× the docs control, with M-F1 ≥ 4/5 and S2's checks 3/3",
    (arm) => {
      const read = IDS.map((id) => keyRatio(id, arm, control(arm), 'eur'));
      const [s3, s2] = [runsOf('S3', arm), runsOf('S2', arm)];
      if (read.includes(undefined) || s3.length === 0 || s2.length === 0)
        return 'not read: it needs S1, S2, S3 and S8';
      const m = mean(read);
      const f1 = s3.filter(f1Holds).length;
      const checks = s2.filter(allChecks).length;
      return verdict(
        m <= 1.1 && f1 === s3.length && checks === s2.length,
        `mean ${round(m, 2)}×; M-F1 held in ${f1} of ${s3.length} runs, S2's checks in ${checks} of ${s2.length}`,
      );
    },
  ],
  ['H9', 'the advantage grows from L1 to L3', () => 'not read: these scenarios are L1'],
  [
    'H10',
    "every arm at the maximum on S2's, S3's and S8's checks",
    (arm) => {
      if (arm !== 'wingfoil') return '—';
      const unsaturated = unsaturatedOf(READ_MODEL);
      if (unsaturated.length === 0) return 'not read';
      const held = unsaturated.every((item) => item.split(' ')[1] === '0');
      return verdict(held, `arms below it: ${unsaturated.join(', ')}`);
    },
  ],
  [
    'H11',
    "the wingfoil arm's gain over the baseline is larger on Haiku 5.5 than on Sonnet 5.5",
    (arm) => {
      if (arm !== 'wingfoil') return '—';
      if (!models.includes('claude-haiku-5-5') || !models.includes('claude-sonnet-5-5')) return 'not read';
      const pairs = H11_PICKS.map(([id, pick]) => [
        gainOf(at(id), 'claude-haiku-5-5', pick),
        gainOf(at(id), 'claude-sonnet-5-5', pick),
      ]).filter(([weak, strong]) => weak !== undefined && strong !== undefined);
      if (pairs.length === 0) return 'not read';
      const larger = pairs.filter(([weak, strong]) => weak > strong).length;
      const smaller = pairs.filter(([weak, strong]) => weak < strong).length;
      return verdict(
        larger > 0 && smaller === 0,
        `larger on ${larger} of ${pairs.length} readings, smaller on ${smaller}`,
      );
    },
  ],
];
console.log('');
console.log(`**The verdicts on ${READ_MODEL}** (v0.1.md §11's "Holds when")`);
console.log('');
console.log('| # | Holds when | wingfoil | wingfoil-configured |');
console.log('|---|---|---|---|');
for (const [id, holds, read] of rows)
  console.log(`| ${id} | ${holds} | ${read('wingfoil')} | ${read('wingfoil-configured')} |`);
