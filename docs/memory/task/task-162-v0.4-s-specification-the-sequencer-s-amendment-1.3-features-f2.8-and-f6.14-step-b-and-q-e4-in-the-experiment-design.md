---
id: task-162-v0.4-s-specification-the-sequencer-s-amendment-1.3-features-f2.8-and-f6.14-step-b-and-q-e4-in-the-experiment-design
type: task
title: "v0.4's specification: the sequencer's amendment 1.3, features F2.8 and F6.14, step B and Q-E4 in the experiment design"
status: in-review
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

### Review

**Round 1** (2026-11-24, reviewer: a fresh headless session of the runner's reviewer role, claude-opus-5-5, not the
building session), on branch `task/task-162-…` at `e1dccadb` (4 commits, 5 files, 172 insertions and 37 deletions by
`git diff --stat main...HEAD`, under the 1 200-line bound). Outcome: **accepted**, no blocker and no should-fix.

Checks run on the branch:

- `nice -n 19 npm run test -- test/acceptance/traceability.test.ts test/unit/docs`: 6 files, 64 tests passed (the
  coverage threshold's error is the targeted run's, not a failure).
- `nice -n 19 npm run lint` (eslint and `prettier --check .`): clean.
- `scripts/pre-review.sh main` was not run by the reviewer (a headless step runs checks only through `npm run`);
  its lint and the docs and traceability tests above cover a documentation-only diff.

Acceptance criteria, read against the diff and the sources:

1. Sequencer 1.3: W20 Foundations, W21 Step B and W25 Role isolation inserted; 1.2's W20–W22 renumbered W22–W24,
   v1.0's W26–W28, decision 4 renamed W27; dl-035 moved to v1.0; the reasons are items 9–11 under "Decisions from the
   sequencer review", Amendment 1.3. Met.
2. Features 1.7: F2.8 (reported apart, hypothesis first, spike first) and F6.14 (S11, dl-036), each with release and
   wave; amendment 12. Met.
3. Experiment design 1.14: the `wingfoil-runner` arm and step B's hypothesis, quoted from dl-037 ("Decision", R1–R6);
   Q-E4, M-E5 to M-E8, H12 and H13 match dl-036's "The question and the metrics" word for word; n = 3 in §4.6; T1 and
   T12; version entry 19. Met.
4. Requirements 1.61: REQ-CLI-03 (campaign gates), REQ-NFR-06 (ledger line), REQ-RUN-13 (quota wait), REQ-NFR-07 and
   REQ-NFR-08 (new), REQ-NFR-03, REQ-NFR-04 (review practice, test file named), REQ-RUN-22 (new), REQ-RES-03 (joining
   rule), each with acceptance or a test named; every cited id exists. Traceability 1.9 gains F2.8 and F6.14. Met.
5. rel-v0.4's Scope and plan-006's wave table list W20–W25 with the sequencer's features, uncertainties and
   "Ends with". Met (no change needed).
6. This review is the independent one (dl-020); the full suites stay for the approve step on the approver's go.

Findings:

- **nit** (process record): the start step's `wingfoil memory submit` (backlog → in-progress) has no declared-vs-observed
  note. Recorded here: declared — moves the task to in-progress; observed — commit `a6dd45a5`, status `in-progress`.
- **nit** (wording): `requirements.md`'s **Traces to** header still names only v0.2's release, as v0.3 left it; not
  changed, since 1.61's amendment cites plan-006 and the sequencer.
- **nit** (wording): "extending `docs/calibration/v0.1.md` §11" (experiment design §4.4) repeats dl-036; §11 there is
  "Hypotheses for v0.2" and H10 lives in `v0.3.md`. Kept as the decision words it; W25's specification task numbers
  H12 and H13 where the calibration places them.
