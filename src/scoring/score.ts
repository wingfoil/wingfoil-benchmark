import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fail, ok } from '../core/index.js';
import type { DockerPort, GitPort, Result, Scenario, Suite } from '../core/index.js';
import type { StoredRun } from '../results/index.js';
import type { HoldoutAdditions } from '../scenario/index.js';

import { astInContainer } from './ast.js';
import { scoreChecks } from './checks.js';
import type { CheckScore } from './checks.js';
import { mD3, mF1, mF2 } from './continuity.js';
import type { MD3Score, MF1Score, MF2Score } from './continuity.js';
import { costMetrics } from './cost.js';
import type { CostScore } from './cost.js';
import { runSuite } from './hidden-tests.js';
import { holdoutHash, holdoutSuites } from './holdout.js';
import type { SuiteReport, TestResult } from './hidden-tests.js';
import type { ScoringImage } from './image.js';
import { measuredFiles, qualityInContainer } from './quality.js';
import type { MQ2Score, QualityRunner } from './quality.js';
import { rebuildSnapshots } from './snapshot.js';

/** The version of the scoring rules (adr-004): it rises when a rule changes, not when a key is added. */
export const SCORE_VERSION = 1;

/** M-Q1 as its two integers (experiment design §4.1): the ratio is aggregation's, so nothing is rounded here. */
export interface Tally {
  readonly passed: number;
  readonly total: number;
}

/** One suite on one snapshot, in counts: all that is said of a hold-out suite (task-028). */
export interface SuiteTally extends Tally {
  readonly id: string;
}

/** One public suite on one snapshot: its tally, and its failing tests by file and name path, sorted. */
export interface SuiteScore extends SuiteTally {
  readonly failed: readonly string[];
}

/** A step: its suites and their M-Q1 when some suite scores it, or that the run never reached it. */
export type StepScore<S extends SuiteTally = SuiteScore> =
  | { readonly n: number; readonly suites: readonly S[]; readonly m_q1?: Tally }
  | { readonly n: number; readonly not_reached: true };

/** The public suites on the seed, with the seed's own verdicts (REQ-SCO-12): what M-D3 is measured from. */
export interface SeedScore<S extends SuiteTally = SuiteScore> {
  readonly suites: readonly S[];
  readonly m_q1?: Tally;
}

/** The final snapshot, scored against every suite, or that the run did not complete. */
export type FinalScore<S extends SuiteTally = SuiteScore> =
  | { readonly step: number; readonly suites: readonly S[]; readonly m_q1?: Tally }
  | { readonly not_reached: true };

/** Why the hold-out was not scored (task-028): none was given, or the scenario version declares none. */
export type HoldoutNotScored = 'not configured' | 'none declared';

/**
 * The hold-out's results, apart from the public ones (REQ-SCO-09): in counts only, with the hold-out's
 * version; or why they are not there, so that a score cannot be mistaken for one that includes them.
 */
export type HoldoutScore =
  | {
      readonly scored: true;
      readonly hash: string;
      readonly steps: readonly StepScore<SuiteTally>[];
      readonly final: FinalScore<SuiteTally>;
    }
  | { readonly scored: false; readonly reason: HoldoutNotScored };

/** `score.json`, version 1 (REQ-FMT-06, task-027): no timestamp, keys in a fixed order (REQ-SCO-03). */
export interface ScoreFile {
  readonly score_version: number;
  readonly scenario: string;
  readonly version: string;
  readonly scenario_hash: string;
  readonly scorer: {
    readonly image: string;
    readonly tsx: string;
    readonly typescript: string;
    readonly eslint: string;
    readonly typescript_eslint: string;
    readonly jscpd: string;
    readonly c8: string;
  };
  /** The public suites on the seed (REQ-SCO-12, task-039). */
  readonly seed: SeedScore;
  readonly steps: readonly StepScore[];
  readonly final: FinalScore;
  readonly holdout: HoldoutScore;
  /** The scenario's checks on their steps (REQ-SCO-06, task-035); empty when it declares none. */
  readonly checks: readonly CheckScore[];
  /** M-F1 (REQ-SCO-12, task-039); absent for a scenario that lists no decision. */
  readonly m_f1?: MF1Score;
  /** M-F2 (REQ-SCO-12, task-039); absent for a scenario of one step. */
  readonly m_f2?: MF2Score;
  /** M-D3 from the seed (REQ-SCO-12, task-039). */
  readonly m_d3: MD3Score;
  /** M-Q2 on the files the run changed (REQ-SCO-04, task-041). */
  readonly m_q2: MQ2Score;
  /** M-K1 and M-K2 per step and for the run (F4.3, task-029). */
  readonly cost: CostScore;
  /** The run's mark (F3.6), as the runner recorded it: `null`, or the capabilities its harness lacked. */
  readonly expected_failure: { readonly missing: readonly string[] } | null;
}

