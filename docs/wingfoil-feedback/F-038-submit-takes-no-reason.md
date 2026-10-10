---
id: F-038
title: "submit takes no --reason"
kind: request
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N51.

## Observed

`wingfoil memory submit <id> --reason "why"` → `error: unknown option '--reason'` and
`(Did you mean --version?)`; nothing is committed (Re-run on 2026-10-10: exit 1 on `0.2-pre-3df305e`, exit 2 on `0.2.2`).
`approve` and `reject` require a reason, so a transition carries one for some verbs and not others, and the
suggestion offered is unrelated.

## Expected

Every transition accepts an optional `--reason`, recorded as `approve`'s is. Low priority.
