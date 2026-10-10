---
id: F-015
title: "No verb amends an approved element"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N16.

## Observed

An element in its final approved state needs a clarifying amendment. `submit` walks only forward, `approve`
is illegal from a final state, and `deprecate` retires the element. `wingfoil memory amend x` → `error: unknown
command 'amend'` (Re-run on 2026-10-10: exit 1 on `0.2-pre-3df305e`, exit 2 on `0.2.2`). The amendment is a hand edit; `memory
history` shows its commit with `"operation": null`, so the approver and the reason are invisible to the tool's
audit trail.

## Expected

An approved element can change through a verb that records the approver and the reason. WingFoil dl-108
(amending an approved element) and task-127 (`memory amend`) address this in a later build.
