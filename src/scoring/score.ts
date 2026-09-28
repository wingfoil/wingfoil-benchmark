import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { DockerPort, GitPort, Result, Scenario, Suite } from '../core/index.js';
import type { StoredRun } from '../results/index.js';

import { runSuite } from './hidden-tests.js';
import type { SuiteReport, TestResult } from './hidden-tests.js';
import type { ScoringImage } from './image.js';
import { rebuildSnapshots } from './snapshot.js';

/** The version of the scoring rules (adr-004): it rises when a rule changes, not when a key is added. */
export const SCORE_VERSION = 1;

/** M-Q1 as its two integers (experiment design §4.1): the ratio is aggregation's, so nothing is rounded here. */
export interface Tally {
  readonly passed: number;
  readonly total: number;
}

/** One suite on one snapshot: its tally, and its failing tests by file and name path, sorted. */
export interface SuiteScore extends Tally {
  readonly id: string;
  readonly failed: readonly string[];
}

/** A step: its suites and their M-Q1 when some suite scores it, or that the run never reached it. */
export type StepScore =
  | { readonly n: number; readonly suites: readonly SuiteScore[]; readonly m_q1?: Tally }
  | { readonly n: number; readonly not_reached: true };

/** The final snapshot, scored against every suite, or that the run did not complete. */
export type FinalScore =
  | { readonly step: number; readonly suites: readonly SuiteScore[]; readonly m_q1?: Tally }
  | { readonly not_reached: true };

/** `score.json`, version 1 (REQ-FMT-06, task-027): no timestamp, keys in a fixed order (REQ-SCO-03). */
export interface ScoreFile {
  readonly score_version: number;
  readonly scenario: string;
  readonly version: string;
  readonly scenario_hash: string;
  readonly scorer: { readonly image: string; readonly tsx: string };
  readonly steps: readonly StepScore[];
  readonly final: FinalScore;
}

/**
 * The census of each suite (task-027 Design): its hidden tests, as `file > name > path` keys, taken on
 * the seed — or why it could not be. By scenario hash and suite id, shared by every run a `bench
 * score` scores, since it depends only on the seed and the oracle.
 */
export type Census = Map<string, Result<readonly string[]>>;

/** What scoring one run needs. */
export interface ScoreRequest {
  readonly runDir: string;
  readonly run: StoredRun;
  readonly scenario: Scenario;
  readonly image: ScoringImage;
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly census: Census;
  /** The stem of the scoring containers' names; each gets a number after it. */
  readonly containerPrefix: string;
}

/**
 * Score one run with its scenario's public oracle (F4.1): rebuild its snapshots from what it stored;
 * for every step, the suites bound to it (dl-001); for the final snapshot — the last step's, when the
 * run completed — every suite. A suite's total is its census on the seed; its passed tests are the
 * census tests the snapshot reports passing; every other census test fails (adr-004).
 */
