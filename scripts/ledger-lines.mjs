#!/usr/bin/env node
// Spending-ledger lines generated from the stored records (task-144, dl-006): one Markdown table row per configuring
// session (`scenarios/<id>/<version>/configured/<arm>.json`) or per dry run (`results/dry-runs/<n>/`), in the columns
// of docs/calibration/v0.3-ledger.md. It runs no agent, spends nothing and writes nothing.
//
// Usage: node scripts/ledger-lines.mjs configuring|dry-runs <root> --element <md> --consent <text> --ceiling <text>
//          [--version <v>] [--after <n>] [--token-file <path>]
//   --version     the scenario version read (default 1.1)
//   --after       dry runs only: the dry runs numbered above <n> (default 0)
//   --token-file  the credential file the secret scan looks for (`grep -rlF`, the value never read here); without it,
//                 each line says the scan was not run
// A dry run's date is the first timestamp of its first step's transcript (UTC): transcripts are git-ignored, kept in
// the checkout that ran the dry runs and packed with the release (`bench transcripts pack`), so a clone without them
// prints "unknown date". A dry run that a later one of the same version, arm and model replaced says so.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [kind, root, ...rest] = process.argv.slice(2);
const options = {};
for (let index = 0; index < rest.length; index += 2)
  options[rest[index].replace(/^--/, '')] = rest[index + 1];
if (
  !['configuring', 'dry-runs'].includes(kind) ||
  root === undefined ||
  !options.element ||
  !options.consent ||
  !options.ceiling
) {
  console.error(
    'usage: ledger-lines.mjs configuring|dry-runs <root> --element <md> --consent <text> --ceiling <text>',
  );
  process.exit(2);
}
const version = options.version ?? '1.1';

const MODELS = {
  'claude-sonnet-5-5': 'Sonnet 5.5',
  'claude-haiku-5-5': 'Haiku 5.5',
  'claude-opus-5-5': 'Opus 5.5',
};
const modelCell = (model, effort, agent) =>
  `${MODELS[model] ?? model}, effort ${effort} (${agent.name === 'claude-code' ? 'Claude Code' : agent.name} ` +
  `${agent.version})`;
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const costCell = (usd, eur) =>
  `${usd.toFixed(4)} USD (${eur.toFixed(4)} €) API-equivalent; nothing billed per token`;

/** "clean" when no file under the paths holds the token file's content, "not run" without a token file. */
function secretScan(paths) {
  if (options['token-file'] === undefined) return 'secret scan not run';
  const present = paths.filter((path) => existsSync(join(root, path)));
  if (present.length === 0) return 'secret scan: nothing stored to scan';
  const grep = spawnSync('grep', ['-rlFf', options['token-file'], ...present], {
    cwd: root,
    encoding: 'utf8',
  });
  if (grep.status === 1) return 'secret scan clean';
  if (grep.status === 0) return `secret scan: ${grep.stdout.trim().split('\n').length} file(s) to check`;
  return 'secret scan failed';
}

const directories = (path) =>
  existsSync(path) ? readdirSync(path).filter((name) => statSync(join(path, name)).isDirectory()) : [];

/** The first timestamp a transcript records, or undefined. */
function firstTimestamp(file) {
  if (!existsSync(file)) return undefined;
  return readFileSync(file, 'utf8').match(/"timestamp":"([^"]+)"/)?.[1];
}

const rows = [];
if (kind === 'configuring') {
  for (const id of directories(join(root, 'scenarios'))) {
    const configured = join(root, 'scenarios', id, version, 'configured');
    if (!existsSync(configured)) continue;
    for (const file of readdirSync(configured).filter((name) => name.endsWith('.json'))) {
      const arm = file.replace(/\.json$/, '');
      const harness = arm.replace(/-configured$/, '');
      for (const record of JSON.parse(readFileSync(join(configured, file), 'utf8'))) {
        const sources = [
          `results/configuring/${id}@${version}/${harness}`,
          `scenarios/${id}/${version}/arms/${arm}`,
        ];
        rows.push({
          date: record.date,
          cells: [
            record.date.slice(0, 10),
            options.element,
            `configuring session of ${id}@${version}, ${arm} arm (${record.outcome}: ` +
              `${count(record.files?.length ?? 0, 'file')}, ${count(record.usage?.turns ?? 0, 'turn')})`,
            options.consent,
            modelCell(record.model, 'medium', record.agent),
            options.ceiling,
            costCell(record.usage?.costUsd ?? 0, record.cost_eur),
            `\`scenarios/${id}/${version}/configured/${file}\`; transcript under \`${sources[0]}/\`; ` +
              secretScan(sources),
          ],
        });
      }
    }
  }
} else {
  const after = Number(options.after ?? 0);
  const base = join(root, 'results', 'dry-runs');
  for (const n of directories(base).filter((name) => Number(name) > after)) {
    for (const scenario of directories(join(base, n, 'runs')).filter((name) =>
      name.endsWith(`@${version}`),
    )) {
      for (const arm of directories(join(base, n, 'runs', scenario))) {
        for (const model of directories(join(base, n, 'runs', scenario, arm))) {
          const dir = `results/dry-runs/${n}/runs/${scenario}/${arm}/${model}/r1`;
          const runFile = join(root, dir, 'run.json');
          if (!existsSync(runFile)) continue;
          const run = JSON.parse(readFileSync(runFile, 'utf8'));
          const usd = run.steps.reduce((sum, step) => sum + (step.usage?.costUsd ?? 0), 0);
          const eur = run.steps.reduce((sum, step) => sum + (step.usage?.costEur ?? 0), 0);
          const interventions = Array.isArray(run.interventions) ? run.interventions.length : 0;
          const timestamp = firstTimestamp(join(root, dir, 'steps', '01', 'transcript.jsonl'));
          const date = timestamp ?? 'unknown date';
          rows.push({
            date,
            n: Number(n),
            key: `${scenario} ${arm} ${model}`,
            cells: [
              timestamp === undefined ? date : timestamp.slice(0, 10),
              options.element,
              `dry run of ${scenario}, ${arm} arm (\`dry-runs/${n}\`, ${count(run.steps.length, 'step')}, ` +
                `${count(interventions, 'intervention')}; ${run.outcome}`,
              options.consent,
              modelCell(run.model, run.effort, run.agent),
              options.ceiling,
              costCell(usd, eur),
              `\`${dir}/\`; ${secretScan([`results/dry-runs/${n}`])}`,
            ],
          });
        }
      }
    }
  }
}

rows.sort((a, b) => (a.n ?? 0) - (b.n ?? 0) || a.date.localeCompare(b.date));
// A dry run's kind cell closes here, saying which later dry run of the same version, arm and model replaced it.
for (const [index, row] of rows.entries()) {
  if (row.key === undefined) continue;
  const later = rows.slice(index + 1).find((other) => other.key === row.key);
  row.cells[2] += later === undefined ? ')' : `; superseded by \`dry-runs/${later.n}\`)`;
}
for (const row of rows) console.log(`| ${row.cells.join(' | ')} |`);
