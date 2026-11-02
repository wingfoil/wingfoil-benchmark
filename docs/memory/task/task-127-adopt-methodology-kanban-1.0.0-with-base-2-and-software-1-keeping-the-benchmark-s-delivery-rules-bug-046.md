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

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
