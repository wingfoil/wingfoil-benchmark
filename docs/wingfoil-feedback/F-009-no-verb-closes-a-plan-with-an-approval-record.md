---
id: F-009
title: "No verb closes a plan with an approval record"
kind: gap
status: needs-info
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N10.

## Observed

A `plan` type declared without a gate on its last step can only be closed by `memory submit`, which records no
approver and no reason, although closing a phase is an approver's decision. Declaring that step `waiting`, as
WingFoil's own `memory.yaml` does, makes `submit` refuse it, and with no workflow engine no verb closes the plan at
all: it is closed by a hand-written commit. The same operation thus leaves two kinds of audit record.

Answer for WingFoil's v0.3 retrospective (2026-11-05, wingfoil@0.3.1): an approval is recorded on a phase, not on the
plan (set-up: a `team.members` entry in `dna.yaml` with `roles: [approver]`, the committer). A workflow phase declared
with `approval: { by_role: approver }` refuses `workflow finalize` without `--reason` (`error: missing required
argument: --reason`), and with it commits `Approver: <name> <email> (approver)` and `Reason: <text>` beside the
`WingFoil-Phase` trailers; a phase without `approval:` commits neither. `workflow end` then closes the instance's plan
with `wf(plan): finalize <instance> [active → done]`, which carries no `Approver:` or `Reason:` line (`memory history`:
`"approver": null`, `"reason": null`); the phase's record, the `workflow: finalize <instance> <step>` commit, is not
listed in the plan's `memory history`, so the approval is not in the plan's audit trail. Without the engine the Kanban
plan (`sequence: [draft, active, done]`, `waiting: [active]`) cannot be closed at all: `submit` from `active` is refused
("a `waiting` state — its forward edge fires only via a Workflow action"), and so is `approve` ("not a `gates` state").

## Expected

A plan (or any element whose last step is an approval) can be closed through a gate that records the approver
and the reason, without a workflow engine.
