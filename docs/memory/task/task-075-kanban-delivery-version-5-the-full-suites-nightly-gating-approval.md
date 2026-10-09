---
id: task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval
type: task
title: "Kanban delivery version 5: the full suites nightly, gating approval"
status: in-progress
release: v0.2
wave: W13
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
fixes:
  - bug-018-a-directive-check-acceptance-test-times-out-under-the-low-priority-full-suites
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
  `.cache/full-suites/` (the Design: on demand, not nightly). **Red-first**, as a shell test with a stubbed `npm`.

## Design

### kanban-delivery version 5 (dl-016 B)

`.wingfoil/workflows/custom/kanban-delivery.yaml`: `version: 5`, with a header line saying what changed.

- **review phase:**
  - by day, typecheck, lint and the touched tests, run at the lowest priority (`nice -n 19 ionice -c3`, vitest
    `--maxWorkers=2`);
  - the independent review rounds, as in version 3;
  - the full suites are no longer asked for before in-progress → in-review.
- **in-review → approved:** the full suites, run on demand, (lint, `npm test` with coverage above 80 %, `test:bin`,
  `test:docker`), green on the task's branch at the commit offered for approval. The run is named in the Review notes
  by its log (`.cache/full-suites/<date>/<branch>.txt`) and the commit it ran on.
