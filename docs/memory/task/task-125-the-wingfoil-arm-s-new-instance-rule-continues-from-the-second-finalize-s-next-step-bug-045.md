---
id: task-125-the-wingfoil-arm-s-new-instance-rule-continues-from-the-second-finalize-s-next-step-bug-045
type: task
title: "The wingfoil arm's new-instance rule continues from the second finalize's next step (bug-045)"
status: done
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

- `arms/wingfoil/manual.md`, *A new instance for a new request*: "… then `wingfoil workflow finalize` twice (this
  project is already past its inception and specification), then continue from the next step the second `finalize`
  printed." Nothing else of the manual changes; the rule *Until the delivery is recorded* (task-124) already covers
  what follows.
- The arm's digest: `2c39a14f3f91` → `62bcf64e6dde`; baseline and baseline-docs unchanged.
  `campaigns/s10-calibration.dry-run.yaml` pins it (it follows the tree); campaign-008's files keep `cc009b5a52a9`.

## Execution notes

- Red first: the manual's test failed on the old rule and passes on the new; the arms' tests and S10's profile test
  pass (94 and 2).
- Checks: prettier on the changed files, `tsc`, eslint, `scripts/pre-review.sh main`: green.
- **For the next campaign** (the review's observation, nothing to change here): on 0.3.1 a new instance's second
  `finalize` prints the delivery's **build** step, not plan: the earlier request's approved task already meets plan's
  evidence. The rule *Every request has its task* then has the agent add and submit its own task before building; the
  next campaign should see whether the weaker models follow it there. The old rule landed on the same step.

- **Full suites** (2026-11-02, `798acd3e`, under the load watcher): LINT 0, TEST 0 (2004 passed, 9 skipped), BUILD 0,
  BIN 0, DOCKER 0.

### Review

**Round 1** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review-125-V1qg`, a clone of `d1af69a2`; both
checkouts unchanged). On 0.3.1's Kanban scaffold it took a first instance to its sunset, then followed the rule
literally: the second `finalize`'s next-step block equals `next`'s (diffed); with two instances open, `finalize` and
`next` act on the new, active one. Digests, the red-first test and the Design confirmed. No blocker, no should-fix;
nits: bug-045's "the delivery's first step" is build on 0.3.1 (acceptable), the checks not yet in the notes (added),
the calibration note's historical sentence about `next` (out of scope, left).

