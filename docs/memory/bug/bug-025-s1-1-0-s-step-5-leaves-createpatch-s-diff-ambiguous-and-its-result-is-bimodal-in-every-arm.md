---
id: bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm
type: bug
title: "S1 1.0's step 5 leaves createPatch's diff ambiguous, and its result is bimodal in every arm"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found at v0.3's release-planning (2026-10-24), from [calibration v0.2](../../calibration/v0.2.md) §9 (H6) and the
campaigns `81ebb2691f9c/1` and `bf3a1ac7dff5/1`; first noted in v0.1's retrospective as "S1 1.1 stating step 5's
shift-aware diff" (calibration v0.1 §8) and again in task-097's validation.

## Expected

A scenario's step states its requirement precisely enough that a correct implementation passes its hidden tests, and
that the arms are told apart by what they do, not by which of two readings of the request they happen to take.

## Actual

S1 1.0's step 5 (`createPatch`) ends in one of two results, in every arm and in both campaigns: 158 or 164/165 public
tests, 43 or 45/48 hold-out. The split follows the diff the agent chooses, which the request leaves open (whether the
patch is shift-aware), not the arm.

## Impact

S1's step 5 adds noise of up to six public and two hold-out tests per run, larger than most differences between arms;
H6's "one signal against v0.3.0" in calibration v0.2 §9 rests on it. Results on S1 1.0 stay published with this limit
stated.

## Resolution

To be fixed in S1 1.1 (the requirement stated, the hidden tests unchanged or re-versioned) and a limit on the method
page, by a W16 task of [plan-005](../../plans/plan-005-release-v0-3.md).
