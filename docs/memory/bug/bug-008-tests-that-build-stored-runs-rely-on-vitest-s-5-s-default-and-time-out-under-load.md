---
id: bug-008-tests-that-build-stored-runs-rely-on-vitest-s-5-s-default-and-time-out-under-load
type: bug
title: "Tests that build stored runs rely on vitest's 5 s default and time out under load"
status: fixed
fixed_by: task-048-test-timeouts-for-fixture-heavy-tests
---

## Context

Many tests build stored runs with the real git (`storedRun`, `aggregatedExecution`, `siteExecution` in
`test/support/`) and score them through the scoring double. Several do it with no timeout of their own, so
vitest's default of 5 s applies (`vitest.config.ts` sets no `testTimeout`). Found on main after
[task-045](../task/task-045-site-build-and-landing-page.md)'s merge (`a519b3e`), on 2026-10-01, while the
machine ran other sessions' test suites (load average 36–59).

## Expected

`npm test` passes on a loaded machine as it does on an idle one: a test fails for what it checks, never
for the time a fixture takes to build.

## Actual

Three consecutive `npm test` runs on main (`08e14c4`), with coverage, failed 5, 22 and 10 tests, every one
with `Test timed out in 5000ms`. Two runs of `npx vitest run` without coverage, at the same time, passed.
The tests that timed out, all building stored runs with no timeout of their own:

- `test/acceptance/results.test.ts`: the three @F5.5 scenarios (task-045) **in every run**; @F5.1 ×2
  (task-034) and @F5.4 (task-044) in some;
- `test/acceptance/scenarios.test.ts`: "@F6.1 @F6.2 @F6.3 @F6.8 Each v0.1 scenario is ready for a
  campaign";
- `test/unit/results/finding.test.ts` (9 tests) and `test/unit/cli/finding.test.ts` (5 tests), task-044;
- `test/unit/cli/score.test.ts`: the determinism line (task-042).

task-045 made it worse: its three @F5.5 tests build and score six runs in the first one, with no timeout,
and its fixtures add load beside the others. Before it, one task-044 test failed once (task-045's build
notes) and passed on the rerun.

## Evidence

- `npm test` ×3 on main `08e14c4`, 2026-10-01: `Tests 5 failed | 1137 passed`, `22 failed | 1120 passed`,
  `10 failed | 1132 passed`; each failure `Error: Test timed out in 5000ms.`
- `npx vitest run` ×2 at the same time: `1142 passed`.
- `uptime` during the runs: load average 36.21, 59.25, 57.28 (another repository's jest workers).

## Suggested handling

A `testTimeout` in `vitest.config.ts` that suits a test building stored runs with git, and an explicit
timeout on the slowest ones, as the tests that score real scenarios already have (`600_000`). Then
`npm test` several times under load to confirm it.

## Resolution

Fixed by [task-048](../task/task-048-test-timeouts-for-fixture-heavy-tests.md) (`5dd1340`), in W11 of
release v0.1: `vitest.config.ts` sets `testTimeout` and `hookTimeout` to 60 s, five times the slowest
default-timed test measured at load average 48–56 (11 s); the @F6.x scenario check, which took 634 s
against its own 600 s, gets 20 minutes. Three consecutive `npm test` runs with coverage then passed
1142/1142 at load averages between 21 and 45. WingFoil has no link from a bug to the task that fixes it
(bug-005), so it is recorded here.

