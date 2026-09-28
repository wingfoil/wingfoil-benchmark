---
id: bug-007-a-stored-patch-leaves-out-the-commits-made-between-two-snapshots
type: bug
title: "A stored patch leaves out the commits made between two snapshots"
status: approved
---

## Context

REQ-RUN-05: after each step the runner commits the workspace as `step <NN>` and stores that step's
`diff.patch`. Since task-005 the patch has been `git show HEAD`, the patch of the runner's own last
commit. Found in [task-027](../task/task-027-hidden-test-oracle.md)'s build, while making the stored
patches what scoring rebuilds snapshots from (W6 plan-phase decision 5).

## Expected

A step's `diff.patch` holds everything that changed between the snapshot before the step and the
snapshot after it, so that the stored patches, applied in order to the seed, give each snapshot.

## Actual

Whatever is committed **between** two runner commits is in no patch:

- **during the setup**, the harness's own commits — `wingfoil init`'s, and those of the wingfoil arm's
  configuration ([adr-003](../adr/adr-003-w3-arm-conventions.md) decision 10) — come before the
  runner's `setup` commit, and step 1's patch is taken against `setup`;
- **during a step**, the agent's own commits: in the wingfoil arm every `memory add`, `submit` and
  `approve` makes one. W3's real-agent check (campaign `ccf207c46915`) had the agent track a task,
  record a decision-log and approve both in step 1: that step's `diff.patch` held only what was left
  uncommitted when the runner committed.

Nothing scored a run before W6, so no result is wrong; but the patches a reviewer reads show less than
the step did, in the arm whose behaviour the benchmark is about, and nothing could have rebuilt a
snapshot from them.

## Evidence

- `git show --format= --patch HEAD` in `src/core/ports/git.ts` up to task-027; adr-003 decision 10 for
  the setup's commits; the W3 section of [rel-v0-1](../release/rel-v0-1.md) for the agent's.
- Not checked on `ccf207c46915`'s stored files, which live outside the repository (plan-003).

## Suggested handling

Take every stored patch between two snapshots rather than of one commit: from the seed's tree to the
setup's, and from each snapshot's tree to the next; record the trees, so that a rebuilt snapshot can be
checked against the run's.

## Resolution

Fixed by [task-027](../task/task-027-hidden-test-oracle.md) (`f8820c7`), in W6 of release v0.1:
`patchOf(directory, from, to)` is `git diff --binary --full-index <from> <to>` over the trees the
runner records; `setup/diff.patch` runs from the seed's tree, each step's from the previous snapshot's.
Scoring rebuilds through harness and agent commits (`test/unit/scoring/snapshot.test.ts`). WingFoil has
no link from a bug to the task that fixes it (bug-005), so it is recorded here.
