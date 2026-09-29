import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The scoring image's build directory, relative to the package root (task-027). */
const SCORE_IMAGE_DIRECTORY = join('docker', 'score-image');

/** The scoring image (REQ-SCO-01, REQ-SCO-02): where it is built from, its tag, and the tsx it pins. */
export interface ScoringImage {
  /** `bench-score:<12 hex>`: the SHA-256 of its build directory, so any change is a new image. */
  readonly tag: string;
  readonly dockerfile: string;
  readonly context: string;
  /** The tsx version the image's `package.json` pins, recorded in every `score.json`. */
  readonly tsx: string;
  /** The TypeScript the AST checks parse with (REQ-SCO-05, task-037), recorded in every `score.json`. */
  readonly typescript: string;
  /** M-Q2's tools (REQ-SCO-04, task-041), each recorded in every `score.json`. */
  readonly eslint: string;
  readonly typescriptEslint: string;
  readonly jscpd: string;
  readonly c8: string;
}

/** The scoring image of the package at `root`. */
export function scoringImage(root: string = packageRoot()): ScoringImage {
  const context = join(root, SCORE_IMAGE_DIRECTORY);
  const lines = filesUnder(context)
    .map((file) => `${sha256(readFileSync(file))}  ${relative(context, file).split('\\').join('/')}\n`)
    .sort();
  const pinned = JSON.parse(readFileSync(join(context, 'package.json'), 'utf8')) as {
    dependencies: Record<'tsx' | 'typescript' | 'eslint' | 'typescript-eslint' | 'jscpd' | 'c8', string>;
  };
  return {
    tag: `bench-score:${sha256(lines.join('')).slice(0, 12)}`,
    dockerfile: join(context, 'Dockerfile'),
    context,
    tsx: pinned.dependencies.tsx,
    typescript: pinned.dependencies.typescript,
    eslint: pinned.dependencies.eslint,
    typescriptEslint: pinned.dependencies['typescript-eslint'],
    jscpd: pinned.dependencies.jscpd,
    c8: pinned.dependencies.c8,
  };
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** The package root, from this file's location in `dist/scoring/` or `src/scoring/`. */
function packageRoot(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}
