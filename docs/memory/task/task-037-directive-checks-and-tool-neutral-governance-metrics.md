---
id: task-037-directive-checks-and-tool-neutral-governance-metrics
type: task
title: "Directive checks and tool-neutral governance metrics"
status: approved
release: v0.1
wave: W8
features: [F4.8]
acceptance: [scoring.feature]
requirements: [REQ-SCO-01, REQ-SCO-03, REQ-SCO-04, REQ-SCO-05, REQ-SCO-06, REQ-FMT-04, REQ-FMT-07]
---

## Context

Third task of wave **W8 — Continuity and governance** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
The W8 plan-phase decisions are in [task-035](task-035-check-format-and-content-checks.md). It completes
**F4.8 tool-neutral governance metrics**, whose content checks task-035 delivered, with **M-E1 directive
violations** (experiment design §4.4) and the AST and dependency checks of REQ-SCO-05.

Scope:

- **Two more check kinds** in task-035's format:
  - **`dependencies`** — R1: `dependencies` in `package.json` compared with the seed's;
  - **`ast`** — rules on the TypeScript AST of files under a declared seed-relative directory, with the
    TypeScript compiler API (REQ-SCO-05): exported functions without a preceding TSDoc block (R2);
    `Date.now()`, `new Date()` with no argument, `Math.random()` (R3); `throw` statements (R4). A
    check counts **violations** (a number, with their locations), not only pass/fail.
- **Where the AST runs:** in the scoring container (REQ-SCO-01), so the TypeScript version is pinned by
  the scoring image, not by the host; whether the image already carries `typescript` or gains it (an
  image change, recorded in adr-004 as an amendment) is this task's design.
- **M-E1 in `score.json`:** violations per rule and per step snapshot, reported per rule, not only as a
  total (`scoring.feature` @F4.8 "Directive violations are counted per rule and per step"); a `not
  reached` step said. Aggregated in `aggregate.json` per rule, with runs and `n` (REQ-FMT-07).
- **Format-neutrality shown on S3** (W8 decision 3): `scoring.feature` @F4.8 "Governance checks do not
  depend on a harness's format" — two runs of S3 whose step 4 records the D3 revision, one in a WingFoil
  decision-log and one in a plain notes file: D3's content check passes in both. M-F1 itself is W9's.
- **Requirements** amended if REQ-SCO-05's wording needs the check kinds spelled out (the next amendment),
  with a recorded review decision.

Out of scope: S8's content and its four check files (task-038 writes them in this format; this task
tests the kinds on fixtures); M-R2's public-interface AST (F4.5, W10), though the AST helper should not
preclude it; M-E2 and M-E3 (v0.2).

**Done** means: `ast` and `dependencies` checks validated and scored per step, M-E1 per rule and step in
`score.json` and `aggregate.json`; both @F4.8 scenarios green; tests, coverage, lint pass.

## Acceptance criteria

Classification confirmed in the design phase, with one criterion added: the scoring image pins
TypeScript.

- `scoring.feature` @F4.8 — "Directive violations are counted per rule and per step": a run of a
  scenario with four directive checks has each check's violations at each step snapshot. The scenario
  is a fixture standing in for S8, as T3 stood in for S1–S3 in W4–W6; task-038 runs the same checks on
  S8 itself. **red-first**
- `scoring.feature` @F4.8 — "Governance checks do not depend on a harness's format", on S3@1.0 itself:
  two runs of its reference whose step 4 records D3's revision one in a WingFoil decision-log and one in
  a plain notes file. D3's check passes in both (W8 decision 3). **red-first**
- REQ-SCO-05 — R1: a runtime dependency added after the seed is one violation, named; a devDependency,
  or a version change of a seed dependency, is none. **red-first**
- REQ-SCO-05 — the AST rules counted by the compiler API, only under the check's directory:
  - an exported function with no TSDoc block before it;
  - `Date.now()` and a `new Date()` with no argument (`new Date(x)` is none);
  - `Math.random()` and Node's `crypto` randomness;
  - `throw`, but not the word in a comment or a string.

  Each violation is named by file, line and rule. **red-first**
- REQ-SCO-01 / REQ-SCO-05 — the AST checks run in the scoring container, with the TypeScript version its
  image pins, which `score.json` records. **red-first** (added in the design)
