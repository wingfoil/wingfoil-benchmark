---
id: campaign-003-v0-2-bridge-campaign
type: campaign
title: "v0.2 bridge campaign"
status: reviewed
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

**`bf3a1ac7dff5/1`**, 2026-10-22, 11:11:00–12:09:24 UTC (`execution.json`: `completed`), from the main checkout at the benchmark
commit **`bf60bc1f`** (`bf60bc1f9311483f57cfbcbcc7adb72bfed02714`, no change in the tree), the same for both
campaigns, nothing committed between them (dl-017 point 3). The script ran the reference campaign, then the bridge,
`bench campaign run <file> --allow-spending` each, detached from the session; the estimates as above, under each
`warn_eur`: no question asked.

- 18 runs completed, 0 failed; **7.6883 USD (6.8556 €)**, under the 8.74 € estimate's high and the 15 € ceiling; one ledger line per run ([v0.2 ledger](../../calibration/v0.2-ledger.md)).
- Every run: one attempt, the arm digest the campaign pins, Claude Code 2.1.300 at `medium`, the run's model priced
  `list` and the only model in every step; no cap reached, no `fail_fast`. The token scan of the results (`grep
  -rlFf`, the value never printed): clean; no `bench-` container left.
- **Scored** (`bench score bf3a1ac7dff5/1 --holdout …`): `aggregate.json`, 12 groups; determinism measured in 3.

| Scenario | Arm | Model | Run | Cost (USD) | Agent time | Turns | Interventions | Final public | Hold-out | Checks | M-F1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1@1.0 | baseline | Sonnet 5.5 | r1 | 0.3614 | 165 s | 21 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline | Sonnet 5.5 | r2 | 0.4349 | 237 s | 26 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline | Sonnet 5.5 | r3 | 0.3797 | 208 s | 24 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.4846 | 212 s | 31 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline-docs | Sonnet 5.5 | r2 | 0.4870 | 199 s | 29 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline-docs | Sonnet 5.5 | r3 | 0.4524 | 203 s | 26 | 0 | 158/165 | 43/48 | — | — |
| S1@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.6899 | 380 s | 47 | 0 | 158/165 | 43/48 | — | — |
| S1@1.0 | wingfoil | Sonnet 5.5 | r2 | 0.6677 | 296 s | 47 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | wingfoil | Sonnet 5.5 | r3 | 0.6647 | 265 s | 45 | 0 | 164/165 | 45/48 | — | — |
| S2@1.0 | baseline | Sonnet 5.5 | r1 | 0.2017 | 79 s | 19 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.2250 | 69 s | 19 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.3823 | 168 s | 35 | 1 | 21/24 | 16/17 | 0/3 | — |
| S3@1.0 | baseline | Sonnet 5.5 | r1 | 0.2530 | 115 s | 20 | 0 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.4331 | 181 s | 32 | 0 | 37/37 | 17/17 | 0/1 | 4/5 |
| S3@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.5330 | 251 s | 43 | 0 | 35/37 | 16/17 | 1/1 | 4/5 |
| S8@1.0 | baseline | Sonnet 5.5 | r1 | 0.2455 | 105 s | 16 | 0 | 23/23 | 7/7 | 12/16 | — |
| S8@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.3315 | 133 s | 18 | 0 | 23/23 | 7/7 | 16/16 | — |
| S8@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.4609 | 146 s | 31 | 0 | 23/23 | 7/7 | 16/16 | — |

## Results review

The approver accepted the results of `bf3a1ac7dff5/1` (scored → reviewed, run by the approver): "Results reviewed:
18 runs completed and scored, no rerun; publishable as the bridge v0.1 -> v0.2; anomalies noted: S2 wingfoil on
v0.2.2 21/24 with 3 regressions".

- **v0.1 → bridge** (`c82a5e74885b/2` → this execution, cross-model): S1 M-K1 for wingfoil 3.82 → 0.60 € a run,
  baseline-docs 2.22 → 0.42 €, M-Q1 within variance; the step changes the model, Claude Code, the effort, the manual
  and the scoring code.
- **Anomalies, none rerun:** S2's wingfoil 21/24, 16/17, checks 0/3, M-D3 3 (n = 1); S1's step 5, 158/165 in
  baseline-docs r3 and wingfoil r1.

## Findings

None exported from the bridge: its figures are the baseline of campaign-002's findings (v0.2.2 on Sonnet 5.5).
