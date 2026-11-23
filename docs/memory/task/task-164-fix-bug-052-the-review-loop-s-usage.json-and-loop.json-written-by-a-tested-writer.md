---
id: task-164-fix-bug-052-the-review-loop-s-usage.json-and-loop.json-written-by-a-tested-writer
type: task
title: "Fix bug-052: the review loop's usage.json and loop.json written by a tested writer"
status: backlog
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

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
