import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join, posix } from 'node:path';
import { parse } from 'yaml';

/** Where arms live, from the repository root (REQ-FMT-05). */
const ARMS = 'arms';

function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Every entry below `dir`, as repository paths from `root`, depth first. */
function entriesUnder(
  root: string,
  dir: string,
): { path: string; full: string; kind: 'file' | 'link' | 'other' }[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = posix.join(dir, entry.name);
    if (entry.isDirectory()) return entriesUnder(root, path);
    const kind = entry.isFile() ? 'file' : entry.isSymbolicLink() ? 'link' : 'other';
    return [{ path, full: join(root, path), kind } as const];
  });
}

/** What a line hashes: a file's content, a link's target, or — for a FIFO or a device, never read — its kind. */
function contentOf({ full, kind }: { full: string; kind: 'file' | 'link' | 'other' }): Buffer | string {
  return kind === 'file' ? readFileSync(full) : kind === 'link' ? `link:${readlinkSync(full)}` : 'special';
}

/**
 * REQ-FMT-13: the digest of an arm, the SHA-256 (64 hex) of one line per file under `arms/<arm>/`, in sorted path
 * order (JavaScript's code-unit order, independent of the locale; the same as byte order for every path an arm has,
 * ASCII), `<path>\0<sha256 of its content>\n`, the path from the repository root. A symbolic link — which the arm
 * loader refuses wherever it lies (task-139, bug-034) — is hashed by its target, so that it cannot change unseen: the
 * digest has no channel for a refusal, and the loader gives it. A docs control's manual is a copy
 * of baseline-docs' under its own directory (task-067), so its digest covers it. A configured arm's lines are its own
 * directory's and its base arm's, `arms/<base>/` (REQ-FMT-13 as amended in 1.50, task-142).
 */
export function armDigest(repoRoot: string, arm: string): string {
  const file = join(repoRoot, ARMS, arm, 'arm.yaml');
  const base = existsSync(file) ? configuredOfIn(readFileSync(file, 'utf8')) : undefined;
  // A configured arm's digest covers its own files and its base arm's (REQ-FMT-13 as amended in 1.50).
  const dirs = [
    arm,
    ...(base === undefined || base === arm || !existsSync(join(repoRoot, ARMS, base)) ? [] : [base]),
  ];
  return armDigestOf(
    new Map(
      dirs.flatMap((dir) =>
        entriesUnder(repoRoot, posix.join(ARMS, dir)).map((entry) => [entry.path, contentOf(entry)] as const),
      ),
    ),
  );
}

/**
 * The base arm an `arm.yaml`'s text names in `configured_of` (REQ-FMT-05 as amended in 1.50), when it is an arm name;
 * `undefined` for any other arm, or for a file that does not parse, which the arm loader refuses.
 */
export function configuredOfIn(text: string): string | undefined {
  try {
    const value = (parse(text) as { configured_of?: unknown } | null)?.configured_of;
    return typeof value === 'string' && /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The same digest over `files`, by repository path, each with what its line hashes: a file's bytes, `link:<target>`
 * for a symbolic link, `special` for anything else (task-073: an arm read from a commit of the history).
 */
export function armDigestOf(files: ReadonlyMap<string, Buffer | string>): string {
  const lines = [...files]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, content]) => `${path}\0${sha256(content)}\n`);
  return sha256(lines.join(''));
}
