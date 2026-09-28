---
id: task-022-cost-estimate
type: task
title: "Cost estimate"
status: draft
release: v0.1
wave: W5
features: [F1.2]
acceptance: [campaign.feature]
requirements: [REQ-CLI-02, REQ-NFR-06]
---

## Context

Second task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It
reads the dry-run costs task-021 stores; the guard (task-023) compares its total with the budget.

Scope of F1.2:

- **`bench campaign estimate <file>` (REQ-CLI-02).** For every scenario × arm × model the campaign
  runs, the dry-run cost of that key times its repetitions; the total in euro, as an API-equivalent
  cost, at the campaign's rate. No agent session starts, no container is created.
- **Keys (W5 plan-phase decision 2, task-021):** scenario version (by content hash), arm and model. A
  key without a dry run fails the estimate, naming the scenario, the arm and the model, and saying to
  run a dry run first. One model's cost is never scaled into another's.
- **What the estimate says about its inputs.** Each line names the dry run it comes from, so that a
  cost measured on an older agent or harness is visible rather than silently reused (a campaign pins
  the released WingFoil, dry runs during development ran on `3df305e`).
- **Cost transparency (REQ-NFR-06), the campaign half:** `campaign run` prints the estimate before its
  first run starts, and the actual cost when it finishes.

The dry-run cost already holds what W2 and W3 left to W5 — the per-session cost floor (adr-002), the
cost of interventions, and a per-arm step cost — because it is measured, not modelled.

**Done** means: `campaign.feature` @F1.2 (both scenarios) passes; `campaign run` prints the estimate
and the actual cost; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `campaign.feature` @F1.2 "The cost is estimated before any run starts" — per scenario and arm, the
  dry-run cost times the repetitions, the total in euro, no session started. **red-first**
- `campaign.feature` @F1.2 @error "A scenario without a dry run cannot be estimated" — the message
  names the scenario and the arm (and the model), and says to run a dry run first. **red-first**
- REQ-NFR-06 — `campaign run` prints the estimate before starting and the actual cost when it
  finishes. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
