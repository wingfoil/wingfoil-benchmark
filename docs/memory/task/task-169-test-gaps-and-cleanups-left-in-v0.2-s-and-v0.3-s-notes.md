---
id: task-169-test-gaps-and-cleanups-left-in-v0.2-s-and-v0.3-s-notes
type: task
title: "Test gaps and cleanups left in v0.2's and v0.3's notes"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["tests","cleanup","v0.4"]
---

## Context

[plan-006](../../plans/plan-006-release-v0.4.md), triage row 9, and [rel-v0-3](../release/rel-v0-3.md)'s Retrospective ("What to change" 8): about
fourteen follow-ups were left in task notes, and plan-005's test-gap and cleanup tasks were never filed. The ones
that belong elsewhere are placed by the triage (classifier v2's gaps and the `ambiguous` hook answer with W25; the
Resource's size under Codex dropped as a stated limit; `memory amend`/`park` as a feedback note).

**Done** means: every follow-up of the list below is fixed, or closed with its reason in this task's notes.

## Acceptance criteria

1. The list: the follow-ups left in v0.3's task notes, collected by script (its command quoted) and checked by
   hand, each with its source task.
2. `.prettierignore`'s `results/` (no leading slash) hides `src/results/` from Prettier: anchored, and the files it
   hid formatted.
3. The review loop's hold-out branch (task-150): a test for the case REQ-RES-02 excludes.
4. `docs/evaluate.md` after publication (task-155): its figures checked against the published v0.3 site.
5. Each other item fixed with a test (red first for behaviour) or closed with its reason.
6. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
