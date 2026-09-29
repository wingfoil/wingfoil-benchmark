import { filesUnder, patchPaths } from './quality.js';

/**
 * The paths an agent commits that a build or a package manager wrote (REQ-SCO-07 as amended in 1.17):
 * anything under these directories, at any depth, build information, and the lockfiles.
 */
const GENERATED = [
  /(^|\/)(node_modules|dist|build|coverage)\//,
  /\.tsbuildinfo$/,
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/,
];

/** A TypeScript source M-R2 reads: the files the AST checks read (REQ-SCO-05). */
const SOURCE = /\.(ts|tsx|mts|cts)$/;
const LEFT_OUT = /(\.d\.[cm]?ts$)|(\.(test|spec)\.[cm]?tsx?$)/;

/** M-R2's and M-R3's inputs in `score.json` (task-042), on the final snapshot; or that it was not reached. */
export type DeterminismScore =
  | { readonly interface: readonly string[]; readonly paths: readonly string[] }
  | { readonly not_reached: true };

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * M-R3's paths (experiment design §4.5, REQ-SCO-07 as amended in 1.17): every file of the snapshot, less
 * every path the setup's patch touches — the harness's files, whatever the harness (task-041's rule) —
 * and less the generated ones; sorted by code unit.
 */
export function determinismPaths(request: {
  readonly snapshot: string;
  readonly setupPatch: string;
}): string[] {
  const setup = patchPaths(request.setupPatch);
  return filesUnder(request.snapshot)
    .filter((path) => !setup.has(path) && !GENERATED.some((pattern) => pattern.test(path)))
    .sort(byCodeUnit);
}

/** The files M-R2 reads among M-R3's paths: TypeScript sources, less declaration files and tests. */
export function interfaceFiles(paths: readonly string[]): string[] {
  return paths.filter((path) => SOURCE.test(path) && !LEFT_OUT.test(path));
}
