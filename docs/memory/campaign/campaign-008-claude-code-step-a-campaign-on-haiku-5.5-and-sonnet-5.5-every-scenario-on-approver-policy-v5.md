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

**The dry runs** (the approver's consent in chat, 2026-10-31: the 17 the estimate lacked, then two more for S10's
wingfoil arm at the pinned digest, 19 in all, 5 € ceiling): one at a time from the main checkout,
`campaigns/claude-step-a.dry-run.yaml`, Haiku first, each started under the load watcher and a budget guard on their
own cost; each scored with the hold-out; a ledger line each. S10's dry runs 132 and 135 ran wingfoil at
`e3f9f11f0f4d` (the manual before its rewrap) and price nothing for `cc009b5a52a9`. The baseline's other keys read
dry runs of v0.2's calibration (same digest, model and effort; approver policy v1, which the baseline never meets);
S10's baseline and baseline-docs read task-119's four rounds (policies v3 to v5). Figures generated from the runs'
files.

| Model | Scenario | Arm | Dry run | Final, hold-out (last step) | Interventions | Cost | Agent time |
|---|---|---|---|---|---|---|---|
| claude-haiku-5-5 | S1 | baseline-docs | `dry-runs/136` | 164/165, 30/33 | 0 | 0.1172 USD | 9.8 min |
| claude-haiku-5-5 | S1 | wingfoil | `dry-runs/137` | 164/165, 30/33 | 5 | 0.1429 USD | 10.8 min |
| claude-haiku-5-5 | S2 | baseline | `dry-runs/138` | 24/24, 17/17 | 0 | 0.0298 USD | 1.8 min |
| claude-haiku-5-5 | S2 | baseline-docs | `dry-runs/139` | 24/24, 17/17 | 0 | 0.0371 USD | 2.2 min |
| claude-haiku-5-5 | S2 | wingfoil | `dry-runs/140` | 24/24, 17/17 | 3 | 0.0684 USD | 4.4 min |
| claude-haiku-5-5 | S3 | baseline-docs | `dry-runs/141` | 35/37, 16/17 | 1 | 0.0667 USD | 4.8 min |
| claude-haiku-5-5 | S3 | wingfoil | `dry-runs/142` | 37/37, 17/17 | 5 | 0.1379 USD | 9.1 min |
| claude-haiku-5-5 | S8 | baseline | `dry-runs/143` | 23/23, 7/7 | 0 | 0.0294 USD | 2.1 min |
| claude-haiku-5-5 | S8 | baseline-docs | `dry-runs/144` | 23/23, 7/7 | 0 | 0.0499 USD | 3.6 min |
| claude-haiku-5-5 | S8 | wingfoil | `dry-runs/145` | 23/23, 7/7 | 6 | 0.0869 USD | 6.6 min |
| claude-haiku-5-5 | S10 | wingfoil | `dry-runs/146` | 11/14, 6/8 | 6 | 0.0768 USD | 5.1 min |
| claude-sonnet-5-5 | S1 | wingfoil | `dry-runs/147` | 164/165, 30/33 | 5 | 0.8029 USD | 4.7 min |
| claude-sonnet-5-5 | S2 | baseline-docs | `dry-runs/148` | 24/24, 17/17 | 0 | 0.2526 USD | 1.0 min |
| claude-sonnet-5-5 | S2 | wingfoil | `dry-runs/149` | 24/24, 17/17 | 3 | 0.3530 USD | 1.7 min |
| claude-sonnet-5-5 | S3 | baseline-docs | `dry-runs/150` | 37/37, 17/17 | 0 | 0.4575 USD | 2.4 min |
| claude-sonnet-5-5 | S3 | wingfoil | `dry-runs/151` | 37/37, 17/17 | 5 | 0.5953 USD | 3.2 min |
| claude-sonnet-5-5 | S8 | baseline-docs | `dry-runs/152` | 23/23, 6/7 | 0 | 0.3138 USD | 1.6 min |
| claude-sonnet-5-5 | S8 | wingfoil | `dry-runs/153` | 23/23, 7/7 | 4 | 0.5005 USD | 2.8 min |
| claude-sonnet-5-5 | S10 | wingfoil | `dry-runs/154` | 14/14, 8/8 | 7 | 0.5605 USD | 3.1 min |

