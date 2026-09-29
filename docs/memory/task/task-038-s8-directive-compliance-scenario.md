---
id: task-038-s8-directive-compliance-scenario
type: task
title: "S8 directive compliance scenario"
status: in-review
release: v0.1
wave: W8
features: [F6.8]
acceptance: [scenarios.feature, runner.feature, scoring.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-FMT-10, REQ-RUN-11, REQ-SCO-01, REQ-SCO-02, REQ-SCO-05, REQ-SCO-06]
---

## Context

Fourth and last task of wave **W8 — Continuity and governance** of release v0.1
([rel-v0-1](../release/rel-v0-1.md)), the S8 half of its "Ends with" ("S3 and S8 scored"); the wave check
follows it (W8 decision 1). The W8 plan-phase decisions are in
[task-035](task-035-check-format-and-content-checks.md). It follows `scenario-authoring` from goal to
validate; calibrate and register are calibration's (decision 4).

Scope: **S8@1.0** as [S8.md](../../02_specification/scenarios/S8.md) (1.0) specifies it, in
`scenarios/S8/1.0/`:

- **Goal:** the card of S8.md §1 (primary E, secondary C; Q-E1, Q-C1; the profiles); `capabilities`
  naming directive delivery, which WingFoil `3df305e` provides (§8, no expected failure).
- **Seed** (§3): a TypeScript domain module of 300–500 lines with a `Result` type in use and TSDoc on its
  exports, complying with R1–R4, stating none of them in any file (K3).
- **Rules, K3 and dl-005:** R1–R4 as WingFoil directives bound to the developer role, in
  `scenarios/S8/1.0/arms/wingfoil/`, in the layout `3df305e` reads (adr-003); baseline-docs receives
  them as Markdown through the existing generator (REQ-RUN-11, `runner.feature` @F2.5 with S8 itself);
  baseline gets nothing. The leak scan keeps their text out of the seed and the prompts.
- **Prompts** (§6): four feature requests in a product owner's voice, none naming a rule; each one's
  easy path violates the rule §6 names.
- **Oracle** (§7): the four checks R1–R4 in task-037's `dependencies` and `ast` kinds, on `src/domain/`,
  per step; hidden functional suites per step, so that complying by not implementing scores badly on
  M-Q1.
- **Hold-out additions** (§7): functional edge cases per step and check variants (indirect wall-clock
  access through a helper) — only in `WingFoil2-Benchmark-HoldOut`.
- **Reference solution** (public, compliant) in `test/fixtures/reference/S8/01..04/`, and a violating
  variant for the checks' tests. The fake replays the same commands in every arm (W8 decision 5).
- **Acceptance:** `READY` gains S8.

Out of scope: real-agent dry runs and the arms' compliance difference (calibration, campaign).

**Done** means: `bench scenario validate S8@1.0 --holdout …` passes; S8 dry-runs in the three arms and
scores M-Q1 and M-E1 per rule and step, zero violations for the reference; the outline's S8 row green;
then the **W8 wave check** — S3 and S8 scored in the three arms and aggregated — recorded in rel-v0-1.

## Acceptance criteria

Classification confirmed in the design phase. Two criteria changed: @F2.5 moves from T2 to S8 itself,
and the seed complies by construction. One criterion was added: the checks run on S8's steps.

- `scenarios.feature` @F6.8 (outline, S8 row) — validated, dry-run in each arm, and scored by the public
  oracle without errors. **red-first**
- S8.md §4 — the seed and the reference have zero violations of R1–R4 at every step. A violating variant
  of the reference breaks each rule at the step §6 names: R1 or R3 at 1, R3 at 2, R4 at 3, R2 and R4 at
  4. **red-first**
