import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadHoldoutAdditions } from '../../../src/scenario/index.js';
import { holdoutHash, holdoutSuites } from '../../../src/scoring/index.js';
import { storedRun, t3Holdout } from '../../support/score-fixture.js';

async function additions() {
  const fixture = await storedRun({ steps: [] });
  const root = t3Holdout();
  const loaded = loadHoldoutAdditions(root, 'T3', '1.0');
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return { fixture, root, additions: loaded.value };
}

describe('holdoutSuites (task-028, dl-001)', () => {
  it('groups the additions by the suite whose id is their first path segment', async () => {
    const { fixture, root, additions: found } = await additions();
    expect(holdoutSuites(fixture.scenario, found)).toEqual([
      {
        suite: fixture.scenario.oracle.suites[0],
        dir: join(root, 'scenarios', 'T3', '1.0', 'orders'),
      },
    ]);
  });

  it('has no hold-out suite for a suite with no addition', async () => {
    const { fixture } = await additions();
    expect(holdoutSuites(fixture.scenario, { dir: '/h', files: [] })).toEqual([]);
  });
});

describe('holdoutHash (task-028, REQ-SCO-03)', () => {
  it("identifies the additions' version by their paths and bytes, never showing them", async () => {
    const { additions: found } = await additions();
    const hash = holdoutHash(found);
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(holdoutHash(found)).toBe(hash);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(found.dir, 'orders', 'refund.test.ts'), '// changed\n');
    expect(holdoutHash(found)).not.toBe(hash);
  });

  it('does not depend on the order the additions are listed in', async () => {
    const { additions: found } = await additions();
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(found.dir, 'orders', 'a.test.ts'), '// a\n');
    const files = ['orders/a.test.ts', 'orders/refund.test.ts'];
    expect(holdoutHash({ dir: found.dir, files })).toBe(
      holdoutHash({ dir: found.dir, files: [...files].reverse() }),
    );
  });
});
