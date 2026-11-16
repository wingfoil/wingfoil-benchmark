#!/usr/bin/env node
// The review loop's figures in the dry runs (task-151, W19's "Ends with"): for every dry run under
// `results/dry-runs/` whose run recorded a loop, its key, outcome and rounds, M-V1 (the round that closed it clean,
// none otherwise), M-V2 (fix-induced findings of rounds 2 and later, of all of them) and M-V3 (the reviewer's and the
// fixer's cost in EUR, and their sum), read with the benchmark's own reader (task-150's `readLoop` and
// `runReviewMetrics`), so that no figure of the note is typed by hand. Reads only; writes nothing. Run after
// `npm run build`.
//
//   node scripts/review-loop-figures.mjs <repository-root> > figures.json
//   node scripts/review-loop-figures.mjs --markdown <repository-root>
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { readLoop, runReviewMetrics } from '../dist/results/review.js';
import { executionRate } from '../dist/results/runs.js';

/** A money figure kept to a millionth, as the benchmark keeps money. */
const money = (value) => Math.round(value * 1e6) / 1e6;

/** The subdirectories of `dir`, by name. */
function directories(dir) {
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort();
}

/**
 * Every dry run's loop under `root`'s `results/dry-runs/`, in execution order then by key: one row each. A loop record
 * that cannot be read is an error, never a row left out.
 */
export function figures(root) {
  const base = join(root, 'results', 'dry-runs');
  if (!existsSync(base)) return [];
  const rows = [];
  const executions = directories(base)
    .filter((name) => /^[1-9][0-9]*$/.test(name))
    .sort((a, b) => Number(a) - Number(b));
  for (const execution of executions) {
    const runs = join(base, execution, 'runs');
    if (!existsSync(runs)) continue;
    for (const version of directories(runs)) {
      for (const arm of directories(join(runs, version))) {
        for (const model of directories(join(runs, version, arm))) {
          const runDir = join(runs, version, arm, model, 'r1');
          if (!existsSync(join(runDir, 'review', 'loop.json'))) continue;
          const loop = readLoop(runDir, () => executionRate(join(base, execution)));
          if (!loop.ok) {
            const why = loop.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
            throw new Error(`dry-runs/${execution}/runs/${version}/${arm}/${model}/r1: ${why}`);
          }
          if (loop.value === undefined) continue;
          const metrics = runReviewMetrics(loop.value);
          const reviewerEur = money(metrics.cost?.reviewer.cost_eur ?? 0);
          const fixerEur = money(metrics.cost?.fixer.cost_eur ?? 0);
          rows.push({
            dryRun: `dry-runs/${execution}`,
            key: `${version}/${arm}/${model}`,
            outcome: loop.value.outcome,
            rounds: loop.value.rounds.length,
            mV1: metrics.roundsToClean ?? null,
            mV2: metrics.fixInduced ?? null,
            reviewerEur,
            fixerEur,
            totalEur: money(reviewerEur + fixerEur),
          });
        }
      }
    }
  }
  return rows;
}

/** The rows as a Markdown table: a loop not clean shows no M-V1, never its cap. */
export function markdown(rows) {
  const eur = (value) => value.toFixed(4);
  return [
    '| dry run | key | outcome | rounds | M-V1 | M-V2 | reviewer EUR | fixer EUR | M-V3 EUR |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.dryRun} | ${row.key} | ${row.outcome} | ${row.rounds} | ${row.mV1 ?? '—'} | ` +
        `${row.mV2 === null ? '—' : `${row.mV2.fix_induced}/${row.mV2.findings}`} | ${eur(row.reviewerEur)} | ` +
        `${eur(row.fixerEur)} | ${eur(row.totalEur)} |`,
    ),
  ].join('\n');
}

const invoked =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invoked) {
  const args = process.argv.slice(2);
  const asMarkdown = args[0] === '--markdown';
  const root = asMarkdown ? args[1] : args[0];
  if (root === undefined) {
    process.stderr.write('usage: node scripts/review-loop-figures.mjs [--markdown] <repository-root>\n');
    process.exit(2);
  }
  const rows = figures(root);
  process.stdout.write(`${asMarkdown ? markdown(rows) : JSON.stringify(rows, undefined, 2)}\n`);
}
