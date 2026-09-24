---
id: task-008-phase-includes-in-the-workflow-configuration
type: task
title: "Phase includes in the workflow configuration"
status: in-progress
release: v0.1
wave: W2
features: []
acceptance: []
requirements: [REQ-ARC-05]
---

## Context

Fixes [bug-001](../bug/bug-001-phase-include-names-a-file-path-instead-of-the-workflow.md): all five
phase `include`s of this repository name a file path where `spec-003` wants the workflow's name, so
no sub-workflow is included by any phase and the composed life cycle does not exist.

This is a configuration task, not a delivery task: it delivers no feature and implements no scenario,
so `features` and `acceptance` are empty, as in
[task-004](task-004-waiting-for-input-and-credentials-spike.md).

**On `requirements`:** no requirement covers the workflow configuration. The specification describes
the benchmark as a product (formats, runner, scoring, architecture), not the process configuration
the project runs itself on. `REQ-ARC-05` is the nearest — it is the one requirement that speaks about
this repository's own `.wingfoil/` having to describe the project truthfully — and it is cited in
that spirit, not because it mentions workflows. The field is required, so it cannot be left empty
(`submit` reads an empty list as a missing field). Worth raising at triage: either a requirement for
the project's own process configuration, or `requirements` not being required for a configuration
task.

## Design

Three changes, each its own commit, in this order.

1. **The five includes.** Replace the path with the value of the target's `name:` field:

   | File | Line | To |
   |---|---|---|
   | `.wingfoil/workflows/custom/sw-life-cycle.yaml` | 10 | `benchmark-inception` |
   | `.wingfoil/workflows/custom/sw-life-cycle.yaml` | 13 | `benchmark-specification` |
   | `.wingfoil/workflows/custom/sw-life-cycle.yaml` | 17 | `release-cycle` |
   | `.wingfoil/workflows/custom/release-cycle.yaml` | 22 | `kanban-delivery` |
   | `.wingfoil/workflows/custom/release-cycle.yaml` | 38 | `campaign-cycle` |

   The manifest `.wingfoil/workflows.yaml` is not touched: paths are correct there. Neither file has
   a `version:` field, so doc-versioning does not apply.

2. **`release-cycle › campaign` stops including `campaign-cycle`** (approver's decision, bug-001
   scope item 1). `campaign-cycle` stays `kind: main` and startable on its own; the phase names it in
   prose and launches it. `campaign-cycle`'s header comment, which claims to be included by
   `release-cycle`, is corrected.

