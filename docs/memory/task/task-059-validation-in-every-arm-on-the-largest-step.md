---
id: task-059-validation-in-every-arm-on-the-largest-step
type: task
title: "Validation in every arm on the largest step"
status: draft
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-NFR-04]
---

## Context

Implements [dl-010](../decision-log/dl-010-validation-exercises-every-arm-the-largest-step-and-the-harness-environment.md),
approved at [rel-v0-2](../release/rel-v0-2.md)'s triage (option B).

**Scope:** `.wingfoil/workflows/custom/release-cycle.yaml` becomes version 3. Its validation phase asks for one
real-agent run per arm on the scenario with the largest step, each arm's environment preflighted (bug-014), the runs
consented like any real-agent run and recorded in the ledger. plan-004's step 4 reads it.

**No real agent, no spending** in this task. **Done** means: the workflow at version 3, read by
`npx wingfoil workflow list`.

## Acceptance criteria

- `npx wingfoil workflow list` reads `release-cycle` version 3. **Characterization** by command.

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Validation in every arm on the largest step"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-059-validation-in-every-arm-on-the-largest-step`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-04] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").