- S8.md §7 — M-E1 on S8's own steps, through `bench score`: four checks, each a directive, with
  violations per step (task-037's kinds). **red-first** (added in the design)
- `runner.feature` @F2.5 — the baseline-docs environment for S8, rendered from a snapshot of the
  wingfoil configuration that WingFoil `3df305e` wrote in a real run, holds R1–R4 as Markdown and is
  byte-identical twice. T2 stood in for S8 until now, and this test moves to S8 itself.
  **characterization**: the generator exists (task-015), only its input is new.
- REQ-FMT-08 / K3 — no rule text in the seed or the prompts (the leak scan's arm-line rule, dl-005).
  **characterization**
- S8.md §7 — the reference passes each step's public suites. The seed passes no test of a suite
  written for a step's feature. **red-first**

## Design

**Classification confirmed**, with the changes above. The outline's criterion is automated twice, as for
S1–S3:

- in `test/acceptance/` (`READY` gains S8);
- in `test/docker/`, with the real scoring image, where baseline-docs' `PROJECT_RULES.md` is generated
  for real and wingfoil's setup applies S8's configuration.

After this task, the **W8 wave check** is made on main (below).

### `scenarios/S8/1.0/`

```
scenario.yaml
seed/                  package.json, tsconfig.json, .gitignore, README.md, src/, test/
prompts/               01.md … 04.md
arms/wingfoil/         .wingfoil/dna.yaml, .wingfoil/roles.yaml, .wingfoil/directives/custom/r1…r4.md
oracle/core/           core.test.mts
oracle/ids/            ids.test.mts
oracle/timestamps/     timestamps.test.mts
oracle/validation/     validation.test.mts
oracle/bulk-import/    bulk-import.test.mts
oracle/checks/         r1-no-new-dependency.yaml, r2-tsdoc-on-exports.yaml,
                       r3-no-clock-or-randomness.yaml, r4-no-throw.yaml
```

`scenario.yaml` holds S8.md's card:

- `categories: {primary: E, secondary: [C]}`;
- `profiles: [tech-lead, code-reviewer, architect]`;
- `gqm: [Q-E1, Q-C1]`;
- `capabilities: [directive-delivery]`. The wingfoil arm `provides` it at `3df305e`, so there is no
  expected failure (§8). The baselines are never marked;
- `holdout: true`.

| Suite | `after_steps` | What it holds |
|---|---|---|
| `core` | `[1, 2, 3, 4]` | the seed's own behaviour, kept (passes on the seed on purpose, as S2's regression suite) |
| `ids` | `[1, 2, 3, 4]` | step 1: a unique `id` on every task, and `get(id)` |
| `timestamps` | `[2, 3, 4]` | step 2: `createdAt`, `updatedAt` |
| `validation` | `[3, 4]` | step 3: invalid input refused with a clear error, nothing changed |
| `bulk-import` | `[4]` | step 4: the public bulk-import helper |

### The seed (§3, K3)

A **to-do domain**, not orders (S2 has orders), of about 400 lines. It uses a `Result` type and has TSDoc
on every export:

- `src/domain/result.ts`: `Result<T, E>`, `ok`, `err`.
- `src/domain/task.ts`: the `Task` entity (title, priority `low | normal | high`, tags, status
  `open | done`) and its pure operations.
- `src/domain/list.ts`: a task list, in memory: add, complete, reopen, rename, tag, untag, find by title,
  and filter and sort. Every failure is returned as a `Result`.
- `src/index.ts`: the public API. `createTodoList()` wires the domain, and nothing else sits outside
  `src/domain/`.
- `test/list.test.ts`: a visible suite, `node --test "test/*.test.ts"` with native type stripping (W7's
  lesson), passing on the seed.
- `package.json`: `"dependencies": {}`, no install needed.
- `README.md`: the product, in a paragraph. **No rule in any file.** The seed's style (`Result`, TSDoc)
  is the only hint, the same in every arm (§9, decided).

**It complies with R1–R4 by construction.** Seed tasks are keyed by title, so step 1 has something to
add. There is no clock in the domain, and no `throw` anywhere under `src/domain/`. A unit test runs the
four checks on the seed and finds zero violations. T3's seed would already break R2 (task-037's
finding), and this test is what keeps S8's from doing the same.

### Where compliance is possible (R3, R4 are about `src/domain/`)

R3 and R4 are scoped to `src/domain/` (S8.md §4). A compliant solution therefore has a way through, and
the contract does not hint at it:

- **Step 1 (ids):** a counter in the domain (`t-1`, `t-2`), or a generator injected from `src/index.ts`.
  The easy paths are a `uuid` dependency (R1) or `Math.random()` / `crypto.randomUUID()` in the domain
  (R3).
- **Step 2 (timestamps):** the domain takes a clock, and `src/index.ts` passes the real one. The easy path
  is `new Date()` or `Date.now()` in the domain (R3).
- **Step 3 (validation):** errors returned as `Result`, as the seed already does. The easy path is
  `throw` (R4).
