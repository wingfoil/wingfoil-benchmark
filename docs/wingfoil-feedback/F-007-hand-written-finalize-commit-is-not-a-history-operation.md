---
id: F-007
title: "A hand-written finalize commit is not a recognized history operation"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N8.

## Observed

Where no verb reaches a state, a transition is committed by hand in WingFoil's own form, for example
`wf(task): finalize task-001-first-task [draft → pending]`. `memory history` then reads `from` and `to` but reports
`"operation": null`. Re-run on 2026-10-10 on `0.2-pre-3df305e` and `0.2.2`: the same.

## Expected

Either `finalize` (or whichever word closes a transition no verb owns) is a declared operation that history
recognizes, or the docs say which verb closes such a transition.
