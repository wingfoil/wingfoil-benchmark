---
id: task-074-the-image-prune-tolerates-a-container-removed-while-it-reads
type: task
title: "The image prune tolerates a container removed while it reads"
status: in-review
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-RUN-01]
fixes:
  - bug-017-the-image-prune-fails-when-a-container-disappears-while-it-reads-containers
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

`dockerImagesCli().containers()` keeps its single `docker inspect` of every listed id. When a container listed by
`docker ps` is removed before it is inspected, `inspect` exits 1, still prints the containers it found, and says
`No such object: <id>` for the missing ones.

- Such an exit is read as the containers that still exist when **every** line of its error output is a "no such
  object" line for one of the listed ids.
- Any other failure is thrown, as today.
- The prune then goes on with the containers that exist, which is right: a container that is gone uses no image.

Tests (unit, with a process double):

- **red-first:** a missing id is skipped, and the others are read;
- **characterization:** any other `inspect` failure is still thrown.

Delivered under kanban-delivery version 5: the touched tests by day, niced; the full suites before approval.

## Execution notes

- `npx wingfoil memory add --type task --title "The image prune tolerates a container removed while it reads"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-074-the-image-prune-tolerates-a-container-removed-while-it-reads`, `status: draft`. Matches.
- `npx wingfoil memory submit task-074-…` refused at first: `Error: missing required field on submit: requirements`.
  Declared: submit fills or checks the required frontmatter. Observed: it refuses an empty `requirements`, naming the
  field, with no commit. Fixed by naming REQ-RUN-01, as task-061 (the prune) did.
- `npx wingfoil memory submit task-074-…` (backlog → in-progress), after the Design commit. Declared: moves the task
  to its next state and commits it. Observed: `status: in-progress`. Matches.
- Build (kanban-delivery version 5):
  - **Red first:** a container gone between `ps` and `inspect` is skipped, and the others are read.
  - **Characterization, green before and after:** any other inspection failure is thrown, including a "no such
    object" for an id that was not listed.
  - **Then the code:** `containers()` runs `inspect` through the process port. It reads an exit whose every error
    line names a listed id as gone, and throws otherwise (`onlyGone`).
  - The touched tests are green, niced: `test/unit/ports` and the images CLI, 63 tests.
- The older capitalised wording, and two missing ids on two lines (only the first prefixed), are now tested (review
  nits).
- `npx wingfoil memory submit task-074-…` (in-progress → in-review): independent review clean, the touched tests
  green. The full suites come before approval, on demand. Declared: moves the task and commits it. Observed: see the
  next commit.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design and bug-017. By day only the
touched tests ran, niced (kanban-delivery version 5).

- **Round 1** (d196b31): **clean.**
  - It checked against docker/cli's behaviour: the regex is case-insensitive and unanchored, and the id compared is
    the argument as passed.
  - stdout still holds the found objects on exit 1.
  - Any other stderr line still throws, the safe direction for a prune.
  - No regression in the prune's only caller.
  - Nits: the older wording and several missing lines are now tested; the short ids in the doubles and the arguments
    not re-checked are left as they are.
- **Suites:** run on demand before approval.