- REQ-SCO-03 — the same snapshot gives the same violations, in the same order. **characterization**
- REQ-FMT-07 — each directive check's violations per step in `aggregate.json`, as a `Value<number>`
  with its runs and `n`. **red-first**

## Design

### What M-E1 is in the files

M-E1 is "violations per step, reported per rule" (experiment design §4.4, S8.md §7). A directive is a
check, of one of two new kinds. It rides on task-035's `checks` rather than on a key of its own.

- The check's id names the directive, e.g. `r1-no-new-dependency`.
- Each step's result carries a `violations` count and where they are.
- `passed` is `violations === 0`, so the check reads like any other and the summary line counts it.
- The kind says which metric a check feeds. `content` and `unchanged` feed M-D2 and M-F1.
  `dependencies` and `ast` feed M-E1.

No new key in `score.json`, and no `SCORE_VERSION` change: keys are added to a check's step, and no
rule changes.

### The two kinds (REQ-SCO-06's file, REQ-SCO-05's checks)

```yaml
# R1
kind: dependencies
steps: [1, 2, 3, 4]
```

```yaml
# R3
kind: ast
steps: [1, 2, 3, 4]
dir: src/domain            # snapshot-relative; its files are what the rules read
rules: [wall-clock, randomness]
```

- **`dependencies`:**
  - One violation per name in the step's `package.json` `dependencies` that is not in the seed's.
    Neither the seed's nor the snapshot's `devDependencies` count, and a version change of a seed
    dependency is not a new one.
  - The seed's `dependencies` are read by the loader, like an unchanged check's lines. A missing or
    unparsable `package.json` at the step counts as no dependencies: the check is about additions.
  - It reads text, so it runs on the host with the other text checks.
  - It records `found: [{ dependency }]`, sorted by name.
- **`ast`:** `dir` is a relative path, and `rules` is a non-empty list from a catalogue fixed in code
  and published with the method (W11). A check is one directive, so R3's two rules are one check.

  The catalogue:

  | Rule | Counts |
  |---|---|
  | `undocumented-export` | each exported function with no `/** … */` block right before it: `export function`, `export default function`, and an exported `const` whose value is an arrow function or a function expression |
  | `wall-clock` | each `Date.now()`, and each `new Date()` with no argument |
  | `randomness` | each `Math.random()`, and each call of Node's `crypto` randomness: `randomUUID`, `getRandomValues`, `randomBytes`, `randomInt`, through `crypto.` or `globalThis.crypto.`, or imported from `node:crypto`/`crypto` |
  | `throw` | each `throw` statement |

  - The rules match syntax, not types. `Date.now()` behind an alias (`const clock = Date;
    clock.now()`) is not counted. That is S8.md §7's "indirect wall-clock access through a helper",
    which the hold-out's variants are for. The limit is stated on the method page (W11).
  - A file is read when it lies under `dir` and ends in `.ts`, `.tsx`, `.mts` or `.cts`. Declaration
    files (`.d.ts`) and test files (`*.test.*`, `*.spec.*`) are left out: R3 and R4 are about domain
    code, and a test's `throw` or `Date.now()` is not domain code.
  - A `dir` missing at the step is zero files, so no violation. The agent deleting the domain code is
    M-Q1's to catch, not M-E1's.
  - It records `found: [{ file, line, rule }]`, sorted by file, line and rule. The file is
    snapshot-relative and the line is 1-based.

### Where the AST runs: the scoring container (REQ-SCO-01, REQ-SCO-05)

