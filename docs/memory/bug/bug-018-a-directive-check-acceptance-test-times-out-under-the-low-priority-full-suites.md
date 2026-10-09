---
id: bug-018-a-directive-check-acceptance-test-times-out-under-the-low-priority-full-suites
type: bug
title: "A directive-check acceptance test times out under the low-priority full suites"
status: approved
fixed_by: task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
---

## Context

Found by task-075's first full-suites run (`scripts/full-suites.sh`, niced, vitest with 2 workers) on 2026-10-09, after
the same timeout in earlier full runs.

## Expected

The full suites are green on a branch whose code is right, also at the lowest priority with 2 workers, which is how
they now run (dl-016, kanban-delivery version 5). A test's limit leaves room for that.

## Actual

`test/acceptance/scoring.test.ts` › `@F4.8 Directive violations are counted per rule and per step` has the file's
120 s limit (`describe('scoring.feature', { timeout: 120_000 })`). It stores a T3 run with four directive checks and
scores it through the AST checks, and in full runs it takes 121–145 s:

| Run | Duration | Result |
|---|---|---|
| task-068's first unit and acceptance run, under load | 121.4 s | timed out |
| task-071's full run | 145.2 s | timed out |
| task-075's `full-suites.sh` run | 135.4 s | timed out |
| task-072's niced run, and task-071's re-run of this test alone | under 120 s | passed |

It fails on time, not on an assertion: a run that is right reads red, and approval (kanban-delivery 5) waits on it.

## Evidence

- `.cache/full-suites/2026-10-09/task_task-075-…-857d398-181954.txt` (main checkout, git-ignored): `Error: Test timed
  out in 120000ms` at `test/acceptance/scoring.test.ts:262`.
- task-071's and task-068's Execution notes.

## Suggested handling

Give this test its own limit, with room for the low-priority run (for example 300 s), and say why beside it, as
bug-008 did for the unit tests (`vitest.config.ts`). A test that hangs still fails.

## Resolution

Fixed by [task-075](../task/task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval.md) (merged in `f0a8674
973a75a`), at the approver's choice of 2026-10-09. The test has its
own 300 s limit, with its reason beside it; the other tests of the file keep 120 s, and a hang still fails. Verified
by `scripts/full-suites.sh` on task-075's branch (e4d31b2): green, @F4.8 included, at the lowest priority with 2
workers.
