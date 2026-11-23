---
id: task-163-fix-bug-053-pre-review.sh-runs-prettier-in-batches-and-selects-every-test-that-imports-a-changed-file
type: task
title: "Fix bug-053: pre-review.sh runs Prettier in batches and selects every test that imports a changed file"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
fixes: [bug-053-scripts-pre-review.sh-stops-at-prettier-with-no-message-when-a-branch-changes-more-files-than-one-npx-argument-can-hold]
tags: ["bug","tooling","review","v0.4"]
---

## Context

[bug-053](../bug/bug-053-scripts-pre-review.sh-stops-at-prettier-with-no-message-when-a-branch-changes-more-files-than-one-npx-argument-can-hold.md), and [rel-v0-3](../release/rel-v0-3.md)'s Retrospective ("What to change" 3; the approver's
decision of 2026-11-22): `scripts/pre-review.sh` stops at Prettier with no message when a branch changes more files
than one `npx` argument list can hold, and its targeted tests miss tests that import a changed file, so the full
suites went red after a green pre-review in six v0.3 tasks. Third in W20's order, since every later review runs it.

**Done** means: the script never stops silently, and its selection covers every test that imports a changed file.

## Acceptance criteria

1. Red first: a branch fixture with more changed files than one argument list holds makes the script fail
   today with no message; after the fix Prettier runs in batches and every file is checked.
2. Red first: a changed module imported only indirectly by a test (through another module) selects that test.
3. Any stage that fails prints its name and exits non-zero; no stage is skipped without a line saying so.
4. The script's usage in the `kanban-delivery` workflow and in `CONTRIBUTING` (or wherever it is documented) matches.
5. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
