---
id: task-125-the-wingfoil-arm-s-new-instance-rule-continues-from-the-second-finalize-s-next-step-bug-045
type: task
title: "The wingfoil arm's new-instance rule continues from the second finalize's next step (bug-045)"
status: pending
release: v0.3
wave: W17
features: [F2.7]
acceptance: []
requirements: [REQ-FMT-05]
fixes: [bug-045-the-wingfoil-arm-s-manual-runs-workflow-next-after-starting-an-instance-though-its-second-finalize-already-prints-the-next-step]
tags: ["v0.3","wingfoil","weak-models"]
---

## Context

[bug-045](../bug/bug-045-the-wingfoil-arm-s-manual-runs-workflow-next-after-starting-an-instance-though-its-second-finalize-already-prints-the-next-step.md): the wingfoil arm's rule *A new instance for a new request* runs `workflow next` after the
second `finalize`, which already prints the next step; the rest of bug-044's fix (task-124). The approver asked for it
in chat (2026-11-02). Placed in v0.3, W17. No real-agent session; the next campaign measures it.

## Acceptance criteria

1. **Red-first (a test of the manual's text):** the rule *A new instance for a new request* ends by continuing from the
   next step the second `finalize` printed, with no `wingfoil workflow next` after it; within the manual's wrap;
   nothing else of the manual changes.
2. The arm's new digest recorded in the task and in S10's calibration profile, which follows the tree; campaign-008's
   files keep theirs.
3. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites on the approver's go; an independent
   review (dl-020).

## Design

<!-- The rule's sentence; the digest. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
