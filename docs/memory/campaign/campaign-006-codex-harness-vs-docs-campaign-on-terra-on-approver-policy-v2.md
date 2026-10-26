---
id: campaign-006-codex-harness-vs-docs-campaign-on-terra-on-approver-policy-v2
type: campaign
title: "Codex harness-vs-docs campaign on Terra, on approver policy v2"
status: running
release: v0.3
campaign_file: campaigns/codex-terra-harness-vs-docs-v2.yaml
campaign_id: 13fda3099afa
wingfoil_commit: cc31d7a8ca3940c6ec96dca4e0ef77f32f52dfb1 # v0.3.0
tags: ["campaign","codex","wingfoil","v0.3"]
---

## Purpose

dl-022's arm B rerun, as [dl-025](../decision-log/dl-025-the-codex-credential-s-scope-widened-to-a-wingfoil-arm-against-its-docs-control-on-terra-dl-022-arm-b.md)
allows it: does WingFoil improve Codex on `gpt-5.6-terra`, against its docs control and the baseline, within one agent
and one model? [campaign-005](campaign-005-codex-harness-vs-docs-campaign-on-terra.md) asked it and could not
answer: approver policy v1 missed six of Codex's seven approval requests in the wingfoil arm
([bug-035](../bug/bug-035-the-approval-classifier-v1-misses-codex-s-approval-requests.md)), so its execution measured
the manual's stops more than WingFoil. The approver chose the rerun (2026-10-26) once
[task-106](../task/task-106-classifier-v2-an-approval-request-needs-a-requester-and-codex-s-requests-are-recognised.md)
implemented policy v2 ([dl-026](../decision-log/dl-026-waiting-for-input-classifier-v2.md)). A campaign outside the
release cycle (dl-022), in [plan-005](../../plans/plan-005-release-v0-3.md)'s W15; its runs are lines of
`docs/calibration/v0.3-ledger.md`.

- **The file:** `campaigns/codex-terra-harness-vs-docs-v2.yaml`, campaign-005's file with one pin changed,
  `approver_policy: v2`; id `13fda3099afa`.
- **The arms:** baseline, baseline-docs and wingfoil (WingFoil v0.3.0, `cc31d7a8`, campaign-002's digests); S1 × 3, S2,
  S3 and S8 × 1: 18 runs, on Codex CLI 0.162.1 at `model_reasoning_effort` medium.
- **What it measures, and what not:** as campaign-005: the wingfoil arm is v0.2's manual (WingFoil as a register of
  documents, its workflow engine not exercised; step A remeasures it), its manual as `AGENTS.md`, its MCP server in
  `config.toml`. Read arm against arm within Codex and Terra; never mixed with the Claude headlines (T14), and **not
  compared across agents** with the v1 executions: M-R across needs one approver policy.
- **What to read against campaign-005:** the same pins but the policy, so the difference between the two executions'
  wingfoil arms is the approver's answers (interventions per arm are reported).
- **The credential:** ChatGPT Plus under dl-024 as dl-025 widens it, until 2026-11-13.

## Estimate and budget

No new dry run: the estimate's key is scenario, arm, model and effort, not the approver policy, so it reads the dry
runs campaign-005's did (`dry-runs/67`, `75`–`85`). `bench campaign estimate
campaigns/codex-terra-harness-vs-docs-v2.yaml`, at `HEAD` of main:

```text
S1@1.0 baseline gpt-5.6-terra: 0.7481 USD + 35 % margin = 1.0099 USD × 3 = 3.0298 USD (1 dry run: results/dry-runs/75)
S1@1.0 baseline-docs gpt-5.6-terra: 0.9369 USD + 35 % margin = 1.2648 USD × 3 = 3.7944 USD (1 dry run: results/dry-runs/80)
S1@1.0 wingfoil gpt-5.6-terra: 1.2115 USD + 35 % margin = 1.6356 USD × 3 = 4.9068 USD (1 dry run: results/dry-runs/81)
S2@1.0 baseline gpt-5.6-terra: 0.3412 USD + 35 % margin = 0.4606 USD × 1 = 0.4606 USD (1 dry run: results/dry-runs/76)
S2@1.0 baseline-docs gpt-5.6-terra: 0.4254 USD + 35 % margin = 0.5743 USD × 1 = 0.5743 USD (1 dry run: results/dry-runs/82)
S2@1.0 wingfoil gpt-5.6-terra: 0.4577 USD + 35 % margin = 0.6179 USD × 1 = 0.6179 USD (1 dry run: results/dry-runs/83)
S3@1.0 baseline gpt-5.6-terra: 0.4412 USD + 35 % margin = 0.5956 USD × 1 = 0.5956 USD (1 dry run: results/dry-runs/67)
S3@1.0 baseline-docs gpt-5.6-terra: 0.7005 USD + 35 % margin = 0.9457 USD × 1 = 0.9457 USD (1 dry run: results/dry-runs/78)
S3@1.0 wingfoil gpt-5.6-terra: 0.8499 USD + 35 % margin = 1.1473 USD × 1 = 1.1473 USD (1 dry run: results/dry-runs/79)
S8@1.0 baseline gpt-5.6-terra: 0.3775 USD + 35 % margin = 0.5096 USD × 1 = 0.5096 USD (1 dry run: results/dry-runs/77)
S8@1.0 baseline-docs gpt-5.6-terra: 0.5767 USD + 35 % margin = 0.7785 USD × 1 = 0.7785 USD (1 dry run: results/dry-runs/84)
S8@1.0 wingfoil gpt-5.6-terra: 0.5676 USD + 35 % margin = 0.7663 USD × 1 = 0.7663 USD (1 dry run: results/dry-runs/85)
estimate: low 13.4272, mean 13.4272, high 18.1267 USD; high 16.1636 EUR at 0.8917 EUR/USD, API-equivalent
budget guard: 0.0000 + 16.1636 = 16.1636 EUR (warn 40 EUR, ceiling 50 EUR)
```

**A lower bound for the wingfoil arm.** In its four dry runs (79, 81, 83, 85) 9 of 17 steps stopped at a request v1
missed and ended without their work; v2 answers them, so those steps will do more. For scale, campaign-005's measured
cost was 14.45 USD API-equivalent for the 18 runs, below this estimate's high 18.13 USD, its wingfoil runs included.

**The limit that applies is the subscription's quota, not money** (sequencer decision 1): nothing is billed per token,
0 € spent. campaign-005 needed about two 5-hour windows; if the window runs out, the execution stops at
`quota exhausted` and resumes (`--resume`) once it resets.

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
