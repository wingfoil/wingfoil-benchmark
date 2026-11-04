#!/usr/bin/env node
// W16's offline re-scoring (task-134): the site catalogue's executions, every one scored before requirements 1.49,
// read again under the method W16 corrected, beside what they published. Nothing is written under results/, no agent,
// Docker container or hidden test runs, and nothing is spent. Three readings, by execution:
// - content checks v2 (REQ-SCO-06 as amended in 1.49): each S2@1.0 and S3@1.0 run under its 1.1 version's v2 check;
// - M-R2 v2 (REQ-SCO-07 as amended in 1.49): each group's final snapshots rebuilt from their stored patches, their
//   interface read by the scoring image's interface.mjs --v2 run here with Node;
// - M-K3 and M-K4 (REQ-SCO-08 as amended in 1.49): recomputed from the published score.json files.
//
//   npm run build && node scripts/rescore.mjs > docs/calibration/v0.3-rescore.md
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (module) => import(join(ROOT, 'dist', module, 'index.js'));
const { foldText, gitCli, systemProcess } = await dist('core');
const { breakEvenEntry, executionRuns, mK3Of, readStoredRun } = await dist('results');
const { loadScenario } = await dist('scenario');
const { addedText, rebuildSnapshots, scoreChecks } = await dist('scoring');

/** The content checks W16 rewrote as v2, by scenario: the 1.1 check read over the 1.0 runs. */
const V2_CHECKS = { S2: 'duplicate', S3: 'd3-revision' };

const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** A run's name as aggregate.json writes it: its path under results/, with forward slashes. */
function runName(resultsDir, runDir) {
  return relative(resultsDir, runDir).split(sep).join('/');
}

/** The runs of one execution with what the readings need: name, scenario, version, arm, model, score. */
function runsOf(results, execution) {
  // Absolute: git applies a run's patches from inside the rebuilt repository.
  const resultsDir = resolve(results);
  return executionRuns(join(resultsDir, execution)).flatMap((runDir) => {
    const scoreFile = join(runDir, 'score.json');
    if (!existsSync(scoreFile)) return [];
    const record = json(join(runDir, 'run.json'));
    return [
      {
        name: runName(resultsDir, runDir),
        runDir,
        scenario: record.scenario,
        version: record.version,
        arm: record.arm,
        model: record.model,
        score: json(scoreFile),
      },
    ];
  });
}

/**
 * Content checks v2 over one execution: each S2@1.0 and S3@1.0 run's check under the 1.1 version's v2 check, beside
 * its published v1 verdict, at each step the check scores. A step the run did not reach is left out.
 */
export async function rescoreChecks(resultsDir, scenariosDir, execution) {
  const rows = [];
  for (const run of runsOf(resultsDir, execution)) {
    const id = V2_CHECKS[run.scenario];
    if (id === undefined || run.version !== '1.0') continue;
    const v10 = loadScenario(scenariosDir, run.scenario, '1.0');
    if (!v10.ok) throw new Error(JSON.stringify(v10.issues));
    const v1Check = v10.value.oracle.checks.find((c) => c.id === id);
    const v11 = loadScenario(scenariosDir, run.scenario, '1.1');
    if (!v11.ok) throw new Error(JSON.stringify(v11.issues));
    const check = v11.value.oracle.checks.find((c) => c.id === id);
    const published = (run.score.checks ?? []).find((c) => c.id === id);
    if (check === undefined || published === undefined) continue;
    const reached = new Map(
      (run.score.steps ?? []).filter((step) => !('not_reached' in step)).map((step) => [step.n, '']),
    );
    const v2 = await scoreChecks({ checks: [check], runDir: run.runDir, snapshots: reached });
    if (!v2.ok) throw new Error(`${run.name}: ${JSON.stringify(v2.issues)}`);
    for (const step of v2.value[0]?.steps ?? []) {
      const v1 = published.steps.find((s) => s.n === step.n);
      if (v1 === undefined || !('passed' in v1) || !('passed' in step)) continue;
      const where =
        v1.where === undefined ? '' : 'file' in v1.where ? v1.where.file : `commit ${v1.where.commit}`;
      rows.push({
        run: run.name,
        check: id,
        step: step.n,
        v1: v1.passed,
        v2: step.passed,
        where,
        words: v1Words(run, step.n, v1, v1Check),
      });
    }
  }
  return rows;
}

/**
 * The words v1 matched where it passed, one per group: the first of each group's substrings found in that file's added
 * lines or that commit message; nothing when v1 failed.
 */
function v1Words(run, n, v1, check) {
  if (!v1.passed || v1.where === undefined || check === undefined) return '';
  const number = String(n).padStart(2, '0');
  const text =
    'file' in v1.where
      ? (addedText(readFileSync(join(run.runDir, 'steps', number, 'diff.patch'), 'utf8')).get(
          v1.where.file,
        ) ?? '')
      : (json(join(run.runDir, 'steps', number, 'commits.json')).messages[v1.where.commit - 1] ?? '');
  const folded = foldText(text);
  return check.patterns
    .map((group) => group.find((pattern) => folded.includes(foldText(pattern))) ?? '?')
    .map((word) => `"${word}"`)
    .join(' + ');
}

