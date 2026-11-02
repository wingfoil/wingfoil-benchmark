---
id: bug-045-the-wingfoil-arm-s-manual-runs-workflow-next-after-starting-an-instance-though-its-second-finalize-already-prints-the-next-step
type: bug
title: "The wingfoil arm's manual runs workflow next after starting an instance, though its second finalize already prints the next step"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","wingfoil","weak-models"]
---

## Context

Left out of [task-124](../task/task-124-the-wingfoil-arm-s-manual-stops-asking-for-workflow-next-after-a-finalize-bug-044.md)'s scope ([bug-044](../bug/bug-044-the-wingfoil-arm-s-manual-asks-for-workflow-next-after-each-step-though-finalize-already-prints-the-next-step.md)), whose criterion kept the rest of the
manual unchanged; its execution notes flagged it. The approver asked for its bug and task in chat (2026-11-02).

## Expected

The rule *A new instance for a new request* asks only for the WingFoil calls the workflow needs: after `wingfoil
workflow start` and the two `wingfoil workflow finalize` that bring the new instance to its delivery, the agent
continues from the next step the second `finalize` printed, as the rule *Until the delivery is recorded* now says.

## Actual

`arms/wingfoil/manual.md`, *A new instance for a new request*: "Run `wingfoil workflow start sw-life-cycle --title
…`, then `wingfoil workflow finalize` twice (…), then `wingfoil workflow next` again." On WingFoil 0.3.1 the second
`finalize` prints the delivery's first step exactly as `next` does (task-124's review, on the Kanban scaffold), so the
last call repeats it; every call re-reads the session's whole context.

## Fix (the approver's choice, 2026-11-02)

The rule ends with "then continue from the next step the second `finalize` printed", dropping the `workflow next`. It
changes the arm's digest.
