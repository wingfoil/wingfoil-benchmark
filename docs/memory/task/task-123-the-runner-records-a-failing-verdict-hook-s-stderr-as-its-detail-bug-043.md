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
  stdout: `stderrDetail` keeps the last non-blank line, trimmed, cut at 500 code points (`DETAIL_LIMIT`, the wingfoil
  hook's cut, task-120); an empty stderr gives no `detail`. A hook that succeeds is read from its stdout as before.
- REQ-FMT-05 amended in 1.48; the scoring's ledger schema unchanged (it accepts `detail` since task-120).

## Execution notes

- Red first: the four new cases (a last non-blank line, stderr over stdout, the 500-character cut, an exec that
  throws) failed before the change; the empty-stderr case passed before and after (it characterizes no `detail`).