- **A red run:** the approver rejects (in-review → in-progress, the phase's fallback), and the failure is fixed and
  reviewed again.
- deliver and real-agent-check are unchanged. `release-cycle`'s validation phase is unchanged: it runs the suites once,
  in a pause, on demand.

### When the full suites run: on demand, not at night (the approver, 2026-10-09)

dl-016's 02:00 cron never fired, because the PC is suspended at night (00:33–06:23 on 2026-10-09). The approver then
chose **on demand**: the agent runs the full suites, niced, when the approver says they are on a break, or asks for
them. They chose this over a timer that wakes the PC from suspend, and the cron entry was removed. Gating approval on
the full suites (dl-016 B) stands; only when they run changed.

### The script, versioned

- `scripts/full-suites.sh` runs the full suites on main and on every `task/*` worktree (or on the branches named as
  arguments), one at a time.
  - Every command is niced (`nice -n 19 ionice -c3`), and vitest has 2 workers.
  - Each log is `.cache/full-suites/<date>/<branch>-<commit>-<hhmmss>.txt`, never overwritten; `summary.txt` gets a
    line per branch: its commit, `DIRTY`, `CHANGED`, the five stages' codes (lint, test, build, bin, docker) and
    the log's name.
  - It holds a lock.
  - Paths come from the environment (`WFB_MAIN`, `WFB_OUT`, the harness clones), so that a test can point it at a
    temporary repository.
- The README gains a "Full suites" section: how and when to run the script, and that it is never left to a cron on a
  machine that sleeps.
- `~/.local/bin/wfb-nightly-suites` (installed on 2026-10-08) is removed once the versioned script lands.

### Tests

- **Red-first:** `test/unit/scripts/full-suites.test.ts` runs the script on a temporary repository with two
  worktrees (`main`, `task/x`) and one other branch (`other`), and a stub `npm` on `PATH` that records its calls and
  exits 0, or 1 for `test` on `task/x`. It checks:
  - one log per main and `task/*` worktree, none for `other`, or only the branches named as arguments;
  - the five stages in order;
  - the `DIRTY` mark, and the `NOT FOUND` and `SKIPPED` lines;
  - `summary.txt` with each branch's exit codes (`TEST 1` for `task/x`);
  - a second run while the lock is held writes "another full-suites run is in progress" and runs nothing.
- **Characterization:** `npx wingfoil workflow list` still loads the workflows with kanban-delivery at version 5.

Under version 4, still in force while this task is built, its suites run at night like any task's. The first task
delivered under version 5 is the one after this.

## Execution notes

- `npx wingfoil memory add --type task --title "Kanban delivery version 5: the full suites nightly, gating approval"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-075-kanban-delivery-version-5-the-full-suites-nightly-gating-approval`, `status: draft`. Matches.
- `npx wingfoil memory submit task-075-…` (backlog → in-progress) on 2026-10-09, after task-072 went to in-review (the
  WIP limit). Declared: moves the task to its next state and commits it. Observed: `status: in-progress`. Matches.
- **The approver's choice of 2026-10-09:** the 02:00 cron never fired, because the PC slept from 00:33 to 06:23. The
  approver chose on-demand full suites over a timer that wakes the PC, and the crontab line was removed. The Design
  says so; the Context's "nightly" stands only in the title.
- Build:
  - **Red first:** `test/unit/scripts/full-suites.test.ts`, three tests on a temporary repository with worktrees
    `main`, `task/x` and `other`, and a stub `npm` on `PATH`. They check:
    - the four stages in order on main and `task/x`, and nothing on `other`;
    - the summary's exit codes;
    - only the branches named as arguments;
    - nothing while the lock is held.
  - **Then the code:**
    - `scripts/full-suites.sh` (paths from `WFB_MAIN`/`WFB_OUT`, `nice`/`ionice`, 2 workers, a lock);
    - `kanban-delivery.yaml` version 5: the review phase's day checks; the full suites' green log, named in the
      Review notes, as the condition of approval; a red log sending the task back;
    - the README's "Full suites" section.
  - **Characterization:** `npx wingfoil workflow list` loads the workflows with kanban-delivery at version 5.
  - At delivery, `~/.local/bin/wfb-nightly-suites` (installed on 2026-10-08) is removed, since the versioned script
    replaces it.
- Review round 1 fixes:
  1. **(should-fix) The commit and the log.**
     - The summary names the commit the run started on, captured once, and marks `DIRTY` a worktree with
       uncommitted changes.
     - Each log is named `<branch>-<commit>-<hhmmss>.txt`, never overwritten.
     - The workflow asks for a clean worktree at the commit offered for approval.
  2. **(nits)**
     - A worktree it cannot enter, and a branch name that matches none, leave a summary line.
     - The summary lines also go to stdout.
     - The suite commands get no stdin and no lock descriptor.
     - Worktree paths with spaces are read whole.
     - `BUILD` has its own code.
     - Relative `WFB_MAIN`/`WFB_OUT` are made absolute, and a run outside a repository says so.
     - The README says what the priority covers (not dockerd's containers), and that a docker test skips itself
       without its clone.
     - The workflow says who runs the suites and when, and that the approval command names the log.
     - The Design's Tests bullets match the code (completed in round 2).
  3. **Left:** plan-004's mentions of kanban-delivery version 3 (an approved plan, not edited); no suites on main
     after a merge (dl-016: deliver unchanged).
- Review round 2 nits fixed: the Design's script and test text; the README names the build; the test title; a test
  for `SKIPPED`; `CHANGED` when the worktree's commit or files change during the run; the codes read only from the
  script's own `<STAGE> <n>` lines. Left: a `git` failure in a worktree reads as clean (it would also fail the
  suites, which run `git`).


## Review notes

Independent read-only agents reviewed `git diff main...HEAD` against the Design (with the approver's on-demand choice
of 2026-10-09) and dl-016 B. No suite ran during the reviews; the reviewers read, typechecked and ran `bash -n`.

- **Round 1** (7ef4933): no blocker.
  - **Should-fix:**
    1. the summary's commit could differ from the code tested, with nothing flagging uncommitted changes;
    2. a same-day rerun overwrote the log an approval names.
  - **Nits:** silent skips, stdin, paths with spaces, the build's code, the lock inherited by children, relative
    paths, the README's priority and skip wording, the workflow's who/when, and the stale Design text.
  - All fixed in 351a973, except plan-004's mention of version 3 (an approved plan) and the absence of suites on main
    after a merge (dl-016: deliver unchanged).
- **Round 2** (351a973): every fix verified on bash 5.2.21. **Clean.** Its nits were fixed in the next commit:
  - the Design text, the README's build, the test title;
  - a SKIPPED test;
  - `CHANGED` for a worktree that moves during the run;
  - codes read only from the script's lines.

  One nit was left: a `git` failure in a worktree reads as clean.
- **Suites:** to be run on demand (kanban-delivery version 4 still governs this task). Its first real use is
  `scripts/full-suites.sh task/task-075-…` itself.
- **Suites, first run** (`scripts/full-suites.sh` on 857d398, 2026-10-09, the approver's go), 23 minutes:
  - `LINT 0 TEST 1 BUILD 0 BIN 0 DOCKER 0`, with `npm test` 1387 of 1388;
  - the one failure was `@F4.8 Directive violations are counted per rule and per step`, timed out at 135 s against
    its 120 s limit. It was the third such timeout in a full run.
  - The approver chose to fix it here: bug-018 (pending), declared in `fixes`. The test now has its own 300 s limit,
    with its reason beside it. No red test was possible: the defect is a limit, and the evidence is the runs.
- **Round 3** (9876a18, the bug-018 fix): the limit applies to the right test and overrides the describe's, and
  nothing else changed.
  - **Should-fix:** the branch lacked bug-018, which is on main, so the traceability test would fail. It was already
    fixed by merging main into the branch (973a75a), and the traceability test is green there.
  - **Nit:** the comment overstated the range (121 s was an unniced run under load). Reworded.
  - **Process note:** bug-018 must be approved before this task's deliver phase can move it to `fixed`.

