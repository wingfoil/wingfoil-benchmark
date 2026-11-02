---
id: task-124-the-wingfoil-arm-s-manual-stops-asking-for-workflow-next-after-a-finalize-bug-044
type: task
title: "The wingfoil arm's manual stops asking for workflow next after a finalize (bug-044)"
status: approved
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

- `arms/wingfoil/manual.md`, *Until the delivery is recorded*: "After a step you closed with `wingfoil workflow
  finalize`, continue from the next step it printed: it is what `next` would print. Run `wingfoil workflow next` when
  a session starts or resumes (after the approver's reply), after a step that a memory verb completed, or when no next
  step was printed, until the request's delivery is recorded." Nothing else of the manual changes. On the Kanban
  scaffold two delivery steps close without a `finalize` (plan on `memory submit`, review on `memory approve`): there
  the last `finalize` output is stale, so the rule sends the agent to `next`; so does a resumed session, whose context
  holds no current `finalize`.
- The arm's digest: `99ea463d1b37` → `2c39a14f3f91`; baseline and baseline-docs unchanged (`964b1354526c`,
  `64e37c838830`). `campaigns/s10-calibration.dry-run.yaml` pins it (it follows the tree, as task-120 found);
  campaign-008's files keep `cc009b5a52a9`.

## Execution notes

- Red first: the manual's test failed on the old rule (checked with the manual set aside) and passes on the new.
- **For the approver, not in this task's scope:** the rule *A new instance for a new request* also says "then `wingfoil
  workflow finalize` twice …, then `wingfoil workflow next` again", the same repetition after a `finalize`; criterion 1
  keeps the rest of the manual unchanged, so it stays. A one-line follow-up if wanted.

- **Full suites** (2026-11-02, `6674a575`, under the load watcher): LINT 0, TEST 0 (1997 passed, 9 skipped), BUILD 0,
  BIN 0, DOCKER 0.

### Review

**Round 1** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review-124-htQQ`, a clone of `08d289a7`; both
checkouts unchanged). On WingFoil 0.3.1's Kanban scaffold, set up as the arm's setup does, `finalize`'s next-step
block matched `next`'s byte for byte at every step (the actions' commands and the gate's `human needed` included).
No blocker; two should-fix and two nits (one row):

| # | Finding | Outcome |
|---|---|---|
| S1 | "after each step, continue from what `finalize` printed" misses the steps a memory verb closes (plan, review) | fixed: the rule names them, and restores "(after the approver's reply)"; the digest moved to `2c39a14f3f91` |
| S2 | the Design's rationale covered the resume only | fixed |
| N | the new lines wider than the manual's; the test's title over 120 columns | fixed |

**Round 2** (2026-11-02, a fresh read-only agent in `/tmp/claude-1000/review2-124-yZ1U`, a clone of `2f7e13a9`; both
checkouts unchanged), on `08d289a7..2f7e13a9`: approved. It walked plan → build → review → deliver on 0.3.1's
scaffold (`memory submit` and `memory approve` print no next step; each `finalize` prints `next`'s block), confirmed
the digests and the test red on main's and round 1's manuals. Nits: criterion 1 quotes round 1's wording, which the
rule still meets (it only adds cases); the table's merged row; both left as they are.
