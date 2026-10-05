---
id: task-058-a-fixed-state-and-a-fixes-link-for-bugs
type: task
title: "A fixed state and a fixes link for bugs"
status: backlog
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-NFR-02]
---

## Context

Fixes [bug-005](../bug/bug-005-a-bug-cannot-name-the-task-that-fixes-it-and-never-closes.md), planned in W12 at
[rel-v0-2](../release/rel-v0-2.md)'s triage. Ten bugs fixed in v0.1 still read `approved`, because the bug type has no state after `approved` and
no field naming its fix.

**Scope:**

- `.wingfoil/memory.yaml`: the bug type gains a `fixed` state after `approved`, and an optional `fixes` field on the
  task type (a task names the bugs it fixes) or a `fixed_by` field on the bug, as the design chooses with WingFoil's
  v0.2 schema;
- the ten fixed bugs (bug-001 to 004, 006 to 011) move to `fixed` through WingFoil's verb, each naming its task.

A WingFoil configuration change: through this task, with the approver's gate for each transition the bug type's new
state requires.

**No real agent, no spending.** **Done** means: `npx wingfoil memory search --type bug --status approved` lists only
bugs that are not fixed.

## Acceptance criteria

- The bug type's state machine includes `fixed`; each fixed bug reaches it with its task named. **Characterization**
  by command (`memory history`).

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "A fixed state and a fixes link for bugs"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-058-a-fixed-state-and-a-fixes-link-for-bugs`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-02] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").
