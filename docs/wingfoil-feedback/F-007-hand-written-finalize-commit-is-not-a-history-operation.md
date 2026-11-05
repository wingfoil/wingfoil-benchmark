---
id: F-007
title: "A hand-written finalize commit is not a recognized history operation"
kind: gap
status: needs-info
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N8.

## Observed

Where no verb reaches a state, a transition is committed by hand in WingFoil's own form, for example
`wf(task): finalize task-001-first-task [draft → pending]`. `memory history` then reads `from` and `to` but reports
`"operation": null`. Re-run on 2026-10-10 on `0.2-pre-3df305e` and `0.2.2`: the same.

Answer for WingFoil's v0.3 retrospective (2026-11-05, wingfoil@0.3.1): `memory history` now names the operation. The
hand-written `wf(task): finalize task-001-a-scratch-task [draft → pending]` reads `"operation": "finalize"`, `from`
`draft`, `to` `pending`, and the commit `workflow end` makes (`wf(plan): finalize <instance> [active → done]`) reads the
same way. The two differ only in `"wingfoil"`: `null` for the hand-written commit (it has no `WingFoil-Version`
trailer), the version for the engine's. `finalize` is still no `memory` verb (`memory finalize` is an unknown command);
it is the `workflow finalize` verb and the engine's word for a `waiting` edge no verb drives. The commits `workflow
finalize` makes for a phase (`workflow: finalize <instance> <step>`) are entries of no element's `memory history`: the
plan's history lists its add, submit and finalize only.

## Expected

Either `finalize` (or whichever word closes a transition no verb owns) is a declared operation that history
recognizes, or the docs say which verb closes such a transition.
