// S1's hidden tests after step 5: createPatch, on pairs the benchmark wrote (task-050). One test per pair,
// named by its index, passing when:
//   - P1: the returned patch, applied to `from` by this suite's own applier (./applier.mts, RFC 6902,
//     strict), gives `to` — so the agent's applyPatch is not what is scored here;
//   - P2: the patch's JSON is at most `max` characters, about twice a minimal patch's, so that
//     replacing the whole document fails the pairs built as a small change in a large one;
//   - neither input was mutated: both are passed frozen, and compared after the call.
// The code under test is imported inside each test (adr-004 decision 10).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { apply } from './applier.mts';

interface Pair {
  readonly from: unknown;
  readonly to: unknown;
  readonly max: number;
}

const pairs = JSON.parse(readFileSync(new URL('./pairs.json', import.meta.url), 'utf8')) as Pair[];

/** A deep copy of `value`, frozen all the way down. */
function frozen<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    Object.freeze(node);
    for (const child of Object.values(node)) freeze(child);
  };
  freeze(copy);
  return copy;
}

describe('pairs', () => {
  pairs.forEach((pair, index) => {
    it(`#${index}`, async () => {
      const { createPatch } = await import('../../seed/src/index.js');
      const from = frozen(pair.from);
      const to = frozen(pair.to);
      const patch = createPatch(from, to);
      assert.deepEqual(apply(pair.from, patch), pair.to);
      assert.ok(JSON.stringify(patch).length <= pair.max, `${JSON.stringify(patch).length} > ${pair.max}`);
      assert.deepEqual(from, pair.from);
      assert.deepEqual(to, pair.to);
    });
  });
});
