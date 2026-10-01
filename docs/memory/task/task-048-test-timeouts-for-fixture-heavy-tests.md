---
id: task-048-test-timeouts-for-fixture-heavy-tests
type: task
title: "Test timeouts for fixture-heavy tests"
status: backlog
release: v0.1
wave: W11
features: [F5.5]
acceptance: [results.feature]
requirements: [REQ-NFR-04]
---

## Context

Fixes [bug-008](../bug/bug-008-tests-that-build-stored-runs-rely-on-vitest-s-5-s-default-and-time-out-under-load.md),
found on main after task-045's merge: tests that build stored runs with git rely on vitest's 5 s default
timeout and fail under load, task-045's three @F5.5 acceptance tests in every run. A task of its own, before
task-046 (the approver's choice, 2026-10-01), in wave **W11 — Publish** of release v0.1
([rel-v0-1](../release/rel-v0-1.md)). It changes tests and test configuration only: no `src/` file, no
requirement, no scoring rule.

Scope:

- `vitest.config.ts` gains a `testTimeout` suited to a test that builds stored runs with git and scores them
  through the scoring double. The value is the design's, measured on this machine idle and loaded.
- The tests bug-008 lists that still need more get an explicit timeout, as those scoring real scenarios
  already have.
- `vitest.bin.config.ts` and `vitest.docker.config.ts` are checked for the same default.

Out of scope:

- Making the fixtures faster: a separate improvement, if wanted.
- The machine's load from other repositories' sessions.

**Done** means:

- `npm test` passes three times in a row with coverage while the machine is loaded (load average recorded
  in the notes), and once idle.
- The tests bug-008 lists all pass; no test is skipped or weakened to get there.
- Lint passes; bug-008's Resolution names this task's commits.

## Acceptance criteria

Classified in the design phase. Both are **characterization**: the tests exist and pass on an idle machine;
what changes is the time they are given.

- REQ-NFR-04: every test bug-008 lists passes in three consecutive `npm test` runs with coverage under load.
- `results.feature` @F5.5 ×3 pass under load (task-045's).

## Design

**Measured** on 2026-10-01, `npx vitest run --coverage --testTimeout=600000 --reporter=json` on main
`ee96cf0`, load average 48–56 throughout (another repository's jest workers):

- 66 of 1142 tests took more than 5 s. Most have a timeout of their own (the scenario and scoring tests,
  `{ timeout: 240_000 }` per describe or `600_000` per test), sized for an idle machine.
- **The tests with no timeout of their own** (bug-008's list) took at most 11.0 s: `finding.test.ts`'s
  slowest 11.0 s, @F5.5's first 9.1 s (it builds the shared site), the others 4.7–7.9 s.
- **One test with a timeout of its own failed:** `scenarios.feature` "@F6.1 @F6.2 @F6.3 @F6.8 Each v0.1
  scenario is ready for a campaign", 634 s against its 600 s. Its comment measures 173 s alone on an idle
  machine. It is in bug-008's list too (it failed in the first runs), though not for the 5 s default.

**The change:**

- `vitest.config.ts`: `testTimeout: 60_000` and `hookTimeout: 60_000`, with a comment naming bug-008 and
  the measurement: five times the slowest default-timed test under load. A test that hangs still fails,
  in a minute.
- The @F6.x test: `1_200_000` (20 minutes), its comment updated with both measures (173 s idle, 634 s at
  load 50).
- No other test changes; the tests with their own timeouts keep them. `vitest.bin.config.ts`
  (`120_000`) and `vitest.docker.config.ts` (`600_000`) already set theirs.

**Verification:** three consecutive `npm test` runs with coverage, each with its load average recorded,
then bug-008's Resolution.

No requirement and no ADR changes.

### Choices to confirm

All three confirmed by the approver as proposed, 2026-10-01.

1. **One global `testTimeout` of 60 s,** not an explicit timeout on each of the ~20 tests. A new test that
   builds stored runs is covered without anyone remembering.
   - *Alternative:* explicit timeouts per test, the default left at 5 s. A fast unit test that hangs fails
     sooner, but the next fixture-heavy test repeats bug-008.
2. **The @F6.x test gets 20 minutes,** and stays one test. It matches the Gherkin outline's single title,
   which the traceability gate checks.
   - *Alternative:* one test per scenario (S1, S2, S3, S8), each with its own budget. Shorter budgets, but
     four titles where the gate expects one, so the gate would change too.
3. **"Done" is three passing loaded runs, recorded with their load:** the load is other sessions', and
   cannot be set.
   - *Alternative:* a synthetic load (a CPU burner beside the run). Reproducible, but it is not the load
     that showed the bug.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type bug --title "…"` (`cad94cd`) and `npx wingfoil memory add --type task
  --title "…"` (`ff0e1cc`), on main.
  - Declared: one commit `wf(<type>): add <id>` and one file from the template, `status: draft`.
  - Observed: exit 0 each, that commit with 1 file. Matches. The bug's scaffold says `memory submit`
    "replaces these placeholder comments with real content"; the content was written by hand first
    (`a7e6022`), so nothing was left for it to replace.
- `npx wingfoil memory submit` for bug-008 (`1334317`) and task-048 (`a5e43b7`).
  - Declared: `draft → pending`, one commit each.
  - Observed: exit 0, 1 file each, a diff limited to `status: draft` → `status: pending`. Matches.
