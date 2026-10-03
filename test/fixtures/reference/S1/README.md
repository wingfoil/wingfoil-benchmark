# S1's reference solution (task-032)

What the fake agent writes in each step of S1@1.0, so that a run's snapshots hold code S1's hidden tests
can pass: `01/` to `05/` are laid over the workspace in turn (`test/support/reference.ts`). Step 2's
JSON Patch leaves out the checks step 3 adds, so that the Patch suite rises from step 2 to step 3, as
S1.md §6 expects. It is public: the conformance suite it passes is public too. It is not the benchmark's
code, and it is never shown to an agent.

`05/` (task-050) adds `createPatch`: a recursive diff, an LCS of equal items in arrays, the rest edited in place.
It passes every pair of the suite `create-patch`, the hold-out's included.
