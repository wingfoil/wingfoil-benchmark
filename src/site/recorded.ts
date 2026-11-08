import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';

import { armDigest, armDigestOf, configuredOfIn } from '../arms/index.js';
import type { HistoryPort } from '../core/index.js';

/**
 * An arm as its runs recorded it (task-073, the approver's choice for task-067's point B): the working tree when it
 * still digests to the recorded value, otherwise the newest commit of the repository's history whose arm does, so that
 * a site rebuilt after an arm's correction shows the setup that ran (REQ-RES-02, REQ-RES-10). The history's arm is
 * written to a directory of its own, to be loaded as any arm is.
 */
export type RecordedArm =
  | { readonly source: 'tree'; readonly dir: string }
  | {
      readonly source: 'history';
      readonly commit: string;
      readonly dir: string;
      /** Removes the copy of the arm, once its page is written. */
      readonly cleanup: () => void;
    };

export async function recordedArm(
  root: string,
  arm: string,
  digest: string,
  history: HistoryPort,
): Promise<RecordedArm | undefined> {
  const path = posix.join('arms', arm);
  if (existsSync(join(root, path)) && armDigest(root, arm) === digest)
    return { source: 'tree', dir: join(root, path) };
  // A configured arm's digest covers its base arm's files too (REQ-FMT-13 as amended in 1.50, task-142): the commits
  // touching it or any base an arm.yaml of its history names, so that one since removed or rebased still resolves.
  const own = await history.commitsTouching(root, path);
  const commits = new Set(own);
  const bases = new Set<string>();
  for (const commit of own) {
    const yaml = (await history.filesAt(root, commit, path)).get(posix.join(path, 'arm.yaml'));
    const named = yaml === undefined ? undefined : configuredOfIn(yaml);
    if (named !== undefined && named !== arm) bases.add(named);
  }
  for (const base of [...bases].sort()) {
    for (const commit of await history.commitsTouching(root, posix.join('arms', base))) commits.add(commit);
  }
  for (const commit of commits) {
    const ownFiles = await history.filesAt(root, commit, path);
    const yaml = ownFiles.get(posix.join(path, 'arm.yaml'));
    const baseArm = yaml === undefined ? undefined : configuredOfIn(yaml);
    const files =
      baseArm === undefined || baseArm === arm
        ? ownFiles
        : new Map([...ownFiles, ...(await history.filesAt(root, commit, posix.join('arms', baseArm)))]);
    if (files.size === 0 || armDigestOf(files) !== digest) continue;
    const base = mkdtempSync(join(tmpdir(), 'bench-recorded-arm-'));
    for (const [file, content] of files) {
      const target = join(base, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content.startsWith('link:') ? '' : content);
    }
    return {
      source: 'history',
      commit,
      dir: join(base, path),
      cleanup: () => rmSync(base, { recursive: true, force: true }),
    };
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