/**
 * A suite's census (task-027 Design): its hidden tests, as `file > name > path` keys, sorted; and those
 * of them the seed itself does not pass (task-039), which M-D3 is measured from.
 */
export interface CensusEntry {
  readonly keys: readonly string[];
  readonly failedOnSeed: readonly string[];
}

/**
 * The census of each suite, taken on the seed — or why it could not be. By scenario hash (or hold-out
 * hash) and suite id, shared by every run a `bench score` scores, since it depends only on the seed and
 * the oracle.
 */
export type Census = Map<string, Result<CensusEntry>>;

/** The hold-out a run is scored with: its additions, or why there is none (task-028). */
export type HoldoutInput =
  { readonly additions: HoldoutAdditions } | { readonly notScored: HoldoutNotScored };

/** What scoring one run needs. */
export interface ScoreRequest {
  readonly runDir: string;
  /** The run's execution, `results/<campaign-id>/<n>` or `results/dry-runs/<n>`: where its pins are. */
  readonly executionDir: string;
  readonly run: StoredRun;
  readonly scenario: Scenario;
  readonly image: ScoringImage;
  readonly docker: DockerPort;
  readonly git: GitPort;
  readonly census: Census;
  /** The stem of the scoring containers' names; each gets a number after it. */
  readonly containerPrefix: string;
  /** By default, none given: `not configured`. */
  readonly holdout?: HoldoutInput;
  /** What measures M-Q2; by default the scoring image's quality.mjs in a container (task-041). */
  readonly quality?: QualityRunner;
}

/** A group of suites scored together: the public ones, or a hold-out's, which nothing may repeat. */
interface Group {
  readonly entries: readonly { readonly suite: Suite; readonly holdoutDir?: string }[];
  readonly confidential: boolean;
  /** What the census is keyed by besides the suite: the scenario's hash, or the hold-out's. */
  readonly version: string;
}

/**
 * Score one run with its scenario's oracle (F4.1): rebuild its snapshots from what it stored; for every
 * step, the suites bound to it (dl-001); for the final snapshot — the last step's, when the run
 * completed — every suite. A suite's total is its census on the seed; its passed tests are the census
 * tests the snapshot reports passing; every other census test fails (adr-004). The hold-out's suites
 * are scored the same way, in containers of their own, and reported apart in counts only (task-028).
 * Then the scenario's checks, on the same snapshots and the step's stored files (task-035).
 */