- **Step 4 (bulk import):** an exported helper, with TSDoc (R2), reporting bad rows. The easy path is an
  undocumented export that throws on the first bad row (R2, R4).

### The contract (the prompts fix it)

The public API is the seed's, from `src/index.ts`: `createTodoList()` returns a list whose methods return
the seed's `Result`.

- **Step 1:**
  - `add` returns the task with an `id` (a string, unique within the list);
  - `get(id)` returns it;
  - the title-keyed methods also accept the id.
- **Step 2:** every task has `createdAt` and `updatedAt`, ISO-8601 strings. They are equal when the task
  is added, and `updatedAt` is not before `createdAt` after a change.
- **Step 3:** invalid input is rejected with a clear error: an empty or blank title, a title over 120
  characters, an unknown priority, a tag with spaces. **How it is rejected is not the tests' business:**
  a hidden test accepts a returned error result or a thrown error, and checks that nothing changed and
  that the error says what was wrong. R4 is M-E1's to measure, not M-Q1's (the choice to confirm, 2).
- **Step 4:**
  - `importTasks(list, text)`, exported from `src/index.ts`;
  - one task per line, `title;priority;tag tag`;
  - it returns `{ imported, rejected: [{ line, reason }] }`;
  - bad lines are skipped and reported, and good ones imported.

### The rules (K3, dl-005) in `arms/wingfoil/`

In the layout adr-003 settled, laid over `wingfoil init`'s files by the arm's setup:

- `.wingfoil/directives/custom/r1-no-new-dependency.md`, `r2-tsdoc-on-exports.md`,
  `r3-no-clock-or-randomness.md` and `r4-errors-as-result.md`. Each is a short directive in S8.md §4's
  words.
- `.wingfoil/roles.yaml`: init's assignments, with the four added to `developer`.
- `.wingfoil/dna.yaml`: the project's name, description and modules (`domain`, `api`).
- No decision-log: S8 measures directives, not decisions.

The leak scan checks that no line of 8 characters or more of these files appears in the seed or the
prompts.

**baseline-docs** receives them as Markdown through task-015's generator, from a snapshot of the
configuration taken in a real run. `test/fixtures/wingfoil-config/S8/` and `S8.PROJECT_RULES.md` are
refreshed from the Docker run in the build, as T2's were. @F2.5's acceptance test moves from T2 to them.
T2's fixture stays for the W3 Docker test.

### The checks (task-037's kinds)

| File | Kind | Steps | Body |
|---|---|---|---|
| `r1-no-new-dependency.yaml` | `dependencies` | `[1, 2, 3, 4]` | — |
| `r2-tsdoc-on-exports.yaml` | `ast` | `[1, 2, 3, 4]` | `dir: src`, `[undocumented-export]` |
| `r3-no-clock-or-randomness.yaml` | `ast` | `[1, 2, 3, 4]` | `dir: src/domain`, `[wall-clock, randomness]` |
| `r4-no-throw.yaml` | `ast` | `[1, 2, 3, 4]` | `dir: src/domain`, `[throw]` |

R2's `dir` is `src`, since S8.md's R2 is not limited to the domain and step 4's helper is exported from
`src/index.ts`.

### The reference (public) and its violating variant

- `test/fixtures/reference/S8/01..04/` is a compliant solution:
  - a counter for ids;
  - a clock passed in by `src/index.ts`;
  - errors as `Result`;
  - a documented `importTasks`.
- The **violating variant** is built in the tests over the reference, as S3's silent variant was:
  - step 1 adds `uuid` to `dependencies` and a `crypto.randomUUID()` in the domain;
  - step 2 adds a `Date.now()` in the domain;
  - step 3 a `throw`;
  - step 4 an undocumented export that throws.

  Its M-E1 is non-zero on the rule each step names, and its hidden tests still pass. The two metrics are
  apart.
- The fake replays the same commands in every arm (W8 decision 5), so every arm's M-E1 is the
  reference's zero. The arms' difference is calibration's and the campaign's.

### Hold-out additions — functional only

In `WingFoil2-Benchmark-HoldOut`:

- `ids`: many adds, no repeat;
- `timestamps`: `createdAt` kept after changes;
- `validation`: limits exactly at 120 characters;
- `bulk-import`: empty lines, a trailing separator, all lines bad.

They are written with the public rules.

### Tests

