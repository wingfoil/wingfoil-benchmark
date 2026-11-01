---
id: bug-043-the-runner-drops-a-verdict-hook-s-stderr-when-the-hook-fails-so-its-outcome-carries-no-reason
type: bug
title: "The runner drops a verdict hook's stderr when the hook fails, so its outcome carries no reason"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","runner","s10"]
---

## Context

Found by [task-120](../task/task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate.md)'s independent review (round 1, a nit left out of that task's scope), which
fixed the same loss one level down ([bug-041](bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason.md)): the wingfoil verdict hook now keeps WingFoil's reason when
WingFoil refuses a verb. Never observed in a run so far.

## Expected

When the verdict hook itself fails (exits non-zero: its workspace missing, an argument missing under `set -u`, a
crash), the run's `verdicts.json` records why, beside the outcome `failed (exit N)`, so the failure can be read from
the stored results.

## Actual

`src/runner/run.ts`, `deliver`: a hook that exits non-zero is recorded as `failed (exit N)` and its stderr is dropped;
a hook that throws records `failed (exit -1)` with the error dropped too.

## Fix (proposed)

The runner keeps the hook's stderr, its last non-blank line cut at 500 characters, as `carried_out.detail` (the field
task-120 added, REQ-FMT-05 as amended in 1.46) when the hook fails; a red-first runner test with a failing hook.
