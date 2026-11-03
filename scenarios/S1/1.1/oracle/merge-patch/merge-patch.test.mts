// S1's hidden tests after step 4: JSON Merge Patch, on the examples of RFC 7386 Appendix A, transcribed
// into rfc7386-appendix-a.json (BSD-3-Clause, IETF Trust: see ../licenses/NOTICE.md). The inputs are
// fresh copies, not frozen: the contract of applyMergePatch does not forbid mutation (S1.md §4), and the
// RFC's own algorithm merges into its target. The code under test is imported inside each test
// (adr-004 decision 10).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

interface Example {
  readonly target: unknown;
  readonly patch: unknown;
  readonly result: unknown;
}

const data = JSON.parse(readFileSync(new URL('./rfc7386-appendix-a.json', import.meta.url), 'utf8')) as {
  readonly cases: readonly Example[];
};

describe('merge', () => {
  data.cases.forEach((example, index) => {
    it(`#${index} ${JSON.stringify(example.patch)}`, async () => {
      const { applyMergePatch } = await import('../../seed/src/index.js');
      assert.deepEqual(
        applyMergePatch(structuredClone(example.target), structuredClone(example.patch)),
        example.result,
      );
    });
  });
});
