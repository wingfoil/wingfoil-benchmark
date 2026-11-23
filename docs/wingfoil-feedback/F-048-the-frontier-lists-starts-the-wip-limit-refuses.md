---
id: F-048
title: "The frontier lists starts that the WIP limit refuses"
kind: gap
status: open
wingfoil_version: 0.3.2
answered_by: []
---

New note (task-127).

## Observed

On WingFoil 0.3.2 (`6de2e13c`), in a project whose `memory.yaml` gives the `task` type `limits: { in-progress: 1 }`
and whose open workflow iterates over tasks from `backlog` (methodology/kanban 1.0.0's `release-flow` and
`work-item`), with one task in `in-progress` and sixteen in `backlog`: `wingfoil workflow next` prints the in-progress
task's step, then sixteen `also ready: work-item.start@task:<id>` entries, each with its action
`memory.submit [wingfoil: wingfoil memory submit <id>]`; `wingfoil workflow status` lists the same sixteen in its
frontier. Running the first of them, `wingfoil memory submit <id>`, exits 1 with
`error: WIP limit reached for 'in-progress' on type 'task' (limit 1): held by <the in-progress task>.`

## Expected

The frontier tells the steps that can run now from those the limit holds back: either a start whose transition the
limit refuses is left out of `also ready`, or it is listed with the limit and its holder, as the refusal states them.
An agent or a runner that takes the next ready step then never picks a step WingFoil will refuse.
