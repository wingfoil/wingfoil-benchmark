---
id: task-164-fix-bug-052-the-review-loop-s-usage.json-and-loop.json-written-by-a-tested-writer
type: task
title: "Fix bug-052: the review loop's usage.json and loop.json written by a tested writer"
status: in-progress
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-RUN-21]
fixes: [bug-052-the-review-loop-s-reviewer-usage.json-and-loop.json-are-written-inline-so-their-reader-is-tested-only-against-a-fixture]
tags: ["bug","review-loop","v0.4"]
---

## Context

[bug-052](../bug/bug-052-the-review-loop-s-reviewer-usage.json-and-loop.json-are-written-inline-so-their-reader-is-tested-only-against-a-fixture.md): the review loop's reviewer `usage.json` and `loop.json` are written inline,
so their reader is tested only against a fixture. Placed in W20 by the approver's decision of 2026-11-22 ([rel-v0-3](../release/rel-v0-3.md)).

**Done** means: one writer produces both files, and the reader's tests read what that writer writes.

## Acceptance criteria

1. Red first: a test round-trips a loop through the writer and the reader, and fails today because no writer
   module exists.
2. The inline writes are replaced by that writer; the files' format is unchanged (characterization against a recorded
   v0.3 loop).
3. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

One module, `src/runner/review-records.ts`, builds the loop's three records: `loopRecord` (`review/loop.json`),
`reviewerUsageRecord` (`review/<n>/reviewer-usage.json`) and `fixerUsageRecord` (moved from `review-loop.ts`, as
task-153 made it). `writeLoop` and `reviewRound` call them; `test/support/loop-records.ts` writes `loop.json` and
`reviewer-usage.json` through them too. `test/unit/runner/review-records.test.ts` round-trips the records through
`readLoop` and compares the writer's output with the stored dry runs 261 (`loop.json`) and 251 (`reviewer-usage.json`).

## Execution notes

- Red first was not shown as a failing run: the writer module and its tests were written in one pass, so the test
  never ran against a tree without the module. The tests pass now; the round trip is the evidence.
- `scripts/pre-review.sh main` needs an approval a headless run cannot get; `npm run format`, `typecheck` and `lint`
  were run instead, and pass. The review (dl-020) and the approver's go for the full suites remain.
- Full suite (`nice -n 19 npm test -- --maxWorkers=2`): 2574 passed, 1 failed:
  `test/unit/docs/required-lists.test.ts > gives every task past draft at least one requirement`. It reads the
  worktree's docs, which this task did not touch; not investigated further.
- Review (dl-020) follow-up, commit cfa76cc6: `findingsRecord` joins the writer (the class "a record `readLoop` reads,
  written inline" is now closed for `loop.json`, `findings.json`, `reviewer-usage.json` and `fixer-usage.json`);
  `reviewRound` and `test/support/loop-records.ts` call it, with a round trip in `review-records.test.ts`. The
  reviewer-usage characterization builds a typed `SessionUsage` with dry run 251's figures and compares bytes with the
  stored file. The round trip checks `reviewers[0]` (cost_eur 0.3, bounded). `loopRecord` takes `LoopPins` and a
  `Pick` of the summary, so the `as ReviewLoop` and `as LoopOutcome` casts are gone. Targeted tests (review-records,
  results/review, review-loop), typecheck, lint and prettier pass. `required-lists` fails on the branch's stale
  task-179 docs, outside this change. `scripts/pre-review.sh main` is still not run (it needs an approval a headless
  run cannot get).
