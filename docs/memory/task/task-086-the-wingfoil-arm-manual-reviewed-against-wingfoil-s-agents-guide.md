---
id: task-086-the-wingfoil-arm-manual-reviewed-against-wingfoil-s-agents-guide
type: task
title: "The wingfoil arm manual reviewed against WingFoil's agents guide"
status: backlog
release: v0.2
wave: W14
features: []
acceptance: []
requirements: [REQ-RUN-12, REQ-FMT-13]
fixes: []
---

## Context

A smaller item left by v0.1's Retrospective and named in rel-v0-2's Scope: "v0.2's wingfoil arm manual is
reviewed against WingFoil's `docs/agents.md` at the pinned tag (N43)". `arms/wingfoil/manual.md` has not changed
since 2026-09-25 (`c03020c`). The gap on WingFoil's side is inbox note F-033 (no level of process, no place for an
automated approver).

**Scope:** read `docs/agents.md` at WingFoil `v0.2.2` (the build the wingfoil arm measures); revise the manual so that
it starts from that guide, and state where and why it departs (the arm's automated approver, REQ-RUN-17; the level of
process the arm chooses). The manual is copied as `CLAUDE.md` (REQ-RUN-12), so the arm digest (REQ-FMT-13) changes:
this lands before calibration, so that every v0.2 dry run measures the revised manual, and the method page says
which manual ran.

**On `features`:** a knowledge and arm task, no feature (as task-004); `acceptance` stays empty. **Done** means: the
manual revised, its departures listed in the method page, the arm's tests green.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- The manual's revision and its departures, checked by the arm's existing tests and the reviewer.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
