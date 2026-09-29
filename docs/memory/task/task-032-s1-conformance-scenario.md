---
id: task-032-s1-conformance-scenario
type: task
title: "S1 conformance scenario"
status: backlog
release: v0.1
wave: W7
features: [F6.1]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-02]
---

## Context

Second task of wave **W7 — First content** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the S1
half of its "Ends with" ("S1 and S2 scored in all three arms"). The W7 plan-phase decisions are in
[task-031](task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md). It follows
`scenario-authoring` from goal to validate; calibrate and register are calibration's (decision 3).

Scope: **S1@1.0** as [S1.md](../../02_specification/scenarios/S1.md) (1.2, after task-031) specifies it,
in `scenarios/S1/1.0/`:

- **Goal:** the card of S1.md §1 in `scenario.yaml` (categories C and D, the GQM questions, the
  profiles, `capabilities: []` — §7, no expected failure in any arm).
- **Seed** (§3): an empty strict TypeScript library, no runtime dependency, a test script with no
  tests, the one-paragraph README; nothing of Pointer, Patch, Merge Patch or their specifications.
- **Prompts** (§5, README §3): four, in a product owner's voice, naming the RFC and the entry point of
  the step (`resolvePointer`, `applyPatch`, `applyMergePatch`), no harness, no list of the step-3 cases.
- **Oracle** (§6): three suites — Pointer after step 1 (RFC 6901 §5), Patch after steps 2, 3 and 4
  (`json-patch-tests` `tests.json` and `spec_tests.json`, `disabled` cases skipped), Merge Patch after
  step 4 (RFC 7386 Appendix A) — each call on a frozen copy of its input (the non-mutation check). The
  third-party material vendored and pinned as task-031 left it: the suite by its full `commit`, the RFC
  examples by `sha256`, each with its license, the IETF one **confirmed here** (dl-002).
- **The regression check** (§6, Q-D3): the Patch suite after step 4 against its result after step 3 is
  read from the per-step results `score.json` already holds; where it is reported (task-034's aggregate
  or a field of `score.json`) is settled in the design, with no new metric.
- **Hold-out additions** (§6) — Pointer escaping, deep and large Patch cases, Merge Patch beyond the
  appendix — written only in `WingFoil2-Benchmark-HoldOut`, under the suite ids, as siblings of the
  public suites (adr-004 amendment 1). This repository records their count and the hold-out commit,
  never their content.
- **Validate:** `bench scenario validate S1@1.0 --holdout <path>` clean, the leak scan included.
- **For the wave check (decision 4):** fake sessions for S1's four steps writing a reference
  solution, in `test/fixtures/`, and an automated `scenarios.feature` @F6.1 example: validation passes,
  a dry run in each of the three arms, the public oracle scoring each without errors.

Constraints W4 and W6 left for scenario content:

- every hidden test imports the code under test inside the test, is registered unconditionally with a
  unique name, and passes nothing on the seed (adr-004 decision 10) — checked by scoring the seed;
- tests run with no network, in the scoring image as it is (node:test and tsx); the seed's own test
  script runs in the run container with no install (the seed has no dependency);
- the leak scan's literals are every quoted string of 8 characters or more in an oracle file, and the
  vendored JSON is full of them (`"comment"` texts, pointers, values): the seed's README and the prompts
  must hold none; an ordinary word of eight letters or more in an expected value is a known limit
  (task-017), and numbers are not scanned.

