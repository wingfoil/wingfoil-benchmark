---
id: F-043
title: "A new workflow instance's step evidence is read from the whole repository, so its gate can be skipped"
kind: defect
status: open
wingfoil_version: 0.3.1
answered_by: []
---

New note (task-107).

## Observed

On `init --template Kanban` (WingFoil 0.3.1, `870bd440`), a second `sw-life-cycle` instance started after the first
one's delivery:

1. Its `kanban-delivery.plan` step counts as done at once: its evidence is `produces: docs/memory/task/`, which the
   first instance's task already satisfies. `workflow next` goes from `sw-life-cycle.specification` straight to
   `kanban-delivery.build`.
2. Its `kanban-delivery.review` step (`where: { type: task, status: pending }`, `approval: { by_role: approver }`)
   has nothing to select when no task is pending, and `workflow next` passes it: the instance reaches its sunset with
   no approval.
3. `memory add --type task --workflow <instance>` then refuses: `error: no step of <instance> adds a task`.

Reproducible with WingFoil alone: `init --template Kanban`; `workflow start sw-life-cycle`; `workflow finalize` twice;
`memory add --type task …` and `memory submit`; approve it; `workflow finalize` through deliver; then `workflow start
sw-life-cycle` again, `workflow finalize` twice, `workflow next`. Seen in two agent sessions of this repository's
step-A spike (Claude Code and Codex, its dry runs 86 and 87): one agent built and delivered with no task and no gate,
the other stopped at the refusal and did no work.

## Expected

A step's evidence is read for its own instance (the documents the instance created or was bound to), so that each
instance's plan asks for its own task and its review stops at its own gate; or the scaffold's Kanban delivery says
how a second request is to be tracked.
