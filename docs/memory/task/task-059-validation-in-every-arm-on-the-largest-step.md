---
id: task-059-validation-in-every-arm-on-the-largest-step
type: task
title: "Validation in every arm on the largest step"
status: in-progress
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

dl-010 was approved as option **B** at rel-v0-2's triage (`42b05a0`: "option B; release-cycle validation amended
(version 3), a task in W12"). The task fixes no bug (`fixes` stays empty): bug-014's preflight is task-060's, which
this text only relies on.

### Classification of the acceptance criteria

**Characterization** by command: no product code changes. `workflow list` before (`99302ed`, after task-058's merge):
exit 0, 19 879 bytes. After: the same, except `release-cycle`'s `"version"` 2 → 3, the `validation` phase's
`description`, and the `approval` it gains.

### `release-cycle.yaml` (version 3), the `validation` phase

Its description keeps the fake-agent checks and replaces "one end-to-end run with the real agent on the cheapest
scenario" with dl-010 B:

- all acceptance tests green against the fake agent, coverage above 80 %, lint clean, and the Docker suite
  (`npm run test:docker`) green — plan-004's step 4 already lists it;
- **one real-agent run per arm of the release's campaign** (in v0.2 the seven arms of experiment design 1.2), each on
  **the scenario with the largest step**: the step with the largest output and cost in calibration's dry runs, so
  that each arm's setup and environment and the largest output are exercised once;
- **each arm's environment preflighted** before any run (`campaign validate`, bug-014);
- the runs are **consented** by the approver before they start, with the model and a ceiling estimated from
  calibration's dry runs, and **each is a line of the release's spending ledger**;
- the difference from a delivery wave check stays as version 2 says it.

The phase gains `approval: { by_role: approver }`: the consent is its gate, as `real-agent-check`'s is in
kanban-delivery. The header comment says what version 3 adds.

### plan-004

Step 4's "real-agent validation as dl-010 decides (if adopted: …)" becomes a pointer to `release-cycle` version 3's
validation phase: dl-010 has been adopted.

### Commit

One `chore(wingfoil)` commit with dl-010's approval as `Approver:`/`Reason:` trailers.

## Execution notes

- `npx wingfoil memory add --type task --title "Validation in every arm on the largest step"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-059-validation-in-every-arm-on-the-largest-step`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-04] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").
