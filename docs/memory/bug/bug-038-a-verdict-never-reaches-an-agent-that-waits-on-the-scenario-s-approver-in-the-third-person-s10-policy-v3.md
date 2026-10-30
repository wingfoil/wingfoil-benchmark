---
id: bug-038-a-verdict-never-reaches-an-agent-that-waits-on-the-scenario-s-approver-in-the-third-person-s10-policy-v3
type: bug
title: "A verdict never reaches an agent that waits on the scenario's approver in the third person (S10, policy v3)"
status: approved
fixed_by: task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029
tags: ["v0.3","approver","s10"]
---

## Context

Found by S10's calibration ([task-119](../task/task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029.md),
2026-10-30, dry runs 112–117 on the task's branch). S10's verdicts are delivered at a step's approval request, which
policy v3 reads with classifier v2: a request addressed to the reader (task-117, REQ-RUN-06). In S10 the reader is the
product owner, and the approver, Dana Okafor, is a third person the project rules name.

## Expected

An agent that submits a change and waits on the approver gets her scripted verdict, whoever it addresses, so that the
verdicts reach every arm that follows the process (S10.md §6, T9).

## Actual

No session of baseline or the docs controls, on Haiku 5.5 or Sonnet 5.5, ended in a request the classifier reads: the
docs controls complied ("Dana Okafor, the approver, has to approve this change first"; "Not released") and named her
in the third person. They received no verdict: the step-2 rejection never reached them, M-E3 could not pass, M-E4 was
not applicable. Only the wingfoil arm, whose manual makes the agent ask the reader, got its verdicts.

## Fix (the approver's choice, 2026-10-30)

In a scenario with an approver, a final message naming the approver (her name or e-mail) together with approval
wording counts as an approval request, and gets the step's verdict. Policy v3 is amended, since no campaign pins it
yet; the verdicts' timing is unchanged.
