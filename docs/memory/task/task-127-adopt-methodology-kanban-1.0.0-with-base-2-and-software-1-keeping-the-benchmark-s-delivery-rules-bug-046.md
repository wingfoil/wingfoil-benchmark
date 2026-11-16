---
id: task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046
type: task
title: "Adopt methodology/kanban 1.0.0 with base@^2 and software@^1, keeping the benchmark's delivery rules (bug-046)"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
fixes: [bug-046-the-repository-s-process-runs-init-s-kanban-scaffold-and-a-hand-written-delivery-loop-not-the-published-methodology-kanban-1.0.0]
tags: ["process","wingfoil","v0.4"]
---

## Context

[bug-046](../bug/bug-046-the-repository-s-process-runs-init-s-kanban-scaffold-and-a-hand-written-delivery-loop-not-the-published-methodology-kanban-1.0.0.md): the repository's process is `init`'s Kanban scaffold of the 0.2 era with a hand-written
`kanban-delivery` (version 6), not the published `methodology/kanban` 1.0.0. The approver asked for its task in chat
(2026-11-02). **Placed after v0.3's release** (release v0.4, its first wave W20): adopting changes the states, the
workflows and the limits every open element moves through, so it is done when no v0.3 task is open, at v0.4's
release-planning, not in the middle of W16–W19. No real-agent session; the benchmark's arms are not touched (their
WingFoil is the one under test, pinned per campaign).

## Acceptance criteria

1. The README's eight steps at the tag, each recorded in the Execution notes: the comparison of `kanban-delivery`
   (version 6) with `kanban`'s `delivery`/`release-flow`/`work-item`; the composition of `methodology/kanban` 1.0.0
   with `base@^2` and `software@^1` by wingfoil-templates' reference composer, with `base`'s required parameters, the
   current path and id parameters (no file moves) and `wip_in_progress: 1`, `wip_in_review: 1`; the composed files
   copied, the project's own entries re-added (the `custom/` workflows it wrote: `release-cycle`, `campaign-cycle`,
   `scenario-authoring`, `benchmark-inception`, `benchmark-specification`, `kanban-delivery` kept beside `work-item`),
   the ones `init` scaffolded removed by bug-007's list.
2. The benchmark's own delivery rules kept as the project's additions: the independent review with severities and
   re-review (dl-020), `scripts/pre-review.sh`, the full suites at the approval gate (dl-016), `fixes`/`fixed_by`
   (task-058), the approver's gates.
3. Every state within its limit before adopting; every open element's state mapped (old → new key mapping recorded);
   every open task given a `release`.
4. The adopted version recorded in the project's Memory (a decision-log or the release's element).
5. `wingfoil` commands run before and after (`workflow status`, `memory search` by type and state), declared against
   observed behaviour in the notes; frictions as `docs/wingfoil-feedback/` notes.
6. Checks: `pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts, from the README at the tag and the composer's output. -->

## Input: the engine way of working (2026-11-16)

Relayed by the WingFoil coordination session (WFCoord) on 2026-11-16 as the approver's decision on this repository's
answer about adopting WingFoil 0.3.x's workflow engine; confirmed by the approver in chat the same day.

1. task-152 stays a pure pin change (0.3.1 → 0.3.2); the way of working does not change with it.
2. The way of working is adopted at v0.4's release-planning through this task, when no v0.3 task is open, after every
   open element's state is mapped (bug-046), with a pilot on one wave whose exit and rollback criteria are written
   before it starts.
3. Points to settle here:
   - **Branches:** Memory verbs are committed on main and only `task/` branches exist, so main is the integration
     branch and the engine's instance records go there.
   - **Checker:** the independent read-only reviewer, `scripts/pre-review.sh` and the full suites before every
     in-review → approved are the checker; with tasks in parallel, a checkpoint check at each task's close
     (`git merge-tree` across the open lanes, the plan's timed duties).
   - **Agent identity:** not adopted now; the approver stays the author and the agent is credited by Co-Authored-By
     (the agent's email added to `dna.yaml`); the author-versus-trailer question waits for WingFoil's v0.4 ruling.
   - **Standing approvals:** one only, the kanban review's in-review → approved (green full suites at a named commit and
     a clean independent review), run by the approver. Spending stays a human choice: campaign approve-spend,
     real-agent checks, validation and dry-run consent never get a standing rule.
   - **Campaigns:** campaign-cycle may stay hand-run in the pilot; whether it becomes an engine instance is decided
     here.
   - **`paths.runs`:** a directory other than the runner's git-ignored `/runs/`, chosen before it is declared.
   - **Engine limits to plan around:** kanban-delivery runs once per instance (F-044, WingFoil bug-489); a new instance
     reads step evidence from the whole repository (F-043, WingFoil bug-488).
   - **From WingFoil's first wave on the engine:** measures from scripts reading git and transcripts, never hand
     registers (orchestration tokens beside the campaigns' costs); `workflow status` needs a filter or a known-noise
     list; on WingFoil 0.4 approvals refuse in an agent shell and verbs write the attribution trailers, so gated
     commands run from a human terminal and trailers are never amended by hand.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
