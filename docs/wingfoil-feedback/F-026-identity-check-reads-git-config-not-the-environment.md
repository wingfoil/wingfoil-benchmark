---
id: F-026
title: "The identity check reads git config, while git takes the author from the environment"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N32, N47.

## Observed

WingFoil's identity checks read `git config user.name/user.email`; git takes a commit's author from
`GIT_AUTHOR_*` when set.

- With only the environment set (no `user.*` in any config), `wingfoil init --template Kanban` →
  `error: git identity not configured (user.name/user.email)`, exit 1, although git would commit
  (Re-run on 2026-10-10, `0.2-pre-3df305e` and `0.2.2`).
- With both set, differently, `memory approve` passed as the config identity and wrote a commit **authored** by the
  environment identity, whose body names the config identity as approver: two identities for one act. Observed in
a container on `0.2-pre-3df305e`; not re-run here.

## Expected

WingFoil resolves the identity the way git will (`git var GIT_AUTHOR_IDENT`), so that the check and the commit
agree. WingFoil bug-149 (closed) records this defect.
