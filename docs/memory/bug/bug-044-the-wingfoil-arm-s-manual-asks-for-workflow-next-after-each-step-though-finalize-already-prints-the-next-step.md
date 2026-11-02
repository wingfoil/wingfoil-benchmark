---
id: bug-044-the-wingfoil-arm-s-manual-asks-for-workflow-next-after-each-step-though-finalize-already-prints-the-next-step
type: bug
title: "The wingfoil arm's manual asks for workflow next after each step, though finalize already prints the next step"
status: fixed
fixed_by: task-124-the-wingfoil-arm-s-manual-stops-asking-for-workflow-next-after-a-finalize-bug-044
tags: ["v0.3","wingfoil","weak-models"]
---

## Context

Found by [task-122](../task/task-122-where-the-wingfoil-arm-s-extra-tokens-go-read-from-the-transcripts-and-what-wingfoil-could-cut-dl-032-item-6.md)'s reading of the wingfoil arm's transcripts
(`docs/calibration/wingfoil-tokens.md`, campaigns 007 and 008). Raised with the approver, who asked for its fix in chat
(2026-11-01).

## Expected

The arm's manual asks only for the WingFoil calls the workflow needs: after `wingfoil workflow finalize`, whose
output already names the next step (its role, directives and actions, as `workflow next` prints them), the agent
continues from that output.

## Actual

`arms/wingfoil/manual.md`, *Until the delivery is recorded*: "Run `wingfoil workflow next` again after each step,
until the request's delivery is recorded." The agents ran `finalize` 7–12 times a run and `next` 3–7 times, part of
it repeating what `finalize` had just printed; every call re-reads the session's whole context (16–20 thousand tokens
of base on Claude Code), and the extra calls are most of the arm's extra tokens.

## Fix (the approver's choice, 2026-11-01)

The rule says to continue from the next step `finalize` printed, and to run `workflow next` only when a session starts
or resumes (after the approver's reply) or when no step was printed. It changes the arm's digest.
