import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A scenario version's content hash (REQ-FMT-09, task-018 Design): every entry of its directory, as
 * `<sha256 of its bytes>  <path with '/'>`, one line each, sorted by path in code-unit order; the
 * SHA-256 of those lines, written `sha256:<hex>`. A symbolic link counts as its target's text, so
 * pointing it elsewhere is a change. The hold-out is not in it: a public rerun must be able to check it.
 */
export function scenarioHash(dir: string): string {
  const lines = entries(dir, '')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([path, digest]) => `${digest}  ${path}\n`);
  return `sha256:${sha256(lines.join(''))}`;
}

/** Every file and link below `dir`, as `[path relative to the version directory, digest]`. */
function entries(dir: string, prefix: string): [string, string][] {
  return readdirSync(dir).flatMap((name): [string, string][] => {
    const path = join(dir, name);
    const relative = prefix === '' ? name : `${prefix}/${name}`;
    const stats = lstatSync(path);
    if (stats.isSymbolicLink()) return [[relative, sha256(`link:${readlinkSync(path)}`)]];
    if (stats.isDirectory()) return entries(path, relative);
    return [[relative, sha256(readFileSync(path))]];
  });
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
