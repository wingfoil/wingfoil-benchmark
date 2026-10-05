---
id: task-058-a-fixed-state-and-a-fixes-link-for-bugs
type: task
title: "A fixed state and a fixes link for bugs"
status: in-progress
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

bug-005 was accepted as a defect in v0.1 (`2684d41`) and its fix planned in W12 at rel-v0-2's triage; this task was
accepted into the backlog in chat on 2026-10-05 (`602e39a`). bug-005's "Scope of the fix" is the candidate shape
followed here, with one addition (the bug's own `fixed_by`, below).

### What WingFoil at the pin can express

From `node_modules/wingfoil/dist/memory/schema.d.ts` and `memory.yaml`'s header: a type may declare its own
`states: { sequence, gates, waiting }`; `submit` walks `sequence`; a state listed in `gates` needs `approve`;
`deprecated` is implicit from any state. Front matter beyond `required` is kept as written and not validated. WingFoil
has no typed link between elements (usage note N29); `memory search` filters by `--type`, `--status` and `--tag`,
and its positional query is a full-text match.

### The bug machine

`bug` gets its own `states:`: `sequence: [draft, pending, approved, fixed]`, `gates: { pending: { reject: draft } }`
— the default machine with `fixed` appended. `approved → fixed` is a plain `submit`, as `approved → done` is for
tasks: the approver's gate on the fix is the fixing task's `in-review → approved`, so a second gate on the bug would
repeat it. A bug closed without a fix (a duplicate, "works as designed") keeps `deprecated`.

### The link, in both directions

- **`fixes: []` on the task** (template, optional, not `required`): the bugs a task fixes, by full id, declared when
  the task is planned. It is the link a reader of a task, and the check below, start from.
- **`fixed_by: <task id>` on the bug**, written by hand in the content commit that precedes the bug's
  `approved → fixed` submit, with the subject `docs(bug): <bug> fixed by <task>`. It puts the task's name in the
  bug's own front matter and in its `memory history`, which the acceptance criterion reads: a status-only submit
  names nothing. The bug template gains it as a comment-documented optional field.

Two fields that say one thing could drift, so a test holds them together.

### The check (red-first)

`test/support/traceability.ts` gains `bugLinkProblems(taskDir, bugDir): string[]`, and
`test/acceptance/traceability.test.ts` a test that it returns `[]` on the repository. It reports:

1. a task's `fixes` entry that names no existing bug;
2. a bug's `fixed_by` that names no existing task, or a task whose `fixes` does not list the bug;
3. a bug in `fixed` without `fixed_by`, or whose `fixed_by` task is not `done`;
4. a `done` task's `fixes` entry whose bug is neither `fixed` nor `deprecated`.

Unit tests on temporary directories cover each rule, red first; then the repository test, which is red until the
migration below is done.

### Migration (the ten bugs)

| Bug | Fixed by (done) |
|---|---|
| bug-001 | task-008 |
| bug-002 | task-009 |
| bug-003 | task-010 |
| bug-004 | task-007 |
| bug-006 | task-019 |
| bug-007 | task-027 |
| bug-008 | task-048 |
| bug-009 | task-050 |
| bug-010 | task-051 |
| bug-011 | task-053 |

Each from its bug's Resolution section, every task `done`. For each: the task's `fixes` and the bug's `fixed_by`
committed by hand (one commit per pair), then `npx wingfoil memory submit <bug>` (`approved → fixed`), on this
branch. task-058 itself declares `fixes: [bug-005-…]`; bug-005 moves to `fixed` in this task's deliver phase, after
`approved → done`, on main. bug-012 to 015 stay `approved`: their tasks (task-060, task-061 and W13/W14's) declare
`fixes` in their own design phase.

### `kanban-delivery` (version 4)

The `deliver` phase adds: after `approved → done`, each bug in the task's `fixes` gets `fixed_by` by hand and then
`approved → fixed` by `submit`. The `design` phase adds: a task that fixes bugs declares them in `fixes`.

### Done

`npx wingfoil memory search --type bug --status approved` lists bug-005 (until deliver) and bug-012 to 015 only;
`--status fixed` lists the ten; `memory history` of each shows the `fixed by` commit and the `approved → fixed` submit.

### Commits

The `.wingfoil/` change (`memory.yaml`, the two templates, `kanban-delivery` 4) is one `chore(wingfoil)` commit with
`Approver:`/`Reason:` trailers from task-058's backlog approval, which accepted this scope.

## Execution notes

- `npx wingfoil memory add --type task --title "A fixed state and a fixes link for bugs"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-058-a-fixed-state-and-a-fixes-link-for-bugs`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-02] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").
