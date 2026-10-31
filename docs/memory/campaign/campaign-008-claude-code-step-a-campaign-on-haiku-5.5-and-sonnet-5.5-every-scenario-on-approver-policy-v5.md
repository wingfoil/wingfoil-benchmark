---
id: campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5
type: campaign
title: "Claude Code step-A campaign on Haiku 5.5 and Sonnet 5.5, every scenario, on approver policy v5"
status: draft
release: v0.3
campaign_file: campaigns/claude-step-a.yaml
campaign_id: 33b54dd89e8b
wingfoil_commit: 870bd4406f3b9bba5ecde7a5f8198b80c2a98583 # v0.3.1
tags: ["campaign","claude-code","wingfoil","v0.3"]
---

## Purpose

The step-A arms under Claude Code, on a strong and a weak model, every published scenario, S10 included
([plan-005](../../plans/plan-005-release-v0-3.md)'s W17;
[dl-031](../decision-log/dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13.md),
the weak models' question on Claude;
[dl-029](../decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md) point 8, which
made it wait for S10). The approver's aim: WingFoil's benefit to weak models, and its governance benefit with strong
ones, S10 being the governance ground. A campaign outside the release cycle (dl-022); its runs are lines of
`docs/calibration/v0.3-ledger.md`. Preliminary: speed and correctness first, a defect gets a note, not a rerun.

**The approver's decisions** (in chat, 2026-10-31, "sì, tutte" to the agent's recommendations):

1. **It runs now**, not after 2026-11-13: plan-005 placed it after the ChatGPT Plus period only to leave Codex the
   room; campaign-007 is published and S10 is calibrated
   ([task-119](../task/task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029.md)).
   This paragraph records the change of plan-005's W17 timing; no decision-log.
2. **Scenario versions 1.0.** W16 has not started (S1 1.1, content checks v2 and the re-scoring do not exist); S10 is
   1.0, and 1.0 keeps the arms comparable with campaign-007's arm against arm. S1 1.0's bimodal step 5 (bug-025) and
   v0.2's content-check errata (bug-026: S2's and S3's checks are lexical) are limits of the reading.
3. **The step-A arms:** baseline (`964b1354526c`), baseline-docs with every role's directives (`64e37c838830`) and
   wingfoil at step A (`cc009b5a52a9`, WingFoil v0.3.1, bug-039's manual as rewrapped after task-119), on Claude Code
   2.1.300 at effort medium. Spec Kit and OpenSpec wait for W18's configured variants.
4. **The matrix:** S1, S2, S3, S8, S10 × the three arms × `claude-sonnet-5-5` (the default) and `claude-haiku-5-5`
   (the slice) × 3 repetitions: 90 runs. n = 3 on both models is what
   [dl-032](../decision-log/dl-032-a-weak-model-with-wingfoil-against-a-strong-model-without-it-cost-and-time-at-equal-quality-and-a-local-model-s-estimate.md)
   (Haiku with WingFoil against Sonnet without it, at equal quality) needs; its task is not opened here.
5. **One approver policy, v5, for every scenario** (S10 refuses v1 and v2; for the scenarios without verdicts v5
   behaves as v2). Campaign-007 pinned v2, so the comparisons across agents that require the same policy
   (REQ-SCO-07 as amended in 1.32 and 1.36) give no value against it: this campaign is read arm against arm and model
   against model within itself. Accepted by the approver.

**The hypotheses it reads** (written before any run):

- **S10** ([S10.md](../../02_specification/scenarios/S10.md) §9), on both models: H1 M-E2 at step 4, wingfoil ≥ its
  docs control; H2 M-E4, wingfoil ≥ its docs control; H3 M-E3, wingfoil and the docs control reconstructible, the
  baseline less; H4 no forged approval in wingfoil; H5 the agent's own approval attempts refused in wingfoil, more on
  the weak model; H6 cost (M-K1, M-K2, interventions) higher in wingfoil; H7 M-Q1, no arm loses hidden tests by
  complying. M-E3a and a refused self-approval are the two that need a mechanism (§9); v5's known reading errors
  (`docs/calibration/s10.md` §4) are the same in every arm.
- **S1–S8** ([v0.2.md](../../calibration/v0.2.md) §9, from v0.1.md §11), now that step A drives the workflow engine:
  H1 the wingfoil arm's cost relative to the baseline, below 1.5× on S1; H2 fewer turns than the baseline on S1; H3
  M-F1 ≥ 4/5 on S3; H4 S2's checks 3/3; H5 S8's rule checks 16/16, hidden tests at baseline-docs' level or above; H8
  wingfoil ÷ baseline-docs at most 1.1× in cost, with M-F1 ≥ 4/5 and S2's checks 3/3; **H11, the weak model:** the
  wingfoil arm's gain over the baseline on S1 and S3 (M-Q1, M-F1) larger on Haiku 5.5 than on Sonnet 5.5. H3 and H4
  rest on lexical checks (bug-026).
- **Cost** read by dl-033's decomposition (base and scenario-specific) where the runs allow it.

## Estimate and budget

<!-- Output of `bench campaign estimate`; the limit that applies (API cost or subscription quota). -->

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
