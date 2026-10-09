import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';

import { armDigest, armDigestOf } from '../arms/index.js';
import type { HistoryPort } from '../core/index.js';

/**
 * An arm as its runs recorded it (task-073, the approver's choice for task-067's point B): the working tree when it
 * still digests to the recorded value, otherwise the newest commit of the repository's history whose arm does, so that
 * a site rebuilt after an arm's correction shows the setup that ran (REQ-RES-02, REQ-RES-10). The history's arm is
 * written to a directory of its own, to be loaded as any arm is.
 */
export type RecordedArm =
  | { readonly source: 'tree'; readonly dir: string }
  | { readonly source: 'history'; readonly commit: string; readonly dir: string };

export async function recordedArm(
  root: string,
  arm: string,
  digest: string,
  history: HistoryPort,
): Promise<RecordedArm | undefined> {
  const path = posix.join('arms', arm);
  if (existsSync(join(root, path)) && armDigest(root, arm) === digest)
    return { source: 'tree', dir: join(root, path) };
  for (const commit of await history.commitsTouching(root, path)) {
    const files = await history.filesAt(root, commit, path);
    if (files.size === 0 || armDigestOf(files) !== digest) continue;
    const base = mkdtempSync(join(tmpdir(), 'bench-recorded-arm-'));
    for (const [file, content] of files) {
      const target = join(base, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content.startsWith('link:') ? '' : content);
    }
    return { source: 'history', commit, dir: join(base, path) };
  }
  return undefined;
}

/** An arm's manual with the sha256 its runs recorded: the working tree's, or the newest commit's that has it. */
export async function recordedManual(
  root: string,
  arm: string,
  sha256: string,
  history: HistoryPort,
): Promise<string | undefined> {
  const path = posix.join('arms', arm, 'manual.md');
  const hash = (text: string) => createHash('sha256').update(text).digest('hex');
  if (existsSync(join(root, path))) {
    const text = readFileSync(join(root, path), 'utf8');
    if (hash(text) === sha256) return text;
  }
  for (const commit of await history.commitsTouching(root, path)) {
    const text = (await history.filesAt(root, commit, path)).get(path);
    if (text !== undefined && hash(text) === sha256) return text;
  }
  return undefined;
}
