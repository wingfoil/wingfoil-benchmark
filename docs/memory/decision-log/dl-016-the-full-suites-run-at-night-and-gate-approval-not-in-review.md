---
id: dl-016-the-full-suites-run-at-night-and-gate-approval-not-in-review
type: decision-log
title: "The full suites run at night and gate approval, not in-review"
status: pending
---

## Context

The approver, in chat on 2026-10-08: the suites load the machine so much that other projects cannot go on beside
them, and they would be better put off to the night or a break.

What they cost today:

- `npm test` with coverage is about 1 380 tests, with vitest's default workers on 12 cores;
- `test:bin`;
- `test:docker`, about 20 tests that build images and run containers, among them a real OpenSpec build from the
  registry;
- each task runs them at least twice, before its first review and after the fixes. A chain takes 20 to 40 minutes,
  and under load a test times out (task-071's @F4.8, 145 s against 120 s).

kanban-delivery version 4 asks for the suites green **before in-progress → in-review**. Run once a night, they would
hold every task in-progress until the next morning. With the WIP limit of one task in progress, that is about one task
a day.

## Options

- **A. Keep the gate where it is,** and run the suites at night. Light by day, but one task a day.
- **B. Run the full suites at night, and make them the condition of in-review → approved.** By day:
  - typecheck, lint and the touched tests, niced and with 2 workers;
  - the independent review rounds;
  - in-review.

  The approver approves after a night whose run is green on the task's branch. A red night sends the task back to
  in-progress, as a rejection does.
- **C. Throttle only:** the full suites as today, niced and with 2 workers, run by day. Lighter, but the machine is
  still busy for an hour per task.

## Proposal

**B**, as the approver chose in chat on 2026-10-08 ("1+2+3"). This dl records it for the workflow.

Already in place, outside the repository:

- `~/.local/bin/wfb-nightly-suites`, from cron at 02:00, runs lint, `npm test`, `test:bin` and `test:docker` on main
  and on every `task/*` worktree, one at a time, at the lowest CPU and I/O priority;
- its logs and a summary go to `.cache/nightly/<date>/` (git-ignored);
- it holds a lock, so no two runs overlap.

## Consequences

- **kanban-delivery version 5** (a task):
  - the review phase asks for typecheck, lint and the touched tests by day, and the independent review;
  - in-review → approved asks for the night's run, green on the task's branch at the commit offered for approval,
    named in the Review notes;
  - the deliver phase is unchanged.
- **The approver's command** for approval names the night's log.
- **A task offered in the evening** is approved the next morning. Work goes on meanwhile, within the WIP limit, which
  counts in-review apart.
- **The nightly script** lives outside the repository. If the approver wants it versioned (in `scripts/`, with its
  crontab line in the README), that is the same task's.
