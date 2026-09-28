import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';

import { fail, ok } from '../core/index.js';
import type { DockerPort, Issue, Result, Scenario, Suite } from '../core/index.js';

/** Where a snapshot and its suites are laid out, as in the scenario version (task-027 Design). */
export const SCORE_ROOT = '/score';

/** The scoring image's unprivileged user. */
const SCORE_USER = 'node';

/** What the scoring image holds at fixed paths (docker/score-image/Dockerfile). */
const TSX_LOADER = '/opt/score/node_modules/tsx/dist/loader.mjs';
const REPORTER = '/opt/score/reporter.mjs';

/**
 * The bounds of a suite's run (adr-004): each test and each test file's process by node's
 * `--test-timeout`; the whole suite by `timeout`, with a kill after it, since a node blocked in a
 * synchronous loop does not act on SIGTERM.
 */
const TEST_TIMEOUT_MS = 120_000;
const SUITE_TIMEOUT_S = 900;
const KILL_AFTER_S = 10;

/** The exit codes a suite's run may end with and still be read: tests passed, some failed, or it was stopped. */
const READABLE_EXITS = [0, 1, 124, 137];

/** A test file of a suite: `*.test.ts`, `.mts`, `.cts`, `.js`, `.mjs` or `.cjs`; anything else is a helper. */
const TEST_FILE = /\.test\.[cm]?[jt]s$/;

/** A hidden test's result as the reporter writes it: its file, its name path, and how it ended. */
export interface TestResult {
  readonly file: string;
  readonly path: readonly string[];
  readonly status: 'pass' | 'fail' | 'skip' | 'todo';
}

/** What a suite's run reported: its tests, and the files that failed as a whole — to load, or killed. */
export interface SuiteReport {
  readonly tests: readonly TestResult[];
  readonly failedFiles: readonly string[];
}

const reporterLine = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('test'),
    file: z.string(),
    path: z.array(z.string()),
    status: z.enum(['pass', 'fail', 'skip', 'todo']),
  }),
  z.strictObject({ kind: z.literal('file'), file: z.string(), status: z.literal('fail') }),
]);

/** Read the reporter's output (docker/score-image/reporter.mjs): one JSON line per result. */
export function parseReport(stdout: string): Result<SuiteReport> {
  const tests: TestResult[] = [];
  const failedFiles: string[] = [];
  const issues: Issue[] = [];
  stdout.split('\n').forEach((line, index) => {
    if (line.trim() === '') return;
    let parsed: z.infer<typeof reporterLine> | undefined;
    try {
      const result = reporterLine.safeParse(JSON.parse(line));
      parsed = result.success ? result.data : undefined;
    } catch {
      parsed = undefined;
    }
    if (parsed === undefined)
      issues.push({ path: `report line ${index + 1}`, message: 'is not a reporter line' });
    else if (parsed.kind === 'file') failedFiles.push(parsed.file);
    else tests.push({ file: parsed.file, path: parsed.path, status: parsed.status });
  });
  return issues.length > 0 ? fail(issues) : ok({ tests, failedFiles });
}

/** A suite's test files, relative to the scenario version directory, in code-unit order. */
export function suiteTestFiles(scenario: Scenario, suite: Suite): string[] {
  const walk = (directory: string): string[] =>
    readdirSync(directory).flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? walk(path) : TEST_FILE.test(name) ? [path] : [];
    });
  return walk(suite.dir)
    .map((file) => relative(scenario.dir, file).split('\\').join('/'))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The command that runs `files` in the scoring container (REQ-SCO-02, adr-004). */
export function suiteCommand(files: readonly string[]): string[] {
  return [
    'timeout',
    `--kill-after=${KILL_AFTER_S}`,
    String(SUITE_TIMEOUT_S),
    'node',
    '--import',
    TSX_LOADER,
    '--test',
    '--test-concurrency=1',
    `--test-timeout=${TEST_TIMEOUT_MS}`,
    `--test-reporter=${REPORTER}`,
    ...files,
  ];
}

/** One suite on one snapshot: the image, the container's name, and what goes in it. */
export interface SuiteRequest {
  readonly docker: DockerPort;
  readonly image: string;
  readonly container: string;
  readonly scenario: Scenario;
  readonly suite: Suite;
  readonly snapshotDir: string;
}

/**
 * Run one suite on one snapshot (REQ-SCO-01): a container with no network, the suite mounted read-only
 * where it sits in the scenario version, the snapshot copied where the seed sits, so that a hidden
 * test's relative import reaches the snapshot as it reaches the seed on the author's machine. The
 * container is removed whatever happens. A suite with no test file runs nothing.
 */
export async function runSuite(request: SuiteRequest): Promise<Result<SuiteReport>> {
  const { docker, scenario, suite } = request;
  const files = suiteTestFiles(scenario, suite);
  if (files.length === 0) return ok({ tests: [], failedFiles: [] });
  const inside = (path: string) => `${SCORE_ROOT}/${relative(scenario.dir, path).split('\\').join('/')}`;
  const container = await docker.createScoring({
    image: request.image,
    name: request.container,
    user: SCORE_USER,
    workdir: SCORE_ROOT,
    readOnly: [{ source: suite.dir, target: inside(suite.dir) }],
  });
  try {
    await docker.start(container);
    await docker.copyTo(container, request.snapshotDir, inside(scenario.seedDir));
    const result = await docker.exec(container, suiteCommand(files));
    if (!READABLE_EXITS.includes(result.code)) {
      const said = result.stderr.trim().split('\n').slice(-5).join('\n');
      return fail([
        {
          path: `suite ${suite.id}`,
          message: `the scoring container exited with code ${result.code}${said === '' ? '' : `: ${said}`}`,
        },
      ]);
    }
    return parseReport(result.stdout);
  } finally {
    await docker.remove(container);
  }
}
