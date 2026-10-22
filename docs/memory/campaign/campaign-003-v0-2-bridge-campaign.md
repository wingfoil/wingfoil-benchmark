---
id: campaign-003-v0-2-bridge-campaign
type: campaign
title: "v0.2 bridge campaign"
status: approved
release: v0.2
campaign_file: campaigns/v0-2-bridge.yaml
campaign_id: bf3a1ac7dff5
wingfoil_commit: 12537b627ce0517222da762e8fa90997a1208a4b # v0.2.2
tags: ["campaign","v0.2"]
---

## Purpose

The bridge of release v0.2 ([dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md); experiment design 1.6 §6): v0.1's configuration, S1, S2, S3 and S8 in
baseline, baseline-docs and wingfoil on **WingFoil v0.2.2** with task-086's manual, re-run on
[campaign-002](campaign-002-v0-2-reference-campaign.md)'s model, Claude Code version, effort and scenario versions. It
links `c82a5e74885b/2` (v0.1) to campaign-002: the step `c82a5e74885b/2` → bridge changes the model, Claude Code, the
effort, the manual and the scoring code with WingFoil held at v0.2.2; the step bridge → campaign-002 changes WingFoil
v0.2.2 → v0.3.0 alone. It is not cut to fit the budget (dl-017).

**Shape:** S1@1.0 × 3 and S2, S3, S8@1.0 × 1 in the three arms, Sonnet 5.5, no slice: **18 runs**.

**Pins** (`campaigns/v0-2-bridge.yaml`): campaign-002's but the arms: WingFoil v0.2.2 (`12537b62`), its wingfoil arm
read from history by its pinned digest `680b19f27c9f` (commit `2441243b8e37`, REQ-FMT-13 as amended in 1.33); baseline
and baseline-docs at campaign-002's digests.

## Estimate and budget

`node dist/cli/main.js campaign validate campaigns/v0-2-bridge.yaml` → `campaign bf3a1ac7dff5 is valid (4 scenarios,
3 arms)`, "arm wingfoil: read from commit 2441243b8e37, which holds its pinned digest". `bench campaign estimate`: 12
keys, every one priced (the baseline's by the reference campaign's dry runs, the same key; wingfoil's and
baseline-docs' by the bridge's own); **low 7.33, high 9.80 USD; high 8.74 €**.

**Budget** (approved with task-096): `warn_eur` **12**, `ceiling_eur` **15**, 65 € with campaign-002's;
`run_cost_eur` **5**. The time: about 0.9 h of agent time.

**How it runs** (validation's chain, [task-097](../task/task-097-validation-of-v0-2-the-suites-and-one-real-agent-run-per-arm-on-the-scenario-with-the-largest-step.md)): from the main checkout, with
`BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token` (never read), `BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO`,
`BENCH_HOLDOUT_PATH`; `bench campaign validate` (every variable `set`), `bench campaign estimate`, `bench campaign run
--allow-spending`, then `bench score <id>/1 --holdout`. **The reference campaign and the bridge run one after the
other from the same benchmark commit** ([dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md) point 3), with nothing committed between them; the commit is
recorded in both elements. A run that fails is recorded; `fail_fast` stops the campaign after three runs failing with
the same error; a rerun (`--resume`) needs the approver's consent. Each run is a line of the
[v0.2 ledger](../../calibration/v0.2-ledger.md).

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
