---
id: task-028-hold-out-tests-in-scoring
type: task
title: "Hold-out tests in scoring"
status: pending
release: v0.1
wave: W6
features: [F3.5]
acceptance: [scenarios.feature]
requirements: [REQ-SCO-09, REQ-CLI-06, REQ-CLI-10, REQ-ARC-03]
---

## Context

Third task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It is
the **scoring half of F3.5**, which W4 left to W6: task-016 delivered the integration half (the
hold-out's path, its additions, never read by `campaign run`) and declared `features: []` so that the
task delivering this half declares F3.5 (rel-v0-1, W4's "Due before"). The W6 plan-phase decisions are
in [task-026](task-026-oracle-suites-per-step.md).

Scope:

- **`bench score … --holdout <path>`** (or `BENCH_HOLDOUT_PATH`, REQ-CLI-10) runs each scenario
  version's hold-out additions, read through task-016's `loadHoldoutAdditions`, on the run's snapshots,
  in the scoring container of task-027, mounted read-only like the public oracle.
- **Each addition belongs to a declared suite** (task-026: `<suite-id>/` in the hold-out) and scores
  the steps that suite scores.
- **Reported apart (REQ-SCO-09):** `score.json` keeps the hold-out's M-Q1 separate from the public one;
  neither is folded into the other.
- **Without a hold-out, scoring still works** and `score.json` states that hold-out additions were not
  scored, so a published score cannot be mistaken for one that includes them.
- **Never printed:** hold-out content, test names and failure messages stay out of stdout, stderr and
  any committed file; only counts and file paths are reported (REQ-FMT-08's rule, carried to scoring).

Left to the design phase: what `score.json` records of a hold-out failure given that its messages are
not published (counts only, or messages kept outside the repository); and how a scenario version with
`holdout: true` scored without a hold-out is flagged.

**Done** means: a run of a T-scenario with hold-out additions, scored with and without the hold-out,
gives the two results the acceptance names; no hold-out text reaches any output; tests, coverage and
lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F3.5 "Hold-out additions are used for scoring only". **red-first**
- `scenarios.feature` @F3.5 @error "A missing hold-out does not break scoring of public oracles".
  **red-first**
- REQ-SCO-09 — hold-out results stored apart from the public ones in `score.json`. **red-first**
- REQ-CLI-10 — `campaign run` still never reads the hold-out, from the option or the variable
  (task-016). **characterization**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
