---
id: dl-030-what-closes-release-cycle-s-retrospective-phase-on-wingfoil-0.3
type: decision-log
title: "What closes release-cycle's retrospective phase on WingFoil 0.3"
status: approved
tags: ["v0.3","wingfoil","governance"]
---

## Context

On WingFoil 0.2 the retrospective phase of `release-cycle` declared its evidence as prose (`produces: "release
element: ## Retrospective section"`), which no file ever matched. WingFoil 0.3 refuses prose there (`E_PHASE_PRODUCES_NOT_A_PATH`,
which failed `workflow list` and `workflow show`), so task-109 (`release-cycle` 6) named the release element's path,
`docs/memory/release/{id}.md`. WingFoil 0.3 counts a `produces` path as evidence when the file exists at `HEAD`; the
release element exists from its planning, so **the retrospective's evidence is always present**, and an engine that
reads it would count the phase done as soon as it is reached. The phase has no `actions` and no `approval`. Task-109's
independent review raised it (round 1, should-fix 2); the approver took it as a follow-up at that task's gate
(2026-10-27). Today no `release-cycle` instance runs on the engine: its phases are followed by hand.

## Options

- **A — a retrospective document of its own.** The phase produces `docs/retrospectives/{release}.md` (a new file,
  written by the facilitator), and the release element's `## Retrospective` section points to it. The evidence is
  real; one more document per release.
- **B — the approver closes it.** `produces` removed, `approval: { by_role: approver }` added, as the validation and
  publishing phases end: the retrospective is done when the approver says so, recorded in git with a reason. No new
  file; the record is the gate.
- **C — no evidence.** `produces` removed and nothing added: the phase is closed by hand, as on 0.2. Simplest, but
  the engine has nothing to read.
- **D — keep `release-cycle` 6 as it is**, the vacuity stated in the `wingfoil-cli` directive (W-19).

**Proposed: B.** It matches how the release's other closing phases end, the retrospective's actions (decision-logs,
bugs, inbox notes) already need the approver, and it adds no document. Whichever is chosen, a task changes
`release-cycle` (version 7) and W-19.

## Decision

<!-- The approver's choice, recorded with its reason at the gate. -->
