---
id: task-165-fix-bug-055-a-reviewer-s-findings-after-unfenced-prose-reach-the-fixer
type: task
title: "Fix bug-055: a reviewer's findings after unfenced prose reach the fixer"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-RUN-21]
fixes: [bug-055-a-reviewer-s-findings-after-prose-unfenced-end-the-review-loop-as-failed-and-its-should-fix-never-reaches-a-fixer]
tags: ["bug","review-loop","v0.4"]
---

## Context

[bug-055](../bug/bug-055-a-reviewer-s-findings-after-prose-unfenced-end-the-review-loop-as-failed-and-its-should-fix-never-reaches-a-fixer.md): when a reviewer writes prose before its findings without a fence, the review
loop ends as failed and its should-fix findings never reach a fixer. Placed in W20 by the approver's decision of
2026-11-22 ([rel-v0-3](../release/rel-v0-3.md)).

**Done** means: the loop finds the findings whatever prose comes before them, and fails only when there are none.

## Acceptance criteria

1. Red first: a reviewer answer with prose then unfenced findings is parsed into its findings; today it fails.
2. Characterization: fenced findings, no findings, and malformed findings keep today's outcome.
3. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
