---
id: task-170-sync-the-wingfoil-feedback-inbox-after-the-approver-files-f-040-to-f-047
type: task
title: "Sync the WingFoil feedback inbox after the approver files F-040 to F-047"
status: draft
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["wingfoil","feedback","v0.4"]
---

## Context

[rel-v0-3](../release/rel-v0-3.md)'s decision on the inbox (2026-11-22): the approver files F-040 to F-047 and the open
notes in WingFoil with the findings (dl-009), and the inbox is synced afterwards (dl-163's process). Last in W20; it
waits for the approver's filing, and may move earlier if that is done sooner.

**Done** means: every note's status in `docs/wingfoil-feedback/` matches WingFoil's answer, and the ledger says so.

## Acceptance criteria

1. `scripts/wingfoil-sync.mjs` run against WingFoil's latest release; its output quoted.
2. Each filed note gets its WingFoil reference and status; resolved notes are moved as the inbox's README says;
   `needs-info` notes answered or kept with the question.
3. The ledger updated; `memory amend`/`park` filed as the next free note (triage row 9) if not yet there.
4. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
