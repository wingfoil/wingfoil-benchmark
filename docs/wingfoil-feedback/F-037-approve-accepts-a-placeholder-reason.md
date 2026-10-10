---
id: F-037
title: "approve --reason accepts a placeholder as the recorded reason"
kind: request
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N50.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`, with a member holding the `approver` role added to `dna.yaml`'s `team.members`): `memory approve <id> --reason "<motivo>"` commits, exit 0, and the commit says `Reason: <motivo>`
(Re-run on 2026-10-10, `0.2-pre-3df305e` and `0.2.2`). A reason made only of an angle-bracketed placeholder is accepted, and the
permanent record says nothing. Correcting it needs a history rewrite.

## Expected

`approve` and `reject` refuse a reason that is only a placeholder token or has no words. Low priority.