3. **`scenario-authoring` becomes `kind: main`** (approver's decision, bug-001 scope item 2). It stays
   in the manifest with all seven phases; the "never included" check stops applying because it is no
   longer a `sub`, not because the warning was suppressed.

Not in scope, deliberately left visible: the three directives listed as `global` in `roles.yaml`
without `scope: global` in their frontmatter.

## Acceptance

Checked with the roadmap viewer, which reads this repository from outside and re-reads it per
request:

- viewer warnings go from 13 to 3, and the 3 remaining are exactly the `scope: global` ones;
- `kanban-delivery`, `benchmark-inception`, `benchmark-specification` and `release-cycle` are each
  reported as included by their phase;
- no warning naming a file path in a phase `include` remains;
- `.wingfoil/workflows.yaml` is unchanged.

### Classification of the criteria

No criterion is red-first or characterization in the usual sense: this task changes declarative
configuration and delivers no code, and the repository's suites do not read `.wingfoil/`. The check
that stands in for a test is the roadmap viewer, an external reader of the configuration, and it does
behave red-first — **baseline recorded at `dbfe52b`, before any change: 13 warnings**, including the
5 that name the path form and the 4 that report a `sub` workflow included by no phase. So the check
fails before the change for the stated reason, and must pass after it.

**One criterion is deliberately adversarial**, because a disappearing warning is weak evidence here.
For `scenario-authoring` the warning goes away because the check stops applying to a `main`, not
because anything was repaired — and deleting the file, or dropping it from the manifest, would make
the same warning disappear just as well and would read as a pass. The acceptance therefore asserts
what a mutation would break: the file still exists, still carries all seven phases, and is still
listed in `.wingfoil/workflows.yaml`. Same idea for the manifest: it is asserted unchanged rather
than assumed, since "fixing" a phase include by editing the manifest instead would also quiet the
viewer.

Commands are in the bug. The fix is not accepted on "the warning disappeared" alone: for
`scenario-authoring` the warning goes away because the check no longer applies, which is the decided
outcome, and that has to be read together with the file keeping all its phases.

## Notes

The content of this fix was written and verified once before this task existed, and committed
straight to `main` outside the process. The approver rejected that route: `main` was rewound to
`2d5c9b8`, the three commits were dropped from history, and the work returns here. Nothing of the
verification carries over as evidence — the acceptance above is re-checked on this task's branch.

WIP: `kanban-delivery` allows one task in-progress and `task-005` holds it. This task therefore stops
at `backlog` and waits, by the approver's decision.

## Execution notes

### Build

- **Three commits in the Design's order**, each one scope item of bug-001: `a6d7a2b` the five phase
  includes, `f1246ca` the campaign include dropped, `d6f67c9` `scenario-authoring` to `kind: main`.
  The viewer was read between commits, so each step has its own measured effect rather than one
  before/after pair: **13 → 5 → 4 → 3**. The 5 → 4 step is the campaign decision and the 4 → 3 step
  is the `scenario-authoring` decision, which is what lets the two be reviewed separately.
- **The acceptance was run as checks, not as a reading.** All eight pass, including the three
  adversarial ones: `scenario-authoring` still in the workflow graph, still `kind: main`, still
  carrying seven phases, still listed in `.wingfoil/workflows.yaml`, and the manifest byte-identical
  to `main`. Without those, "the warning is gone" would also have been satisfied by deleting the
  file, which is the outcome the criterion exists to exclude.
- **Nothing outside `.wingfoil/workflows/custom/` was touched.** `git diff --stat main` is three
  files; the manifest, `memory.yaml`, `roles.yaml` and the directives are untouched.
- **The three `scope: global` warnings are still there**, deliberately. They are a different defect
  (N19) and fixing them here would have put an undecided question inside a task that did not ask it.

### WingFoil commands (declared vs observed)

- **`memory add --type task`** — declared: copies the scaffold and commits it. Observed: as declared,
  `233a02e`, `wf(task): add …`, element at `draft`.
- **`memory submit`** (`backlog → in-progress`, `937ecaf`) — declared: walks the sequence forward.
  Observed: as declared, and **the commit touched only the `status:` line** (1 insertion, 1 deletion).
  This is the counter-case to N13, which reports `submit` silently committing uncommitted body edits
  under a state-only subject: committing the body edit first (`c1302c3`, `docs(task): design …`)
  avoids it entirely. Worth adding to N13 as the workaround — the problem is not that `submit`
  commits, but that it commits *other people's* changes under its own subject.
- **`memory approve`** — not run by the agent. The harness refuses it as self-approval, and kept
  refusing after the approver said to proceed; the approver ran the two gates of `bug-001` and
  `task-008` personally. `memory history` then recorded `operation: approve` with the approver and
  the reason. See N23: the record names a git identity, not who performed the transition.
- **`workflow list`** — declared: lists the workflows. Observed: as declared, but it resolves the
  manifest's paths only and never validates a phase's `include`; on the broken form it exits 0 and
  echoes the path back. This is the reason the bug survived from `428b295` to now (N18).
- **`memory history`** — declared: the element's history. Observed: prepends unrelated commits with
  `operation: null` and leaks `fatal:` to stderr while exiting 0 (N7, confirmed again here).

### Verification

Read from the roadmap viewer, which loads the repository from outside and re-reads it per request, so
no restart is needed after editing the YAML:

```
tools/roadmap/start.sh --port 4180 --repo <this repo>
curl -s localhost:4180/api/snapshot
```

Baseline at `dbfe52b` (before the branch): 13 warnings. At `d6f67c9`: 3, all `scope: global`.
