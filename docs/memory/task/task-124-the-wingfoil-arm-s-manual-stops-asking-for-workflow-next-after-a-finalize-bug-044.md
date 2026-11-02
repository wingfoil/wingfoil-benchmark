---
id: task-124-the-wingfoil-arm-s-manual-stops-asking-for-workflow-next-after-a-finalize-bug-044
type: task
title: "The wingfoil arm's manual stops asking for workflow next after a finalize (bug-044)"
status: in-progress
release: v0.3
wave: W17
features: [F2.7]
acceptance: []
requirements: [REQ-FMT-05]
fixes: [bug-044-the-wingfoil-arm-s-manual-asks-for-workflow-next-after-each-step-though-finalize-already-prints-the-next-step]
tags: ["v0.3","wingfoil","weak-models"]
---

## Context

[bug-044](../bug/bug-044-the-wingfoil-arm-s-manual-asks-for-workflow-next-after-each-step-though-finalize-already-prints-the-next-step.md): the wingfoil arm's manual asks for `workflow next` after each step, though `finalize`
already prints the next step; the extra calls are most of the arm's extra tokens (task-122). The approver asked for
the fix in chat (2026-11-01). Placed in v0.3, W17. No real-agent session; the next campaign measures it.

## Acceptance criteria

1. **Red-first (a test of the manual's text):** the rule *Until the delivery is recorded* says to continue from the
   next step `finalize` printed and to run `wingfoil workflow next` when a session starts or resumes, or when no next
   step was printed; it no longer asks for `next` after every step. Within 120 columns; nothing else of the manual
   changes.
2. The arm's new digest recorded in the task and in S10's calibration profile, which follows the tree (as task-120);
   campaign-008's files keep theirs.
3. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites on the approver's go; an independent
   review (dl-020).

## Design

- `arms/wingfoil/manual.md`, *Until the delivery is recorded*: "After each step, continue from the next step `wingfoil
  workflow finalize` printed: it is what `next` would print. Run `wingfoil workflow next` when a session starts or
  resumes, or when no next step was printed, until the request's delivery is recorded." Nothing else of the manual
  changes. A resumed session (after the approver's reply) still runs `next`, since its context does not hold a
  `finalize` it can trust to be current.
- The arm's digest: `99ea463d1b37` → `43b1de33f6c1`; baseline and baseline-docs unchanged (`964b1354526c`,
  `64e37c838830`). `campaigns/s10-calibration.dry-run.yaml` pins it (it follows the tree, as task-120 found);
  campaign-008's files keep `cc009b5a52a9`.

## Execution notes

- Red first: the manual's test failed on the old rule (checked with the manual set aside) and passes on the new.
- **For the approver, not in this task's scope:** the rule *A new instance for a new request* also says "then `wingfoil
  workflow finalize` twice …, then `wingfoil workflow next` again", the same repetition after a `finalize`; criterion 1
  keeps the rest of the manual unchanged, so it stays. A one-line follow-up if wanted.
