---
id: F-030
title: "An approver's decision that moves no element has no record"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N40.

## Observed

Only transitions produce an approval record (operation, approver, reason). A decision of the approver that
moves no element — a spending consent, an ordering of work, a scope ruling — can only be written as prose in an
ordinary commit, with no `Approver:` or `Reason:` that the tool reads.

## Expected

A recorded approver decision on an element without a transition, for example
`memory approve <id> --decision "<text>"` leaving the state as it is.
