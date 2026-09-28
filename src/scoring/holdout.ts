import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Scenario, Suite } from '../core/index.js';
import type { HoldoutAdditions } from '../scenario/index.js';

/** A suite's hold-out additions (task-028): the public suite they add to, and their directory in the hold-out. */
export interface HoldoutSuite {
  readonly suite: Suite;
  readonly dir: string;
}

/**
 * The hold-out suites of a scenario version: its additions grouped by the suite whose id is their
 * first path segment (dl-001, checked by `bench scenario validate` since task-026), in the order the
 * scenario declares its suites. A suite with no addition has none.
 */
export function holdoutSuites(scenario: Scenario, additions: HoldoutAdditions): HoldoutSuite[] {
  const ids = new Set(additions.files.map((file) => file.split('/')[0]));
  return scenario.oracle.suites
    .filter((suite) => ids.has(suite.id))
    .map((suite) => ({ suite, dir: join(additions.dir, suite.id) }));
}

/**
 * The hold-out's version, as `scenario_hash` is the public oracle's (task-018's rule): the SHA-256 of
 * one line per addition, `<sha256 of its bytes>  <path>`, in path order. It says nothing of the content.
 */
export function holdoutHash(additions: HoldoutAdditions): string {
  const lines = [...additions.files]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((file) => `${sha256(readFileSync(join(additions.dir, file)))}  ${file}\n`);
  return `sha256:${sha256(lines.join(''))}`;
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
