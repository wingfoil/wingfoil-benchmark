---
id: F-036
title: "init's commit subject carries an internal plan id"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N46.

## Observed

`wingfoil init --template Kanban` commits `chore(wingfoil): initialize .wingfoil/ with the Kanban template
(P5.1.1)` (Re-run on 2026-10-10, `0.2-pre-3df305e` and `0.2.2`). `P5.1.1` is an id of WingFoil's own plan, meaningless in a
user's repository.

## Expected

The subject names only what happened in the user's repository.
