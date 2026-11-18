#!/usr/bin/env node
// The revised budget's table and the review loops' count (task-154, plan-005 step 3), read from the campaign file, its
// preset, the stored estimate and the dry runs, so that no figure of docs/calibration/v0.3.md §6 is typed by hand. It
// runs no agent, spends nothing and writes nothing; it prints Markdown.
//
// Usage: node scripts/budget-reading.mjs budget|loops <root> --campaign <file> --estimate <file> [--after <n>]
//          [--skip <n>]
//   budget     the table of the budget, the caps, fail_fast and the rate, each with what it was set against
//   loops      how the dry runs' review loops ended
//   --after    the dry runs numbered above <n> (default 0)
//   --skip     a superseded dry run left out
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { parse } from 'yaml';

const [kind, root, ...rest] = process.argv.slice(2);
const options = {};
for (let index = 0; index < rest.length; index += 2)
  options[rest[index].replace(/^--/, '')] = rest[index + 1];
if (!['budget', 'loops'].includes(kind) || root === undefined) {
  console.error(
    'usage: budget-reading.mjs budget|loops <root> --campaign <file> --estimate <file> [--after <n>]',
  );
  process.exit(2);
}
const after = Number(options.after ?? 0);
const skip = options.skip === undefined ? undefined : Number(options.skip);

/** Every stored run of the dry runs read: its number, its record and its loop, if it ran one. */
const records = [];
const base = join(root, 'results', 'dry-runs');
for (const n of readdirSync(base)
  .map(Number)
  .filter((number) => number > after && number !== skip)
  .sort((a, b) => a - b)) {
  const runs = join(base, String(n), 'runs');
  if (!existsSync(runs)) continue;
  for (const scenario of readdirSync(runs))
    for (const arm of readdirSync(join(runs, scenario)))
      for (const model of readdirSync(join(runs, scenario, arm))) {
        const dir = join(runs, scenario, arm, model, 'r1');
        if (!existsSync(join(dir, 'run.json'))) continue;
        const loopFile = join(dir, 'review', 'loop.json');
        records.push({
          n,
          scenario,
          arm,
          run: JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')),
          loop: existsSync(loopFile) ? JSON.parse(readFileSync(loopFile, 'utf8')) : undefined,
        });
      }
}

if (kind === 'loops') {
  const loops = records.filter((record) => record.loop !== undefined);
  const others = loops.filter((record) => record.loop.outcome !== 'clean');
  const clean = loops.length - others.length;
  const named = others.map((r) => `\`${r.n}\` ${r.loop.outcome} (${r.scenario} ${r.arm})`).join(', ');
  console.log(`Of the ${loops.length} loops, ${clean} closed clean${named ? `; the others: ${named}` : ''}.`);
  process.exit(0);
}

if (!options.campaign || !options.estimate) {
  console.error('budget needs --campaign and --estimate');
  process.exit(2);
}
const campaignFile = join(root, options.campaign);
const own = parse(readFileSync(campaignFile, 'utf8'));
const preset = own.extends ? parse(readFileSync(join(dirname(campaignFile), own.extends), 'utf8')) : {};
const spec = { ...preset, ...own };
const high = /high ([\d.]+) EUR at/.exec(readFileSync(options.estimate, 'utf8'))?.[1];
if (high === undefined) {
  console.error('the estimate names no high in EUR');
  process.exit(2);
}

const steps = records.flatMap((record) =>
  record.run.steps.map((step) => ({ ...record, step: step.n, usage: step.usage })),
);
const largest = (items, pick) => items.reduce((top, item) => (pick(item) > pick(top) ? item : top));
const tokens = ({ usage }) =>
  usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
const runCost = (record) => record.run.steps.reduce((sum, step) => sum + step.usage.costEur, 0);
const longest = largest(steps, (step) => step.usage.durationMs);
const heaviest = largest(steps, tokens);
const dearest = largest(records, runCost);
const dearestLoop = largest(
  records.filter((record) => record.loop !== undefined),
  (record) => record.loop.cost_eur,
);
const times = (value) => (value / Number(high)).toFixed(2);

console.log('| Field | Value | Set against |');
console.log('|---|---|---|');
const row = (field, value, why) => console.log(`| \`${field}\` | ${value} | ${why} |`);
row(
  'budget.warn_eur',
  spec.budget.warn_eur,
  `${times(spec.budget.warn_eur)} times the estimate's high (${high} EUR)`,
);
row(
  'budget.ceiling_eur',
  spec.budget.ceiling_eur,
  `${times(spec.budget.ceiling_eur)} times the estimate's high`,
);
row(
  'caps.run_cost_eur',
  spec.caps.run_cost_eur,
  `the dearest dry run's steps ${runCost(dearest).toFixed(4)} EUR (\`${dearest.n}\`, ${dearest.scenario} ${dearest.arm})`,
);
row(
  'caps.step_time_s',
  spec.caps.step_time_s,
  `the longest step ${Math.round(longest.usage.durationMs / 1000)} s (\`${longest.n}\`, step ${longest.step}); a guard`,
);
row(
  'caps.step_tokens',
  spec.caps.step_tokens,
  `the largest step ${tokens(heaviest)} tokens (\`${heaviest.n}\`, step ${heaviest.step}); a guard`,
);
row(
  'review_loop.caps.session_cost_eur',
  spec.review_loop.caps.session_cost_eur,
  `the dearest whole loop ${dearestLoop.loop.cost_eur.toFixed(4)} EUR (\`${dearestLoop.n}\`)`,
);
row(
  'fail_fast',
  `\`same_error: ${spec.fail_fast.same_error}\``,
  'stop after that many runs failing alike (REQ-RUN-19)',
);
row(
  'currency.usd_to_eur',
  spec.currency.usd_to_eur,
  "campaign-008's and the dry runs' rate, so that costs compare",
);
