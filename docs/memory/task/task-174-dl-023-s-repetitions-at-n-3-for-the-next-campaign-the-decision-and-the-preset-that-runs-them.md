---
id: task-174-dl-023-s-repetitions-at-n-3-for-the-next-campaign-the-decision-and-the-preset-that-runs-them
type: task
title: "dl-023's repetitions at n = 3 for the next campaign: the decision and the preset that runs them"
status: backlog
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["campaign","repetitions","dl-023","v0.4"]
---

## Context

[dl-023](../decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md) planned three repetitions per scenario and arm, as campaigns of their own from a preset;
they never ran in v0.3, so its results stay preliminary (n = 1 on S2, S3, S8 and the Haiku slice; [rel-v0-3](../release/rel-v0-3.md),
"What to change" 7). The approver's decision of 2026-11-22: decided before the next campaign, and [plan-006](../../plans/plan-006-release-v0.4.md)
reads every group at n = 3 in the reference campaign. Placed before the campaign's estimate.

**Done** means: the way the reference campaign reaches n = 3 is decided by the approver and can be run.

## Acceptance criteria

1. A decision-log: n = 3 through repetition campaigns of the same key or through a preset that runs them;
   how results group the repetitions; the variance rule (bug-030) at n = 3; the cost's upper bound.
2. Red first: the preset (or the campaign option) produces the three repetitions with distinct execution ids and the
   same pins; a dry run lists them and their estimate.
3. The results pages read a group at n = 3 (characterization against a fixture of three runs).
4. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
