---
id: task-175-dl-033-cost-differences-between-arms-decomposed-by-component
type: task
title: "dl-033: cost differences between arms decomposed by component"
status: backlog
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-SCO-13, REQ-NFR-06]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["costs","results","dl-033","v0.4"]
---

## Context

[dl-033](../decision-log/dl-033-cost-differences-between-arms-decomposed-by-component-base-and-scenario-specific.md), approved; placed in W21 by the approver (2026-11-23) to read the next campaign's costs:
the difference between arms split into a base component and a scenario-specific one. The Determinism Index's *P*
read from the workflow (the WingFoil maintainer's point of 2026-10-24) is weighed here as a metric candidate.

**Done** means: the results show each arm's cost difference by component, from the runs' own records.

## Acceptance criteria

1. The decomposition as dl-033 states it, computed from the run records by a tested module (red first).
2. The results and the method page show it; a v0.3 execution re-read with it (characterization: no figure changes).
3. *P*: kept as a candidate with its reason, or added as a metric through the experiment design.
3a. From the runs' usage records, per step: the prompt-cache hit rate, and the share of input tokens spent reading the
   arm's rules and decisions where the records tell it apart; a step's cache rate far below its arm's is flagged
   ([plan-006](../../plans/plan-006-release-v0.4.md)'s external-benchmarks triage, row 6; imec's broken-cache build,
   grade B, in [X_external-benchmarks-2026-11-25.md](../../01_vision/X_external-benchmarks-2026-11-25.md), re-read
   at its source before the method page cites it). Red first, against a fixture with a low-cache step.
4. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
