---
id: dl-012-budget-and-estimate-rebased-on-v0-1-s-measurements
type: decision-log
title: "Budget and estimate rebased on v0.1's measurements"
status: draft
---

## Context

v0.1's budget rested on scenarios K4 and the experiment design §6: a 30 € target at about 1.2 € a run. What was
measured:

| | Planned | Measured |
|---|---|---|
| A Sonnet run | about 1.2 € | about 1.8 € on average (S1 up to 4.4 €) |
| Opus against Sonnet | priced 2.5× (list price) | 6.8× (3.6× the tokens) |
| The campaign | 30 € target | 60.32 € estimate, 61.38 € for execution 2, 102.61 € with execution 1 |

- **Spread:** S1 in one arm ranged from −23 % to +35 % between two runs.
- **The estimate itself:** it read one dry run per key, with no margin.
- **The ceiling:** it was per execution. Re-running a whole execution took the campaign above the ceiling the
  approver had consented to.
- **Repetitions:** with n = 3 on S1 and n = 1 elsewhere, executions 1 and 2 disagree on the same runs.

## Options

- **A. Amend the figures only:** K4 and §6 restated on v0.1's costs.
- **B. A, plus estimate rules:**
  - the estimate shows a range from at least two dry runs per key, or applies a stated margin;
  - a model is never scaled by list price;
  - the ceiling covers the campaign across its executions.
- **C. B, plus a repetition and re-run policy:**
  - a minimum *n* per scenario for a non-preliminary comparison;
  - completing an execution by re-running only its failed runs, instead of a whole new execution.

## Proposal

**C**, decided at v0.2's release-planning together with dl-007 (models), since both change the budget.

## Consequences

- K4 and experiment design §6 are amended with a raised version.
- `campaign estimate` and the budget guard change, through tasks.
- bug-013's question on partial re-runs is answered here.
