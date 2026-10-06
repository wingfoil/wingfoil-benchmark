import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join, posix } from 'node:path';

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
 * loader refuses where it reads — is hashed by its target, so that it cannot change unseen; the Design had it refused,
 * but the digest has no channel for a refusal, and the loader already gives one. A docs control's manual is a copy
 * of baseline-docs' under its own directory (task-067), so its digest covers it.
 */
export function armDigest(repoRoot: string, arm: string): string {
  const lines = entriesUnder(repoRoot, posix.join(ARMS, arm))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((entry) => `${entry.path}\0${sha256(contentOf(entry))}\n`);
  return sha256(lines.join(''));
}
