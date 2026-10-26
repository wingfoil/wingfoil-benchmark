---
id: campaign-005-codex-harness-vs-docs-campaign-on-terra
type: campaign
title: "Codex harness-vs-docs campaign on Terra"
status: running
release: v0.3
campaign_file: campaigns/codex-terra-harness-vs-docs.yaml
campaign_id: c4c49685911c
wingfoil_commit: cc31d7a8ca3940c6ec96dca4e0ef77f32f52dfb1 # v0.3.0
tags: ["campaign","codex","wingfoil","v0.3"]
---

## Purpose

dl-022's arm B, as [dl-025](../decision-log/dl-025-the-codex-credential-s-scope-widened-to-a-wingfoil-arm-against-its-docs-control-on-terra-dl-022-arm-b.md)
allows it: does WingFoil improve Codex on `gpt-5.6-terra`, against its docs control and the baseline, within one agent
and one model? The approver's question of 2026-10-25, after [campaign-004](campaign-004-codex-baseline-campaign.md)'s
baseline left Terra room. A campaign outside the release cycle (dl-022), planned in
[plan-005](../../plans/plan-005-release-v0-3.md)'s W15; its runs are lines of `docs/calibration/v0.3-ledger.md`.

- **The file:** `campaigns/codex-terra-harness-vs-docs.yaml`, extending `presets/harness-vs-docs.yaml`; id
  `c4c49685911c`. Built by [task-105](../task/task-105-a-wingfoil-arm-on-codex-against-its-docs-control-on-terra-dl-022-arm-b.md).
- **The arms:** baseline, baseline-docs and wingfoil (WingFoil v0.3.0, `cc31d7a8`, campaign-002's digests); S1 × 3, S2,
  S3 and S8 × 1: 18 runs, on Codex CLI 0.162.1 at `model_reasoning_effort` medium.
- **What it measures, and what not:** the wingfoil arm is v0.2's manual (WingFoil as a register of documents, its
  workflow engine not exercised; step A remeasures it). Its manual reaches Codex as `AGENTS.md`, its MCP server through
  `config.toml` (required; WingFoil v0.3.0 exposes no tool, so the agent uses the CLI). Read arm against arm within
  Codex and Terra; never mixed with the Claude headlines (T14).
- **The credential:** ChatGPT Plus under dl-024 as dl-025 widens it, until 2026-11-13.

## Estimate and budget

The dry runs: S3 baseline (`dry-runs/67`, campaign-004's), S1, S2, S8 baseline (`dry-runs/75`–`77`), S3 baseline-docs and
wingfoil (`dry-runs/78`, `79`, task-105's spike), S1, S2, S8 in baseline-docs and wingfoil (`dry-runs/80`–`85`); every
one completed with no intervention, each secret scan clean. `bench campaign estimate
campaigns/codex-terra-harness-vs-docs.yaml`, at `HEAD` of main:

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

**The limit that applies is the subscription's quota, not money** (sequencer decision 1): the estimate is
API-equivalent from the pinned price table, nothing is billed per token. If the 5-hour window runs out, the execution
stops at `quota exhausted` and resumes (`--resume`) once it resets.

## Execution

- **Spending approved** (`996e7ae5`): run by the agent at the approver's explicit request in chat (2026-10-26, "gate
  eseguito, lancia la campagna"). **approved → running** on start (`38b9883d`).
- **`c4c49685911c/1`**, `bench campaign run campaigns/codex-terra-harness-vs-docs.yaml --allow-spending` from the main
  checkout, 2026-10-26, in three legs:
  1. 10:45–12:08 UTC: S1 baseline and baseline-docs r1–r3 completed; S1 wingfoil r1 stopped at the subscription's
     quota at step 1 (0 turns, 0 cost; its attempt kept in `attempts/1`). The 5-hour window read by the approver
     before the resume: 0 % left, the week 84 % left.
  2. Resumed (`--resume c4c49685911c/1`) at 13:38 UTC, after the window reset: S1 wingfoil r1–r3, S2 and S3 baseline
     and baseline-docs completed; S3 wingfoil r1 interrupted at step 1 by an unexpected shutdown of the machine
     (0 turns, 0 cost; its attempt kept in `attempts/1`). The execution record stayed `running`; the stopped container
     (`bench-c4c49685911c-1-S3-1.0-wingfoil-gpt-5.6-terra-r1`, Codex's own stores only, the workspace bind-mounted)
     was removed so that the runner would resume.
  3. Resumed at 15:43 UTC at the approver's request ("riavvia con resume"): S3 wingfoil r1 and S8 in the three arms
     completed. Execution `completed` at 16:10 UTC.
- **Outcome:** 18 runs completed, 0 failed, no intervention; two runs took a second attempt (S1 wingfoil r1 after the
  quota stop, S3 wingfoil r1 after the shutdown). No cap reached. Cost: 14.4471 USD, 12.8825 EUR at 0.8917 EUR/USD,
  API-equivalent (`price-table`), the steps' reported costs summed; 0 € spent (ChatGPT Plus, dl-025). The secret scan
  of `results/c4c49685911c/1/` and `runs/c4c49685911c/1/` (plain files and every git object) after the first and the
  last leg: clean (the second leg's log was lost with `/tmp` in the shutdown; the last leg's scan covers the whole
  execution).
- **Scored** (`bench score c4c49685911c/1 --holdout ../WingFoil2-Benchmark-HoldOut`): `aggregate.json`, 12 groups;
  determinism measured in 3, n = 1 in 9.

| Scenario | Run | baseline | baseline-docs | wingfoil |
|---|---|---|---|---|
| S1 | r1 | 165/165, 48/48 | 165/165, 48/48 | 159/165, 48/48 |
| S1 | r2 | 165/165, 48/48 | 165/165, 48/48 | 165/165, 48/48 |
| S1 | r3 | 165/165, 48/48 | 165/165, 48/48 | 135/165, 33/48 |
| S2 | r1 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 |
| S3 | r1 | 34/37, 16/17, checks 0/1, M-F1 3/5 | 37/37, 17/17, checks 0/1, M-F1 4/5 | 30/37, 15/17, checks 1/1, M-F1 3/5 |
| S8 | r1 | 23/23, 6/7, checks 13/16 | 23/23, 6/7, checks 16/16 | 15/23, 4/7, checks 16/16 |

Each cell: final public tests, hold-out, then checks and M-F1 where the scenario has them; from the scoring's output.

- **For the results review:** the wingfoil arm's losses are steps where Codex stopped at the manual's approval gate
  and did not implement: S1 r1 step 3, S1 r3 step 5 (`dl-005 … awaiting approval`), S3 step 5 (a question to the user
  on the refund policy), S8 steps 2–4 ("Please reply: Approved. Proceed."). A non-interactive `codex exec` has no one
  to answer; 0 interventions recorded. Whether these runs measure WingFoil or
  the arm's gate wording on an unattended agent is the review's question.

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
