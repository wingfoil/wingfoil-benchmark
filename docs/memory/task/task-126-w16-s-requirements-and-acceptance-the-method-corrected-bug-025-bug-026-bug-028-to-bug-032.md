---
id: task-126-w16-s-requirements-and-acceptance-the-method-corrected-bug-025-bug-026-bug-028-to-bug-032
type: task
title: "W16's requirements and acceptance: the method corrected (bug-025, bug-026, bug-028 to bug-032)"
status: in-progress
release: v0.3
wave: W16
features: []
acceptance: []
requirements: [REQ-SCO-06, REQ-SCO-07, REQ-SCO-08, REQ-RES-03, REQ-RES-05, REQ-RUN-09, REQ-FMT-09]
fixes: []
tags: ["v0.3","specification","w16"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W16, "The method corrected": its requirements and acceptance first (delivery order
item 2), then one task per bug group. The experiment design already states the rules (task-103,
[task-103](task-103-the-v0-3-vision-and-experiment-design-amendments.md): the variance rule for ▲/▼, headline counts and M-K4); this task carries them, and the other
fixes the retrospective's bugs ask, into `requirements.md` and the acceptance features, so that each later task
starts from a stated, red-first criterion. The approver asked to start W16 in chat (2026-11-02). A specification
change: no code, no real-agent session.

The bugs: [bug-025](../bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md) (S1 1.0's bimodal step 5),
[bug-026](../bug/bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words.md) (content checks match substrings and template text),
[bug-028](../bug/bug-028-m-r2-measures-the-file-layout-not-the-public-interface.md) (M-R2 measures the layout),
[bug-029](../bug/bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance.md) (M-K3 always zero; M-K4's "not applicable" ignores the variance),
[bug-030](../bug/bug-030-the-up-and-down-marks-and-the-headline-counts-flag-differences-within-the-variance.md) (▲/▼ and headline counts within the variance),
[bug-031](../bug/bug-031-findings-cite-the-v0-2-2-template-through-template-commit.md) (`TEMPLATE_COMMIT`),
[bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md) (an interrupted step's cost).

## Acceptance criteria

<!-- A specification change. The approver's choice (chat, 2026-11-02): this task amends the requirements and drafts
     each acceptance scenario's text; the task that implements an item adds the scenario to its `.feature` with its
     test, red first (the traceability test requires a test for every scenario of a feature a started task lists). -->

1. **Content checks v2 (bug-026):** REQ-SCO-06 amended: a content check matches whole words in the agent's own text
   (what the step wrote and its commit messages), never the seed's or a template's text; a check's verdict also has a
   published human judgement against a rubric; 1.0's results get an erratum. Scenario drafted for its task
   (`scoring.feature`).
2. **M-R2 v2 (bug-028):** REQ-SCO-07's M-R2 reads the public interface (its 1.17 definition), and the layout no longer
   counts; a version of the metric recorded with each value. Scenario drafted for its task (`scoring.feature`).
3. **M-K3 and M-K4 (bug-029):** REQ-SCO-08 amended: M-K3 is the cost an arm pays once (setup, configuration), measured
   where it is spent; M-K4 is "not applicable" only when the difference it divides by is within the variance
   (experiment design 1.7). Scenario drafted for its task (`scoring.feature`).
4. **The variance rule on the site (bug-030):** REQ-RES-03 amended: ▲/▼ and a headline count only beyond the variance,
   on every page; a difference within it is shown without a mark. Scenario drafted for its task (`results.feature`).
5. **The template cited (bug-031):** REQ-RES-05 amended: a finding note names the WingFoil template of the version it
   is filed against, read from the run, not a constant. Scenario drafted for its task (`results.feature`).
6. **An interrupted step's cost (bug-032):** REQ-RUN-09 amended: a step that stops early (interrupted, killed at a
   cap, failed) is recorded with the cost it spent, or at its bound when the agent reports none, and marked so.
   Scenario drafted for its task (`runner.feature`).
7. **S1 1.1 (bug-025):** the scenario conventions' K7 (amendment 1.5) already state the 1.1 versions: no requirement
   changes; S1 1.1 states step 5's requirement so that one reading passes (createPatch's diff); 1.0 kept, with its
   limit on the method page. Scenario drafted for its task (`scenarios.feature`).
8. The W16 tasks that follow, named in the Execution notes in plan-005's order (bug-026; bug-028 with bug-029 and
   bug-030; bug-031 with bug-032; bug-025 with S1 1.1; the M-K1 annotation; the re-scoring of v0.2's campaigns), each
   to be filed after this task's approval.
9. Checks: `pre-review.sh main` (the traceability and documentation tests); an independent review (dl-020).

## Design

- **Requirements 1.49** amend REQ-SCO-06, REQ-SCO-07, REQ-SCO-08, REQ-RES-03, REQ-RES-05 and REQ-RUN-09 (each row's
  new paragraph, and the Amendment 1.49 section). The two points experiment design 1.7 left to W16: **M-K4's
  variance** applies to its quality condition ("not applicable" only when M-Q1 is worse beyond the variance), not to
  the step-cost difference, as task-103 attached it; **a preliminary difference** gets no ▲/▼ and is counted apart in
  the headline ("… and preliminary in *p* of *n*"), as is a difference within the variance.
- **The scenarios, drafted** for the tasks that implement them (each adds its scenario to the `.feature` with its test,
  red first; the task names it in `acceptance` as `<file>#<title>`):
  - `scoring.feature`, @F4.7 — "A content check passes only on whole words the agent wrote": Given a step whose added
    lines hold "unchanged" and a template comment holds "revised", When it is scored with a content check for
    "changed" / "revised", Then the check fails; And with a commit message of the agent's saying "revised D3", it
    passes. — "The maintainer's judgement is shown beside a content check's verdict": Given a judgement stored for a
    check at a step of a run, When the site is built, Then the check's verdict and the judgement are shown together,
    and a disagreement is counted.
  - `scoring.feature`, @F4.5 — "M-R2 compares the interface, not the files it lies in": Given two runs exporting the
    same functions from different files, Then M-R2 is 1; Given two runs with the same files exporting different
    functions, Then M-R2 is below 1; And each value records M-R2 version 2.
  - `scoring.feature`, @F4.4 — "Break-even is not applicable only when quality is worse beyond the variance": Given
    an arm whose final M-Q1 is lower than the baseline's within the variance (n ≥ 3 a side), Then break-even is
    computed (or "never"), not "not applicable"; Given it lower beyond the variance, Then "not applicable". — "M-K3
    counts a one-off cost once": Given an arm whose setup runs an agent, Then M-K3 is that cost, once per scenario
    version and arm.
  - `results.feature`, @F5.5 — "A difference within the variance has no mark and is not counted as better or worse":
    Given two arms with overlapping ranges (n ≥ 3), Then their comparison shows the delta with no ▲/▼, and the
    headline counts it "within the variance"; Given n < 3, Then "preliminary", no mark, counted apart; on every page.
  - `results.feature`, @F5.4 — "A finding cites the template of the WingFoil version the execution ran": Given an
    execution on WingFoil 0.3.1, When a finding is exported, Then it cites 0.3.1's template, not v0.2.2's.
  - `runner.feature`, @F2.3 — "An interrupted step keeps the cost it spent": Given a step whose agent reported usage
    before an interruption, When the runner is interrupted, Then the step is recorded `interrupted` with that cost;
    Given no usage reported, Then at its bound with `cost_reported: false`.
  - `scenarios.feature`, @F3.4 — "S1 1.1's step 5 has one reading": Given S1 1.1, Then its step 5's request states
    createPatch's diff form, and 1.0 stays registered with its limit stated.

## Execution notes

- **Deviation, the approver's choice (2026-11-02):** the scenarios are drafted here and written, with their tests, by
  the tasks that implement them: the traceability test fails on a scenario of a feature that a started task lists
  without a test (checked: a probe scenario tagged @F4.1 turned it red), and no tag marks a scenario as planned.
  `features` and `acceptance` are empty here, as task-103's.
- **Criterion 3, read for the approver:** it quotes bug-029's "not applicable only when the difference it divides by
  is within the variance"; the amendment attaches the variance to M-K4's quality condition instead (M-Q1 worse
  beyond the variance), as experiment design 1.7 and task-103's review attached it, and keeps "never" on the
  step-cost difference as a point comparison. The approver confirms or asks for the other reading at the gate.
- **The W16 tasks to file after this task's approval**, in plan-005's order: (1) content checks v2 and the rubric
  (bug-026); (2) M-R2 v2, M-K3 and M-K4, the variance rule on the site (bug-028, bug-029, bug-030); (3) the cited
  template and an interrupted step's cost (bug-031, bug-032); (4) S1 1.1 (bug-025); (5) the M-K1 annotation (plan-005
  triage item 4); (6) v0.2's campaigns re-scored offline from their transcripts. task-112 and task-113 (W16's
  backlog) stay as they are.
