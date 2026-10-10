---
id: F-022
title: "workflow list accepts actions on unknown types and roles nobody has"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N28.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`), `bug-ingest.yaml`'s phase is given `role: nobody` and `actions: ["memory.add(type: nonsense)"]`:
`wingfoil workflow list --format json` exits 0 with an empty stderr (Re-run on 2026-10-10, `0.2-pre-3df305e` and `0.2.2`).
Nothing checks an action's `type` against `memory.yaml`, a phase's `role` against `roles.yaml`, or a `produces`
path against the type's `path`.

## Expected

`workflow list` cross-checks action types, roles and `produces` paths against the Memory schema and the roles,
and reports what does not resolve.
