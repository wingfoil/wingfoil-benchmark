#!/usr/bin/env node
// Spending-ledger lines generated from the stored records (task-144, dl-006; a dry run's review loop, task-154): one Markdown table row per configuring
// session (`scenarios/<id>/<version>/configured/<arm>.json`), per dry run (`results/dry-runs/<n>/`) or per campaign
// run of an execution (`results/<id>/<n>/`, task-161), in the columns of docs/calibration/v0.3-ledger.md. It runs no agent, spends nothing and writes nothing.
//
// Usage: node scripts/ledger-lines.mjs configuring|dry-runs|campaign <root> --element <md> --consent <text>
//          --ceiling <text> [--version <v>] [--after <n>] [--execution <id>/<n>] [--token-file <path>]
//   --version     the scenario version read (default 1.1)
//   --after       dry runs only: the dry runs numbered above <n> (default 0)
//   --execution   campaign only (required): the execution whose runs are listed, `results/<id>/<n>/`, every scenario
//                 version (task-161)
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
  !['configuring', 'dry-runs', 'campaign'].includes(kind) ||
  root === undefined ||
  !options.element ||
  !options.consent ||
  !options.ceiling ||
  (kind === 'campaign' && !options.execution)
) {
  console.error(
    'usage: ledger-lines.mjs configuring|dry-runs|campaign <root> --element <md> --consent <text> --ceiling <text>' +
      ' (campaign: --execution <id>/<n>)',
  );
  process.exit(2);
}
const version = options.version ?? '1.1';

const MODELS = {
  'claude-sonnet-5-5': 'Sonnet 5.5',
  'claude-haiku-5-5': 'Haiku 5.5',
  'claude-opus-5-5': 'Opus 5.5',
};
// A Codex run is worded as the ledger's Codex lines are: its effort as Codex's setting, its cost from the pinned price
// table and nothing spent, on ChatGPT Plus (dl-024; review of task-161).
const modelCell = (model, effort, agent) =>
  agent.name === 'codex'
    ? `${model}, \`model_reasoning_effort\` ${effort} (Codex CLI ${agent.version})`
    : `${MODELS[model] ?? model}, effort ${effort} (${agent.name === 'claude-code' ? 'Claude Code' : agent.name} ` +
      `${agent.version})`;
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const money = (usd, eur) => `${usd.toFixed(4)} USD (${eur.toFixed(4)} €)`;
const costCell = (usd, eur, agent) =>
  agent?.name === 'codex'
    ? `${usd.toFixed(4)} USD API-equivalent (\`price-table\`); 0 € spent: ChatGPT Plus (dl-024)`
    : `${money(usd, eur)} API-equivalent; nothing billed per token`;

/** A loop's outcome and round; `not clean at 5` already names its round. */
const loopOutcome = (loop) =>
  loop.outcome.startsWith('not clean at') ? loop.outcome : `${loop.outcome} at round ${loop.rounds}`;

/**
 * A dry run's review loop (task-154, REQ-FMT-06 as amended in 1.58): its outcome, its last round, its cost in EUR as
 * `loop.json` records it (bounds included) and in USD as its sessions reported it; undefined without a loop.
 */
function reviewLoop(runDir) {
  const file = join(runDir, 'review', 'loop.json');
  if (!existsSync(file)) return undefined;
  const loop = JSON.parse(readFileSync(file, 'utf8'));
  let usd = 0;
  for (const n of directories(join(runDir, 'review'))) {
    const reviewer = join(runDir, 'review', n, 'reviewer-usage.json');
    const fixer = join(runDir, 'review', n, 'fixer-usage.json');
    if (existsSync(reviewer)) usd += JSON.parse(readFileSync(reviewer, 'utf8')).costUsd ?? 0;
    if (existsSync(fixer)) usd += JSON.parse(readFileSync(fixer, 'utf8')).usage?.costUsd ?? 0;
  }
  const rounds = Array.isArray(loop.rounds) ? loop.rounds.length : 0;
  return { outcome: loop.outcome, rounds, usd, eur: loop.cost_eur ?? 0 };
}

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

