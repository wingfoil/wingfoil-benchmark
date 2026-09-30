import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { z } from 'zod';

import { fail, ok } from '../core/index.js';
import type { DockerPort, Result } from '../core/index.js';

import { SCORE_ROOT } from './hidden-tests.js';

/** The scoring image's static-quality measure (docker/score-image/quality.mjs, task-041). */
const QUALITY_SCRIPT = '/opt/score/quality.mjs';

/** Where the snapshot is copied in the container, relative to its working directory. */
const SNAPSHOT = 'snapshot';

/** The bounds of the measure: it runs the project's tests (300 s of their own), then ESLint and jscpd. */
const QUALITY_TIMEOUT_S = 600;
const KILL_AFTER_S = 10;

/** A source file M-Q2 reads (REQ-SCO-04 as amended in 1.16); a declaration file is not one. */
const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const DECLARATION = /\.d\.[cm]?ts$/;
/** A test: measured, but never a coverage target. */
const TEST = /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;

/** The files M-Q2 measures, and those of them coverage is taken on: relative paths, sorted. */
export interface QualityFiles {
  readonly measured: readonly string[];
  readonly coverageTargets: readonly string[];
}

const qualityLine = z.strictObject({
  lint: z.strictObject({ findings: z.number().int(), lines: z.number().int() }),
  complexity: z.strictObject({ functions: z.number().int(), sum: z.number().int(), max: z.number().int() }),
  duplication: z.strictObject({ duplicated_lines: z.number().int(), lines: z.number().int() }),
  coverage: z.strictObject({
    covered: z.number().int(),
    total: z.number().int(),
    tests: z.enum(['passed', 'failed', 'timed out', 'none']),
  }),
});

/** What quality.mjs measured: each indicator as the integers it is a ratio of. */
export type QualityMeasure = z.infer<typeof qualityLine>;

/** M-Q2 in `score.json` (REQ-SCO-04): the measure with the files it read; or why there is none. */
export type MQ2Score =
  | ({ readonly measured: readonly string[]; readonly coverage_targets: readonly string[] } & QualityMeasure)
  | { readonly not_reached: true }
  | { readonly not_applicable: true };

/** Measures one run's final snapshot. */
export type QualityRunner = (request: {
  readonly snapshot: string;
  readonly files: QualityFiles;
}) => Promise<Result<QualityMeasure>>;

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Every file under `root`, relative and with `/`, `node_modules/` not entered. */
export function filesUnder(root: string): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'node_modules' && name !== '.git') walk(path);
      } else found.push(relative(root, path).split(sep).join('/'));
    }
  };
  walk(root);
  return found;
}

/** The paths a stored patch touches, on either side: `diff --git a/<path> b/<path>`, quoted or not. */
export function patchPaths(patch: string): Set<string> {
  const paths = new Set<string>();
  for (const line of patch.split('\n')) {
    const quoted = /^diff --git "a\/(.*)" "b\/(.*)"$/.exec(line);
    const plain = quoted ?? /^diff --git a\/(\S+) b\/(\S+)$/.exec(line);
    if (plain !== null) {
      paths.add(plain[1] as string);
      paths.add(plain[2] as string);
    }
  }
  return paths;
}

/**
 * The files the run changed (REQ-SCO-04 as amended in 1.16, experiment design §4.1): the source files
 * the final snapshot adds or changes from the seed, less every path the setup's patch touches — the
 * harness's files, whatever the harness. Tests are measured, but are not coverage targets.
 */
export function measuredFiles(request: {
  readonly seedDir: string;
  readonly snapshot: string;
  readonly setupPatch: string;
}): QualityFiles {
  const setup = patchPaths(request.setupPatch);
  const measured = filesUnder(request.snapshot)
    .filter((file) => SOURCE.test(file) && !DECLARATION.test(file) && !setup.has(file))
    .filter((file) => {
      const before = join(request.seedDir, file);
      return !existsSync(before) || !readFileSync(before).equals(readFileSync(join(request.snapshot, file)));
    })
    .sort(byCodeUnit);
  return { measured, coverageTargets: measured.filter((file) => !TEST.test(file)) };
}

/** Read quality.mjs's one line. */
export function parseQuality(stdout: string): Result<QualityMeasure> {
  const line = stdout.trim().split('\n').at(-1) ?? '';
  let data: unknown;
  try {
    data = JSON.parse(line);
  } catch {
    return fail([{ path: 'final', message: 'the static-quality measure printed no JSON line' }]);
  }
  const parsed = qualityLine.safeParse(data);
  if (!parsed.success) {
    return fail([
      {
        path: 'final',
        message: `the static-quality measure printed an unexpected line: ${parsed.error.message}`,
      },
    ]);
  }
  return ok(parsed.data);
}

/**
 * The static-quality runner of scoring (REQ-SCO-01, REQ-SCO-04; adr-004 amendment 3): one scoring
 * container, with no mount and no network, the final snapshot copied in, the image's script run with
 * the tools the image pins. The container is removed whatever happens; an exit other than 0 is an
 * oracle error. The project's tests failing is not: the script records it.
 */
export function qualityInContainer(options: {
  readonly docker: DockerPort;
  readonly image: string;
  readonly containerPrefix: string;
}): QualityRunner {
  const { docker } = options;
  return async ({ snapshot, files }) => {
    const container = await docker.createScoring({
      image: options.image,
      name: `${options.containerPrefix}-quality`,
      user: 'node',
      workdir: SCORE_ROOT,
      readOnly: [],
    });
    try {
      await docker.start(container);
      await docker.copyTo(container, snapshot, `${SCORE_ROOT}/${SNAPSHOT}`);
      const spec = JSON.stringify({ measured: files.measured, coverageTargets: files.coverageTargets });
      const result = await docker.exec(container, [
        'timeout',
        `--kill-after=${KILL_AFTER_S}`,
        String(QUALITY_TIMEOUT_S),
        'node',
        QUALITY_SCRIPT,
        SNAPSHOT,
        spec,
      ]);
      if (result.code !== 0) {
        const said = result.stderr.trim().split('\n').slice(-5).join('\n');
        return fail([
          {
            path: 'final',
            message: `the static-quality measure exited with code ${result.code}${said === '' ? '' : `: ${said}`}`,
          },
        ]);
      }
      return parseQuality(result.stdout);
    } finally {
      await docker.remove(container);
    }
  };
}
