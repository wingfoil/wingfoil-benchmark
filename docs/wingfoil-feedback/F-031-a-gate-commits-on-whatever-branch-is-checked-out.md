---
id: F-031
title: "A gate commits on whatever branch is checked out"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N41.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`, with a member holding the `approver` role added to `dna.yaml`'s `team.members`): a bug submitted on `master`, then `git switch -c other` and `memory approve <id> --reason ok`:
the approval commit lands on `other`, and `master` still has the bug `pending` (Re-run on 2026-10-10, `0.2.2`). In a repository
with linked worktrees, an approval run in a task's worktree lands on the task's branch; the element's state then
differs between branches, and the approval has to be cherry-picked. Nothing says which branch an element's state
belongs to, nor warns.

## Expected

An element type (or element) has a home branch, and a gate run off it warns or refuses.
