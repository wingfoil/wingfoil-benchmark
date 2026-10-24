---
id: bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent
type: bug
title: "An interrupted or killed step loses the cost it spent"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 7;
[calibration v0.2](../../calibration/v0.2.md) §11, the dry run interrupted at stage 3), with two related follow-ups:
task-079's accepted Ctrl-C race and task-094's Codex invocation that fails or is killed.

## Expected

A step that stops before its end (interrupted, killed at a cap, or failed) is recorded with the cost it spent, or, when
the agent reports none, at its bound, and marked as such (REQ-RUN-09).

## Actual

- An interrupted dry-run step loses its spent cost; restarted, the dry run runs again from its start.
- On Ctrl-C the `docker exec` client dies first, so the step is recorded `failed` at its reported cost, not
  `interrupted` at its bound.
- A failed or killed Codex invocation reports no usage and is counted as zero.

## Impact

The ledger and the estimates under-count spending; the cross-agent comparison of dl-022's Codex campaign would count a
killed session as free.

## Resolution

A W16 task of [plan-005](../../plans/plan-005-release-v0-3.md); the Codex case is checked by task-102's spike first.
