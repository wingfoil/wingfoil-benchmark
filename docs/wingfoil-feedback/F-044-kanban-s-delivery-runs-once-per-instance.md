---
id: F-044
title: "Kanban's delivery runs once per instance, though the scaffold says work flows continuously"
kind: gap
status: open
wingfoil_version: 0.3.1
answered_by: []
---

New note (task-107).

## Observed

`init --template Kanban` (WingFoil 0.3.1, `870bd440`) scaffolds `kanban-delivery.yaml`, whose header says "Work
flows continuously across the board; there are no timeboxed iterations", included once by `sw-life-cycle`'s
`delivery` phase. After one plan → build → review → deliver, `workflow next` reaches `sw-life-cycle.sunset`; the
workflow format has no construct that repeats a phase, so a second request needs a second instance (with its own
inception and specification to finalize). Reproducible with the commands of F-043's first half.

## Expected

The Kanban delivery repeats within one instance (a loop, or a phase that can be re-entered), or its documentation
says that each request is an instance of its own.
