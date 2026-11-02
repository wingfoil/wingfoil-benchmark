---
id: task-123-the-runner-records-a-failing-verdict-hook-s-stderr-as-its-detail-bug-043
type: task
title: "The runner records a failing verdict hook's stderr as its detail (bug-043)"
status: in-progress
release: v0.3
wave: W17
features: [F2.7]
acceptance: [runner.feature]
requirements: [REQ-FMT-05]
fixes: [bug-043-the-runner-drops-a-verdict-hook-s-stderr-when-the-hook-fails-so-its-outcome-carries-no-reason]
tags: ["v0.3","runner","s10"]
---

## Context

[bug-043](../bug/bug-043-the-runner-drops-a-verdict-hook-s-stderr-when-the-hook-fails-so-its-outcome-carries-no-reason.md) (approved): when the verdict hook itself fails (exits non-zero, or the exec throws), the
runner records `failed (exit N)` and drops the hook's stderr, the same loss bug-041 fixed one level down. Never
observed in a run. The approver asked for its task in chat (2026-11-01). Placed in v0.3, W17. No real-agent session.

## Acceptance criteria

1. **Red-first:** a runner test with a hook that exits non-zero with a message on stderr: `verdicts.json`'s
   `carried_out` is `{outcome: 'failed (exit N)', detail: <its last non-blank stderr line, at most 500 characters>,
   commits}`; an exec that throws records the error's message as `detail` (`failed (exit -1)`); a failing hook with
   an empty stderr records no `detail`; a hook that succeeds keeps its own JSON line's `detail` (task-120), stderr
   ignored.
2. REQ-FMT-05's amendment (1.46) extended, or a new amendment, to say that `detail` also carries a failing hook's
   own stderr; the scoring's ledger schema unchanged (it already accepts `detail`).
3. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites on the approver's go; an independent
   review (dl-020).

## Design

- `src/runner/run.ts`, `deliver`: when the hook's run is not timed out and its exit code is not 0 (a run that throws is
  recorded as exit -1 with the error as its stderr, as before), its answer is read from its stderr instead of its
  stdout: `stderrDetail` keeps the last non-blank line, trimmed, cut at 500 code points (`DETAIL_LIMIT`, the cut the
  wingfoil hook applies to WingFoil's own, task-120, which also prefers an `error:` line); an empty stderr gives no
  `detail`. A hook that succeeds is read from its stdout as before.
- REQ-FMT-05 amended in 1.48; the scoring's ledger schema unchanged (it accepts `detail` since task-120).

## Execution notes

- Criterion 1's "the error's message" for an exec that throws is recorded as the error as text (`Error: <message>`),
  as REQ-FMT-05's 1.48 text says.
- Red first: the four new cases (a last non-blank line, stderr over stdout, the 500-character cut, an exec that
  throws) failed before the change; the empty-stderr case passed before and after (it characterizes no `detail`).

- **Full suites** (2026-11-02, `d204cff2`, under the load watcher): LINT 0, TEST 0 (2002 passed, 9 skipped), BUILD 0,
  BIN 0, DOCKER 0.

### Review

**Round 1** (2026-11-01, a fresh read-only agent in `/tmp/claude-1000/review-123-MWVS`, a clone of `3324dfe0`; both
checkouts unchanged by it, main moved by the approver's approvals of bug-044 and task-124). Correct and complete;
red first confirmed (4 failed, 1 passed on main's runner). Two should-fix and five nits:

| # | Finding | Outcome |
|---|---|---|
| S1 | the code-point cut was not pinned (`é` is one UTF-16 unit) | fixed: an astral character |
| S2 | no test for a succeeding hook with a stderr (criterion 1) | fixed: its own line's `detail`, stderr ignored |
| N | the throw test's name and REQ-FMT-05's "error's message" (it is the error as text); comments overstating the parallel with the hook; `Delivery.carried_out.detail`'s doc comment; a 121-column comment | fixed |

**Round 2** (2026-11-01, a fresh read-only agent in `/tmp/claude-1000/review2-123-K7CZ`, a clone of `ab81c80b`; both
checkouts unchanged), on `3324dfe0..ab81c80b`: round 1 resolved; both pinning tests fail when the change they guard is
undone. One optional nit (criterion 1's wording of a throw): stated in the Execution notes.
