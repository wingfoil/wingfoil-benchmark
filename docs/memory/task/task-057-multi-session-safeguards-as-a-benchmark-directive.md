---
id: task-057-multi-session-safeguards-as-a-benchmark-directive
type: task
title: "Multi-session safeguards as a benchmark directive"
status: draft
release: v0.2
wave: W12
features: []
acceptance: []
requirements: []
---

## Context

Implements [dl-014](../decision-log/dl-014-process-safeguards-for-a-repository-worked-by-several-sessions.md),
approved at [rel-v0-2](../release/rel-v0-2.md)'s triage (option B).

**Scope:** a benchmark directive, bound to every role that works the repository, holding dl-014's rules:

- one linked worktree per session, with its own `npm ci`, and no branch switch in a shared checkout;
- no history rewrite of `main` once a branch is based on it;
- every approval command run with an explicit `cd` to the checkout of the branch that should receive it;
- real-agent runs from the main checkout, and `git status --ignored` checked before removing a worktree;
- a consent given in chat recorded with the approver's words.

**No real agent, no spending.** **Done** means: `npx wingfoil directives list --role developer` lists it, and
README's development section points to it.

## Acceptance criteria

- `npx wingfoil directives list --role developer` (and the other working roles) lists the directive. **Characterization**
  by command.

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Multi-session safeguards as a benchmark directive"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-057-multi-session-safeguards-as-a-benchmark-directive`, `status: draft`.
