---
id: task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval
type: task
title: "Kanban delivery version 5: the full suites nightly, gating approval"
status: backlog
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

### kanban-delivery version 5 (dl-016 B)

`.wingfoil/workflows/custom/kanban-delivery.yaml`: `version: 5`, with a header line saying what changed.

- **review phase:**
  - by day, typecheck, lint and the touched tests, run at the lowest priority (`nice -n 19 ionice -c3`, vitest
    `--maxWorkers=2`);
  - the independent review rounds, as in version 3;
  - the full suites are no longer asked for before in-progress → in-review.
- **in-review → approved:** the night's full suites (lint, `npm test` with coverage above 80 %, `test:bin`,
  `test:docker`), green on the task's branch at the commit offered for approval. The run is named in the Review notes
  by its log (`.cache/nightly/<date>/<branch>.txt`) and the commit it ran on.
- **A red night:** the approver rejects (in-review → in-progress, the phase's fallback), and the failure is fixed and
  reviewed again.
- deliver and real-agent-check are unchanged. `release-cycle`'s validation phase is unchanged: it runs the suites once,
  at night or in a pause.

### The nightly script, versioned (dl-016's consequence)

- `scripts/nightly-suites.sh` is today's `~/.local/bin/wfb-nightly-suites`, with three changes:
  - its paths come from the environment, with the current defaults: `WFB_MAIN` (the main checkout), `WFB_OUT`
    (`$WFB_MAIN/.cache/nightly`), and the harness clones;
  - its `npm` is whatever `PATH` gives, so that a test can stub it;
  - it keeps its lock.
- **README:** a "Nightly suites" section with the crontab line, `0 2 * * * <repo>/scripts/nightly-suites.sh`. The
  installed copy becomes a one-line wrapper calling the versioned script, so that a change reaches the next night
  through git.

### Tests

- **Red-first:** `test/unit/scripts/nightly-suites.test.ts` runs the script on a temporary repository with two
  worktrees (`main`, `task/x`) and one other branch (`other`), and a stub `npm` on `PATH` that records its calls and
  exits 0, or 1 for `test` on `task/x`. It checks:
  - one log per main and `task/*` worktree, none for `other`;
  - the four stages in order;
  - `summary.txt` with each branch's exit codes (`TEST 1` for `task/x`);
  - a second run while the lock is held writes "another nightly run is in progress" and runs nothing.
- **Characterization:** `npx wingfoil workflow list` still loads the workflows with kanban-delivery at version 5.

Under version 4, still in force while this task is built, its suites run at night like any task's. The first task
delivered under version 5 is the one after this.

## Execution notes

- `npx wingfoil memory add --type task --title "Kanban delivery version 5: the full suites nightly, gating approval"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval`, `status: draft`. Matches.
