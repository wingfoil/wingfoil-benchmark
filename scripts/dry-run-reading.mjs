#!/usr/bin/env node
// The dry runs read from their records (task-144): per scenario version, each base arm and, beside it, its configured
// arm, from the newest dry run of each (`results/dry-runs/<n>/runs/<id>@<version>/<arm>/<model>/r1/run.json`); the
// older dry runs a newer one superseded; every run's pins checked against the profile, the harness commits each tool
// ran at; and the sum against the ceiling.
// It runs no agent, spends nothing and writes nothing; it prints Markdown for docs/calibration/v0.3.md.
//
// Usage: node scripts/dry-run-reading.mjs <root> --profile <yaml> --ceiling <eur> [--version <v>] [--after <n>]
//          [--through <n>] [--model <id>]
//   --version  the scenario version read (default 1.1)
//   --after    the dry runs numbered above <n> (default 0)
//   --through  the dry runs numbered up to <n> (default: every one)
//   --model    the model whose dry runs are read (default: the profile's default model)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

const [root, ...rest] = process.argv.slice(2);
const options = {};
for (let index = 0; index < rest.length; index += 2)
  options[rest[index].replace(/^--/, '')] = rest[index + 1];
if (root === undefined || !options.profile || !options.ceiling) {
  console.error(
    'usage: dry-run-reading.mjs <root> --profile <yaml> --ceiling <eur> [--version <v>] [--after <n>]',
  );
  process.exit(2);
}
const version = options.version ?? '1.1';
const after = Number(options.after ?? 0);
const through = options.through === undefined ? Infinity : Number(options.through);
const ceiling = Number(options.ceiling);
const profile = parse(readFileSync(join(root, options.profile), 'utf8'));
const model = options.model ?? profile.models.default;

const directories = (path) =>
  existsSync(path) ? readdirSync(path).filter((name) => statSync(join(path, name)).isDirectory()) : [];

/** Every dry run of the model and version from --after to --through: its number, scenario, arm, the run record. */
const runs = [];
const base = join(root, 'results', 'dry-runs');
for (const n of directories(base).filter((name) => Number(name) > after && Number(name) <= through)) {
  for (const scenario of directories(join(base, n, 'runs')).filter((name) => name.endsWith(`@${version}`))) {
    for (const arm of directories(join(base, n, 'runs', scenario))) {
      const file = join(base, n, 'runs', scenario, arm, model, 'r1', 'run.json');
      if (existsSync(file))
        runs.push({ n: Number(n), scenario, arm, run: JSON.parse(readFileSync(file, 'utf8')) });
    }
  }
}
runs.sort((a, b) => a.n - b.n);

/** The pins a run breaks against the profile, as `<field> <found>`. */
function brokenPins({ arm, run }) {
  const broken = [];
  const expect = (field, found, wanted) => {
    if (found !== wanted) broken.push(`${field} ${found ?? 'missing'}`);
  };
  expect('dry_run', run.dry_run, true);
  expect(
    'agent',
    `${run.agent?.name} ${run.agent?.version}`,
    `${profile.agent.name} ${profile.agent.version}`,
  );
  expect('model', run.model, profile.models.default);
  expect('effort', run.effort, profile.agent.effort[run.model]);
  expect('approver_policy', run.approver_policy, profile.approver_policy);
  const digest = profile.arm_digests?.[arm];
  if (digest === undefined || !String(run.arm_digest).startsWith(digest))
    broken.push(`arm_digest ${String(run.arm_digest).slice(0, 12)}`);
  // A harness arm, configured or not, runs its harness: a record without one breaks the pin.
  const harnessOf = profile.harnesses?.[arm.replace(/-configured$/, '')];
  if (harnessOf !== undefined && run.harness === undefined) broken.push('harness missing');
  if (run.harness !== undefined) {
    const pinned = Object.values(profile.harnesses).find((harness) => harness.tool === run.harness.tool);
    expect(`harness ${run.harness.tool}`, run.harness.version, pinned?.version);
  }
  return broken;
}

const cost = (run) => (run.steps ?? []).reduce((sum, step) => sum + (step.usage?.costEur ?? 0), 0);
const seconds = (run) =>
  (run.steps ?? []).reduce((sum, step) => sum + (step.usage?.durationMs ?? 0), 0) / 1000;
