---
id: dl-010-validation-exercises-every-arm-the-largest-step-and-the-harness-environment
type: decision-log
title: "Validation exercises every arm, the largest step and the harness environment"
status: draft
---

## Context

plan-003 step 4 (validation, task-052) ran one real-agent run, as `release-cycle` asks: "one end-to-end run on the
cheapest scenario". It ran S3 in the baseline arm: no harness, and small outputs. The campaign then failed in two ways
that this validation could not show:

- bug-011: S1's longest step wrote more than 1 MiB, and three runs were lost;
- bug-014: the wingfoil arm needs `BENCH_WINGFOIL_REPO`, and the first start was refused.

Each of the v0.1 bugs found after delivery (bug-009, 010, 011, 012) is on the real-agent path, which the fake agent
cannot exercise.

## Options

- **A. Keep "the cheapest scenario".** Cheapest, and it misses what only harness arms and long steps show.
- **B. One run per arm, on the scenario with the largest step.** Every arm's setup and environment, and the largest
  output, are exercised once.
- **C. B, but on a shortened scenario:** the largest step alone, in each arm.

## Proposal

**B**, budgeted from calibration's dry runs. In v0.1 terms: S1 in three arms, about 10 €. `release-cycle`'s
validation phase description is amended accordingly (a WingFoil configuration change: through a task, never straight
to main).

## Consequences

- Validation costs more, and it is consented like any real-agent run.
- `release-cycle.yaml`'s validation description changes, with a raised version.
