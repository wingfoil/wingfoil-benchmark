import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';

/** Whether this repository's `.gitignore` ignores `path`, as `git check-ignore` answers it. */
function ignored(path: string): boolean {
  try {
    execFileSync('git', ['-C', repoPath('.'), 'check-ignore', '--quiet', '--no-index', path]);
    return true;
  } catch {
    return false;
  }
}

describe('what the repository commits of a run (REQ-RES-06, bug-009)', () => {
  const run = 'S1@1.0/baseline/claude-sonnet-5/r1';

  it.each([
    ['a campaign', `results/0123456789ab/1/runs/${run}`],
    ['a dry run', `results/dry-runs/1/runs/${run}`],
  ])("keeps %s's run records", (_kind, dir) => {
    for (const file of ['run.json', 'score.json', 'setup/diff.patch', 'steps/01/usage.json', 'steps/01/diff.patch', 'steps/01/commits.json'])
      expect(ignored(`${dir}/${file}`), `${dir}/${file}`).toBe(false);
    expect(ignored(`${dir}/steps/01/transcript.jsonl`)).toBe(true);
  });

  it("keeps an execution's aggregate, and ignores the runner's workspaces at the root", () => {
    expect(ignored('results/0123456789ab/1/aggregate.json')).toBe(false);
    expect(ignored(`runs/0123456789ab/1/${run}/workspace/src/index.ts`)).toBe(true);
    expect(ignored(`runs/dry-runs/1/${run}/workspace/src/index.ts`)).toBe(true);
  });
});
