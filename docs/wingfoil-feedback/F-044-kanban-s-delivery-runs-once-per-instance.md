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
flows continuously across the board; there are no timeboxed iterations", included **once** by `sw-life-cycle`'s
`delivery` phase. After one plan → build → review → deliver, `workflow next` reaches `sw-life-cycle.sunset`, so a
second request needs a second instance (with its own inception and specification to finalize). The workflow format
has the constructs that would repeat it — `iterate_over` (an include once per element, P4.16) and `cadence: {
recurring: … }` — but the scaffold uses neither. Whether `iterate_over: task` would carry later requests in one
instance was not checked. Reproducible with the commands of F-043's first half.

## Expected

The Kanban scaffold's delivery repeats within one instance (for example through `iterate_over` or a recurring
cadence), or its documentation says that each request is an instance of its own.
