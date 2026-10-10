---
id: F-039
title: "directive assign cannot bind a directive globally"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

New note (task-078).

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`,
`wingfoil directive create --name x`): `wingfoil directive assign --directive x --role global` →
`error: unknown role 'global' (not defined in dna.yaml)`, exit 1. The help names only `--directive` and `--role`.
`roles.yaml` keeps a `global:` list beside the per-role `assignments:`, and `directives list` reads it, but no verb
writes it: binding a directive to every role is a hand edit of `roles.yaml` with a hand-written commit.
Re-run on 2026-10-10 on `0.2-pre-3df305e` and `0.2.2`: the same error, exit 1.

## Expected

A verb (for example `directive assign --directive x --global`) adds a directive to `roles.yaml`'s `global:` list
and commits it, as `directive assign` does for a role.
