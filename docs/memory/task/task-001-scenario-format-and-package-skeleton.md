---
id: task-001-scenario-format-and-package-skeleton
type: task
title: "Scenario format and package skeleton"
status: approved
release: v0.1
wave: W1
features: [F3.1]
acceptance: [scenarios.feature]
requirements: [REQ-ARC-01, REQ-ARC-02, REQ-ARC-03, REQ-ARC-05, REQ-FMT-04, REQ-NFR-04]
---

## Context

First task of wave **W1 — Skeleton** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md);
[07_sequencer.md](../../01_vision/07_sequencer.md) 1.1). The wave ends with "a trivial scenario runs in a
container from a campaign file". This task provides the first building block: the scenario format.

It also bootstraps the `wingfoil-benchmark` package, because every later task depends on it:

- TypeScript strict, Node.js ≥ 22.12, modules under `src/` (REQ-ARC-01). Only the modules this task
  needs are created (`core`, `scenario`); the others appear with the task that first uses them, so that
  no empty module exists.
- The downward dependency rule of REQ-ARC-02 is enforced by the linter from the first commit.
- Test runner, coverage threshold (80%) and lint are wired into `npm test` / `npm run lint`
  (REQ-NFR-04, testing and code-quality directives).
- `.wingfoil/dna.yaml` lists the modules created (REQ-ARC-05).

Scope of F3.1 here: the Zod schema of `scenario.yaml` (REQ-FMT-04) and a loader that reads
`scenarios/<id>/<version>/` (REQ-ARC-03) and resolves `seed` and step `prompt_file`s. The command
`bench scenario validate` and the leak scan belong to F3.2 (W4); scenario versioning to F3.4 (W4).

**Done** means: a scenario directory declaring every field of REQ-FMT-04 loads; one missing or
malformed field is rejected with a message naming the field; tests, coverage and lint pass.

## Acceptance criteria

Classification confirmed in the design phase. The package is new, so every criterion is
**red-first**: no behaviour exists yet that a characterization test could pin.

- `scenarios.feature` @F3.1 "A scenario declares everything the runner and the scorer need" — a
  complete scenario directory loads with ID, version, seed, one prompt per step, oracle reference,
  primary and secondary categories, profiles, GQM questions and capabilities. **red-first**
- REQ-FMT-04 error path — a scenario with a missing required field, a step whose `prompt_file` does not
  exist, or a missing `seed` directory is rejected, naming the field or file. **red-first**
- REQ-ARC-02 — an import from a lower module to a higher one fails lint. **red-first**
- REQ-NFR-04 — `npm test` fails below 80% coverage. **red-first** (checked by configuration)
- Acceptance traceability (W1 default 2) — every Gherkin scenario tagged with a feature of a task that
  has started (`in-progress` or later) has an acceptance test named after it. **red-first**

## Design

### W1 technical decisions

