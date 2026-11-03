---
id: bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance
type: bug
title: "M-K3 is always zero and M-K4's not applicable ignores the variance"
status: fixed
fixed_by: task-129-m-r2-v2-m-k3-and-m-k4-the-variance-rule-on-every-page-bug-028-bug-029-bug-030
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 4). Cost metrics are in
`src/scoring/cost.ts`.

## Expected

M-K3 measures a cost the arm pays once (setup, configuration); M-K4 (break-even) is "not applicable" only when the
difference it divides by is within the variance.

## Actual

M-K3 is 0 in every v0.2 run, since no arm has a one-off cost the runner records; M-K4 is degenerate, and its "not
applicable" ignores the variance.

## Impact

Two published metrics carry no information; the configured variants of v0.3 add a real one-off cost (the
configuration written by an agent) that M-K3 would miss.

## Resolution

Approver's decision (2026-10-23): M-K3 as the one-off costs (configuration writing); M-K4 "not applicable" only beyond
the variance. A W16 task of [plan-005](../../plans/plan-005-release-v0-3.md).
