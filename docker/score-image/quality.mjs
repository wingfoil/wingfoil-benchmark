// M-Q2, static quality (REQ-SCO-04 as amended in 1.16, task-041), run in the scoring container on a
// run's final snapshot.
//
//   node quality.mjs <snapshot directory> '<{ "measured": [paths], "coverageTargets": [paths] }>'
//
// The host decides which files count; this script only measures them, and prints one JSON line:
//   lint         { findings, lines }        ESLint with the benchmark's configuration, never the project's;
//                                           a file that does not parse is one finding
//   complexity   { functions, sum, max }    each function's value, from ESLint's `complexity` at 0
//   duplication  { duplicated_lines, lines } jscpd's duplicated lines among the measured files
//   coverage     { covered, total, tests }  c8 over the project's `npm test`, whether its tests pass or
//                                           not; `tests` is passed, failed, timed out or none
// Integers only: every ratio is aggregation's, and nothing here is a composite.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const [snapshot, spec] = process.argv.slice(2);
if (snapshot === undefined || spec === undefined) {
  process.stderr.write('usage: quality.mjs <snapshot> <files as JSON>\n');
  process.exit(2);
}
const root = resolve(snapshot);
const { measured, coverageTargets } = JSON.parse(spec);
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** jscpd's smallest clone, in tokens: its default, pinned here so that a new default changes nothing. */
const MIN_TOKENS = 50;
/** How long the project's tests may run, and the kill after it. */
const TESTS_TIMEOUT_MS = 300_000;

/** A file's physical lines: a last line without its newline still counts. */
function linesOf(file) {
  const path = join(root, file);
  if (!existsSync(path)) return 0;
  const text = readFileSync(path, 'utf8');
  if (text === '') return 0;
  const count = text.split('\n').length;
  return text.endsWith('\n') ? count - 1 : count;
}

/** The path of a package's own file, wherever its node_modules is: the image's, or this repository's. */
function packageFile(name, file) {
  return join(dirname(require.resolve(`${name}/package.json`)), file);
}

async function lint() {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: join(here, 'lint-rules.mjs'),
    overrideConfig: { rules: { complexity: ['error', 0] } },
    ignore: false,
  });
  const results = await eslint.lintFiles(measured.map((file) => join(root, file)));
  let findings = 0;
  const complexities = [];
  for (const result of results) {
    for (const message of result.messages) {
      const found = message.ruleId === 'complexity' ? /complexity of (\d+)/.exec(message.message) : null;
      if (found !== null) complexities.push(Number(found[1]));
      else findings += 1;
    }
  }
  return {
    findings,
    functions: complexities.length,
    sum: complexities.reduce((total, value) => total + value, 0),
    max: complexities.length === 0 ? 0 : Math.max(...complexities),
  };
}

function duplicatedLines(work) {
  const output = join(work, 'jscpd');
  const run = spawnSync(
    process.execPath,
    [
      packageFile('jscpd', 'run-jscpd.js'),
      '--silent',
      '--min-tokens',
      String(MIN_TOKENS),
      '--reporters',
      'json',
      '--output',
      output,
      ...measured,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  const report = join(output, 'jscpd-report.json');
  if (run.status !== 0 || !existsSync(report)) {
    throw new Error(`jscpd exited with ${run.status}: ${run.stderr.trim().split('\n').slice(-3).join(' ')}`);
  }
  return JSON.parse(readFileSync(report, 'utf8')).statistics.total.duplicatedLines;
}

function coverage(work) {
  const manifest = join(root, 'package.json');
  const scripts = existsSync(manifest) ? (JSON.parse(readFileSync(manifest, 'utf8')).scripts ?? {}) : {};
  const hasTests = typeof scripts.test === 'string';
  const { bin } = JSON.parse(readFileSync(packageFile('c8', 'package.json'), 'utf8'));
  const c8 = packageFile('c8', typeof bin === 'string' ? bin : bin.c8);
  const reports = join(work, 'coverage');
  const run = spawnSync(
    process.execPath,
    [
      c8,
      '--all',
      '--src',
      root,
      ...coverageTargets.flatMap((file) => ['--include', file]),
      '--exclude-node-modules',
      '--reporter',
      'json-summary',
      '--reports-dir',
      reports,
      '--temp-directory',
      join(work, 'c8'),
      ...(hasTests ? ['npm', 'test', '--silent'] : [process.execPath, '-e', '0']),
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: TESTS_TIMEOUT_MS,
      killSignal: 'SIGKILL',
      env: { ...process.env, npm_config_update_notifier: 'false', npm_config_fund: 'false' },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const tests = !hasTests
    ? 'none'
    : run.error !== undefined || run.signal !== null
      ? 'timed out'
      : run.status === 0
        ? 'passed'
        : 'failed';
  const summaryFile = join(reports, 'coverage-summary.json');
  const summary = existsSync(summaryFile) ? JSON.parse(readFileSync(summaryFile, 'utf8')) : {};
  let covered = 0;
  let total = 0;
  for (const file of coverageTargets) {
    const lines = summary[join(root, file)]?.lines;
    // A target c8 did not report — the run was killed, or the file does not parse — is all uncovered.
    if (lines === undefined) total += linesOf(file);
    else {
      covered += lines.covered;
      total += lines.total;
    }
  }
  return { covered, total, tests };
}

const work = mkdtempSync(join(tmpdir(), 'bench-quality-'));
try {
  const lines = measured.reduce((sum, file) => sum + linesOf(file), 0);
  const linted = await lint();
  const duplicated = duplicatedLines(work);
  const covered = coverage(work);
  process.stdout.write(
    `${JSON.stringify({
      lint: { findings: linted.findings, lines },
      complexity: { functions: linted.functions, sum: linted.sum, max: linted.max },
      duplication: { duplicated_lines: duplicated, lines },
      coverage: covered,
    })}\n`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
