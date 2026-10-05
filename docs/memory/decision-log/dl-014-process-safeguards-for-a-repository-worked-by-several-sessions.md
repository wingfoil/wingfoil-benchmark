---
id: dl-014-process-safeguards-for-a-repository-worked-by-several-sessions
type: decision-log
title: "Process safeguards for a repository worked by several sessions"
status: approved
---

## Context

This repository was worked by several Claude sessions at once. Release v0.1 recorded these incidents:

- **2026-09-24, a session reverted another's files:** it ran `git checkout -- .wingfoil/` on modified files it did not
  recognise.
- **2026-09-24, a history rewrite hit a live branch:** a rewrite of main reached a branch another session was working
  on, and had to be repaired with `rebase --onto`.
- **2026-10-03, an approval landed on the wrong branch:** bug-010's approval was run in task-050's worktree,
  committed on the task branch, and had to be cherry-picked to main (`ea21256` → `86327a2`). This is not in the
  project's documents.
- **Evidence was lost:** `git worktree remove --force` deleted the 19 calibration dry runs' git-ignored transcripts
  (about 65 € of runs). bug-010's fixture had to be rebuilt.
- **Consents without an approver line:** spending consents given in chat were committed without an `Approver:`
  line (`5f4b5eb`, `e37dee2`).

## Options

- **A. Leave them to the sessions' own memory.** As in v0.1. Each lesson was learnt once per session.
- **B. Write them as the repository's rules,** in a WingFoil directive or the README's development section:
  - one linked worktree per session, and never a branch switch in a shared checkout;
  - no history rewrite of `main` once any branch is based on it;
  - every approval command run with an explicit `cd` to the checkout of the branch that should receive it;
  - real-agent runs from the main checkout, so their ignored transcripts outlive task branches, and
    `git status --ignored` checked before removing a worktree;
  - a consent given in chat recorded with the approver's name and the chat's words.
- **C. B, plus tooling:** a script that refuses a gate when the element's home branch is not the checked-out one, and
  a worktree removal that lists ignored files first.

## Proposal

**B**, as a benchmark directive through a task. C is passed to WingFoil as usage notes (N40, N41).

## Consequences

The rules are read by every session through `wingfoil directives list`, instead of living in one session's memory.
