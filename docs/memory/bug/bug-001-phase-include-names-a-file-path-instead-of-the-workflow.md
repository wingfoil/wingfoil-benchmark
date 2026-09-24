---
id: bug-001-phase-include-names-a-file-path-instead-of-the-workflow
type: bug
title: "Phase include names a file path instead of the workflow"
status: approved
---

## Context

`spec-003` uses the key `include` for two different things. In the manifest
`.wingfoil/workflows.yaml` it is a list of **file paths**. Inside a phase it is the **name** of the
workflow to include. Both forms are plain strings, so a path written where a name belongs is
well-formed YAML: it parses, and it resolves to nothing.

All five phase includes of this repository carried a path:

| File | Line | Written | Should be |
|---|---|---|---|
| `.wingfoil/workflows/custom/sw-life-cycle.yaml` | 10 | `workflows/custom/benchmark-inception.yaml` | `benchmark-inception` |
| `.wingfoil/workflows/custom/sw-life-cycle.yaml` | 13 | `workflows/custom/benchmark-specification.yaml` | `benchmark-specification` |
| `.wingfoil/workflows/custom/sw-life-cycle.yaml` | 17 | `workflows/custom/release-cycle.yaml` | `release-cycle` |
| `.wingfoil/workflows/custom/release-cycle.yaml` | 22 | `workflows/custom/kanban-delivery.yaml` | `kanban-delivery` |
| `.wingfoil/workflows/custom/release-cycle.yaml` | 38 | `workflows/custom/campaign-cycle.yaml` | `campaign-cycle` |

The manifest is correct and must not be touched: paths belong there.

## Impact

No sub-workflow is included by any phase. The composed life cycle — the reason the phase `include`
exists — does not exist: `sw-life-cycle` has neither an inception nor a specification, and
`release-cycle` has neither a delivery loop nor a campaign. A reader navigating from `sw-life-cycle`
cannot reach the concrete steps of any of them.

Silent since `428b295` and `8d96d99`. `npx wingfoil workflow list` does not catch it: on a copy of
this repository with the path form restored, it exits 0, prints no warning, and echoes the phase back
as `"include": "workflows/custom/benchmark-inception.yaml"`. It resolves the manifest's paths but
never resolves or validates a phase's include. The defect was visible only to an external reader (the
roadmap viewer), which checks that every `sub` workflow is included by some phase.

## Evidence

`tools/roadmap/start.sh --repo <this repo>` then `/api/snapshot` at `2d5c9b8`: 13 warnings, of which
5 name the path form directly and 4 report a `sub` workflow included by no phase.

## Scope of the fix

The five lines above. Two further defects surface once they resolve, both already decided by the
approver:

1. `campaign-cycle` is `kind: main` but `release-cycle › campaign` includes it, and only a `sub` is
   includable. Decision: drop the include — a campaign stays startable on its own, and the phase
   hands over instead of nesting.
2. `scenario-authoring` is named by no phase at all. Decision: it becomes `kind: main`, a workflow
   startable in its own right (journey J3), so the "never included" check no longer applies to it.

Out of scope, same family, left visible: three directives listed as `global` in `roles.yaml` whose
frontmatter has no `scope: global`.

## Notes

The content of the fix was written and verified before this bug existed, and was committed straight
to `main` as three `chore(wingfoil)` commits, bypassing `bug-ingest` and `kanban-delivery`. The
approver rejected that route; `main` was rewound to `2d5c9b8` and those commits were dropped from
history. The fix returns through the task that this bug opens. Verified there, not here: warnings
13 → 3, and the four `sub` workflows each included by their phase.

The underlying WingFoil issues are recorded in the usage notes as N18 (`include` carrying two
meanings, unvalidated) and N20 (`kind` conflating "startable" with "includable", which is what forces
both decisions above).
