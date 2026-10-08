---
id: task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval
type: task
title: "Kanban delivery version 5: the full suites nightly, gating approval"
status: pending
release: v0.2
wave: W13
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

Applies [dl-016](../decision-log/dl-016-the-full-suites-run-at-night-and-gate-approval-not-in-review.md), approved by
the approver on 2026-10-08 (option B). The suites loaded the machine so much that other work could not go on beside
them.

**Scope:**

- **`.wingfoil/workflows/custom/kanban-delivery.yaml` version 5:**
  - the review phase asks, by day, for typecheck, lint and the touched tests (niced, 2 workers), and for the
    independent review rounds;
  - in-review → approved asks for the night's full suites green on the task's branch, at the commit offered for
    approval, named in the Review notes;
  - a red night sends the task back to in-progress (the review phase's fallback).
- **The nightly script versioned** as `scripts/nightly-suites.sh`, with its crontab line in the README. Today it lives
  only in `~/.local/bin/wfb-nightly-suites`. The installed copy then calls or matches the versioned one.
- `release-cycle`'s validation phase is unchanged: it runs the suites once, at night or in a pause.

**No real agent, no spending.** **Done** means: kanban-delivery 5 is in force and committed, the script is versioned,
and the next task is delivered under it.

## Acceptance criteria

- The workflow file's version 5 says what each gate asks for. **Characterization** (the workflow's existing YAML test,
  if any, extended).
- The versioned script runs on main and on `task/*` worktrees, one at a time, holding a lock, logging under
  `.cache/nightly/`. **Red-first**, as a shell test with a stubbed `npm`.

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Kanban delivery version 5: the full suites nightly, gating approval"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval`, `status: draft`. Matches.