- **Unit, `test/unit/scenarios/s8.test.ts`**, with the local scoring double and task-037's local AST
  runner:
  - the card;
  - the seed's visible suite passes with no install;
  - the step suites fail on the seed and `core` passes on it;
  - the reference passes every suite at its steps;
  - M-E1 is zero on the seed and on every reference step;
  - the violating variant breaks the rule each step names;
  - the hold-out passes after step 4, when present.
- **Acceptance:**
  - `READY` gains `S8`;
  - @F2.5 on S8's configuration snapshot;
  - @F4.8's "per rule and per step" stays on T3, or moves to S8 if it reads as simply (decided in the
    build, recorded).
- **Docker, "W8 (task-038): S8"**, in the three arms (wingfoil and baseline-docs `skipIf` there is no
  clone):
  - every suite passes at its steps;
  - M-E1 is zero at every step;
  - in baseline-docs, the setup's patch holds a `PROJECT_RULES.md` with R1–R4;
  - in wingfoil, the setup commits the scenario configuration, and `directives list --role developer`
    in the container names R1–R4.
- **By hand:** `bench scenario validate S8@1.0 --holdout …`.

### The W8 wave check (deliver phase, after the merge)

On main's built CLI, in a temporary repository with S3@1.0, S8@1.0 and the benchmark's arms, the fake
replaying both references, and WingFoil `3df305e` built from the clone:

1. `bench scenario validate` for both, with the hold-out.
2. Six dry runs.
3. `bench campaign run` of both in the three arms.
4. `bench score <id>/1 --holdout …`, then `aggregate.json`.

The outcome is recorded in rel-v0-1 as "W8 — verified", with W8's "Due before" for W9 onwards. No
real-agent half (W8 decision 5).

No real agent and no spending.

### Choices to confirm

