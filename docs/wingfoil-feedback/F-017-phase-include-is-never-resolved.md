---
id: F-017
title: "A phase include is never resolved: a path where a name belongs passes in silence"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N18.

## Observed

`include` means a file path in `workflows.yaml` and a workflow name inside a phase. In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`), the phase
`delivery` of `sw-life-cycle.yaml` is changed to `include: no-such-workflow`: `wingfoil workflow list` exits 0 with
no warning and echoes `"include": "no-such-workflow"` (Re-run on 2026-10-10, `0.2-pre-3df305e` and `0.2.2`). The scaffold itself
writes a path there (`include: workflows/custom/kanban-delivery.yaml`). A composed life cycle whose includes
resolve to nothing looks valid.

## Expected

`workflow list` refuses, or warns about, a phase `include` that names no known workflow; one key keeps one
meaning. WingFoil bug-145 and bug-144 (closed) and task-136 (done) address this in a later build.
