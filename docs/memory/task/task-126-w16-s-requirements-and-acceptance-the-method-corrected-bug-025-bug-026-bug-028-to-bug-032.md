---
id: task-126-w16-s-requirements-and-acceptance-the-method-corrected-bug-025-bug-026-bug-028-to-bug-032
type: task
title: "W16's requirements and acceptance: the method corrected (bug-025, bug-026, bug-028 to bug-032)"
status: draft
release: v0.3
wave: W16
features: [F4.1, F4.3, F4.5, F5.4, F5.5, F2.4]
acceptance: [scoring.feature, results.feature, runner.feature, scenarios.feature]
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

<!-- A specification change: each item is a requirement amended and its acceptance scenario written, red for the
     task that implements it. -->

1. **Content checks v2 (bug-026):** REQ-SCO-06 amended: a content check matches whole words in the agent's own text
   (what the step wrote and its commit messages), never the seed's or a template's text; a check's verdict also has a
   published human judgement against a rubric; 1.0's results get an erratum. Scenarios in `scoring.feature`.
2. **M-R2 v2 (bug-028):** REQ-SCO-07's M-R2 reads the public interface (its 1.17 definition), and the layout no
   longer counts; a version of the metric recorded with each value. Scenario in `scoring.feature`.
3. **M-K3 and M-K4 (bug-029):** REQ-SCO-08 amended: M-K3 is the cost an arm pays once (setup, configuration),
   measured where it is spent; M-K4 is "not applicable" only when the difference it divides by is within the
   variance (experiment design 1.7). Scenarios in `scoring.feature`.
4. **The variance rule on the site (bug-030):** REQ-RES-03 amended: ▲/▼ and a headline count only beyond the
   variance, on every page; a difference within it is shown without a mark. Scenarios in `results.feature`.
5. **The template cited (bug-031):** REQ-RES-05 amended: a finding note names the WingFoil template of the version it
   is filed against, read from the run, not a constant. Scenario in `results.feature`.
6. **An interrupted step's cost (bug-032):** REQ-RUN-09 amended: a step that stops early (interrupted, killed at a
   cap, failed) is recorded with the cost it spent, or at its bound when the agent reports none, and marked so.
   Scenario in `runner.feature`.
7. **S1 1.1 (bug-025):** the scenario conventions and REQ-FMT-09: S1 1.1 states step 5's requirement so that one
   reading passes (createPatch's diff); 1.0 kept, with its limit on the method page. Scenario in `scenarios.feature`.
8. The W16 tasks that follow, named in the Execution notes in plan-005's order (bug-026; bug-028 with bug-029 and
   bug-030; bug-031 with bug-032; bug-025 with S1 1.1; the M-K1 annotation; the re-scoring of v0.2's campaigns), each
   to be filed after this task's approval.
9. Checks: `pre-review.sh main` (the traceability and documentation tests); an independent review (dl-020).

## Design

<!-- Each amendment's text; the scenarios' wording; the numbering of requirements 1.49. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