/**
 * A stored run's ledger line, for a dry run or a campaign run: its date from its first transcript (else `fallback`,
 * a campaign's start: Codex transcripts record no timestamp), its kind cell
 * (`label` and `where` open it, the caller may close it), its model, its cost with its review loop's, its secret scan.
 */
function runRow(dir, label, where, scanned, fallback) {
  const run = JSON.parse(readFileSync(join(root, dir, 'run.json'), 'utf8'));
  const usd = run.steps.reduce((sum, step) => sum + (step.usage?.costUsd ?? 0), 0);
  const eur = run.steps.reduce((sum, step) => sum + (step.usage?.costEur ?? 0), 0);
  const interventions = Array.isArray(run.interventions) ? run.interventions.length : 0;
  const loop = reviewLoop(join(root, dir));
  const own = firstTimestamp(join(root, dir, 'steps', '01', 'transcript.jsonl'));
  const timestamp = own ?? fallback;
  const date = timestamp ?? 'unknown date';
  return {
    date,
    datedByFallback: own === undefined && fallback !== undefined,
    run,
    loop,
    cells: [
      timestamp === undefined ? date : timestamp.slice(0, 10),
      options.element,
      `${label} (\`${where}\`, ${count(run.steps.length, 'step')}, ${count(interventions, 'intervention')}; ` +
        run.outcome,
      options.consent,
      modelCell(run.model, run.effort, run.agent),
      options.ceiling,
      // A review loop's cell is worded for Claude Code, the only agent whose runs have one so far; a Codex run with a
      // loop (a later campaign's) gets the Codex wording with its first such line (review of task-161, round 2).
      loop === undefined
        ? costCell(usd, eur, run.agent)
        : `${money(usd + loop.usd, eur + loop.eur)} API-equivalent: steps ${money(usd, eur)}, ` +
          `review loop ${money(loop.usd, loop.eur)}; nothing billed per token`,
      `\`${dir}/\`; ${secretScan([scanned])}`,
    ],
  };
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
} else if (kind === 'campaign') {
  const execution = options.execution;
  const base = join(root, 'results', execution, 'runs');
  if (!/^[^/]+\/\d+$/.test(execution) || !existsSync(base)) {
    console.error(`ledger-lines.mjs: no stored execution results/${execution}/runs (expected <id>/<n>)`);
    process.exit(2);
  }
  const executionFile = join(root, 'results', execution, 'execution.json');
  const started = existsSync(executionFile)
    ? JSON.parse(readFileSync(executionFile, 'utf8')).started
    : undefined;
  for (const scenario of directories(base)) {
    for (const arm of directories(join(base, scenario))) {
      for (const model of directories(join(base, scenario, arm))) {
        for (const repetition of directories(join(base, scenario, arm, model))) {
          const dir = `results/${execution}/runs/${scenario}/${arm}/${model}/${repetition}`;
          if (!existsSync(join(root, dir, 'run.json'))) continue;
          const row = runRow(
            dir,
            `campaign run ${scenario} ${repetition}, ${arm} arm`,
            execution,
            dir,
            started,
          );
          if ((row.run.attempts ?? 1) > 1) row.cells[2] += `; attempt ${row.run.attempts}`;
          if (row.datedByFallback) row.cells[2] += "; dated by the execution's start";
          if (row.loop !== undefined) row.cells[2] += `; review loop ${loopOutcome(row.loop)}`;
          row.cells[2] += ')';
          rows.push(row);
        }
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
          if (!existsSync(join(root, dir, 'run.json'))) continue;
          const row = runRow(
            dir,
            `dry run of ${scenario}, ${arm} arm`,
            `dry-runs/${n}`,
            `results/dry-runs/${n}`,
          );
          if (row.loop !== undefined) row.cells[2] += `; review loop ${loopOutcome(row.loop)}`;
          rows.push({ ...row, n: Number(n), key: `${scenario} ${arm} ${model}` });
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