export async function scoreRun(request: ScoreRequest): Promise<Result<ScoreFile>> {
  const { run, scenario } = request;
  const workDir = mkdtempSync(join(tmpdir(), 'bench-score-'));
  try {
    const snapshots = await rebuildSnapshots({ ...request, workDir });
    if (!snapshots.ok) return snapshots;
    let containers = 0;
    const suiteRun = (suite: Suite, snapshotDir: string) => {
      containers += 1;
      return runSuite({
        docker: request.docker,
        image: request.image.tag,
        container: `${request.containerPrefix}-${containers}`,
        scenario,
        suite,
        snapshotDir,
      });
    };
    // One result per step and suite: the final snapshot is a step's, and is not run twice.
    const scored = new Map<string, SuiteScore>();
    const scoreSuite = async (n: number, suite: Suite): Promise<Result<SuiteScore>> => {
      const key = `${n}#${suite.id}`;
      const known = scored.get(key);
      if (known !== undefined) return ok(known);
      const census = await censusOf(request, suite, suiteRun);
      if (!census.ok) return census;
      const report = await suiteRun(suite, snapshots.value.get(n) as string);
      if (!report.ok) return report;
      const result = tally(suite, census.value, report.value, n);
      if (result.ok) scored.set(key, result.value);
      return result;
    };

    const steps: StepScore[] = [];
    for (const step of scenario.steps) {
      if (!snapshots.value.has(step.n)) {
        steps.push({ n: step.n, not_reached: true });
        continue;
      }
      const suites = await scoreAll(
        scenario.oracle.suites.filter((suite) => suite.afterSteps.includes(step.n)),
        (suite) => scoreSuite(step.n, suite),
      );
      if (!suites.ok) return suites;
      steps.push({ n: step.n, suites: suites.value, ...mQ1(suites.value) });
    }
    const last = scenario.steps.length;
    let final: FinalScore = { not_reached: true };
    if (run.outcome === 'completed' && snapshots.value.has(last)) {
      const suites = await scoreAll(scenario.oracle.suites, (suite) => scoreSuite(last, suite));
      if (!suites.ok) return suites;
      final = { step: last, suites: suites.value, ...mQ1(suites.value) };
    }
    return ok({
      score_version: SCORE_VERSION,
      scenario: run.scenario,
      version: run.version,
      scenario_hash: run.scenarioHash,
      scorer: { image: request.image.tag, tsx: request.image.tsx },
      steps,
      final,
    });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function scoreAll(
  suites: readonly Suite[],
  score: (suite: Suite) => Promise<Result<SuiteScore>>,
): Promise<Result<SuiteScore[]>> {
  const out: SuiteScore[] = [];
  for (const suite of suites) {
    const result = await score(suite);
    if (!result.ok) return result;
    out.push(result.value);
  }
  return ok(out);
}

/** M-Q1 over a snapshot's suites, only when some suite scores it. */
function mQ1(suites: readonly SuiteScore[]): { m_q1?: Tally } {
  if (suites.length === 0) return {};
  return {
    m_q1: {
      passed: suites.reduce((sum, suite) => sum + suite.passed, 0),
      total: suites.reduce((sum, suite) => sum + suite.total, 0),
    },
  };
}

/** A test's key: its file and its name path. */
function keyOf(test: Pick<TestResult, 'file' | 'path'>): string {
  return [test.file, ...test.path].join(' > ');
}

/** Counted in a tally: a test that ran; `skip` and `todo` count nowhere (adr-004). */
function counted(test: TestResult): boolean {
  return test.status === 'pass' || test.status === 'fail';
}

/** The census of `suite` (task-027 Design), taken once per scenario version and suite. */
async function censusOf(
  request: ScoreRequest,
  suite: Suite,
  suiteRun: (suite: Suite, snapshotDir: string) => Promise<Result<SuiteReport>>,
): Promise<Result<readonly string[]>> {
  const key = `${request.scenario.hash}#${suite.id}`;
  const known = request.census.get(key);
  if (known !== undefined) return known;
  const report = await suiteRun(suite, request.scenario.seedDir);
  const census = report.ok ? takeCensus(suite, report.value) : report;
  request.census.set(key, census);
  return census;
}

function takeCensus(suite: Suite, report: SuiteReport): Result<readonly string[]> {
  const path = `suite ${suite.id}`;
  const [file] = report.failedFiles;
  if (file !== undefined) {
    return fail([
      {
        path,
        message: `${file} fails to load on the seed: a hidden test must import the code under test inside the test (adr-004)`,
      },
    ]);
  }
  const keys = report.tests.filter(counted).map(keyOf);
  const repeated = keys.find((key, index) => keys.indexOf(key) !== index);
  if (repeated !== undefined) {
    return fail([{ path, message: `two hidden tests are named '${repeated}' on the seed` }]);
  }
  return ok([...keys].sort(byCodeUnit));
}

function tally(suite: Suite, census: readonly string[], report: SuiteReport, n: number): Result<SuiteScore> {
  const known = new Set(census);
  const unknown = report.tests
    .filter(counted)
    .map(keyOf)
    .find((key) => !known.has(key));
  if (unknown !== undefined) {
    return fail([
      {
        path: `suite ${suite.id}`,
        message:
          `step ${String(n).padStart(2, '0')} reports '${unknown}', which the census on the seed does not ` +
          'have: the oracle registers tests depending on the code under test (adr-004)',
      },
    ]);
  }
  const passing = new Set(report.tests.filter((test) => test.status === 'pass').map(keyOf));
  const failed = census.filter((key) => !passing.has(key));
  return ok({ id: suite.id, passed: census.length - failed.length, total: census.length, failed });
}

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Write `score.json` beside the run's `run.json` (REQ-FMT-06). */
export function writeScore(runDir: string, score: ScoreFile): void {
  writeFileSync(join(runDir, 'score.json'), `${JSON.stringify(score, undefined, 2)}\n`);
}

/** One line for the command line: M-Q1 per scored step and for the final snapshot. */
export function scoreSummary(score: ScoreFile): string {
  const tallied = (m: Tally | undefined) => (m === undefined ? undefined : `${m.passed}/${m.total}`);
  const parts = score.steps.flatMap((step) => {
    const label = `step ${String(step.n).padStart(2, '0')}`;
    if ('not_reached' in step) return [`${label} not reached`];
    const value = tallied(step.m_q1);
    return value === undefined ? [] : [`${label} ${value}`];
  });
  if ('not_reached' in score.final) parts.push('final not reached');
  else if (score.final.m_q1 !== undefined) parts.push(`final ${tallied(score.final.m_q1)}`);
  return parts.length === 0 ? 'no hidden tests' : parts.join(', ');
}
