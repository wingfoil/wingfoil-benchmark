---
id: task-081-the-estimate-is-a-range-and-the-ceiling-covers-every-execution
type: task
title: "The estimate is a range and the ceiling covers every execution"
status: draft
release: v0.2
wave: W14
features: [F1.2, F1.4]
acceptance:
  - "campaign.feature#The cost is estimated before any run starts"
  - "campaign.feature#The ceiling covers every execution of a campaign"
requirements: [REQ-CLI-02, REQ-CLI-03]
fixes: []
---

## Context

dl-012 (approved, option C) at v0.2's triage: "estimate and guard tasks in W14 with F1.4".

**Scope** (REQ-CLI-02 and REQ-CLI-03 as amended in 1.26):
- the estimate reads every completed dry run of a key and prints the lowest, the mean and the highest; from a single
  dry run it adds a stated 35 % margin; no model is priced from another;
- the figure compared with `warn_eur` and `ceiling_eur` is the highest, added to what every earlier execution of the
  same campaign spent, so that a resume (task-080) counts against the ceiling.

After task-080, whose executions it sums. **Done** means: both scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `campaign.feature#The cost is estimated before any run starts`: classified red-first or characterization in the design phase.
- `campaign.feature#The ceiling covers every execution of a campaign`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
