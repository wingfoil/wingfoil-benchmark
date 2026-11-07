import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

/**
 * Every file under `root`, relative and with `/`, `node_modules/` and `.git/` not entered; a symbolic link is neither
 * listed nor followed (task-139, bug-034), so a link is never measured as the file it points to.
 */
export function filesUnder(root: string): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') walk(path);
      } else if (entry.isFile()) found.push(relative(root, path).split(sep).join('/'));
    }
  };
  walk(root);
  return found;
}

/** A path as git writes it in a patch: C-quoted when it holds a special character, its octal escapes UTF-8 bytes. */
function unquote(text: string): string {
  if (!text.startsWith('"')) return text;
  const bytes: number[] = [];
  const named: Record<string, number> = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };
  for (let i = 1; i < text.length - 1; i += 1) {
    const char = text.charAt(i);
    if (char !== '\\') {
      bytes.push(...Buffer.from(char, 'utf8'));
      continue;
    }
    const next = text.charAt(i + 1);
    if (/[0-7]/.test(next)) {
      bytes.push(Number.parseInt(text.slice(i + 1, i + 4), 8));
      i += 3;
    } else {
      bytes.push(named[next] ?? next.charCodeAt(0));
      i += 1;
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * The paths a stored patch touches, on either side (task-139, bug-034): each `diff --git` header's two paths, quoted
 * or not, spaces included (an unquoted header names the same path twice unless the file was renamed or copied, and
 * then its `rename`/`copy` lines name both), and every `---`/`+++` path of a file's extended header, never a hunk's line.
 */
export function patchPaths(patch: string): Set<string> {
  const paths = new Set<string>();
  const add = (path: string) => {
    if (path !== '/dev/null') paths.add(path);
  };
  // Only a file's extended header names paths: from its `diff --git` line to its first hunk or binary patch.
  let header = false;
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@') || line.startsWith('GIT binary patch')) header = false;
    const quoted = /^diff --git ("(?:[^"\\]|\\.)*"|a\/\S*) ("(?:[^"\\]|\\.)*"|b\/.*)$/.exec(line);
    if (line.startsWith('diff --git ')) {
      const rest = line.slice('diff --git '.length);
      const half = (rest.length - 1) / 2;
      if (quoted !== null && (quoted[1]?.startsWith('"') === true || quoted[2]?.startsWith('"') === true)) {
        add(unquote(quoted[1] as string).replace(/^a\//, ''));
        add(unquote(quoted[2] as string).replace(/^b\//, ''));
      } else if (
        Number.isInteger(half) &&
        rest.slice(2, half) === rest.slice(half + 3) &&
        rest.charAt(half) === ' '
      ) {
        add(rest.slice(2, half));
      }
      header = true;
      continue;
    }
    if (!header) continue;
    const named =
      /^(?:rename|copy) (?:from|to) (.*)$/.exec(line) ?? /^(?:---|\+\+\+) [ab]\/(.*?)\t?$/.exec(line);
    if (named !== null) add(unquote(named[1] as string));
    const quotedSide = /^(?:---|\+\+\+) ("(?:[^"\\]|\\.)*")\t?$/.exec(line);
    if (quotedSide !== null) add(unquote(quotedSide[1] as string).replace(/^[ab]\//, ''));
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
