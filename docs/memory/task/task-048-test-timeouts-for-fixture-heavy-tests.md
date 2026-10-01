---
id: task-048-test-timeouts-for-fixture-heavy-tests
type: task
title: "Test timeouts for fixture-heavy tests"
status: pending
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

Classified in the design phase.

- REQ-NFR-04: the suite passes on a loaded machine; every test bug-008 lists passes in three consecutive
  `npm test` runs with coverage under load.
- `results.feature` @F5.5 ×3 pass under load (task-045's).

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
