---
id: F-012
title: "submit commits uncommitted edits under a state-only subject"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N13.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`, with a member holding the `approver` role added to `dna.yaml`'s `team.members`): `memory add --type bug`, then a line appended to the body without committing it, then
`memory submit <id>`. The submit commit, subject `wf(bug): submit <id>`, holds the status change **and** the body
line (2 insertions, 1 deletion). The same with `memory approve`: the uncommitted edit is swept into the approval
commit, exit 0.

Re-run on 2026-10-10 on `0.2.2`: `approve` (and `reject`, `deprecate`) now refuses, naming the remedy ("refusing to commit …:
it carries uncommitted modifications this transition does not own … commit or stash these changes first"), exit 1.
`submit` still commits the body with the status, by design; the docs do not say which verbs the guard covers.

## Expected

A transition commit holds only the transition, or names the other changes it carries. The CLI docs say which
verbs refuse a dirty element. WingFoil bug-076 (closed) records the `approve` half.
