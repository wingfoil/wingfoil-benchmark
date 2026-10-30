---
id: bug-039-the-wingfoil-arm-s-manual-counts-only-approved-proceed-as-an-approval-and-refuses-a-verdict-already-carried-out
type: bug
title: "The wingfoil arm's manual counts only Approved. Proceed. as an approval, and refuses a verdict already carried out"
status: approved
fixed_by: task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029
tags: ["v0.3","wingfoil","s10"]
---

## Context

Found by S10's calibration ([task-119](../task/task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029.md),
2026-10-30, dry runs 114 and 117). The wingfoil arm's manual (`arms/wingfoil/manual.md`) was written for option (a):
the agent holds the approver role and runs `memory approve` itself after "Approved. Proceed.".

## Expected

In a scenario with a separate approver (option (b1), task-118), an agent that receives the approver's verdict sees
that it has been recorded and carries on, without approving anything itself.

## Actual

The verdict hook approved the task as Dana (`done` in the ledger), yet the agent answered that only "Approved.
Proceed." is an approval, did not look at the task's state, and asked again until the intervention cap, at steps 1 and
3 on Sonnet 5.5 and at steps 2 and 3 on Haiku 5.5: cost and interventions the arm's manual, not WingFoil, caused.

## Fix (the approver's choice, 2026-10-30)

One sentence in the manual: a reply that gives the verdict of the project's approver, another member, has been
recorded by her; check the element's state and continue; never approve yourself. It changes the arm's digest.
