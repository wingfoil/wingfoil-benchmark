---
id: bug-005-a-bug-cannot-name-the-task-that-fixes-it-and-never-closes
type: bug
title: "A bug cannot name the task that fixes it, and never closes"
status: approved
---

## Context

Two gaps in this repository's Memory configuration (`.wingfoil/memory.yaml` and the templates), which
together make a fixed bug indistinguishable from an open one.

1. **Nothing links a bug and the task that fixes it.** A task's frontmatter has `features`,
   `acceptance` and `requirements`, and nothing that names a bug; a bug's has only `id`, `type`,
   `title` and `status`. The link exists only as prose — "Fixes [bug-001](…)" in task-008's Context,
   the same in task-009, a *Resolution* section in bug-004 — which no search, check or viewer reads.
2. **A bug's life cycle ends at `approved`.** `bug` uses the default machine, `draft → pending →
   approved`. `approved` means "accepted as a defect", and there is no state after it, so a bug whose
   fix is merged stays exactly where a bug nobody has started stays.

## Impact

At 2026-09-24, with W2 closed, the four bugs read as four unassigned open defects to anyone looking at
their state:

| Bug | State | Fixed by | Task state |
|---|---|---|---|
| bug-001 | approved | task-008 (prose) | done |
| bug-002 | approved | task-009 (prose) | backlog |
| bug-003 | pending | task-010 (prose) | draft |
| bug-004 | approved | task-007 (prose, and a Resolution section) | done |

The approver asked why none was assigned to a task. Three were; the configuration had no way to say
so. The same gap defeats a release's triage (release-cycle: "triage open bugs and decision-logs"):
"open" cannot be computed from a state that does not change when the fix lands, so triage has to read
every bug's prose and every task's Context to know what is still open.

## Expected

- A task declares the bugs it fixes in its frontmatter, and a bug can be found from its task and the
  task from its bug.
- A bug has a terminal state reached when its fix is delivered, distinct from `approved`.
- The traceability test (or an equivalent check) holds the two together: a task that declares a bug
  names one that exists; a bug in the terminal state has a `done` task that declares it.

## Scope of the fix, to be decided at release v0.2 planning

Filed now, fixed later: **this element is input to the triage of release v0.2's planning**, not work
for v0.1, whose remaining waves do not depend on it. Candidate shape, for the approver to decide:

- a `fixes: []` list in the task template and schema, optional (most tasks fix nothing);
- a `states:` block for `bug`, e.g. `draft → pending → approved → fixed`, the last edge a plain
  `submit` taken in kanban-delivery's deliver phase when the fixing task reaches `done` — the same
  pattern as `approved → done` for tasks;
- the existing four bugs migrated by hand in the same task, with the transition recorded, so the
  history is not rewritten.

To decide with it: whether a bug can be closed without a task (a duplicate, a "works as designed"),
which is `deprecated` today, and whether WingFoil itself should offer the link rather than each
project inventing a field — a question for the WingFoil usage notes, not for this repository.

## Notes

Per this project's rule, a correction to `.wingfoil/` goes through a bug and a task and never straight
to main: this is the bug; the task is for v0.2's planning to open.
