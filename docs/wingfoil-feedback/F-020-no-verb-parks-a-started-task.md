---
id: F-020
title: "No verb parks a started task"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N22.

## Observed

A task machine `draft → pending → backlog → in-progress → in-review → approved → done`, with gates on
`pending` and `in-review`, has no backward edge from `in-progress`: `submit` walks forward, `reject` exists only at
a gate, `deprecate` retires. `wingfoil memory park x` → `error: unknown command 'park'` (Re-run on 2026-10-10: exit 1 on
`0.2-pre-3df305e`, exit 2 on `0.2.2`). With a WIP limit of one `in-progress` task, a started task cannot be put
down: freeing the slot means finishing it or running two at once, so a scheduling choice becomes an approver's
exception.

## Expected

A started task can be parked, through a declared backward edge or state, and WIP limits can be declared in
`memory.yaml`. WingFoil dl-110 (ready) and task-180 (`memory park`, done) address this in a later build.
