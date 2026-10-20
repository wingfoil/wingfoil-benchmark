import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { armDigest, armFromHistory, loadArm } from '../arms/index.js';
import type { Arm, Issue, Result } from '../core/index.js';

/**
 * The arm named `name` as a campaign or a dry-run profile pins it (REQ-FMT-13 as amended in 1.33): the working tree's
 * when it digests to `pinned` (or nothing is pinned), else the newest commit's of the history that does, with `from`
 * saying where. When no commit does, the working tree's, which `pinnedDigestIssue` then refuses.
 */
export function loadPinnedArm(repoRoot: string, name: string, pinned: string | undefined): Result<Arm> {
  const armsRoot = join(repoRoot, 'arms');
  const moved =
    pinned !== undefined &&
    (!existsSync(join(armsRoot, name)) || armDigest(repoRoot, name).slice(0, 12) !== pinned);
  const history = moved ? armFromHistory(repoRoot, name, pinned) : undefined;
  if (history === undefined) return loadArm(armsRoot, name);
  const loaded = loadArm(join(history.root, 'arms'), name);
  if (!loaded.ok) {
    const at = `read from commit ${history.commit.slice(0, 12)}`;
    return {
      ok: false,
      issues: loaded.issues.map((issue) => ({ ...issue, message: `${issue.message} (${at})` })),
    };
  }
  return { ok: true, value: { ...loaded.value, from: history } };
}

/** The refusal of an arm whose files do not digest to its pin, read from the tree or from history (REQ-FMT-13). */
export function pinnedDigestIssue(repoRoot: string, arm: Arm, pinned: string | undefined): Issue | undefined {
  if (pinned === undefined) return undefined;
  const actual = armDigest(arm.from?.root ?? repoRoot, arm.name).slice(0, 12);
  if (actual === pinned) return undefined;
  return {
    path: `arm_digests.${arm.name}`,
    message: `is ${pinned}, but the arm's files digest to ${actual}: the arm changed since the campaign pinned it`,
  };
}
