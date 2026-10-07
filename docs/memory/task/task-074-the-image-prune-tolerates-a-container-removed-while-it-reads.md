---
id: task-074-the-image-prune-tolerates-a-container-removed-while-it-reads
type: task
title: "The image prune tolerates a container removed while it reads"
status: backlog
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-RUN-01]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

Fixes [bug-017](../bug/bug-017-the-image-prune-fails-when-a-container-disappears-while-it-reads-containers.md)
(approved 2026-10-07), placed in W13 at its plan phase: `bench images prune` lists every container with `docker ps`,
then inspects them all at once; a container removed in between makes `docker inspect` fail, and the prune with it.
Found by task-067's `test:docker` run, while other tests created and removed containers.

The design phase declares bug-017 in `fixes`. **No real agent, no spending.** **Done** means: a container removed
between the listing and the reading is skipped, and the prune goes on with the containers that still exist.

## Acceptance criteria

- A container gone between `docker ps` and `docker inspect` is skipped; the others are read. **Red-first** (a
  process double whose `inspect` reports a missing object).
- Containers present throughout are read as today. **Characterization.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "The image prune tolerates a container removed while it reads"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-074-the-image-prune-tolerates-a-container-removed-while-it-reads`, `status: draft`. Matches.
- `npx wingfoil memory submit task-074-…` refused at first: `Error: missing required field on submit: requirements`.
  Declared: submit fills or checks the required frontmatter. Observed: it refuses an empty `requirements`, naming the
  field, with no commit. Fixed by naming REQ-RUN-01, as task-061 (the prune) did.