- claude-haiku-5-5: 11 dry runs, 0.8431 USD, 60.4 min of agent time.
- claude-sonnet-5-5: 8 dry runs, 3.8361 USD, 20.5 min of agent time.

- **Spent on the dry runs:** 4.6792 USD, 4.1724 € of the 5 € ceiling (the runs' usage files).
- **Secret scan** of `results/dry-runs/136`–`154` and `runs/dry-runs/136`–`154` (plain files and every git object of
  the workspaces; Anthropic and OpenAI key shapes, JWTs, `access_token`/`refresh_token`/`id_token` values): clean.
  A first pass matched `sk-` inside WingFoil's task ids (`task-002-…`); the pattern was anchored and rerun.
- **Read nothing into these** (n = 1 each); every dry run completed, no cap reached.

`bench campaign estimate campaigns/claude-step-a.yaml`:

```text
S1@1.0 baseline claude-sonnet-5-5: 0.3393 USD + 35 % margin = 0.4581 USD × 3 = 1.3744 USD (1 dry run: results/dry-runs/41)
S1@1.0 baseline-docs claude-sonnet-5-5: 0.5028 USD + 35 % margin = 0.6788 USD × 3 = 2.0363 USD (1 dry run: results/dry-runs/89)
S1@1.0 wingfoil claude-sonnet-5-5: 0.8029 USD + 35 % margin = 1.0839 USD × 3 = 3.2517 USD (1 dry run: results/dry-runs/147)
S2@1.0 baseline claude-sonnet-5-5: 0.2131 USD + 35 % margin = 0.2877 USD × 3 = 0.8632 USD (1 dry run: results/dry-runs/29)
S2@1.0 baseline-docs claude-sonnet-5-5: 0.2526 USD + 35 % margin = 0.3409 USD × 3 = 1.0228 USD (1 dry run: results/dry-runs/148)
S2@1.0 wingfoil claude-sonnet-5-5: 0.3530 USD + 35 % margin = 0.4765 USD × 3 = 1.4295 USD (1 dry run: results/dry-runs/149)
S3@1.0 baseline claude-sonnet-5-5: low 0.2690, mean 0.2699, high 0.2707 USD × 3 = 0.8122 USD (2 dry runs: results/dry-runs/22, results/dry-runs/21)
S3@1.0 baseline-docs claude-sonnet-5-5: 0.4575 USD + 35 % margin = 0.6177 USD × 3 = 1.8530 USD (1 dry run: results/dry-runs/150)
S3@1.0 wingfoil claude-sonnet-5-5: 0.5953 USD + 35 % margin = 0.8037 USD × 3 = 2.4110 USD (1 dry run: results/dry-runs/151)
S8@1.0 baseline claude-sonnet-5-5: 0.2366 USD + 35 % margin = 0.3195 USD × 3 = 0.9584 USD (1 dry run: results/dry-runs/35)
S8@1.0 baseline-docs claude-sonnet-5-5: 0.3138 USD + 35 % margin = 0.4236 USD × 3 = 1.2709 USD (1 dry run: results/dry-runs/152)
S8@1.0 wingfoil claude-sonnet-5-5: 0.5005 USD + 35 % margin = 0.6757 USD × 3 = 2.0271 USD (1 dry run: results/dry-runs/153)
S10@1.0 baseline claude-sonnet-5-5: low 0.2771, mean 0.3109, high 0.3428 USD × 3 = 1.0285 USD (4 dry runs: results/dry-runs/133, results/dry-runs/127, results/dry-runs/121, results/dry-runs/115)
S10@1.0 baseline-docs claude-sonnet-5-5: low 0.3488, mean 0.3662, high 0.3891 USD × 3 = 1.1674 USD (4 dry runs: results/dry-runs/134, results/dry-runs/128, results/dry-runs/122, results/dry-runs/116)
S10@1.0 wingfoil claude-sonnet-5-5: 0.5605 USD + 35 % margin = 0.7567 USD × 3 = 2.2700 USD (1 dry run: results/dry-runs/154)
S1@1.0 baseline claude-haiku-5-5: 0.0604 USD + 35 % margin = 0.0815 USD × 3 = 0.2445 USD (1 dry run: results/dry-runs/58)
S1@1.0 baseline-docs claude-haiku-5-5: 0.1172 USD + 35 % margin = 0.1582 USD × 3 = 0.4747 USD (1 dry run: results/dry-runs/136)
S1@1.0 wingfoil claude-haiku-5-5: 0.1429 USD + 35 % margin = 0.1929 USD × 3 = 0.5787 USD (1 dry run: results/dry-runs/137)
S2@1.0 baseline claude-haiku-5-5: 0.0298 USD + 35 % margin = 0.0402 USD × 3 = 0.1207 USD (1 dry run: results/dry-runs/138)
S2@1.0 baseline-docs claude-haiku-5-5: 0.0371 USD + 35 % margin = 0.0501 USD × 3 = 0.1504 USD (1 dry run: results/dry-runs/139)
S2@1.0 wingfoil claude-haiku-5-5: 0.0684 USD + 35 % margin = 0.0924 USD × 3 = 0.2772 USD (1 dry run: results/dry-runs/140)
S3@1.0 baseline claude-haiku-5-5: 0.0404 USD + 35 % margin = 0.0545 USD × 3 = 0.1635 USD (1 dry run: results/dry-runs/56)
S3@1.0 baseline-docs claude-haiku-5-5: 0.0667 USD + 35 % margin = 0.0901 USD × 3 = 0.2703 USD (1 dry run: results/dry-runs/141)
S3@1.0 wingfoil claude-haiku-5-5: 0.1379 USD + 35 % margin = 0.1861 USD × 3 = 0.5583 USD (1 dry run: results/dry-runs/142)
S8@1.0 baseline claude-haiku-5-5: 0.0294 USD + 35 % margin = 0.0397 USD × 3 = 0.1191 USD (1 dry run: results/dry-runs/143)
S8@1.0 baseline-docs claude-haiku-5-5: 0.0499 USD + 35 % margin = 0.0674 USD × 3 = 0.2022 USD (1 dry run: results/dry-runs/144)
S8@1.0 wingfoil claude-haiku-5-5: 0.0869 USD + 35 % margin = 0.1173 USD × 3 = 0.3520 USD (1 dry run: results/dry-runs/145)
S10@1.0 baseline claude-haiku-5-5: low 0.0378, mean 0.0402, high 0.0438 USD × 3 = 0.1313 USD (4 dry runs: results/dry-runs/130, results/dry-runs/124, results/dry-runs/118, results/dry-runs/112)
S10@1.0 baseline-docs claude-haiku-5-5: low 0.0496, mean 0.0540, high 0.0592 USD × 3 = 0.1777 USD (4 dry runs: results/dry-runs/131, results/dry-runs/125, results/dry-runs/119, results/dry-runs/113)
S10@1.0 wingfoil claude-haiku-5-5: 0.0768 USD + 35 % margin = 0.1037 USD × 3 = 0.3111 USD (1 dry run: results/dry-runs/146)
estimate: low 21.1624, mean 21.3390, high 27.9082 USD; high 24.8857 EUR at 0.8917 EUR/USD, API-equivalent
budget guard: 0.0000 + 24.8857 = 24.8857 EUR (warn 25 EUR, ceiling 30 EUR)
```

**The limit that applies is money** (API-equivalent through the agent's credential, as task-119's runs): the
estimate's high, 24.8857 €, is under the 30 € ceiling and just under the 25 € warning. Agent time from the dry runs:
about 5.5 min a run on Haiku 5.5 and 2.6 min on Sonnet 5.5, so the 90 runs take about six hours one at a
time.

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
