import { describe, expect, it } from 'vitest';

import { checkDryRun } from '../../../src/runner/index.js';
import { loadDryRunProfile } from '../../../src/scenario/dry-run.js';
import { repoPath } from '../../support/paths.js';

/**
 * v0.3's dry-run profile with the review loop (task-152, criterion 3): the 1.1 reference profile's pins unchanged
 * (task-144), plus the review loop the default profile pins (task-151), so that W19's loop dry runs price a v0.3
 * campaign with that loop (REQ-CLI-02 as amended in 1.58 and 1.59).
 */
describe("v0.3's review-loop dry-run profile (task-152, characterization)", () => {
  const file = 'campaigns/v0-3-review-loop.dry-run.yaml';
  const load = (path: string) => {
    const loaded = loadDryRunProfile(repoPath(path));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    return loaded.value;
  };

  it("holds the v0.3 reference profile's pins unchanged, and the default profile's review loop", () => {
    const { review_loop: loop, ...pins } = load(file);
    const { review_loop: none, ...reference } = load('campaigns/v0-3-reference.dry-run.yaml');
    expect(none).toBeUndefined();
    expect(pins).toEqual(reference);
    expect(loop).toEqual(load('scenarios/dry-run.yaml').review_loop);
    expect(loop).toMatchObject({
      agent: { name: 'claude-code', version: '2.1.300' },
      model: 'claude-sonnet-5-5',
      effort: 'medium',
      max_rounds: 5,
    });
  });

  it('is accepted for baseline and wingfoil on S1, S2, S3 and S8 at 1.1', () => {
    for (const id of ['S1', 'S2', 'S3', 'S8'])
      for (const arm of ['baseline', 'wingfoil']) {
        const checked = checkDryRun({ id, version: '1.1', arm, profile: file }, repoPath(''));
        expect(checked.ok ? [] : checked.issues, `${id} ${arm}`).toEqual([]);
      }
  });
});
