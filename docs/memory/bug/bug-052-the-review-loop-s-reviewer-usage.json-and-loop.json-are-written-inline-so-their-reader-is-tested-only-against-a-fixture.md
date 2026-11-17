---
id: bug-052-the-review-loop-s-reviewer-usage.json-and-loop.json-are-written-inline-so-their-reader-is-tested-only-against-a-fixture
type: bug
title: "The review loop's reviewer-usage.json and loop.json are written inline, so their reader is tested only against a fixture"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.4","results","review-loop"]
---

## Context

Raised as a nit by task-153's independent review (2026-11-17). The approver chose on 2026-11-17 to file it for v0.4.
[bug-051](bug-051-the-results-reader-refuses-a-fixer-round-s-usage-because-the-runner-records-its-interventions-as-a-list.md)
was a drift between the review loop's writer and reader: the runner wrote a fixer round's interventions as a list,
the reader required a number, and the reader's tests used a fixture that agreed with the reader. Task-153 fixed it
for `fixer-usage.json`. The runner and the tests now share one writer, `fixerUsageRecord`. The loop's other two
records are still exposed to the same drift.

## Expected

Every record of the review loop that `readLoop` (`src/results/review.ts`) reads is built by a function the runner
uses and the tests call too. A change to the writer's shape then fails a reader test, as task-153 arranged for
`fixer-usage.json`.

## Actual

- `review/loop.json` is built inline in `writeLoop` (`src/runner/review-loop.ts`).
- `review/<n>/reviewer-usage.json` is built inline in `reviewRound` (the same file).
- `test/support/loop-records.ts` writes both records again by hand for the reader's tests.

Today the three agree. Task-153's review compared every field with the stored dry runs 208–215 and found no mismatch.
But renaming a field in the runner (for example `cost_bound_eur`) would leave the fixture and the reader agreeing with
each other while every real record stopped reading. The failures would be bug-051's: the figures script stops, an
estimate skips the dry run, and the aggregate fails.

## Fix (proposed, for the approver's choice)

A v0.4 task, with no spending:

- Extract the two builders as exported functions, as `fixerUsageRecord` was: one for the loop's record from its pins,
  summary and rounds, and one for a reviewer round's usage, its bound and its rate-limit waits.
- `writeLoop` and `reviewRound` call them.
- `test/support/loop-records.ts` writes its records through them, or at least one reader test per record does.
- A unit test per record writes it with the runner's builder and reads it back with `readLoop`.

Stored records stay as they are.
