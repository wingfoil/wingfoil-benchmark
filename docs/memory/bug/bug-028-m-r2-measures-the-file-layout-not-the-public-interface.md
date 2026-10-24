---
id: bug-028-m-r2-measures-the-file-layout-not-the-public-interface
type: bug
title: "M-R2 measures the file layout, not the public interface"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 4). M-R2 is computed in
`src/scoring/determinism.ts`; task-094's cross-agent reading (`m_r_across`) uses it too.

## Expected

M-R2 measures the agreement of the public interface the repeated runs expose.

## Actual

It compares the file layout: two runs exposing the same interface from different files disagree, and two runs with the
same files but different exports agree.

## Impact

Determinism across runs and across agents is misread; S3 and S1 are the most affected.

## Resolution

Approver's decision (2026-10-23): M-R2 v2, the interface resolved from the entry point. A W16 task of
[plan-005](../../plans/plan-005-release-v0-3.md); the published v0.2 values stay, with errata.
