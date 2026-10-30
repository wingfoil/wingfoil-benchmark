---
id: task-118-a-separate-approver-identity-the-agent-never-the-approver-verdicts-executed-by-the-runner-dl-029
type: task
title: "A separate approver identity: the agent never the approver, verdicts executed by the runner (dl-029)"
status: in-progress
release: v0.3
wave: W17
features: [F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-17, REQ-FMT-04]
fixes: []
tags: ["v0.3","runner","governance"]
---

## Context

[dl-029](../decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md) point 7, the
second of the method's two changes that S10 ([task-116](task-116-s10-gates-and-roles-scenario-dl-029.md)) needs:
option (b) of the scenario conventions' open question 1, in the variant **(b1)** the approver chose in S10's goal phase
(2026-10-29). For a scenario that declares it, the agent's git identity holds no approver role; the scripted verdict
([task-117](task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029.md)) is carried out by the
runner under a separate approver identity the agent's container does not hold, through the arm's published verdict
hook (WingFoil's `memory approve|reject … --reason`), and as text only for an arm with none; the runner keeps a ledger
of the verdicts it carried out, outside the snapshot, read by M-E3a. Every other scenario keeps option (a) (dl-029
constraint 5). Placed in v0.3, W17. Implemented after task-117; one task at a time in review.

## Acceptance criteria

- A scenario may declare a separate approver; then the agent's identity and the approver's differ, and the approver's
  is never in the agent's environment — red-first.
- The arm's verdict hook runs under the approver identity at the time S10.md fixes; an arm with none receives text
  only; a missing or ambiguous target is recorded, never guessed — red-first.
- The ledger of executed verdicts (identity, verdict, reason, commits) is written per run and read by M-E3a's check —
  red-first.
- REQ-RUN-17, the scenario conventions' open question 1 and the method page amended — characterization.

## Design

To be completed once S10.md fixes what the identity and the hook must provide.

## Execution notes
