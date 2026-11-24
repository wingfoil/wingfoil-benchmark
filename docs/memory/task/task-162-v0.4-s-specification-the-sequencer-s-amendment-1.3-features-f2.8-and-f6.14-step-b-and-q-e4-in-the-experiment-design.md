---
id: task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design
type: task
title: "v0.4's specification: the sequencer's amendment 1.3, features F2.8 and F6.14, step B and Q-E4 in the experiment design"
status: in-progress
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-ARC-03]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["specification","v0.4"]
---

## Context

[plan-006](../../plans/plan-006-release-v0.4.md), Delivery order 1, second after task-127. The approver's scope of 2026-11-23: the
sequencer stays as it is (S4, S7, S5 with the blind judge, S6), and v0.4 also takes step B on the external runner
([dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md)), dl-023's repetitions and role isolation ([dl-036](../decision-log/dl-036-a-role-isolation-scenario-for-v0.4-s-planning-a-rule-only-the-reviewer-receives.md)). The vision does not say so yet:
the sequencer (1.2) has v0.4 as W20–W22, and no feature names step B or S11.

**Done** means: the vision and the specification describe v0.4 as [rel-v0.4](../release/rel-v0.4.md) scopes it, so that every later
wave's task can cite its feature, its requirements and its acceptance.

## Acceptance criteria

<!-- Documentation: no code, so no red-first test; the docs and traceability tests are characterization. -->

1. `docs/01_vision/07_sequencer.md` amendment 1.3: W20 (Foundations), W21 (Step B) and W25 (Role isolation)
   inserted; the sequencer's W20–W22 renumbered W22–W24 and v1.0's waves W26–W28; dl-035 moved to v1.0; the reason
   recorded under "Decisions from the sequencer review".
2. `docs/01_vision/06_features.md`: F2.8 (the wingfoil arm's step B on the external runner, reported apart) and F6.14
   (S11, role isolation, dl-036), each with its release and wave.
3. `docs/01_vision/09_experiment-design.md`: step B's arm and its hypothesis (dl-037), Q-E4 and its metric
   (dl-036), the repetitions at n = 3 (dl-023), each with its version entry.
4. `docs/02_specification/requirements.md`: the requirements W20 and W21 need first (the campaign gates, the quota
   wait and the notices, the machine preflight, the review practice where the code enforces it), each with acceptance
   or a test named; later waves' requirements are left to their own specification tasks.
5. [rel-v0.4](../release/rel-v0.4.md)'s Scope and [plan-006](../../plans/plan-006-release-v0.4.md)'s wave table agree with the amended sequencer.
6. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

Documentation only, in the order of the acceptance criteria: (1) sequencer amendment 1.3 (waves W20, W21, W25
inserted; later waves renumbered; dl-035 to v1.0; reason under "Decisions from the sequencer review"); (2) F2.8 and
F6.14 in the features; (3) step B's arm, Q-E4 and the n = 3 repetitions in the experiment design, each with a version
entry; (4) the requirements W20 and W21 need, each with acceptance or a named test; (5) rel-v0.4 and plan-006 aligned
with the sequencer; (6) pre-review, docs and traceability tests, independent review. Each document gets its version
bump as the doc-versioning directive asks. Later waves' requirements stay out of this task.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
