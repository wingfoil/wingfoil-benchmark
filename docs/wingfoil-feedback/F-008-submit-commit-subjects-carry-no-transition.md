---
id: F-008
title: "submit commit subjects carry no transition"
kind: request
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N9.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`): two `memory submit`s of one element (for example draft → pending, then pending → … where the
machine allows it) produce commits with the same subject, `wf(<type>): submit <id>`, and no body. `approve`,
`reject` and `deprecate` subjects carry `[from → to]`. `git log --oneline` cannot tell the two submits apart.
Re-run on 2026-10-10 on `0.2-pre-3df305e` and `0.2.2`: `wf(bug): submit bug-001-b-one`, no bracket.

## Expected

Every transition subject carries `[from → to]`. WingFoil dl-054 (ready) asks the same question.
