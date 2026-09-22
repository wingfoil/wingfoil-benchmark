---
id: plan-002-benchmark-specification
type: plan
title: "Benchmark specification"
status: active
workflow: benchmark-specification
phase: specification
---

## Context

The inception is complete (plan-001 `done`). All the documents in `docs/01_vision/` are approved.
The `specification` phase of `sw-life-cycle` now runs, through the `benchmark-specification`
sub-workflow (`.wingfoil/workflows/custom/benchmark-specification.yaml`).

**Scope:** release **v0.1 only** ([07_sequencer.md](../01_vision/07_sequencer.md), waves W1–W11): 33
features and the scenarios S1, S2, S3 and S8. Later releases are specified when they are planned.

**Inputs:**

- [06_features.md](../01_vision/06_features.md): the features to specify.
- [09_experiment-design.md](../01_vision/09_experiment-design.md): GQM questions, arms, run
  protocol, metric definitions, validity threats, and the budget model (21 runs; Sonnet 5 runs
  averaging about 1.2 € or less).
- [05_journeys.md](../01_vision/05_journeys.md): J1–J4.

**Constraints carried from the inception:**

- Every scenario answers at least one GQM question.
- Step prompts are identical across arms and name no harness.
- Oracles never enter a run container.
- Nothing about the benchmark is written into the WingFoil repository.
- Oracle content for hold-out scenarios, and hold-out tests added to public scenarios (threat T13),
  is written **only** in the private `WingFoil2-Benchmark-HoldOut` repository. This public
  repository describes the oracle *design*, never hold-out oracle content.

## Steps

| # | Phase | Role | Produces | Gate |
|---|-------|------|----------|------|
| 1 | scenario-specs | scenario-author | `docs/02_specification/scenarios/{S1,S2,S3,S8}.md` | approver review |
| 2 | acceptance | product-owner | `docs/02_specification/acceptance/*.feature` | approver review |
| 3 | requirements | architect | `docs/02_specification/requirements.md` | approver review |
| 4 | traceability | reviewer | `docs/02_specification/traceability.md` | approver review |

Scenario specs come first because their sizing (steps, seed size, expected cost per run) constrains
the runner's caps and the cost estimate.

Each step runs on its own branch, `design/specification_<step>`, and is merged into `main` after the
approver's review. The agent drafts. The approver corrects and confirms. Open points go into the
document's own "Open questions" section rather than being silently resolved. Changes to approved
inception documents are brought to review and recorded as review decisions.

## Handoff

- **Agent:** drafts every artifact, and keeps traceability to features (F*), journeys (J*), GQM
  questions (Q-*), metrics (M-*) and threats (T*).
- **Approver (Roberto):** chooses among the options for each scenario, answers open questions, and
  approves each step.
- **Completion:** the four `produces:` artifacts exist on `main` and are approved. The plan then
  moves `active → done`, and the `delivery` phase (Kanban) can start with wave W1.