**Done** means: `scenarios/S1/1.0/` validates with the hold-out configured; S1 dry-runs with the fake in
the three arms and each dry run is scored by its public oracle, the reference solution passing every
suite and the seed passing none; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F6.1 (the outline's S1 row) — validation passes, a dry-run cost in every arm,
  the public oracle scores the dry runs without errors. **red-first**
- REQ-FMT-04 — S1's `scenario.yaml` as S1.md specifies it: three suites bound to their steps, the
  third-party pins and licenses. **red-first**
- REQ-FMT-08 — the leak scan is clean on S1, the hold-out's additions included. **red-first**
- REQ-SCO-01 / REQ-SCO-02 — the reference solution passes every suite after its steps, the seed none
  (adr-004 decision 10); a mutating `applyPatch` fails the non-mutation check. **red-first**
- dl-002 — the RFC examples' license confirmed and recorded (BSD-3-Clause), with the notices the
  licenses require. **red-first** (added in the design)

## Design

**Classification confirmed**, all four red-first. One criterion is added: the RFC examples' license,
confirmed below, as dl-002 asked. The outline's criterion is automated twice: in `test/acceptance/`
with the Docker doubles, which traceability requires, and in `test/docker/` with the real scoring
image, which is the wave check's half (W7 decision 4).

### `scenarios/S1/1.0/`

```
scenario.yaml
seed/            package.json, tsconfig.json, .gitignore, README.md
prompts/         01.md … 04.md
oracle/pointer/      pointer.test.mts, rfc6901-section5.json
oracle/patch/        patch.test.mts, tests.json, spec_tests.json
oracle/merge-patch/  merge-patch.test.mts, rfc7386-appendix-a.json
oracle/licenses/     Apache-2.0.txt, BSD-3-Clause-IETF.txt, NOTICE.md
```

`scenario.yaml` holds S1.md's card:

- `categories: {primary: C, secondary: [D]}`;
- `profiles: [solo-developer, team-developer]`;
- `gqm: [Q-C1, Q-C2, Q-D3, G-X1, G-X2]`;
- `capabilities: []` (§7);
- `holdout: true`.

It declares three suites, whose ids are also the hold-out's directory names:

| Suite | Directory | `after_steps` |
|---|---|---|
| `pointer` | `oracle/pointer` | `[1]` |
| `patch` | `oracle/patch` | `[2, 3, 4]` |
| `merge-patch` | `oracle/merge-patch` | `[4]` |

The Pointer examples are scored after step 1 only, as §6 says. Steps 2–4 build on Pointer, and its
hold-out additions guard its edge cases.

### The seed (§3, K3)

- **`package.json`:** `"type": "module"`, `"private": true`, no dependency, and `"test": "node --test"`,
  a test script that finds no test and exits 0 with no install. That exit is checked in the build, on
  the pinned image's Node 22.
- **`tsconfig.json`:** `strict`, `NodeNext`, `ES2022`, `include: ["src"]`, `outDir: "dist"`.
- **`.gitignore`:** `node_modules` and `dist`. It is a convention, not a rule (K3). It keeps an
  install the agent may make out of the step patches.
- **`README.md`:** the one paragraph, which names what the library is for and no specification.
- **No `src/`.** The prompts name `src/index.ts`, and the agent creates it.

`"type": "module"` matters for scoring: tsx loads the snapshot's `src/*.ts` as ESM, which is what the
suites' `await import('../../seed/src/index.js')` expects. The run image has no TypeScript; the agent
can install it from the network, as any developer would, and nothing in scoring depends on that.

### The prompts (§5, README §3)

Four prompts in a product owner's voice, naming no harness and no tool:

1. JSON Pointer, RFC 6901. It asks for `resolvePointer(document, pointer)` exported from `src/index.ts`,
   returning the referenced value and throwing when the pointer is invalid or does not resolve, and says
   later features will build on it.
2. JSON Patch, RFC 6902, the six operations. It asks for `applyPatch(document, patch)`, which returns a
   new document, must not mutate its input, and throws on an invalid patch or a failed operation.
3. Users report surprising results on invalid patches and edge cases. It asks for behaviour that
   conforms to the RFC and lists no case.
4. JSON Merge Patch, RFC 7386. It asks for `applyMergePatch(target, patch)`, returning the merged
   document.

Their final text is written in the build and read at review. The leak scan checks them.

### The suites — how a case becomes a test (REQ-SCO-02, adr-004 decision 10)

Each suite is **one `.test.mts` file beside its data**, self-contained, because each suite is mounted
alone at `/score/oracle/<id>`.

- **`.mts`** makes the file ESM whatever lies around it. There is no `package.json` under
  `/score/oracle`, and `import.meta.url` is needed to read the data:
  `readFileSync(new URL('./tests.json', import.meta.url))`. That this works under the image's tsx is
  the build's first red test, in Docker.
- **Every case is a registered test with a unique name built from its index** (`` `tests.json #${i}: ${comment}` ``,
  `` `spec_tests.json #${i}: …` ``, `` `RFC 6901 §5: ${pointer}` ``). They are registered
  unconditionally, because they come from the data, not from the snapshot. The code under test is
  imported inside each test, so that a snapshot without it fails every test, not the file. The names are
  template literals with `${}`, which are not literals for the leak scan.
- **`json-patch-tests`:** a case with `error` passes when `applyPatch` throws. A case with `expected`
  passes when the result deep-equals it. A case with neither passes when the patch applies without
  throwing (the suite's own README). A `disabled` case is registered with `{ skip: true }`, which the
  census counts nowhere (adr-004), so "`disabled` cases are skipped" (§6) is visible, not silent.
  Counted totals: 92 of 95 and 16 of 17.
- **Pointer:** the 12 examples of §5 against `resolvePointer`, 12 tests.
- **Merge Patch:** the 15 cases of Appendix A against `applyMergePatch`, 15 tests.

### The non-mutation check — a reading of S1.md §6 to confirm at review

§6 says "every call receives a frozen copy of its input", and §4's contracts forbid mutation only to
`applyPatch`. **Calls to `resolvePointer` and `applyPatch` receive deep-frozen copies**, and a
successful `applyPatch` is also checked against a copy of its input taken before the call.
**`applyMergePatch` receives fresh, unfrozen copies.** Its contract does not forbid mutation, and RFC
7386's own pseudo-code merges into its target in place, so freezing would fail an implementation that
follows the RFC to the letter, for a rule §4 never set. Known limit: a case that expects an error passes
on any throw, including the `TypeError` a mutating `applyPatch` raises on a frozen input. The success
cases catch that implementation anyway. If the approver prefers §6's words literally, it is one line
per suite, and S1.md needs no change either way.

### The regression check (§6, Q-D3) — no code here, carried to task-034

`score.json` already lists, for each public suite at each step, the tests that failed (task-027). "After
step 4 the Patch suite still passes as it did after step 3" is therefore the tests in `patch`'s `failed`
at step 4 that are not in it at step 3, read from what is stored. S1 adds no metric and no field.
Reporting it (M-D3, which S2 needs too) is aggregation's, so a line is added to task-034's Context,
to be confirmed in its design.

### Third-party material (dl-002, task-031) and the licenses — confirmed here

| Entry | Pin | License | Files |
|---|---|---|---|
| `json-patch-tests` | `commit: 2a928f9044aad35c74e2788d498bcf2c6b91adea` | `Apache-2.0` | `oracle/patch/tests.json`, `oracle/patch/spec_tests.json`, taken with `git show <commit>:<file>`, byte for byte |
| RFC 6901 §5 examples | `sha256` of `rfc6901-section5.json` | `BSD-3-Clause` | `oracle/pointer/rfc6901-section5.json` |
| RFC 7386 Appendix A | `sha256` of `rfc7386-appendix-a.json` | `BSD-3-Clause` | `oracle/merge-patch/rfc7386-appendix-a.json` |

**The RFC examples' license is BSD-3-Clause, confirmed (dl-002).**

- Both RFCs, of 2013 and 2014, carry the IETF Trust boilerplate: "Code Components extracted from this
  document must include Simplified BSD License text as described in Section 4.e of the Trust Legal
  Provisions".
- The Trust's list of Code Components names **JSON** and **tables of values**. The §5 document and its
  table of pointers, and Appendix A's table of JSON triples, are both.
- The license TLP 4.e describes is the three-clause text. The Trust corrected its name from
  "Simplified" to "Revised BSD License" on 2021-09-21 (Corrected TLP 5.0).

So the examples are an SPDX-listed license and need no `LicenseRef-`. task-031's `LicenseRef-` route
stays available for material that does need it.

The examples are transcribed into JSON: the document, then `{pointer, expected}` pairs, and
`{target, patch, result}` triples. Their `sha256` is taken from that file. BSD-3-Clause allows the
reformatting, and requires the notice to go with it. Apache-2.0 requires a copy of the license.

**`oracle/licenses/`** therefore holds:

- the Apache-2.0 text;
- the BSD-3-Clause text with "Copyright (c) 2013 IETF Trust and the persons identified as the document
  authors" and its 2014 counterpart;
- a `NOTICE.md` naming each file, its source and its license.

It lies outside every suite. It is not oracle material, so it is neither mounted nor leak-scanned, and
it is published with the scenario.

### Hold-out additions (§6, K2) — in `WingFoil2-Benchmark-HoldOut` only

`scenarios/S1/1.0/{pointer,patch,merge-patch}/*.test.mts`: Pointer escaping edge cases, deep-structure
and large-array Patch cases, and Merge Patch cases beyond the appendix. They are benchmark-authored and
written with the same rules as the public suites. They import `../../seed/src/index.js` from their
`.holdout` mount, which sits at the same depth. They are committed in the hold-out repository. This
task records their count per suite and that repository's commit, never their content.

### The reference solution and the fake sessions (W7 decision 4)

`test/fixtures/reference/S1/<step>/` holds the files a step writes: step 1 Pointer and `src/index.ts`,
step 2 Patch, step 3 Patch's error semantics, step 4 Merge Patch. **Step 2's Patch leaves out part of the
error semantics that step 3 adds**, so the scores show what §6 expects: the Patch suite rising from step
2 to step 3 on the same suite. `test/fixtures` is outside `tsc` and lint; the reference is checked by the
tests that score it.

A helper, `referenceScript(scenario, steps)` in `test/support/`, builds the fake's script from those
directories. Each file becomes a `mkdir -p … && echo <base64> | base64 -d > <path>` command, written
to a temporary file for `BENCH_FAKE_SCRIPT`. No reference is copied by hand into a JSON fixture.
task-033 reuses the helper with its hold-out reference (decision 5).

### Tests

- **A local scoring double** (`test/support/`), so that the hidden tests really run in `npm test`:
  - `tsx` is added as a devDependency, pinned to `4.23.15`, the version the scoring image's lockfile pins.
  - A `judge` for `scoringDocker` lays out the snapshot and the suite in a temporary `/score`-like
    directory, as `runSuite` would in the container.
  - It runs the command's test files with `node --import tsx --test --test-reporter=docker/score-image/reporter.mjs`
    on the host, with no network needed.

  Host Node 22.21 against the image's 22.x is the known difference. The Docker test below is the check
  that matters.
- **Acceptance, `test/acceptance/scenarios.test.ts`:** `@F6.1 @F6.2 @F6.3 @F6.8 Each v0.1 scenario is
  ready for a campaign`, over the rows that exist (S1 now; task-033 adds S2). For each row:
  - `bench scenario validate` on the scenario copied from the repository passes;
  - `bench scenario dry-run` in baseline, baseline-docs and wingfoil records a cost per arm, with the
    doubles the W3–W5 acceptance tests use;
  - `bench score dry-runs/<n>` scores each dry run with the local judge and exits 0.

  With the doubles no command is executed in a workspace, so each snapshot is the seed and every suite
  scores 0/N. "Without errors" is exactly the outline's claim.
- **Unit, the oracle against the reference** (local judge):
  - the seed passes no test of any suite (adr-004 decision 10);
  - each reference step passes every test of its suites, except the step-2 Patch cases step 3 fixes;
  - an `applyPatch` that mutates its input fails the success cases;
  - a `json-patch-tests` file changed by one byte is refused by its pin.
- **Docker, `test/docker/run.test.ts`, "W7: S1":** in a temporary repository with the benchmark's arms:
  - the fake replays the reference (`referenceScript`);
  - `bench scenario dry-run S1@1.0` in the three arms (wingfoil `skipIf` there is no WingFoil clone, as
    in W3);
  - `bench score dry-runs/<n>` for each, with the real scoring image: pointer 12/12 after step 1, patch
    rising from step 2 to 108/108 after step 3 and still 108/108 after step 4, merge-patch 15/15;
  - with a hold-out configured (`BENCH_HOLDOUT_PATH`, else skipped with the reason), its counts are
    all passing and no hold-out name is printed.
- **Validation by hand:** `bench scenario validate S1@1.0 --holdout ../WingFoil2-Benchmark-HoldOut`,
  its line recorded in the build notes.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `c34986e`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W7 tasks of release v0.1` (`02edf51`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-032-s1-conformance-scenario` → `e75c304`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