Recorded in [adr-001-w1-toolchain-and-runner-conventions](../adr/adr-001-w1-toolchain-and-runner-conventions.md)
(the eleven defaults the approver accepted in the W1 plan phase, and two deltas made during this
task that await the approver's decision). They apply to task-001, task-002 and task-003.

### Package

- `package.json`: `"type": "module"`; scripts `build` (`tsc -p tsconfig.build.json`), `typecheck`,
  `test` (`vitest run --coverage`), `lint` (`eslint .` and `prettier --check .`), `format`.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `module`/`moduleResolution` `nodenext`,
  target ES2023. `tsconfig.build.json` compiles `src/` only.
- Layout: `src/<module>/index.ts` is each module's public surface; other modules import only that
  file. Tests live in `test/unit/<module>/`, `test/acceptance/`, `test/fixtures/`.

### Modules created (REQ-ARC-01, REQ-ARC-05)

- **`core`**: `result.ts` (`Result<T> = { ok: true; value: T } | { ok: false; issues: Issue[] }`,
  `Issue = { path: string; message: string }`) and `scenario.ts` (the Zod schema of `scenario.yaml`
  and its inferred types). No imports from other modules.
- **`scenario`**: `loadScenario(scenariosRoot, id, version): Result<Scenario>`. It reads
  `<scenariosRoot>/<id>/<version>/scenario.yaml`, validates it with the `core` schema, then checks the
  file system. It returns the parsed scenario with absolute, resolved paths. Validation failures are
  expected outcomes and come back as `issues`; only programming errors throw.

`.wingfoil/dna.yaml` gets `modules: core, scenario` and `paths.sources: [src]`, `paths.tests: [test]`.

### `scenario.yaml` schema (REQ-FMT-04)

| Field | Rule |
|---|---|
| `id` | `^[A-Z][A-Z0-9]*$` (S1, S8, M1, T0), equal to the directory name |
| `version` | `^\d+\.\d+$`, equal to the directory name |
| `categories.primary` | one of `A`–`G` |
| `categories.secondary` | list of `A`–`G`, without the primary and without duplicates (may be empty) |
| `profiles` | non-empty list, without duplicates, of `solo-developer`, `code-reviewer`, `team-developer`, `tech-lead`, `non-technical-manager`, `architect` (personas §2) |
| `gqm` | non-empty list, without duplicates, of `Q-<A–G><n>` or `G-X<n>` |
| `capabilities` | list of kebab-case names without duplicates, e.g. `workflow-engine` (REQ-FMT-10 vocabulary); may be empty |
| `seed` | relative directory; must exist; must not contain or lie inside `scenario.yaml`, a step prompt or an oracle path |
| `steps` | non-empty list of `{ n, prompt_file }`; `n` runs 1, 2, 3 … in order; each file must exist; no file declared twice (`./a` and `a` are the same file); a prompt must not be or lie inside `scenario.yaml` or an oracle path |
| `oracle.public_tests` | relative directory; must exist |
| `oracle.checks` | list of relative files (content checks, REQ-SCO-06), without duplicates; each must exist; default empty |
| `oracle.third_party` | list of `{ name, url (http, https, git or ssh), commit (40-hex SHA), license (SPDX-shaped expression, parentheses nested at most 32 deep; identifiers not checked against the SPDX list, so `NOASSERTION` or `x` pass) }`; default empty |
| `holdout` | boolean: whether hold-out additions are expected |

Unknown keys are rejected (strict objects) and reported one per key at their own path, so that a typo
never silently drops a field. Every path is relative and must stay inside the scenario version
directory: absolute paths and `..` segments are rejected, and every declared path is checked again
after `realpath`, so a symbolic link cannot leave the directory either. What the agent sees must be
disjoint from what it must not see (REQ-RUN-02): the seed, copied into the run container, must not
contain or lie inside `scenario.yaml`, any step prompt or any oracle path; a step prompt, given to
the agent, must not be or lie inside `scenario.yaml` or an oracle path. Returned paths are absolute, whatever the form of
`scenariosRoot`.

Issues are reported in a stable order (determinism directive): schema issues in schema order; then id
and version against their directories; then file-system issues in declaration order; then every
overlap, seed first. Overlaps are checked only when every declared path exists inside the directory. Issues with no field path (a file that is empty, unreadable, not YAML or not a mapping)
are reported against `scenario.yaml`.

Known gaps, recorded as elements rather than solved here: per-step oracle mapping
([dl-001](../decision-log/dl-001-per-step-oracle-mapping-in-the-scenario-format.md)) and third-party
material without a git commit
([dl-002](../decision-log/dl-002-third-party-oracle-material-without-a-git-commit.md)).

### REQ-ARC-02 lint rule

A local ESLint rule, `eslint/module-boundaries.js`, registered in `eslint.config.js` for
`src/**/*.{ts,mts,cts,tsx}` (adr-001 delta 1). For every relative or absolute import, re-export,
dynamic `import()` (string or plain template literal), TypeScript `import('…')` type and
`declare module '…'` augmentation, it resolves
the target against `src/`, with symbolic links resolved on both sides, and reports:

- a file directly under `src/`, outside any module (REQ-ARC-01);
- a source or target directory that is not one of the eleven modules;
- an import of `src/` itself or of anything outside `src/`;
- an import to a module the direction rule forbids: `core` imports nothing; `campaign`, `scenario`,
  `arms`, `agents`, `results` import `core`; `runner`, `scoring`, `site` import those and `core`, never
  each other; `cli` imports all;
- an import that reaches another module other than through its `index.js`.

Imports inside the same module, at any depth, and package imports are not restricted. The cases run
the rule in an in-process `Linter` (20 forbidden, 15 allowed, plus the `src/` message and a symlinked
checkout). One test lints through the project configuration in a separate ESLint process, to check the
wiring (`.ts` and `.mts` in `src/`, not tests): loading the configuration inside the test process
would load the rule a second time, which Vitest's coverage misattributes. The rule is type-checked
(`checkJs`) and under the coverage threshold.

### Acceptance traceability test

`test/acceptance/traceability.test.ts` parses the `.feature` files in
`docs/02_specification/acceptance/` and the task elements in `docs/memory/task/` (frontmatter
`features` and `status`). For every task whose status is `in-progress` or later, every scenario
tagged with one of its features must match an acceptance test title `@<feature> <scenario title>`.

- The parser (a small line parser, no Gherkin library) reads `Scenario`, `Scenario Outline`,
  `Scenario Template` and `Example`; Feature tags, then the enclosing Rule's own tags, are inherited;
  comment lines keep pending tags; CRLF is accepted.
- Titles are read from the TypeScript syntax tree of `test/acceptance/*.test.ts`: calls to `it`/`test`
  with any modifier chain (`.only`, `.concurrent`, `.each(…)`, tagged `.each`) except `skip`, `todo`,
  `skipIf`, `runIf` and `fails`, and not inside a skipped or pending `describe`; string or plain
  template titles only. Comments and other calls (`re.test`, `expect.it`, `describe`) never count.
- Known limits of a static scan: a test in dead code, an `it` shadowed by a local function, or a test
  with an empty body still count. Review is what catches those.

All test paths are resolved from the repository root (`test/support/paths.ts`), not from the working
directory. Temporary directories are removed when the test that created them finishes.

### Fixture

`test/fixtures/scenarios/T0/1.0/`: the trivial scenario (one step that asks to create a file; an
empty public test directory; `holdout: false`). task-003 runs it in a container. Error-path
fixtures are built in temporary directories by the tests themselves, so that every broken variant is
visible next to its assertion.

## Execution notes

### Build

- **TDD order, visible in history:** each behaviour has a red test commit followed by its
  implementation: REQ-ARC-02 (`bea61fc` → `14cf847`), acceptance traceability (`2b39c6b`, green with
  `b1285a0`), F3.1 and the loader (`74dc65c` → `b1285a0`), self-review fixes (`2c36906` → `5f66b03`).
  The red runs failed for the expected reason: 8 forbidden imports not reported; the `@F3.1` test
  missing; `src/scenario/index.js` not found; symlink accepted and generic version message.
- **Deviation from default 4:** TypeScript 6.0.3 instead of the latest 7.0.2, because typescript-eslint
  8.70.1 requires `<6.1.0` (recorded in Design).
- **Self-review findings, fixed in this task** (in scope: the Design promises that declared paths stay
  inside the scenario directory): a symlinked `seed` leading outside was accepted, now rejected after
  `realpath`; `version: 1.0` unquoted is read by YAML as the number 1, and the message now says to
  quote it.
- **REQ-ARC-05:** `.wingfoil/dna.yaml` edited by hand (`7188272`), because `dna set` writes scalars
  only (usage note N14).
- **Documentation directive:** doc comments on every export (`2960a94`); README development section
  (`ef4b4fe`).
- **Review checklist (at `5f66b03`):** `npm test` 56/56 green; coverage 100% statements, branches,
  functions and lines (threshold 80%, and `--coverage.thresholds.lines=101` exits 1, so the gate
  works); `npm run lint` clean; `tsc --noEmit` clean; `npm run build` emits `dist/core`,
  `dist/scenario`.
- **Traceability:** F3.1 → `scenarios.feature` "A scenario declares everything the runner and the
  scorer need" → `test/acceptance/scenarios.test.ts`; REQ-ARC-01 (package, `core`, `scenario`),
  REQ-ARC-02 (`eslint.config.js`, `test/unit/architecture/`), REQ-ARC-03 (`loadScenario` reads
  `<root>/<id>/<version>/`), REQ-ARC-05 (`dna.yaml`), REQ-FMT-04 (`src/core/scenario.ts`,
  `test/unit/scenario/`), REQ-NFR-04 (`vitest.config.ts` thresholds).
- **Follow-up for task-003** (already in its scope, not a new element): copying the seed into the run
  workspace must not follow symbolic links.

### Review, round 1

- **What happened:** the first submit to `in-review` (`2000e0b`) rested on the review checklist
  above (gates green) and on the author's own self-review, not on a review of the diff. On the
  approver's question, an independent reviewer (a separate agent that did not write the code, read
  only) reviewed the diff against the Design, the requirements, the scenario specs and the directives,
  proving each finding with a probe. The author reproduced the three majors before reporting them.
