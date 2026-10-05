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
fixes: [bug-005-a-bug-cannot-name-the-task-that-fixes-it-and-never-closes]
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
4. a `done` task's `fixes` entry whose bug is neither `fixed` nor `deprecated`;
5. a `fixes` that is not a list, an element without an id, two elements with one id (each would otherwise hide a
   link from rules 1–4).

Unit tests on temporary directories cover each rule, red first. The repository test is green before the migration
(no element carries a link yet), red as soon as a done task declares a bug still `approved`, and green again once
that bug is `fixed`: the migration's first pair shows it.

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

The `deliver` phase adds: after `approved → done`, each bug in the task's `fixes` gets `fixed_by` and a Resolution
section naming the task by hand, and then `approved → fixed` by `submit`. Between the task's `done` and its bugs'
`fixed`, the repository test is red by design (rule 4); the reverse order would break rule 3. The deliver text says
so, so that a red run at that commit is not read as a regression. The `design` phase adds: a task that fixes bugs declares them in `fixes`.

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

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-058-…` → `f7ab092`, in the linked worktree `WingFoil2-Benchmark-task-058` with its
  own `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one
  file, diff limited to `status`. Matches.
- The new machine, probed first in a throwaway clone of the branch (`scratchpad`, deleted after):
  - `memory add --type bug --title "Probe"`: the template's `# fixed_by: …` comment line is copied verbatim into the
    new bug's front matter. Declared: the scaffold is copied verbatim. Matches.
  - `memory submit` on an `approved` bug: `approved → fixed`, one commit `wf(bug): submit <id>`. Declared
    (`memory.yaml`'s header): `submit` walks `sequence`, and `approved` is not a gate. Matches.
  - A second `submit` on the `fixed` bug: refused, exit 1, `illegal transition fixed -> pending for type 'bug'`.
    Refusing is right; the message names `pending`, the sequence's first gate, not a successor (usage note N49,
    reproduced).
- `npx wingfoil memory submit <bug>` ×10 on this branch, each after its link commit:

  | Bug | Task | Link commit | Submit | Transition |
  |---|---|---|---|---|
  | bug-001 | task-008 | `5490700` | `b3d50c1` | approved → fixed |
  | bug-002 | task-009 | `bc66560` | `fa714c3` | approved → fixed |
  | bug-003 | task-010 | `b5d3b92` | `d4fa301` | approved → fixed |
  | bug-004 | task-007 | `f6f6a90` | `191cd8b` | approved → fixed |
  | bug-006 | task-019 | `87622a3` | `001f023` | approved → fixed |
  | bug-007 | task-027 | `e9bcad8` | `1b80925` | approved → fixed |
  | bug-008 | task-048 | `0f0042e` | `c5a7af0` | approved → fixed |
  | bug-009 | task-050 | `a2258c2` | `e595755` | approved → fixed |
  | bug-010 | task-051 | `3c16529` | `6285e0f` | approved → fixed |
  | bug-011 | task-053 | `3622cfa` | `5a990e4` | approved → fixed |

  Declared: one commit each, `status` only. Observed: exit 0 each, one file and one line changed each (the
  `fixed_by` line written just before is kept). Matches.
- `npx wingfoil memory search --type bug --status approved` after the migration: bug-005, bug-012, bug-013, bug-014,
  bug-015. `--status fixed`: the ten above. Declared: filter by type and status. Matches; this is the task's "Done"
  except bug-005, which moves in the deliver phase.
- `npx wingfoil memory history bug-004-…`: its last entries are `f6f6a90` "docs(bug): bug-004 fixed by task-007"
  (operation `null`, a content commit) and `191cd8b` `submit`, `approved → fixed`. The acceptance criterion's "with
  its task named" is read there. Declared: one entry per commit touching the file. Matches (stderr still carries
  N7's `fatal: path … exists on disk, but not in 'd5a31a4…'`).
- `npx wingfoil workflow list` after `kanban-delivery` 4: exit 0, no warning.

### Build

1. `f3d1ef9` `test(traceability)`: `bugLinkProblems` in `test/support/traceability.ts`, seven unit tests on temporary
   directories and the repository test, written first and red (`bugLinkProblems is not a function`), then green.
2. `6664cb6` `chore(wingfoil)` (trailers from task-058's backlog approval): the bug machine, the templates' `fixes` and
   `fixed_by`, `kanban-delivery` 4.
3. The repository test red on purpose: with `fixes` added to task-008 alone, it reported "task-008-… is done but
   bug-001-… is approved, not fixed"; green after bug-001's link commit and submit.
4. The ten pairs above, then task-058's own `fixes: [bug-005-…]`.
5. `npm test`: 77 files, 1233/1233 (eight new), coverage 98.04 % statements, 90.93 % branches (the check lives in
   `test/support`, outside coverage's `src/`); `npm run lint` clean. `test:bin`/`test:docker` not run: no CLI,
   runner, image or scoring change.

### Review

- **Round 1** (independent read-only Explore subagent, on `e6ded8c`): nothing blocking. It verified the ten
  bug → task pairs against each bug's Resolution, every hash of the notes, the searches, `memory history`, the
  trailers, lint and the traceability tests, and found the Design's two fields justified (the acceptance criterion
  reads the bug's history; bug-005 asks for both directions). Findings and outcomes:
  1. should-fix — a scalar `fixes: bug-1-a` was iterated per character, with junk messages, and `includes` became a
     substring match. **Fixed** red-first: `fixesOf` reads only a list, and a non-list is reported ("has a fixes that
     is not a list"); a unit test.
  2. nit — a duplicate id overwrote the first element, and an element without an id was skipped, both silently.
     **Fixed** red-first: both are reported ("repeats the id", "has no id"); a unit test.
  3. nit — the deliver text said nothing of the bug's Resolution section, which bug-005 lacks. **Fixed:** the deliver
     text and the Design ask for it in the `fixed by` commit.
  4. nit — main is red between the task's `done` and its bugs' `fixed`. **Fixed:** said in the deliver text and the
     Design, as by design (the reverse order breaks rule 3).
  Not verified by the reviewer: the full-suite count, and the red step of `f3d1ef9` (test and code in one commit).
  This round's two new tests were run red before the code (2 failed, 19 passed), then green (21/21).
