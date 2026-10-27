---
id: campaign-006-codex-harness-vs-docs-campaign-on-terra-on-approver-policy-v2
type: campaign
title: "Codex harness-vs-docs campaign on Terra, on approver policy v2"
status: scored
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

- **Spending approved** by the approver (`1dc823af`), the quota read by the approver first (100 % of the 5-hour
  window, 70 % of the week); run by the agent at the approver's explicit request in chat (2026-10-26, "lancia la
  campagna"). **approved → running** on start (`af37aa5d`).
- **`13fda3099afa/1`**, `bench campaign run campaigns/codex-terra-harness-vs-docs-v2.yaml --allow-spending` from the
  main checkout, in two legs:
  1. 2026-10-26 19:50–21:43 UTC: 10 runs completed; S2 baseline-docs r1 stopped at the subscription's quota at step 2
     (its attempt kept in `attempts/1`: step 1 completed at 0.1053 USD, step 2 at 0). Leg cost 9.6570 USD.
  2. Resumed automatically at the quota's reset, at the approver's request in chat ("programma tu la ripresa al reset
     della quota"): a script read Codex's "try again at Oct 27th, 2026 12:51 AM" (UTC) from the stopped step and
     resumed (`--resume 13fda3099afa/1`) at 00:56 UTC: the 8 other runs completed, the execution `completed` at
     01:59 UTC. Leg cost 5.6630 USD.
- **Outcome:** 18 runs completed, 0 failed; one run on a second attempt (S2 baseline-docs r1, after the quota stop).
  No cap reached. Cost: 15.3200 USD, 13.6608 EUR at 0.8917 EUR/USD, API-equivalent (`price-table`), the two legs'
  totals; 0 € spent (ChatGPT Plus, dl-025). The secret scan of `results/13fda3099afa/1/` and `runs/13fda3099afa/1/`
  (plain files and every git object) after each leg: clean.
- **Interventions (approver policy v2):** the wingfoil arm 13 in its 27 steps (S1 r1 3, r2 2, r3 1, S2 1, S3 4, S8 2),
  every one "Approved. Proceed."; baseline and baseline-docs 0. No step of any arm ended still waiting (each step's
  last message read by classifier v2: none waiting). campaign-005 on v1: 1 intervention and 6 requests left unanswered.
- **Scored** (`bench score 13fda3099afa/1 --holdout ../WingFoil2-Benchmark-HoldOut`): `aggregate.json`, 12 groups;
  determinism measured in 3, n = 1 in 9.

| Scenario | Run | baseline | baseline-docs | wingfoil |
|---|---|---|---|---|
| S1 | r1 | 165/165, 48/48 | 164/165, 45/48 | 165/165, 48/48 |
| S1 | r2 | 165/165, 48/48 | 164/165, 45/48 | 164/165, 46/48 |
| S1 | r3 | 165/165, 48/48 | 165/165, 48/48 | 165/165, 48/48 |
| S2 | r1 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 |
| S3 | r1 | 34/37, 16/17, checks 0/1, M-F1 3/5 | 37/37, 16/17, checks 0/1, M-F1 4/5 | 37/37, 16/17, checks 1/1, M-F1 5/5 |
| S8 | r1 | 23/23, 6/7, checks 12/16 | 23/23, 6/7, checks 16/16 | 23/23, 6/7, checks 16/16 |

Each cell: final public tests, hold-out, then checks and M-F1 where the scenario has them; from the scoring's output.
Run costs (USD, API-equivalent): baseline 0.31–0.86, baseline-docs 0.42–0.88, wingfoil 0.61–1.58.

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
