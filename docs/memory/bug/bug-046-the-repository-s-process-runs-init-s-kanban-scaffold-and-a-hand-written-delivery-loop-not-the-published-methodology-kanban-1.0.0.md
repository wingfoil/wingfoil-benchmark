---
id: bug-046-the-repository-s-process-runs-init-s-kanban-scaffold-and-a-hand-written-delivery-loop-not-the-published-methodology-kanban-1.0.0
type: bug
title: "The repository's process runs init's Kanban scaffold and a hand-written delivery loop, not the published methodology/kanban 1.0.0"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["process","wingfoil","v0.4"]
---

## Context

WingFoil-Templates published `methodology/kanban` 1.0.0 on 2026-11-02 (tag `methodology/kanban@1.0.0`, `31102df`;
WingFoil `>=0.3.0 <=0.3.1`; requires `base@^2` and `software@^1`), told to this repository by the coordination
session the same day. The approver asked for its bug and task in chat (2026-11-02).

## Expected

The repository's process runs a published, versioned methodology within the WingFoil release that manages it
(0.3.1 since task-109), its delivery loop and limits enforced by WingFoil's workflow engine, and its own rules (the
independent review, the full suites at approval, one task in progress and one in review) as the project's own
additions, recorded with the adopted version.

## Actual

`.wingfoil/` is `wingfoil init`'s Kanban scaffold of the 0.2 era (`dna.yaml`: "scaffolded by `wingfoil init` (Kanban
template)") with a hand-written `workflows/custom/kanban-delivery.yaml` (version 6) whose WIP limits "are not enforced
by WingFoil"; no published methodology version is recorded.

## Fix (proposed)

Adopt `methodology/kanban` 1.0.0 with `base` and `software` by its README's "Install and update" (eight hand steps),
keeping `kanban-delivery`'s rules as the project's own, with `wip_in_progress: 1` and `wip_in_review: 1`.
