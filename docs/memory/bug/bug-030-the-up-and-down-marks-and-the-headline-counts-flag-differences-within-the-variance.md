---
id: bug-030-the-up-and-down-marks-and-the-headline-counts-flag-differences-within-the-variance
type: bug
title: "The up and down marks and the headline counts flag differences within the variance"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 4). The marks are rendered in
`src/site/render.ts`.

## Expected

A comparison marks ▲ or ▼, and a headline counts a difference, only when the difference exceeds the variance
(REQ-RES-03), on every page of the site.

## Actual

Any non-zero difference is marked and counted, including differences within the spread of repeated runs.

## Impact

The site says more than the data; a reader takes noise for a result.

## Resolution

Approver's decision (2026-10-23): ▲/▼ and the headline counts only beyond the variance, site-wide. A W16 task of
[plan-005](../../plans/plan-005-release-v0-3.md).