/** The pairwise Jaccard mean of sets, to 4 decimals, as aggregate.json computes M-R2 (REQ-SCO-07); none below 2. */
function jaccardMean(sets) {
  if (sets.length < 2) return undefined;
  const ratios = [];
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const a = new Set(sets[i]);
      const b = new Set(sets[j]);
      const union = new Set([...a, ...b]).size;
      ratios.push(union === 0 ? 1 : [...a].filter((x) => b.has(x)).length / union);
    }
  }
  return Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 1e4) / 1e4;
}

/** A run's interface under M-R2 v2: its final snapshot rebuilt, then interface.mjs --v2 on it. */
async function interfaceV2(run, scenariosDir) {
  const scenario = loadScenario(scenariosDir, run.scenario, run.version);
  if (!scenario.ok) throw new Error(JSON.stringify(scenario.issues));
  const stored = readStoredRun(run.runDir);
  if (!stored.ok) throw new Error(`${run.name}: ${JSON.stringify(stored.issues)}`);
  const workDir = mkdtempSync(join(tmpdir(), 'bench-rescore-'));
  try {
    const snapshots = await rebuildSnapshots({
      scenario: scenario.value,
      run: stored.value,
      runDir: run.runDir,
      git: gitCli(systemProcess),
      workDir,
    });
    if (!snapshots.ok) throw new Error(`${run.name}: ${JSON.stringify(snapshots.issues)}`);
    const snapshot = snapshots.value.get(run.score.final.step);
    const script = join(ROOT, 'docker', 'score-image', 'interface.mjs');
    const result = spawnSync(process.execPath, [script, snapshot, '--v2'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`${run.name}: interface.mjs exited ${result.status}`);
    return result.stdout
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line));
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * M-R2 v2 over one execution: each group with a published M-R2 (n ≥ 2, the pins equal), its reached runs' interfaces
 * from the entry point, beside the published v1 value.
 */
export async function rescoreMR2(resultsDir, scenariosDir, execution) {
  const aggregate = json(join(resultsDir, execution, 'aggregate.json'));
  const runs = runsOf(resultsDir, execution);
  const rows = [];
  for (const group of [...aggregate.groups, ...aggregate.slices]) {
    const v1 = group.metrics.m_r.m_r2;
    if (v1 === undefined) continue;
    const reached = group.metrics.m_r.runs.map((name) => runs.find((run) => run.name === name));
    const sets = [];
    for (const run of reached) sets.push(await interfaceV2(run, scenariosDir));
    rows.push({
      group: `${group.scenario}@${group.version} ${group.arm} ${group.model}`,
      n: reached.length,
      v1: v1.mean,
      v2: jaccardMean(sets),
    });
  }
  return rows.sort((a, b) => byCodeUnit(a.group, b.group));
}

/** What M-K4 reads of a run's score.json, as aggregate.ts reads it; none when step costs were not recorded. */
function breakEvenRun(run) {
  const steps = run.score.cost.steps;
  if (steps === undefined) return undefined;
  const m = 'not_reached' in run.score.final ? undefined : run.score.final.m_q1;
  return {
    name: run.name,
    finalMQ1: m === undefined || m.total === 0 ? 0 : m.passed / m.total,
    stepCosts: steps.flatMap((step) => ('not_reached' in step ? [] : [step.cost_eur])),
  };
}

/** M-K3 and M-K4 over one execution: REQ-SCO-08 1.49's entries beside the published 1.15 ones. */
export function rescoreMK4(resultsDir, execution) {
  const aggregate = json(join(resultsDir, execution, 'aggregate.json'));
  const runs = runsOf(resultsDir, execution);
  const of = (scenario, version, arm, model) =>
    runs.filter(
      (r) =>
        r.scenario === scenario &&
        r.version === version &&
        r.arm === arm &&
        (model === undefined || r.model === model),
    );
  return aggregate.break_even
    .map((v1) => {
      const base = of(v1.scenario, v1.version, 'baseline', v1.model).map(breakEvenRun);
      const arm = of(v1.scenario, v1.version, v1.arm, v1.model).map(breakEvenRun);
      const setups = of(v1.scenario, v1.version, v1.arm).map((r) => {
        const setup = r.score.cost.setup;
        return setup === undefined || 'not_recorded' in setup
          ? { name: r.name }
          : { name: r.name, setupEur: setup.cost_eur };
      });
      const k3 = mK3Of(setups);
      const v2 =
        base.includes(undefined) || arm.includes(undefined) ? undefined : breakEvenEntry(base, arm, k3.value);
      return {
        entry: `${v1.scenario}@${v1.version} ${v1.arm} ${v1.model}`,
        v1: v1.value,
        v2: v2 === undefined ? 'not computed' : v2.value,
        reason: v2?.reason,
        k3: k3.value,
      };
    })
    .sort((a, b) => byCodeUnit(a.entry, b.entry));
}

const show = (value) => (typeof value === 'number' ? String(value) : value);

async function main() {
  const resultsDir = join(ROOT, 'results');
  const scenariosDir = join(ROOT, 'scenarios');
  const catalog = parse(readFileSync(join(ROOT, 'site-content', 'catalog.yaml'), 'utf8')).executions;
  const executions = Object.keys(catalog).sort(byCodeUnit);
  const out = [];
  const totals = {
    checks: { both: 0, v1Only: 0, v2Only: 0, neither: 0 },
    mr2: { lower: 0, same: 0, higher: 0 },
    mk4: 0,
  };
  const checks = [];
  const mr2 = [];
  const mk4 = [];
  for (const execution of executions) {
    for (const row of await rescoreChecks(resultsDir, scenariosDir, execution)) checks.push(row);
    for (const row of await rescoreMR2(resultsDir, scenariosDir, execution)) mr2.push({ execution, ...row });
    for (const row of rescoreMK4(resultsDir, execution)) mk4.push({ execution, ...row });
  }
  for (const row of checks) {
    const key = row.v1 && row.v2 ? 'both' : row.v1 ? 'v1Only' : row.v2 ? 'v2Only' : 'neither';
    totals.checks[key] += 1;
  }
  for (const row of mr2) {
    if (row.v2 === undefined) continue;
    totals.mr2[row.v2 < row.v1 ? 'lower' : row.v2 > row.v1 ? 'higher' : 'same'] += 1;
  }
  totals.mk4 = mk4.filter((row) => String(row.v1) !== String(row.v2)).length;

  out.push(
    "# v0.3's offline re-scoring of the published executions",
    '',
    'Written by `npm run build && node scripts/rescore.mjs > docs/calibration/v0.3-rescore.md` (task-134): every',
    "execution of the site's catalogue, each scored before requirements 1.49, read again under W16's method beside what",
    'it published. Nothing under `results/` changes; no agent, container or hidden test runs; nothing is spent.',
    `Executions: ${executions.slice(0, 4).join(', ')},`,
    `${executions.slice(4).join(', ')}.`,
    '',
  );
  out.push('## Totals', '');
  /** A bullet wrapped at 120 characters, its later lines indented under its text. */
  const bullet = (text) => {
    const lines = [];
    let line = '-';
    for (const word of text.split(' ')) {
      if (line.length + 1 + word.length > 120) {
        lines.push(line);
        line = ` ${word}`;
      } else line = `${line} ${word}`;
    }
    return [...lines, line].join('\n ');
  };
  out.push(
    bullet(
      `Content checks (S2 duplicate, S3 d3-revision; ${checks.length} run-steps): ${totals.checks.both} pass under ` +
        `both, ${totals.checks.v1Only} under v1 only, ${totals.checks.v2Only} under v2 only, ${totals.checks.neither} under neither.`,
    ),
  );
  out.push(
    bullet(
      `M-R2 (${mr2.length} groups): v2 lower than v1 in ${totals.mr2.lower}, the same in ${totals.mr2.same}, higher in ` +
        `${totals.mr2.higher}.`,
    ),
  );
  out.push(bullet(`M-K4 (${mk4.length} entries): the value or its kind changes in ${totals.mk4}.`), '');

  out.push(
    '## Content checks: the verdicts that change',
    '',
    "| Run | Check | Step | v1 | v2 | v1 matched in | v1's words |",
    '|---|---|---|---|---|---|---|',
  );
  for (const row of checks.filter((r) => r.v1 !== r.v2)) {
    const v1 = row.v1 ? 'pass' : 'fail';
    const v2 = row.v2 ? 'pass' : 'fail';
    out.push(
      `| ${row.run} | ${row.check} | ${row.step} | ${v1} | ${v2} | ${row.where || '—'} | ${row.words || '—'} |`,
    );
  }
  out.push(
    '',
    '## M-R2, v1 and v2, by group',
    '',
    '| Execution | Group | n | v1 | v2 |',
    '|---|---|---|---|---|',
  );
  for (const row of mr2)
    out.push(`| ${row.execution} | ${row.group} | ${row.n} | ${row.v1} | ${row.v2 ?? '—'} |`);
  out.push(
    '',
    '## M-K4, 1.15 and 1.49, by entry',
    '',
    '| Execution | Entry | M-K3 (EUR) | 1.15 | 1.49 |',
    '|---|---|---|---|---|',
  );
  for (const row of mk4) {
    const v2 = row.reason === undefined ? show(row.v2) : `${show(row.v2)} (${row.reason})`;
    out.push(`| ${row.execution} | ${row.entry} | ${row.k3} | ${show(row.v1)} | ${v2} |`);
  }
  process.stdout.write(`${out.join('\n')}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
