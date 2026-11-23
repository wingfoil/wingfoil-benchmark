---
id: task-175-dl-033-cost-differences-between-arms-decomposed-by-component
type: task
title: "dl-033: cost differences between arms decomposed by component"
status: draft
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
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
4. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