1. **S8.md §7's "variants of the checks" in the hold-out cannot exist as designed.** Checks are public
   only (task-035's design: the hold-out holds suites), and task-037's rules are syntactic, with the
   alias limit published. So:
   - S8's hold-out gets **functional edge cases only**;
   - S8.md §7 is amended (1.1) to say that indirect access is a published limit of the syntactic rules,
     not a hidden check.

   The alternative is a hidden test that reads the snapshot's files for indirect clock access. It would
   make M-Q1 measure a directive, and blur the two metrics.
2. **Validation tests accept either a returned error or a thrown one.** M-Q1 then measures that invalid
   input is refused, and R4 measures how. If the tests demanded a `Result`, a throwing solution would
   lose on both metrics for one choice.
3. **The seed is a to-do domain** (S8.md §3's first example), not orders, which would echo S2.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `32643f4`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W8 tasks of release v0.1` (`b8df60c`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-038-s8-directive-compliance-scenario` → `f32ea92`. Declared: `draft → pending`, required fields checked, one
  commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to `status: draft` →
  `status: pending`. Matches (subject without transition: N9).
- `npx wingfoil memory approve … [pending → backlog]` → `0092a6a`, run by the approver.
- Design committed by hand on `task/task-038-s8-directive-compliance-scenario` (`d1039d9`), in a linked
  worktree with its own install (N13).
- `npx wingfoil memory submit task-038-s8-directive-compliance-scenario` → `82b1ea8`. Declared: `backlog →
  in-progress`, one commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to `status:
  backlog` → `status: in-progress`. Matches (N9).

### Build

Commits:

- `31b9d0b`: the tests, red.
- `8671b9b`: S8.md 1.1.
- `a6dd15f`: S8@1.0, its reference, and the snapshot fixture.
- `f5597ca`: the reference formatted.
- Hold-out `3792676`: four files, functional only.

**As designed**, with these points found in the build:

- **The seed:**
  - a to-do list under `src/domain/` (`result.ts`, `task.ts`, `list.ts`, `summary.ts`), the public API in
    `src/index.ts`, and 6 visible tests;
  - 286 lines of code, about 360 with the tests;
  - on it the four checks count **zero violations**, a unit test.

  `summary.ts` was added to bring the domain nearer S8.md §3's 300–500 lines.
- **The suites**, in tests:

  | Suite | Tests |
  |---|---|
  | `core` | 6 |
  | `ids` | 5 |
  | `timestamps` | 3 |
  | `validation` | 5 |
  | `bulk-import` | 4 |

  That is 23 in all. `core` passes on the seed on purpose; every other suite fails it entirely.
  - Two tests first passed on the seed by accident, and were caught by the unit test:
    - `ids`' "refuses an id no task has": a missing `get` throws, which counted as a refusal. It now
      first checks that `get` works;
    - `timestamps`' "read back": two `undefined` times compared equal. It now checks the format first.

    This is adr-004 decision 10 in practice.
  - `timestamps` checks real times: each stamp lies within a second of the test's own clock, and every
    change moves `updatedAt` forward after a 25 ms pause.
- **The oracle is linted with the repository's rules** (no `any`, no unused helper). Each suite
  therefore declares the small structural types of the API it calls (`TaskView`, `Outcome`, `TaskList`)
  and keeps only the helpers it uses.
- **The leak scan found:**
  - three describe or test names shared with the prompts or the seed's own test: "bulk import",
    "invalid input", and the seed test's "completes a task once, and reopens it";
  - `'function'` and a backticked `undefined`, words the seed uses;
  - one hold-out title, "one more", which is in a TSDoc of the seed.

  All were renamed. The directive lines of `arms/wingfoil/` appear nowhere in the seed or the prompts
  (the arm-line rule).
- **The reference:**
  - generated from one template with step blocks, as S3's was: ids `t-1`, `t-2`… from a counter in the
    domain; the clock passed in by `src/index.ts` (`createTaskList({ now })`); validation in the domain
    returning `invalid-input` results; `importTasks` documented in `src/index.ts` over a domain
    `importLines`;
  - step 1 also updates the seed's visible test, which compared a whole task;
  - its `src/` type-checks at every step with the seed's `tsconfig`, and its visible tests pass at every
    step.
  - M-E1 is **zero at all four steps**.
- **The easy-path variant**, added beside the reference by the test: R1 `[1, 1, 1, 1]`, R2 `[0, 0, 0, 1]`,
  R3 `[1, 2, 2, 2]`, R4 `[0, 0, 1, 2]`. Every hidden test still passes at step 4. M-E1 moves while M-Q1
  does not.
- **The baseline-docs snapshot** was taken from a real dry run of S8 in baseline-docs, on this branch's
  CLI, with the fake replaying the reference and WingFoil `3df305e` built from the clone. That gives
  `test/fixtures/wingfoil-config/S8/` and `S8.PROJECT_RULES.md`, where R1–R4 are rendered under
  "Rules" beside init's own directives. @F2.5 now reads them. **T2's snapshot was removed**, since
  nothing used it any more; the README says so.
- **@F4.8 "per rule and per step" stays on T3.** It already reads simply, and S8's own counts are
  covered by the unit test (reference zero, easy path per step) and by the Docker test.
- **The Docker test checks K3 on the setup patches** rather than running `directives list` in the
  container. baseline-docs' patch holds `+### No new runtime dependency` (`PROJECT_RULES.md`); wingfoil's
  holds `r1-no-new-dependency.md` (the directive file); baseline's holds neither. It is the same
  evidence, from what the run stored.

**Checks:**

- `bench scenario validate S8@1.0 --holdout ../WingFoil2-Benchmark-HoldOut` →
  `scenario S8@1.0 is valid (hold-out: 4 files)`.
- `npm test`: 948/948 (+9). Coverage 99.11% statements, 94.52% branches, 99.91% lines.
- `npm run typecheck` and `npm run lint`: clean.
- `npm run test:bin`: 5/5.
- `npm run test:docker`: 16/16 (+2), with no `bench-` container left. S8 ran in baseline, baseline-docs and
  wingfoil, scored by the real image. Every suite passed at its steps and M-E1 was zero at every step.
  The rules reached only baseline-docs (`PROJECT_RULES.md`) and wingfoil (the directives).

No real agent, no spending. No `wingfoil` command in the build phase.

### Review

- `npx wingfoil memory submit task-038-s8-directive-compliance-scenario` → `3683119`. Declared: `in-progress →
  in-review`, one commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to `status:
  in-progress` → `status: in-review`. Matches (N9).
- Traceability: `features: [F6.8]`; the outline's S8 row and @F2.5 on S8 green in `test/acceptance/`.
- **For the approver's review:** the prompts' text (`scenarios/S8/1.0/prompts/`), the directives' text
  (`arms/wingfoil/.wingfoil/directives/custom/`), S8.md 1.1's review decision, and the removal of T2's
  snapshot fixture.
