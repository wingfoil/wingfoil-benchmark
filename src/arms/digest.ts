import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join, posix } from 'node:path';

/** Where arms live, from the repository root (REQ-FMT-05). */
const ARMS = 'arms';

function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Every entry below `dir`, as repository paths from `root`, depth first. */
function entriesUnder(root: string, dir: string): { path: string; full: string; link: boolean }[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = posix.join(dir, entry.name);
    if (entry.isDirectory()) return entriesUnder(root, path);
    return [{ path, full: join(root, path), link: entry.isSymbolicLink() }];
  });
}

/**
 * REQ-FMT-13: the digest of an arm, the SHA-256 (64 hex) of one line per file under `arms/<arm>/`, in sorted path
 * order, `<path>\0<sha256 of its content>\n`, the path from the repository root. A symbolic link — which the arm loader
 * refuses where it reads — is hashed by its target, so that it cannot change unseen. A docs control's borrowed manual
 * (REQ-RUN-11) joins it when docs controls borrow one (task-067).
 */
export function armDigest(repoRoot: string, arm: string): string {
  const lines = entriesUnder(repoRoot, posix.join(ARMS, arm))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(
      ({ path, full, link }) =>
        `${path}\0${link ? sha256(`link:${readlinkSync(full)}`) : sha256(readFileSync(full))}\n`,
    );
  return sha256(lines.join(''));
}