The AST rules need the TypeScript compiler. The benchmark's runtime dependencies are `yaml` and `zod`,
and TypeScript is only a devDependency, so the built CLI cannot parse on the host. The scoring image
already holds the pinned tools scoring uses (REQ-SCO-04 says so for M-Q2's), so:

- **`docker/score-image/package.json` gains `typescript: 6.0.3`**, the version the repository itself
  uses, with its lockfile. The image's tag changes, since it is the hash of its directory.
  `score.json`'s `scorer` gains `typescript`, beside `tsx`.
- **`docker/score-image/ast-checks.mjs`** is a plain ES module with no TypeScript of its own to load.
  - It takes the checks as one JSON argument: `[{ id, dir, rules }]`.
  - It reads `/score/snapshot`, and prints one JSON line per violation, `{ id, file, line, rule }`.
  - It parses each file with `ts.createSourceFile`: syntax only, with no program and no type check, so
    it needs no `tsconfig`, is fast, and cannot fail on the agent's type errors.
  - An unparsable file is still walked, since the compiler recovers; nothing is invented for it.
- **One container per step that has an `ast` check**, named after the suites' containers. It has no
  mount and no network, and the snapshot is copied in, as for a suite. A non-zero exit is an oracle
  error that names the step, as a suite's is.
- `scoreChecks` becomes `async` and receives an `ast` runner, so that `checks.ts` stays free of Docker.
  `score.ts` passes the container runner. The unit tests pass the local double, which, like the
  suites', runs the image's script on the host with the devDependency TypeScript: the same version, so
  the result is the same.

### Aggregation (REQ-FMT-07)

- Each step of a `dependencies` or `ast` check gains `violations: Value<number>`, over the runs that
  reached it, beside `passed`.
- M-E1's total per step is not stored. It is a sum any reader can take, and REQ-FMT-07's values stay
  per rule, as S8.md §7 asks.
- The reader's schema accepts the new keys, and still accepts old scores without them.

### Requirements 1.13 (a review decision)

- **REQ-SCO-05:**
  - the two kinds;
  - the rule catalogue and its syntactic limit;
  - the files an `ast` check reads;
  - the AST run in the scoring container with the TypeScript the image pins, recorded in `score.json`;
  - `dependencies` read on the host.
- **REQ-SCO-06:** its list of kinds points to REQ-SCO-05 for the two directive kinds.
- **adr-004 amendment 2:** the image holds TypeScript and `ast-checks.mjs`, and a step's AST is one
  container.

### Tests

- **Unit, red first:**
  - `test/unit/scenario/checks.test.ts`: the two kinds' schema:
    - an unknown rule;
    - an empty `rules`;
    - a `dir` outside the version.
  - `test/unit/scoring/checks.test.ts`, `dependencies`:
    - an added one;
    - a devDependency;
    - a version bump;
    - a removed `package.json`.
  - `test/unit/scoring/checks.test.ts`, `ast`, through the local double:
    - each rule, with a positive and a negative case;
    - a file outside `dir`;
    - a test file;
    - a `.d.ts`;
    - the order of `found`;
    - a missing `dir`;
    - an oracle error on a failed exit.
  - `test/unit/scoring/image.test.ts`: the image pins `typescript` and `scorer.typescript` is read
    from it.
  - `test/unit/results/aggregate.test.ts`: `violations` as a `Value<number>`.
- **Acceptance, `test/acceptance/scoring.test.ts`:**
  - the two @F4.8 scenarios as above;
  - the first on a fixture scenario with R1–R4 as four checks, and a stored run whose steps add a
    dependency, an undocumented export, a `Date.now()` and a `throw`;
  - the second on S3@1.0 and its reference (`referenceRun`).
- **Docker:** a stored run with directive checks, scored by the real image, where each rule finds its
  violation. It is added to the W6 scoring test, which already builds the image.

No real agent and no spending.

### Choices to confirm

1. **Node's `crypto` randomness is randomness.** S8.md's R3 names only `Math.random()`, but its rule is
   "no randomness in the domain code", and step 1's easiest compliant-looking path is
   `crypto.randomUUID()`. Counting it follows the rule. Not counting it follows the table, and leaves
   the rule's own word unchecked.
2. **Test files and `.d.ts` are outside an `ast` check.**
3. **Violations are listed with their file and line in `score.json`**, not only counted. They are the
   agent's code, public in `diff.patch` already, and they make a finding checkable (F5.4, W10).

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `f38a469`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W8 tasks of release v0.1` (`b8df60c`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-037-directive-checks-and-tool-neutral-governance-metrics` → `69689df`. Declared: `draft → pending`, required fields checked, one
  commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to `status: draft` →
  `status: pending`. Matches (subject without transition: N9).
- `npx wingfoil memory approve … [pending → backlog]` → `751fa04`, run by the approver.
- Design committed by hand on `task/task-037-directive-checks-and-tool-neutral-governance-metrics`
  (`53171d6`), in a linked worktree with its own install (N13).
- `npx wingfoil memory submit task-037-directive-checks-and-tool-neutral-governance-metrics` → `5d2a0cb`.
  Declared: `backlog → in-progress`, one commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff
  limited to `status: backlog` → `status: in-progress`. Matches (N9).

### Build

Commits:

- `e1dc44f`: the tests, red (7 failing, and the scoring checks' file not loading).
- `3a62146`: requirements 1.13.
- `3fe6d6e`: adr-004 amendment 2.
- `1c1061a`: the implementation.
- `99da4e9`: three tests for the branches the first full run left uncovered, then one for overloads and
  `/**/` (below).

**As designed**, with these points found in the build:

- **The @F4.8 format-neutrality scenario was green from the start.** task-035 had already delivered
  its behaviour: D3's content check, on S3's reference with its step 4 recorded as a WingFoil
  decision-log or as `NOTES.md`. The criterion is therefore **characterization**, not red-first. The
  test is new, and it stands on S3@1.0 itself.
- **`dependenciesOf` lives in `core/check-text.ts`.** The loader reads the seed's dependencies with it
  and scoring reads the snapshot's, so both read `package.json` the same way.
- **`scoreChecks` is `async`.** It groups a step's `ast` checks into one runner call, so one container
  per step, as designed. A scenario with `ast` checks and no runner is an issue on `oracle.checks`.
  S2's, S3's and the fixtures' callers now `await` it.
- **The image:**
  - `docker/score-image/package.json` pins `typescript: 6.0.3`, and its lockfile was regenerated with
    `npm install --package-lock-only`. Only the `typescript` entry is added.
  - The Dockerfile copies `ast-checks.mjs`. The tag changes, as its content hash.
  - The local scoring double maps `/opt/score/ast-checks.mjs` to the file in the repository, and
    resolves `typescript` from the devDependency: the same version, so the unit tests parse as the image
    does.
- **What the script counts, each point a unit test:**
  - an overloaded function is documented when any of its declarations is;
  - a TSDoc block is `/**`, never `/**/`;
  - a string or a comment holding `throw` or `Math.random()` is not counted;
  - `new Date(x)` is not counted, and `new Date()` is;
  - `crypto` random functions are counted through `crypto.`, `globalThis.crypto.`, a namespace or
    default import, or a named import under any alias.
- **The acceptance @F4.8 "per rule and per step"** runs on T3 with R1–R4 as four checks over `src/`, via
  `bench score` with the local scoring double. The hidden test and the AST really run there. The
  counts per step are R1 `[1, 1]`, R2 `[1, 1]`, R3 `[1, 2]` and R4 `[0, 1]`. R2 fires at step 1
  because T3's seed `ship` has no TSDoc: a seed that breaks a rule is visible as such, and task-038's S8
  seed must comply (S8.md §3).
- **Docker, "W8 (task-037)":** the same run scored by the real image, where TypeScript 6.0.3 is recorded
  in `scorer`. Step 1's randomness is `crypto.randomUUID()`, counted, and the same counts come out.
  `found` names `src/guard.ts:3 throw`.

**Checks:**

- `npm test`: 939/939 (+17). Coverage 99.11% statements, 94.46% branches, 99.91% lines; `ast.ts`,
  `checks.ts` and `check-text.ts` at 100% of lines.
- `npm run typecheck` and `npm run lint`: clean.
- `npm run test:bin`: 5/5.
- `npm run test:docker`: 14/14 (+1), with no `bench-` container left. The image was rebuilt with
  TypeScript; S1, S2 and S3 score as before with it.

No real agent, no spending. No `wingfoil` command in the build phase.

### Review

- `npx wingfoil memory submit task-037-directive-checks-and-tool-neutral-governance-metrics` → `4502acf`.
  Declared: `in-progress → in-review`, one commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff
  limited to `status: in-progress` → `status: in-review`. Matches (N9).
- Traceability: `features: [F4.8]`, completed here (task-035 delivered its first half); both @F4.8
  scenarios green in `test/acceptance/scoring.test.ts`.
- **For the approver's review decision:** requirements 1.13 (REQ-SCO-05, REQ-SCO-06) and adr-004
  amendment 2 (the image pins TypeScript and runs the AST checks).
