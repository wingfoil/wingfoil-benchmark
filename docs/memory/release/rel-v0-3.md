---
id: rel-v0-3
type: release
title: "v0.3"
status: in-development
version: v0.3
waves: [W15, W16, W17, W18, W19]
features: [F1.1, F4.1, F4.3, F2.7, F2.6, F7.5, F4.9]
---

## Goal

**WingFoil as designed, harnesses as configured.** Re-measure S1, S2, S3 and S8, in scenario versions 1.1, with an
oracle and metrics that say no more than the data, with the wingfoil arm driving WingFoil 0.3.1's workflow engine
(dl-021 step A), every harness also configured for the project, and the review loop measured in every arm. It serves
Riley (a WingFoil result that tests the engine), Avery and Dana (harnesses compared as they would use them) and the
Maintainer. The sequencer's "Broader categories" move to v0.4 (sequencer 1.2).

## Scope

Waves and features: [plan-005](../../plans/plan-005-release-v0-3.md), which holds the triage table (the approver's
decisions in chat, 2026-10-24). The specification amends `docs/02_specification/` through task-103 and each wave's
first task.

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W15 — Presets and Codex | F1.1 presets and `extends:` | the Codex spike | the Codex baseline campaign run | |
| W16 — The method corrected | F4.1 · F4.3 | — | v0.2's campaigns re-scored offline | |
| W17 — WingFoil 0.3.1, step A | F2.7 · F2.6 | the spike on 0.3.1 | an S1 dry run driving the engine | |
| W18 — Configured variants | F7.5 | the configuring agent | every arm in a dry run | |
| W19 — The review loop | F4.9 | F4.9 | the review-loop metrics in the dry runs | |

**Outside the release, by dl-022:** the Codex baseline campaign (arm A), before 2026-11-13.

**Not in v0.3:** S4, S5 with F4.6, S6, S7 (v0.4); dl-022's arm B; dl-021's steps B and C; configuration profiles;
dl-013's levels of delegation and external control (v0.4).

**Triaged** (plan-005, Context): dl-013 amended; dl-023 and dl-024 new; bug-025 to bug-034 new; v0.1's 12 smaller items
and v0.2's follow-ups merged, filed or dropped.

## Release checklist

<!-- delivery done · calibration (dry runs, budget revision) · validation · reference campaign ·
     publishing · retrospective — with links to the elements that prove each one. -->

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->

**Inputs collected for the retrospective** (input only, not acted on before it):

- 2026-10-24, the WingFoil maintainer on the wingfoil arm and WingFoil's workflow model (dl-203, the steps A, B, C):
  [docs/retrospective-inputs/v0.3/](../../retrospective-inputs/v0.3/2026-10-24-wingfoil-maintainer-the-arm-and-the-workflow-model.md).
