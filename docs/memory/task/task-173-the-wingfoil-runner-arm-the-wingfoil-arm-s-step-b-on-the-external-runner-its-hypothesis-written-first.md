---
id: task-173-the-wingfoil-runner-arm-the-wingfoil-arm-s-step-b-on-the-external-runner-its-hypothesis-written-first
type: task
title: "The wingfoil-runner arm: the wingfoil arm's step B on the external runner, its hypothesis written first"
status: draft
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["arm","runner","step-b","dl-037","v0.4"]
---

## Context

[dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md)'s arm, after the spike: the result of WingFoil driven by the external runner, reported
apart, never the wingfoil arm's headline, never replacing step A; on WingFoil 0.4 read against D (WingFoil's own
headless launch). Its hypothesis is written before its first run (T1: the runner and WingFoil come from the
Benchmark's maintainer). WingFoil dl-203's `coordinator` role is weighed in its design (triage row 8).
[dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)'s table gains the row for step B on the runner.

**Done** means: the arm is admitted and ready for calibration, with its hypothesis, its manual and its pins public.

## Acceptance criteria

1. The hypothesis, before any run: "per-role launches with a distinct reviewer catch more of the scenario's
   checks than step A's single session, at a cost not above step A's by more than the variance"; a failure is
   published as a finding.
2. `arms/wingfoil-runner/`: `arm.yaml` with the runner's tag and manifest digest and the arm's WingFoil pin, its
   manual, its wrapper; the same isolation, approver policy, hidden tests and hold-out rules as every arm.
3. Its records measured as every arm's: transcripts, usage including subagents, the observed model, exit status.
4. dl-021 amended (its table's row); the method page and the results pages report the arm apart.
5. Red first for every runner or wrapper code path the Benchmark writes.
6. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
