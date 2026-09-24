---
id: task-008-phase-includes-in-the-workflow-configuration
type: task
title: "Phase includes in the workflow configuration"
status: backlog
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