const interventions = (run) => (Array.isArray(run.interventions) ? run.interventions.length : 0);

/** The newest dry run of each version and arm; the older ones, superseded by it. */
const newest = new Map();
const superseded = [];
for (const entry of runs) {
  const key = `${entry.scenario} ${entry.arm}`;
  if (newest.has(key)) superseded.push({ old: newest.get(key), by: entry });
  newest.set(key, entry);
}

const cells = (entry) =>
  entry === undefined
    ? ['—', '—', '—', '—', '—', '—']
    : [
        `\`${entry.n}\``,
        entry.run.outcome,
        cost(entry.run).toFixed(4),
        String(entry.run.steps?.length ?? 0),
        String(interventions(entry.run)),
        seconds(entry.run).toFixed(0),
      ];

const CONFIGURED = /-configured$/;
const scenarios = [...new Set(runs.map((entry) => entry.scenario))].sort();
const baseArms = [...new Set(runs.map((entry) => entry.arm).filter((arm) => !CONFIGURED.test(arm)))].sort();
console.log(
  '| Version | Arm | Dry run | Outcome | Cost (EUR) | Steps | Interventions | Time (s) | ' +
    'Configured: dry run | Outcome | Cost (EUR) | Steps | Interventions | Time (s) |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
let baseSum = 0;
let configuredSum = 0;
let dearer = 0;
let pairs = 0;
for (const scenario of scenarios) {
  for (const arm of baseArms) {
    const own = newest.get(`${scenario} ${arm}`);
    const configured = newest.get(`${scenario} ${arm}-configured`);
    if (own === undefined && configured === undefined) continue;
    if (configured !== undefined) {
      configuredSum += cost(configured.run);
      if (own !== undefined) {
        baseSum += cost(own.run);
        pairs += 1;
        if (cost(configured.run) > cost(own.run)) dearer += 1;
      }
    }
    console.log(`| ${scenario} | ${arm} | ${[...cells(own), ...cells(configured)].join(' | ')} |`);
  }
}
const orphans = [...newest.values()].filter(
  (entry) => CONFIGURED.test(entry.arm) && !baseArms.includes(entry.arm.replace(CONFIGURED, '')),
);
for (const entry of orphans)
  console.log(`| ${entry.scenario} | ${entry.arm} | ${cells(entry).join(' | ')} |`);

const total = runs.reduce((sum, entry) => sum + cost(entry.run), 0);
const measured = [...newest.values()];
const outcomes = {};
for (const entry of measured) outcomes[entry.run.outcome] = (outcomes[entry.run.outcome] ?? 0) + 1;
console.log('');
console.log(
  `Dry runs: ${runs.length}, ${measured.length} measured (${Object.entries(outcomes)
    .map(([outcome, count]) => `${count} ${outcome}`)
    .join(', ')}), ${superseded.length} superseded; their cost: ${total.toFixed(4)} EUR against the ` +
    `${ceiling.toFixed(2)} EUR ceiling (${((100 * total) / ceiling).toFixed(1)}%).`,
);
console.log(
  `The configured arms: ${configuredSum.toFixed(4)} EUR; their base arms on the same versions: ` +
    `${baseSum.toFixed(4)} EUR.`,
);
console.log(
  `Pair by pair, the configured arm is dearer in ${dearer} of ${pairs}, cheaper or equal in ${pairs - dearer}.`,
);
for (const { old, by } of superseded)
  console.log(`Superseded: \`${old.n}\` (${old.scenario}, ${old.arm}) by \`${by.n}\`.`);
const broken = runs
  .map((entry) => ({ entry, pins: brokenPins(entry) }))
  .filter(({ pins }) => pins.length > 0);
if (broken.length === 0) console.log(`Pins: every dry run matches \`${options.profile}\`.`);
for (const { entry, pins } of broken) console.log(`Pins broken by \`${entry.n}\`: ${pins.join(', ')}.`);
const commits = {};
for (const { run } of runs)
  if (run.harness !== undefined)
    (commits[run.harness.tool] ??= new Set()).add(run.harness.commit.slice(0, 12));
const tools = Object.keys(commits).sort();
if (tools.length > 0)
  console.log(
    `Harness commits: ${tools.map((tool) => `${tool} ${[...commits[tool]].sort().join(' and ')}`).join(', ')}.`,
  );
