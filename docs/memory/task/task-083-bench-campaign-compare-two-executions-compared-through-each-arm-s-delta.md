---
id: task-083-bench-campaign-compare-two-executions-compared-through-each-arm-s-delta
type: task
title: "bench campaign compare: two executions compared through each arm's delta"
status: draft
release: v0.2
wave: W14
features: [F5.2]
acceptance:
  - "comparison.feature#Two campaigns are compared through each arm's delta against its own baseline"
  - "comparison.feature#A comparison across models is marked"
  - "comparison.feature#A group whose scenario changed is not compared"
  - "comparison.feature#Only aggregated campaign executions can be compared"
requirements: [REQ-SCO-13, REQ-CLI-12]
fixes: []
---

## Context

F5.2, the command and the comparison record.

**Scope:**
- `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>` (REQ-CLI-12): earlier, then newer, as the maintainer
  orders them; writes `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json`; refuses a dry run, an unaggregated
  execution, the same execution twice;
- REQ-SCO-13: group by group (scenario version and arm present in both), each side's value, each arm's delta against
  its own execution's baseline, and the change of that delta (T7); differing pins listed; **cross-model** rows
  (T14); a changed scenario hash is not compared; ranges and certainty as REQ-RES-03 (task-082); tokens read as
  task-069 recorded them.

**Done** means: the four scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `comparison.feature#Two campaigns are compared through each arm's delta against its own baseline`: classified red-first or characterization in the design phase.
- `comparison.feature#A comparison across models is marked`: classified red-first or characterization in the design phase.
- `comparison.feature#A group whose scenario changed is not compared`: classified red-first or characterization in the design phase.
- `comparison.feature#Only aggregated campaign executions can be compared`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
