// S1's hidden tests after steps 2, 3 and 4: JSON Patch, on the official conformance suite
// json-patch-tests, vendored byte for byte from commit 2a928f9044aad35c74e2788d498bcf2c6b91adea
// (Apache-2.0: see ../licenses/NOTICE.md). One test per case, named by its file and index:
//   - a case with `error` passes when applyPatch throws;
//   - a case with `expected` passes when the result deep-equals it;
//   - a case with neither passes when the patch applies without throwing (the suite's README);
//   - a `disabled` case is registered as skipped, and counts nowhere (adr-004).
// applyPatch receives frozen copies of the document and the patch — it must not mutate its input
// (S1.md §4) — and a successful call is checked against a copy taken before it. The code under test is
// imported inside each test (adr-004 decision 10).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

interface Case {
  readonly comment?: string;
  readonly doc: unknown;
  readonly patch: unknown;
  readonly expected?: unknown;
  readonly error?: string;
  readonly disabled?: boolean;
}

function cases(file: string): readonly Case[] {
  return JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as Case[];
}

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

for (const file of ['./tests.json', './spec_tests.json']) {
  describe(file.slice(2), () => {
    cases(file).forEach((entry, index) => {
      it(`#${index} ${entry.comment ?? ''}`.trimEnd(), { skip: entry.disabled === true }, async () => {
        const { applyPatch } = await import('../../seed/src/index.js');
        const doc = frozen(entry.doc);
        const patch = frozen(entry.patch);
        if (entry.error !== undefined) {
          assert.throws(() => applyPatch(doc, patch));
          return;
        }
        const result = applyPatch(doc, patch);
        if ('expected' in entry) assert.deepEqual(result, entry.expected);
        assert.deepEqual(doc, entry.doc);
      });
    });
  });
}
