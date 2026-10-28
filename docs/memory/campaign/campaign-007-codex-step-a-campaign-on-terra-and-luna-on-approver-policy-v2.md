---
id: campaign-007-codex-step-a-campaign-on-terra-and-luna-on-approver-policy-v2
type: campaign
title: "Codex step-A campaign on Terra and Luna, on approver policy v2"
status: draft
release: v0.3
campaign_file: campaigns/codex-terra-step-a.yaml
campaign_id: 697e79b75e41
wingfoil_commit: bd27f62afe4379dd521a386f9fa8ef260a1a64ed # v0.3.1
tags: ["campaign","codex","wingfoil","v0.3"]
---

## Purpose

The step-A wingfoil arm on Codex
([dl-027](../decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md)),
with a weak-model slice
([dl-031](../decision-log/dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13.md)):
does WingFoil 0.3.1, its workflow's cycle driven by the session agent in each step's role (dl-021 step A,
[task-114](../task/task-114-the-step-a-wingfoil-arm-on-wingfoil-0.3.1-baseline-docs-with-every-role-s-directives-dl-021-dl-027.md)),
improve Codex against its docs control and the baseline, on `gpt-5.6-terra` and on the weak `gpt-6-luna`? A campaign
outside the release cycle (dl-022), in [plan-005](../../plans/plan-005-release-v0-3.md)'s W15; its runs are lines of
`docs/calibration/v0.3-ledger.md`. It must finish by **2026-11-13**, the Codex credential's end (dl-024).

- **The file:** `campaigns/codex-terra-step-a.yaml`, extending `presets/harness-vs-docs.yaml`; id `697e79b75e41`.
- **The arms:** baseline (`964b1354526c`), baseline-docs with every role's directives (`64e37c838830`) and wingfoil
  at step A (`cf70ad7ed9aa`, WingFoil v0.3.1, `bd27f62a`), on Codex CLI 0.162.1 at `model_reasoning_effort` medium,
  approver policy v2 (dl-026).
- **The default model, `gpt-5.6-terra`:** S1 × 3, S2, S3, S8 × 1, 18 runs (dl-027): the bridge with
  [campaign-006](campaign-006-codex-harness-vs-docs-campaign-on-terra-on-approver-policy-v2.md), whose wingfoil arm
  ran v0.2's manual on WingFoil 0.3.0. That execution's wingfoil arm carries bug-036's erratum (12 of its 27 steps
  resumed on `gpt-6.1-sol`); no rerun (the approver, 2026-10-28), so the comparison carries the same note.
- **The slice, `gpt-6-luna`:** the three arms, every scenario × 3, 36 runs (dl-031): the weak model, a stand-in for
  local models, the approver's aim. Read within Luna, arm against arm (T14); preliminary.
- **What it does not measure:** governance, which needs scenarios of gates and roles (dl-029, v0.4); M-R across
  agents (no Claude Code execution of the step-A arms yet: W17).
- **The credential:** ChatGPT Plus under dl-024, as dl-025, dl-027 and dl-031 widen it (REQ-RUN-15 as amended in
  1.42), until 2026-11-13; cost API-equivalent (`price-table`), 0 € spent.
- **The cut order** (dl-031 item 5), if not every run fits: Luna's S2, S3, S8 repetitions 2 and 3 first, then the
  default model's S3, S1 × 3, S2, S8; Luna's first repetitions last.

## Estimate and budget

<!-- Output of `bench campaign estimate`; the limit that applies (API cost or subscription quota). -->

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
