---
id: bug-033-runner-and-tooling-edge-cases-accept-bad-input-or-report-it-wrongly
type: bug
title: "Runner and tooling edge cases accept bad input or report it wrongly"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Collected at v0.3's release-planning (2026-10-24) from the smaller items of [rel-v0-1](../release/rel-v0-1.md)'s
Retrospective and the follow-ups left in v0.2's task notes. Each is small; together they are one hygiene fix.

## Expected

The runner and its tools refuse bad input early, with the right message, and report what happened.

## Actual

1. An empty seed fails with git's message, not the benchmark's (task-005).
2. `bench run compare` without models fails obscurely (task-054).
3. `scenario dry-run`'s profile check skips the eligibility register (task-063).
4. A registry harness's commit pin is refused only at run time, after the image build, not by `campaign validate`
   (task-071).
5. `scripts/full-suites.sh`: a `git` failure in a worktree reads as clean (task-075).
6. A `run.json` holding an array passes the object check and reads as "no outcome" (task-081).
7. The landing page lists executions in file-name order (`…-10` before `…-2`); the profile pages sort numerically
   (task-084).
8. The dry run always keys on the arm digest while an unpinned campaign's estimate does not, unstated; the "the
   campaign pins" skip message is discarded by `latestDryRun` (task-096).

## Impact

Low each; items 4 and 5 can waste a build or hide a red suite.

## Resolution

One task, queued after W16's bugs ([plan-005](../../plans/plan-005-release-v0-3.md)).