- **Outcome:** no blocker, 3 major, 9 minor or nit. The approver rejected the task
  (`d3b10c1`, `in-review → in-progress`).
- **Fixed in this task** (red `90b68da`, then `a6a10ff`, `da09cb6`, `cbcf4c2`):
  1. the seed could overlap the oracle (REQ-RUN-02): now rejected, on real paths;
  2. paths were relative with a relative root: now always absolute;
  3. the title scan missed titles containing quotes (`runner.feature` has "arm's"): rewritten;
  4. parser gaps (Feature tags, comments, `Example`, CRLF; titles in comments and skipped tests
     counted): **partly**, completed in round 2;
  5. issues with an empty path; unknown keys reported at the parent;
  6. and 7. the dependency rule's false negatives and false positives: replaced by a local rule
     (false negatives **partly**, completed in round 2);
  8. duplicates, URL and license not validated: **partly**, completed in round 2;
  9. 38 temporary directories left per run;
  10. tests depended on the working directory;
  11. read errors reported as YAML errors;
  12. two missing doc comments and one unsorted directory read.
- **Recorded as elements (out of scope):** dl-001 (per-step oracles), dl-002 (non-git third-party
  material, and the abbreviated `2a928f9` pin in S1.md).
- **Not acted on:** a `scenario.yaml` that is itself a symbolic link to a file outside is accepted;
  judged low impact because the file is only read, never mounted. Links inside `seed/` are handled by
  task-003 (copy without following links).
