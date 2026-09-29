// S1's hidden tests after step 1: JSON Pointer, on the examples of RFC 6901 section 5, transcribed into
// rfc6901-section5.json (BSD-3-Clause, IETF Trust: see ../licenses/NOTICE.md). Each example resolves
// its pointer against a frozen copy of the document. The code under test is imported inside each test
// (adr-004 decision 10), so that a snapshot without it fails every test and not the file.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

interface Example {
  readonly pointer: string;
  readonly value: unknown;
}

const data = JSON.parse(readFileSync(new URL('./rfc6901-section5.json', import.meta.url), 'utf8')) as {
  readonly doc: unknown;
  readonly cases: readonly Example[];
};

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

describe('pointer', () => {
  for (const example of data.cases) {
    it(`resolves ${JSON.stringify(example.pointer)}`, async () => {
      const { resolvePointer } = await import('../../seed/src/index.js');
      assert.deepEqual(resolvePointer(frozen(data.doc), example.pointer), example.value);
    });
  }
});
