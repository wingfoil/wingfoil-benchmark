---
id: bug-022-the-codex-credential-s-checkout-check-takes-any-git-for-a-repository
type: bug
title: "The Codex credential's checkout check takes any .git for a repository"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["codex","security","preflight"]
---

## Context

Found by task-095's day checks on 2026-10-20: six tests of `test/unit/cli/codex-credential.test.ts` (task-094) failed on
a machine where an empty directory `/tmp/.git` exists (created 2026-10-19 22:58 by something outside this
repository). The approver asked, in chat on 2026-10-20, for it to be fixed in task-095.

## Expected

`BENCH_CODEX_AUTH_FILE` is refused "inside a git checkout" (dl-019 bounds 2 and 7, REQ-RUN-15 as amended in 1.32) only
when a directory above the file's real path is a git checkout: a `.git` directory holding `HEAD`, or a `.git` file
starting with `gitdir:` (a linked worktree). An empty `/tmp/.git`, or any `.git` that is neither, makes nothing a
checkout.

## Actual

`src/cli/preflight.ts` `checkoutOf` returns the first directory above the file holding any entry named `.git`. With
an empty `/tmp/.git`, every credential under `/tmp` is refused as "inside a git checkout", and so are the six tests,
whose temporary files are under `/tmp`.

## Impact

A credential outside every repository is refused (a false refusal, not a leak): the check fails closed. Every
machine with a stray `.git` above its temporary directory fails task-094's tests and the full suites.