- **Found while fixing:** the first dependency-rule test failed once at random, because loading
  typescript-eslint cold took more than Vitest's 5 s per-test timeout. Loading now happens once in
  `beforeAll`. Two coverage gaps: a dead guard (removed) and an untested branch (a `scenario.yaml` that
  is not a mapping), whose test was written after the code: **characterization**, not red-first.
- **Correction:** these notes first said items 4, 6 and 8 were fixed; round 2 showed they were only
  partly fixed.
- **Checklist (at `cbcf4c2`):** `npm test` 90/90; coverage 100% on all four
  measures; lint and typecheck clean; the suite also passes when run from `/tmp`; the count of
  `/tmp/bench-*` directories is unchanged after a run.

### Review, round 2

- **Reviewer:** the same independent reviewer, re-running its round-1 probes and reviewing the new
  code, the two decision-logs and adr-001.
- **Round-1 findings:** 8 fixed, 4 partly (1, 4, 6, 8). **New:** no blocker or major; minors A–G,
  nits H–J; adr-001 did not quote the accepted defaults faithfully.
- **Fixed** (red `c8ce6ab`, then `992af0a`, `85f5dd9`, `a8f033e`):
  A. prompts could be or lie inside the oracle or `scenario.yaml`;
  B. the title scan counted trailing comments and non-test calls: now read from the syntax tree;
  C. it missed `it.each` with nested calls, `.concurrent`, `it (`, tagged `.each`;
  D. the rule missed absolute, type-only and template-literal imports and symlinked checkouts;
  E. URLs of any scheme, SPDX parentheses rejected, `./a` vs `a` duplicates, duplicate checks;
  F. the cleanup test depended on test order;
  G. Rule tags leaked into later Rules;
  H. only the first seed overlap was reported; the Design said "later prompts";
  I. `import '..'` gave a confusing message;
  J. the rule was outside type-checking (now `checkJs`) and coverage (see below).
- **adr-001:** now quotes the defaults from their first written record and lists three deltas for
  the approver: the local lint rule (default 3), the coverage scope (default 2), the pinned tool
  versions (addition). dl-001's citation corrected to §3 item 7 and §4.1 M-Q1.
- **Found while fixing:**
  - Moving the rule cases to an in-process `Linter` first broke them when run from another directory
    (19 failures from `/tmp`): the config's `files` glob resolves against `process.cwd()`. Fixed by
    passing `cwd` to the `Linter`.
  - Vitest's v8 coverage reports lines 37, 62 and 78 of the rule as uncovered, while Node's own
    coverage (`node --experimental-test-coverage`, same cases, scratch script) shows them executed.
    The rule is therefore outside the coverage threshold (adr-001 delta 2).
  - A dead check in the SPDX validator (always true) was removed; the `MIT WITH`, `()` and empty-string
    cases were added after the code: **characterization**.
- **Checklist (at `a8f033e`):** `npm test` 118/118; coverage 100% on all four measures (`src/`); lint
  and typecheck clean; 118/118 with `--sequence.shuffle` (seeds 1, 3, 7), from `/tmp` and from
  `test/`; `/tmp/bench-*` count unchanged after a run.

- **Correction (round 3):** the Vitest coverage anomaly above has a probable cause: two copies of
  the rule module, one loaded natively by `new ESLint()` through `eslint.config.js`, one through Vite.
  With the in-process cases alone the rule measured 100% of lines. Moving the project-configuration
  test to a separate process brought the rule back under the coverage gate, and adr-001 delta 2 was
  withdrawn.