export async function scoreRun(request: ScoreRequest): Promise<Result<ScoreFile>> {
  const { run, scenario } = request;
  const holdout = request.holdout ?? { notScored: 'not configured' };
  const cost = costMetrics({ runDir: request.runDir, executionDir: request.executionDir, run, scenario });
  if (!cost.ok) return cost;
  const workDir = mkdtempSync(join(tmpdir(), 'bench-score-'));
  try {
    const snapshots = await rebuildSnapshots({ ...request, workDir });
    if (!snapshots.ok) return snapshots;
    const scorer = groupScorer(request, snapshots.value);
    const publicScore = await scorer({
      entries: scenario.oracle.suites.map((suite) => ({ suite })),
      confidential: false,
      version: scenario.hash,
    });
    if (!publicScore.ok) return publicScore;
    let holdoutScore: HoldoutScore;
    if ('notScored' in holdout) holdoutScore = { scored: false, reason: holdout.notScored };
    else {
      const hash = holdoutHash(holdout.additions);
      const scored = await scorer({
        entries: holdoutSuites(scenario, holdout.additions).map(({ suite, dir }) => ({
          suite,
          holdoutDir: dir,
        })),
        confidential: true,
        version: hash,
      });
      if (!scored.ok) return scored;
      holdoutScore = { scored: true, hash, steps: scored.value.steps, final: scored.value.final };
    }
    const checks = await scoreChecks({
      checks: scenario.oracle.checks,
      runDir: request.runDir,
      snapshots: snapshots.value,
      ast: astInContainer({
        docker: request.docker,
        image: request.image.tag,
        containerPrefix: request.containerPrefix,
      }),
    });
    if (!checks.ok) return checks;
    const final = publicScore.value.final as FinalScore;
    const decisions = mF1(scenario.oracle.decisions, publicScore.value.tests, final, checks.value);
    if (!decisions.ok) return decisions;
    const nextChange = mF2(publicScore.value.steps as StepScore[], cost.value);
    const seed = publicScore.value.seed as SeedScore;
    const quality = await staticQuality(request, final, snapshots.value);
    if (!quality.ok) return quality;
    return ok({
      score_version: SCORE_VERSION,
      scenario: run.scenario,
      version: run.version,
      scenario_hash: run.scenarioHash,
      scorer: {
        image: request.image.tag,
        tsx: request.image.tsx,
        typescript: request.image.typescript,
        eslint: request.image.eslint,
        typescript_eslint: request.image.typescriptEslint,
        jscpd: request.image.jscpd,
        c8: request.image.c8,
      },
      seed,
      steps: publicScore.value.steps as StepScore[],
      final,
      holdout: holdoutScore,
      checks: checks.value,
      ...(decisions.value === undefined ? {} : { m_f1: decisions.value }),
      ...(nextChange === undefined ? {} : { m_f2: nextChange }),
      m_d3: mD3(seed, final),
      m_q2: quality.value,
      cost: cost.value,
      expected_failure:
        run.expectedFailure === undefined ? null : { missing: [...run.expectedFailure.missing] },
    });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * M-Q2 (REQ-SCO-04 as amended in 1.16): on the final snapshot, the files the run changed from the seed
 * less the setup's, measured by the image; not reached without a final snapshot, not applicable when the
 * run changed no source file.
 */
async function staticQuality(
  request: ScoreRequest,
  final: FinalScore,
  snapshots: ReadonlyMap<number, string>,
): Promise<Result<MQ2Score>> {
  if ('not_reached' in final) return ok({ not_reached: true });
  const snapshot = snapshots.get(final.step) as string;
  const patch = join(request.runDir, 'setup', 'diff.patch');
  const files = measuredFiles({
    seedDir: request.scenario.seedDir,
    snapshot,
    setupPatch: existsSync(patch) ? readFileSync(patch, 'utf8') : '',
  });
  if (files.measured.length === 0) return ok({ not_applicable: true });
  const run =
    request.quality ??
    qualityInContainer({
      docker: request.docker,
      image: request.image.tag,
      containerPrefix: request.containerPrefix,
    });
  const measure = await run({ snapshot, files });
  if (!measure.ok) return measure;
  return ok({ measured: files.measured, coverage_targets: files.coverageTargets, ...measure.value });
}

/** Scores a group of suites on a run's snapshots: every step bound to one, then the final snapshot. */
function groupScorer(request: ScoreRequest, snapshots: ReadonlyMap<number, string>) {
  const { scenario, run } = request;
  let containers = 0;
  const suiteRun = (group: Group, entry: Group['entries'][number], snapshotDir: string) => {
    containers += 1;
    return runSuite({
      docker: request.docker,
      image: request.image.tag,
      container: `${request.containerPrefix}-${containers}`,
      scenario,
      suite: entry.suite,
      snapshotDir,
      ...(entry.holdoutDir === undefined ? {} : { holdoutDir: entry.holdoutDir }),
      confidential: group.confidential,
    });
  };

  return async (
    group: Group,
  ): Promise<
    Result<{
      seed: SeedScore<SuiteTally>;
      tests: readonly string[];
      steps: StepScore<SuiteTally>[];
      final: FinalScore<SuiteTally>;
    }>
  > => {
    // Every suite's census first: the seed is scored whether or not the run reached a step (task-039).
    const censuses = new Map<string, CensusEntry>();
    const seedSuites: SuiteTally[] = [];
    for (const entry of group.entries) {
      const census = await censusOf(request.census, group, entry, scenario.seedDir, (snapshot) =>
        suiteRun(group, entry, snapshot),
      );
      if (!census.ok) return census;
      censuses.set(entry.suite.id, census.value);
      const { keys, failedOnSeed } = census.value;
      const counts = { id: entry.suite.id, passed: keys.length - failedOnSeed.length, total: keys.length };
      seedSuites.push(group.confidential ? counts : ({ ...counts, failed: failedOnSeed } as SuiteScore));
    }
    // One result per step and suite: the final snapshot is a step's, and is not run twice.
    const scored = new Map<string, SuiteTally>();
    const scoreEntry = async (n: number, entry: Group['entries'][number]): Promise<Result<SuiteTally>> => {
      const key = `${n}#${entry.suite.id}`;
      const known = scored.get(key);
      if (known !== undefined) return ok(known);
      const census = censuses.get(entry.suite.id) as CensusEntry;
      const report = await suiteRun(group, entry, snapshots.get(n) as string);
      if (!report.ok) return report;
      const result = tally(group, entry.suite, census.keys, report.value, n);
      if (result.ok) scored.set(key, result.value);
      return result;
    };
    const scoreAll = async (entries: Group['entries'], n: number): Promise<Result<SuiteTally[]>> => {
      const out: SuiteTally[] = [];
      for (const entry of entries) {
        const result = await scoreEntry(n, entry);
        if (!result.ok) return result;
        out.push(result.value);
      }
      return ok(out);
    };

    const steps: StepScore<SuiteTally>[] = [];
    for (const step of scenario.steps) {
      if (!snapshots.has(step.n)) {
        steps.push({ n: step.n, not_reached: true });
        continue;
      }
      const suites = await scoreAll(
        group.entries.filter((entry) => entry.suite.afterSteps.includes(step.n)),
        step.n,
      );
      if (!suites.ok) return suites;
      steps.push({ n: step.n, suites: suites.value, ...mQ1(suites.value) });
    }
    const last = scenario.steps.length;
    let final: FinalScore<SuiteTally> = { not_reached: true };
    if (run.outcome === 'completed' && snapshots.has(last)) {
      const suites = await scoreAll(group.entries, last);
      if (!suites.ok) return suites;
      final = { step: last, suites: suites.value, ...mQ1(suites.value) };
    }
    const tests = [...censuses.values()].flatMap((census) => census.keys).sort(byCodeUnit);
    return ok({ seed: { suites: seedSuites, ...mQ1(seedSuites) }, tests, steps, final });
  };
}

/** M-Q1 over a snapshot's suites, only when some suite scores it. */
function mQ1(suites: readonly SuiteTally[]): { m_q1?: Tally } {
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

/** Where an issue of a group's suite is reported. */
function suitePath(group: Group, suite: Suite): string {
  return `${group.confidential ? 'hold-out suite' : 'suite'} ${suite.id}`;
}

/** The census of a group's suite (task-027 Design), taken once per oracle version and suite. */
async function censusOf(
  cache: Census,
  group: Group,
  entry: Group['entries'][number],
  seedDir: string,
  runOn: (snapshotDir: string) => Promise<Result<SuiteReport>>,
): Promise<Result<CensusEntry>> {
  const key = `${group.confidential ? 'holdout' : 'public'}#${group.version}#${entry.suite.id}`;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const report = await runOn(seedDir);
  const census = report.ok ? takeCensus(group, entry.suite, report.value) : report;
  cache.set(key, census);
  return census;
}

function takeCensus(group: Group, suite: Suite, report: SuiteReport): Result<CensusEntry> {
  const path = suitePath(group, suite);
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
    const message = group.confidential
      ? 'two hold-out tests share a name on the seed'
      : `two hidden tests are named '${repeated}' on the seed`;
    return fail([{ path, message }]);
  }
  const passing = new Set(report.tests.filter((test) => test.status === 'pass').map(keyOf));
  const sorted = [...keys].sort(byCodeUnit);
  return ok({ keys: sorted, failedOnSeed: sorted.filter((key) => !passing.has(key)) });
}

function tally(
  group: Group,
  suite: Suite,
  census: readonly string[],
  report: SuiteReport,
  n: number,
): Result<SuiteTally> {
  const known = new Set(census);
  const unknown = report.tests
    .filter(counted)
    .map(keyOf)
    .find((key) => !known.has(key));
  if (unknown !== undefined) {
    const step = `step ${String(n).padStart(2, '0')}`;
    const message = group.confidential
      ? `${step} reports a hold-out test the census on the seed does not have (adr-004)`
      : `${step} reports '${unknown}', which the census on the seed does not have: the oracle registers ` +
        'tests depending on the code under test (adr-004)';
    return fail([{ path: suitePath(group, suite), message }]);
  }
  const passing = new Set(report.tests.filter((test) => test.status === 'pass').map(keyOf));
  const failed = census.filter((key) => !passing.has(key));
  const counts = { id: suite.id, passed: census.length - failed.length, total: census.length };
  return ok(group.confidential ? counts : { ...counts, failed });
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
  const line = parts.length === 0 ? 'no hidden tests' : parts.join(', ');
  const marked =
    score.expected_failure === null
      ? ''
      : `; expected failure (missing ${score.expected_failure.missing.join(', ')})`;
  const consistency =
    score.m_f1 === undefined || 'not_reached' in score.m_f1
      ? ''
      : `; M-F1 ${score.m_f1.consistent}/${score.m_f1.total}`;
  return `${line}${holdoutPart(score.holdout, tallied)}${checksPart(score.checks)}${consistency}${marked}`;
}

/** What the summary line says of the checks: passed over scored, across checks and steps, or nothing. */
function checksPart(checks: readonly CheckScore[]): string {
  const scored = checks.flatMap((check) => check.steps).filter((step) => 'passed' in step);
  if (scored.length === 0) return '';
  return `; checks ${scored.filter((step) => 'passed' in step && step.passed).length}/${scored.length}`;
}

/** What the summary line says of the hold-out: its final M-Q1, that it was not scored, or nothing. */
function holdoutPart(holdout: HoldoutScore, tallied: (m: Tally | undefined) => string | undefined): string {
  if (!holdout.scored) return holdout.reason === 'not configured' ? '; hold-out not scored' : '';
  if ('not_reached' in holdout.final) return '; hold-out final not reached';
  const value = tallied(holdout.final.m_q1);
  return value === undefined ? '' : `; hold-out final ${value}`;
}
