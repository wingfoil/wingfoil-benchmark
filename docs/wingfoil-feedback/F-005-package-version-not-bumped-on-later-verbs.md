---
id: F-005
title: "The package version is not bumped: a 0.1.0 build ships later verbs"
kind: defect
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N6.

## Observed

A build of commit `3df305e` (and of `7a65580`; `git diff --stat 7a65580 3df305e -- src` is empty) prints
`0.1.0` for `wingfoil --version` and in the MCP `serverInfo`, while it ships `memory submit/approve/reject/deprecate/
history` and `directive create/assign/remove`, which 0.1.0's docs say do not exist. Re-run on 2026-10-10: `--version` → `0.1.0`,
exit 0. A consumer that pins "0.1.0" gets a wrong picture of what it can call.

## Expected

The version moves when verbs are added (a pre-release such as `0.2.0-pre.N`), or `--version` names the commit.
WingFoil dl-025 (agent-facing docs ownership, ready) covers the docs that described those verbs as missing.