### Review, round 3

- **Earlier findings:** all fixed except B (skipped suites), E (some shapes) and J (coverage), partly
  fixed. **New:** no blocker or major; 2 minors, 6 nits.
- **Fixed** (red `4f814b7`, then `1f44d8a`, `60df072`, `caae64c`):
  1. a license nested 8000 deep made `loadScenario` throw (stack overflow): nesting is capped at 32
     and reported as an issue;
  2. tests inside `describe.skip`/`describe.todo` counted: skipped suites are now pruned;
  3. the rule's fallback for non-existent paths dropped a character at `/`: uses `basename`;
  4. the coverage exclusion of the rule: removed, as above;
  6. the cleanup test did not check the default registration: a test now checks that `tempDir`
     removes its directory through `onTestFinished` (**characterization**: it passed at once);
  7. `declare module '…'` augmentation was not checked: now it is;
  8. adr-001's "see below" had no target: explained after the quoted defaults.
- **Documented, not changed:** 5 (static-scan limits, now in the Design); E's remaining shapes
  (`https://x` is a valid URL; license identifiers are not checked against the SPDX list, as the
  Design states).
- **Characterization cases added after the code** for coverage: a file outside `src/`, a non-module
  directory under `src/`, `declare namespace`. One branch stays uncovered: the guard in the rule's
  `real()` against recursing past the filesystem root, kept to rule out infinite recursion.
- **Checklist (at `caae64c`):** `npm test` 125/125; coverage 100% statements, lines and functions,
  99.1% branches (`src/` and `eslint/`); lint, typecheck and build clean; 125/125 with
  `--sequence.shuffle` (seeds 1, 5, 13), from `/tmp` and with `npx vitest run` from `test/`;
  `/tmp/bench-*` count unchanged.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `69ba5f3`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W1 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-001-scenario-format-and-package-skeleton` → `5dcfd91`. Declared: `draft → pending`, required fields checked,
  one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty stderr, 1 file,
  diff limited to `status: draft` → `status: pending`. Matches (subject without transition: N9).
- `npx wingfoil memory approve task-001-scenario-format-and-package-skeleton --reason "…"` → `ef68c8c`, run after the approver's explicit
  consent in chat. Declared: `pending → backlog` gate, approver role checked, subject with
  `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0, empty
  stderr, subject `wf(task): approve task-001-scenario-format-and-package-skeleton [pending → backlog]`, both trailers present, 1-line diff.
  Matches.
- `npx wingfoil memory submit task-001-scenario-format-and-package-skeleton` → `41d86a5`. Declared:
  `backlog → in-progress`, one commit, no bracket. Observed: exit 0, empty stderr, 1 file, diff
  limited to `status`. Matches. The Design was committed by hand first (`c1085fe`), per N13.
- `npx wingfoil dna show` (read-only, after the hand edit). Declared: loads and validates
  `.wingfoil/dna.yaml`. Observed: exit 0, the two modules and the new `paths.sources`/`paths.tests`
  printed as written, no commit. Matches.
- `npx wingfoil memory submit task-001-…` → `2000e0b` (`in-progress → in-review`). Observed: exit 0,
  empty stderr, 1-line `status` diff. Matches.
- `npx wingfoil memory reject task-001-… --reason "…"` → `d3b10c1`, after the approver's explicit
  consent. Declared: `in-review → in-progress` (the gate's reject target), subject with bracket,
  `Approver:`/`Reason:` body, and `rejection_reason` written to the frontmatter (spec-010 field
  ownership; the next `submit` removes it). Observed: exactly that; exit 0, empty stderr, 1 file,
  2 insertions and 1 deletion. Matches.
- `memory add` of `dl-001`, `dl-002`, `adr-001` (`f8394a3`, `237041d`, `c46b25e`) and their `submit`
  to `pending` (`fcca4cc`, `be01f38`, `26c9e85`): each exit 0, empty stderr, one file, the `submit`
  diffs limited to `status`. Matches the code. The scaffolded template text and spec-010 claim that
  `submit` replaces placeholder comments and fills required fields; it does not (usage note N15).
- `npx wingfoil memory submit task-001-…` → `aabc391` (`in-progress → in-review`, after the rejection).
  Declared: `status` set to the target and `rejection_reason` removed. Observed: exit 0, empty stderr,
  1 file, `status` changed and the `rejection_reason` line removed, nothing else. Matches.
