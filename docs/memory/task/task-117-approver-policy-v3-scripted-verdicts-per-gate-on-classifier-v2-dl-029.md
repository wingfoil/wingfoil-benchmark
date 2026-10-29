---
id: task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029
type: task
title: "Approver policy v3: scripted verdicts per gate on classifier v2 (dl-029)"
status: draft
release: v0.3
wave: W17
features: [F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-06, REQ-RUN-07, REQ-FMT-04]
fixes: []
tags: ["v0.3","runner","approver"]
---

## Context

[dl-029](../decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md) point 7, the
first of the method's two changes that S10
([task-116](task-116-s10-gates-and-roles-scenario-dl-029.md)) needs before its calibration: **scripted verdicts**,
approve or reject with a fixed reason per gate, declared in the scenario and the same in every arm, as a new approver
policy on classifier v2 (dl-026). v1 and v2 stay frozen; a scenario that declares no verdicts reads v3 as v2. Placed in
v0.3, W17, as task-116. Implemented after task-116's spec fixes the verdicts' shape and timing; one task at a time in
review.

## Acceptance criteria

- A scenario may declare verdicts per step (shape and timing as S10.md fixes them); `validate` refuses a malformed
  declaration, naming it — red-first.
- Policy v3: classifier v2 unchanged; replies to an approval request at a step with verdicts are the scenario's fixed
  texts, each one an intervention, the cap unchanged; without verdicts, v2's replies — red-first.
- A campaign pins v1, v2 or v3; requirements (REQ-RUN-06/07) and the experiment design §3 amended — characterization.

## Design

To be completed once S10.md fixes what the policy must provide.

## Execution notes
