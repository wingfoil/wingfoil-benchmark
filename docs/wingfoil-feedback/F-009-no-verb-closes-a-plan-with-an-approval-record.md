---
id: F-009
title: "No verb closes a plan with an approval record"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N10.

## Observed

A `plan` type declared without a gate on its last step can only be closed by `memory submit`, which records no
approver and no reason, although closing a phase is an approver's decision. Declaring that step `waiting`, as
WingFoil's own `memory.yaml` does, makes `submit` refuse it, and with no workflow engine no verb closes the plan at
all: it is closed by a hand-written commit. The same operation thus leaves two kinds of audit record.

## Expected

A plan (or any element whose last step is an approval) can be closed through a gate that records the approver
and the reason, without a workflow engine.
