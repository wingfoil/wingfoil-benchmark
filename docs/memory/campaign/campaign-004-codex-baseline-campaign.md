---
id: campaign-004-codex-baseline-campaign
type: campaign
title: "Codex baseline campaign"
status: draft
release: v0.3
campaign_file: campaigns/codex-baseline.yaml
campaign_id: 4682bcc65d6b
wingfoil_commit: none # the baseline arm only
tags: ["campaign","codex","v0.3"]
---

## Purpose

[dl-022](../decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)'s
first campaign run outside the release cycle (arm A): the baseline arm on S1, S2, S3 and S8 at 1.0, on Codex CLI 0.162.1,
so that its results compare with Claude Code's baseline in campaign-002 (M-R across agents, experiment design 1.4
§4.5). It is planned in [plan-005](../../plans/plan-005-release-v0-3.md) step 1-bis, and its runs are lines of
`docs/calibration/v0.3-ledger.md`; it belongs to no release's checklist, and `release: v0.3` names the ledger only.
Its results are published only as their own cross-agent comparison, never mixed with the Claude headline (T14).

- **The file:** `campaigns/codex-baseline.yaml`, extending `presets/baseline-across-agents.yaml` (task-101); id
  `4682bcc65d6b`. Built and checked by
  [task-102](../task/task-102-codex-models-spike-prices-and-the-codex-baseline-campaign-files.md).
- **The models**, the approver's option A in task-102: `gpt-6.1-sol` by default, `gpt-5.6-terra` and `gpt-6-luna` as
  slices over the same runs (S1 × 3, S2, S3 and S8 × 1 each), all at `model_reasoning_effort` medium. Codex 0.162.1
  offers no generation-6 Terra, so the scale mixes generations; the method page says so.
- **No WingFoil:** the baseline arm only; `wingfoil_commit: none`.
- **The credential:** the ChatGPT Plus subscription under
  [dl-024](../decision-log/dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model.md), until 2026-11-13;
  the runner refuses a Codex run after that day (REQ-RUN-15 1.35).

## Estimate and budget

The dry runs: eleven on 2026-10-25 (`dry-runs/67` to `77`, every one completed with no intervention, each secret scan
clean) and S3 on Sol from task-094 (`dry-runs/20`); lines of the v0.3 ledger. `bench campaign estimate
campaigns/codex-baseline.yaml`, at `HEAD` of main:

```text
S1@1.0 baseline gpt-6.1-sol: 0.5343 USD + 35 % margin = 0.7213 USD × 3 = 2.1639 USD (1 dry run: results/dry-runs/69)
S2@1.0 baseline gpt-6.1-sol: 0.2140 USD + 35 % margin = 0.2889 USD × 1 = 0.2889 USD (1 dry run: results/dry-runs/70)
S3@1.0 baseline gpt-6.1-sol: 0.3323 USD + 35 % margin = 0.4486 USD × 1 = 0.4486 USD (1 dry run: results/dry-runs/20)
S8@1.0 baseline gpt-6.1-sol: 0.2225 USD + 35 % margin = 0.3004 USD × 1 = 0.3004 USD (1 dry run: results/dry-runs/71)
S1@1.0 baseline gpt-5.6-terra: 0.7481 USD + 35 % margin = 1.0099 USD × 3 = 3.0298 USD (1 dry run: results/dry-runs/75)
S2@1.0 baseline gpt-5.6-terra: 0.3412 USD + 35 % margin = 0.4606 USD × 1 = 0.4606 USD (1 dry run: results/dry-runs/76)
S3@1.0 baseline gpt-5.6-terra: 0.4412 USD + 35 % margin = 0.5956 USD × 1 = 0.5956 USD (1 dry run: results/dry-runs/67)
S8@1.0 baseline gpt-5.6-terra: 0.3775 USD + 35 % margin = 0.5096 USD × 1 = 0.5096 USD (1 dry run: results/dry-runs/77)
S1@1.0 baseline gpt-6-luna: 0.0126 USD + 35 % margin = 0.0171 USD × 3 = 0.0512 USD (1 dry run: results/dry-runs/72)
S2@1.0 baseline gpt-6-luna: 0.0152 USD + 35 % margin = 0.0205 USD × 1 = 0.0205 USD (1 dry run: results/dry-runs/73)
S3@1.0 baseline gpt-6-luna: 0.0124 USD + 35 % margin = 0.0167 USD × 1 = 0.0167 USD (1 dry run: results/dry-runs/68)
S8@1.0 baseline gpt-6-luna: 0.0119 USD + 35 % margin = 0.0161 USD × 1 = 0.0161 USD (1 dry run: results/dry-runs/74)
estimate: low 5.8532, mean 5.8532, high 7.9018 USD; high 7.0460 EUR at 0.8917 EUR/USD, API-equivalent
budget guard: 0.0000 + 7.0460 = 7.0460 EUR (warn 40 EUR, ceiling 50 EUR)
```

**The limit that applies is the subscription's quota, not money** (sequencer decision 1): the estimate is
API-equivalent from the pinned price table (`costBasis: price-table`), and nothing is billed per token. The Plus
quota does not show while it lasts (task-102); the approver reads what is left on the account's usage page before
the run. A session stopped at the quota with no `turn.completed` counts at its bound (REQ-RUN-09 1.35) and stops the
execution. If not every run fits by 2026-11-12 (dl-022): S3's runs on every model first, then Sol's whole campaign,
then Luna, then Terra.

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
