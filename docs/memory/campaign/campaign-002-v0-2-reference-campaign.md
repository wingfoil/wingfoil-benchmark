---
id: campaign-002-v0-2-reference-campaign
type: campaign
title: "v0.2 reference campaign"
status: reviewed
release: v0.2
campaign_file: campaigns/v0-2-reference.yaml
campaign_id: 81ebb2691f9c
wingfoil_commit: cc31d7a8ca3940c6ec96dca4e0ef77f32f52dfb1 # v0.3.0
tags: ["campaign","v0.2"]
---

## Purpose

The reference campaign of release v0.2 ([rel-v0-2](../release/rel-v0-2.md) Goal;
[plan-004](../../plans/plan-004-release-v0-2.md) step 5, `release-cycle` › `campaign`, run through `campaign-cycle`),
after calibration ([task-096](../task/task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget.md), the revised budget approved) and validation ([task-097](../task/task-097-validation-of-v0-2-the-suites-and-one-real-agent-run-per-arm-on-the-scenario-with-the-largest-step.md)). Its bridge is
[campaign-003](campaign-003-v0-2-bridge-campaign.md); the comparisons `c82a5e74885b/2` → bridge → this campaign
(F5.2, dl-017) and the verification of dl-147 (M-K1 on S1, H1) follow its scoring.

**Shape** ([09_experiment-design.md](../../01_vision/09_experiment-design.md) 1.6 §6):

| Part | Scenarios | Arms | Model | Repetitions | Runs |
|---|---|---|---|---|---|
| Main | S1@1.0 | the seven | Sonnet 5.5 | 3 | 21 |
| Main | S2@1.0, S3@1.0, S8@1.0 | the seven | Sonnet 5.5 | 1 | 21 |
| Opus 5.5 slice | S1@1.0 | baseline, baseline-docs, wingfoil | Opus 5.5 | 1 | 3 |
| Haiku 5.5 rung | S1@1.0, S3@1.0 | baseline, wingfoil | Haiku 5.5 | 1 | 4 |
| | | | | | **49** |

The seven arms: baseline, baseline-docs, wingfoil, speckit, speckit-docs, openspec, openspec-docs.

**Pins** (`campaigns/v0-2-reference.yaml`, calibration §1 and §7): WingFoil **v0.3.0** (`cc31d7a8`, task-095), Spec Kit
v1.1.0, OpenSpec 1.14.0; Claude Code **2.1.300**, effort `medium` for the three models; approver policy `v1`; caps
1800 s, 10 M tokens, 5 € a run; `fail_fast` after three same errors; rate 0.8917 (ECB, 2026-10-20); every arm's
digest (openspec `1ba12def23cf`, bug-023's fix).

## Estimate and budget

`node dist/cli/main.js campaign validate campaigns/v0-2-reference.yaml` → `campaign 81ebb2691f9c is valid (4
scenarios, 7 arms)`. `bench campaign estimate`, from calibration's dry runs ([v0.2.md](../../calibration/v0.2.md)
§6): 35 keys, every one priced; **low 27.08, high 36.46 USD; high 32.51 €** at 0.8917 EUR/USD, API-equivalent.

**Budget** (approved with task-096): `warn_eur` **40**, `ceiling_eur` **50**, with the bridge's 15 € **65 € for both**
(dl-012's campaign-wide ceiling); `run_cost_eur` **5**. The estimate is below the warning, so `campaign run` asks
nothing and can run in the background.

**The limit that applies:** the agent runs on the maintainer's subscription; nothing is billed per token (sequencer
decision 1); the figures are the API-equivalent the agent reports. A 429 is waited out (task-051).

**Time:** calibration's agent time for these keys sums to about **3 h** for the 49 runs, plus container setup and the
harness builds; the bridge about 0.9 h more.

**How it runs** (validation's chain, [task-097](../task/task-097-validation-of-v0-2-the-suites-and-one-real-agent-run-per-arm-on-the-scenario-with-the-largest-step.md)): from the main checkout, with
`BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token` (never read), `BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO`,
`BENCH_HOLDOUT_PATH`; `bench campaign validate` (every variable `set`), `bench campaign estimate`, `bench campaign run
--allow-spending`, then `bench score <id>/1 --holdout`. **The reference campaign and the bridge run one after the
other from the same benchmark commit** ([dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md) point 3), with nothing committed between them; the commit is
recorded in both elements. A run that fails is recorded; `fail_fast` stops the campaign after three runs failing with
the same error; a rerun (`--resume`) needs the approver's consent. Each run is a line of the
[v0.2 ledger](../../calibration/v0.2-ledger.md).

## Execution

**`81ebb2691f9c/1`**, 2026-10-22, 07:52:58–11:11:00 UTC (`execution.json`: `completed`), from the main checkout at the benchmark
commit **`bf60bc1f`** (`bf60bc1f9311483f57cfbcbcc7adb72bfed02714`, no change in the tree), the same for both
campaigns, nothing committed between them (dl-017 point 3). The script ran the reference campaign, then the bridge,
`bench campaign run <file> --allow-spending` each, detached from the session; the estimates as above, under each
`warn_eur`: no question asked.

- 49 runs completed, 0 failed; **27.2624 USD (24.3099 €)**, under the 32.51 € estimate's high and the 50 € ceiling; one ledger line per run ([v0.2 ledger](../../calibration/v0.2-ledger.md)).
- Every run: one attempt, the arm digest the campaign pins, Claude Code 2.1.300 at `medium`, the run's model priced
  `list` and the only model in every step; no cap reached, no `fail_fast`. The token scan of the results (`grep
  -rlFf`, the value never printed): clean; no `bench-` container left.
- **Scored** (`bench score 81ebb2691f9c/1 --holdout …`): `aggregate.json`, 28 groups, 7 slices; determinism measured in 7.

| Scenario | Arm | Model | Run | Cost (USD) | Agent time | Turns | Interventions | Final public | Hold-out | Checks | M-F1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1@1.0 | baseline | Haiku 5.5 | r1 | 0.0583 | 322 s | 49 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline | Opus 5.5 | r1 | 1.9507 | 529 s | 52 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | baseline | Sonnet 5.5 | r1 | 0.3599 | 154 s | 24 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline | Sonnet 5.5 | r2 | 0.3870 | 195 s | 23 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | baseline | Sonnet 5.5 | r3 | 0.4153 | 199 s | 24 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | baseline-docs | Opus 5.5 | r1 | 2.3758 | 732 s | 54 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.5404 | 253 s | 34 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | baseline-docs | Sonnet 5.5 | r2 | 0.5180 | 218 s | 29 | 0 | 158/165 | 43/48 | — | — |
| S1@1.0 | baseline-docs | Sonnet 5.5 | r3 | 0.4921 | 225 s | 26 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | openspec | Sonnet 5.5 | r1 | 0.9669 | 333 s | 75 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | openspec | Sonnet 5.5 | r2 | 0.8646 | 350 s | 70 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | openspec | Sonnet 5.5 | r3 | 1.0141 | 401 s | 82 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | openspec-docs | Sonnet 5.5 | r1 | 0.4000 | 222 s | 28 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | openspec-docs | Sonnet 5.5 | r2 | 0.4059 | 199 s | 27 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | openspec-docs | Sonnet 5.5 | r3 | 0.4167 | 192 s | 27 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | speckit | Sonnet 5.5 | r1 | 0.6077 | 260 s | 39 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | speckit | Sonnet 5.5 | r2 | 0.5428 | 217 s | 38 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | speckit | Sonnet 5.5 | r3 | 0.5701 | 250 s | 31 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | speckit-docs | Sonnet 5.5 | r1 | 0.3865 | 179 s | 25 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | speckit-docs | Sonnet 5.5 | r2 | 0.4323 | 196 s | 28 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | speckit-docs | Sonnet 5.5 | r3 | 0.3590 | 164 s | 24 | 0 | 165/165 | 48/48 | — | — |
| S1@1.0 | wingfoil | Haiku 5.5 | r1 | 0.1455 | 660 s | 126 | 3 | 165/165 | 48/48 | — | — |
| S1@1.0 | wingfoil | Opus 5.5 | r1 | 2.6549 | 658 s | 68 | 3 | 165/165 | 48/48 | — | — |
| S1@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.6743 | 292 s | 42 | 0 | 164/165 | 45/48 | — | — |
| S1@1.0 | wingfoil | Sonnet 5.5 | r2 | 0.6730 | 322 s | 44 | 1 | 164/165 | 45/48 | — | — |
| S1@1.0 | wingfoil | Sonnet 5.5 | r3 | 0.6231 | 274 s | 42 | 0 | 164/165 | 45/48 | — | — |
| S2@1.0 | baseline | Sonnet 5.5 | r1 | 0.2419 | 63 s | 22 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.2761 | 89 s | 24 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | openspec | Sonnet 5.5 | r1 | 0.6010 | 183 s | 54 | 0 | 24/24 | 17/17 | 3/3 | — |
| S2@1.0 | openspec-docs | Sonnet 5.5 | r1 | 0.2028 | 74 s | 19 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | speckit | Sonnet 5.5 | r1 | 0.2762 | 84 s | 24 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | speckit-docs | Sonnet 5.5 | r1 | 0.2085 | 85 s | 20 | 0 | 24/24 | 17/17 | 2/3 | — |
| S2@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.2957 | 88 s | 25 | 0 | 24/24 | 17/17 | 2/3 | — |
| S3@1.0 | baseline | Haiku 5.5 | r1 | 0.0457 | 229 s | 60 | 0 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.0 | baseline | Sonnet 5.5 | r1 | 0.2829 | 139 s | 24 | 0 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.4247 | 177 s | 33 | 0 | 37/37 | 17/17 | 0/1 | 4/5 |
| S3@1.0 | openspec | Sonnet 5.5 | r1 | 0.8981 | 279 s | 83 | 0 | 37/37 | 17/17 | 1/1 | 5/5 |
| S3@1.0 | openspec-docs | Sonnet 5.5 | r1 | 0.2703 | 105 s | 25 | 0 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.0 | speckit | Sonnet 5.5 | r1 | 0.8724 | 276 s | 76 | 0 | 30/37 | 15/17 | 1/1 | 3/5 |
| S3@1.0 | speckit-docs | Sonnet 5.5 | r1 | 0.2739 | 106 s | 24 | 0 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.0 | wingfoil | Haiku 5.5 | r1 | 0.1050 | 456 s | 119 | 0 | 30/37 | 15/17 | 1/1 | 3/5 |
| S3@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.5290 | 240 s | 40 | 0 | 35/37 | 16/17 | 0/1 | 3/5 |
| S8@1.0 | baseline | Sonnet 5.5 | r1 | 0.2526 | 92 s | 16 | 0 | 23/23 | 7/7 | 12/16 | — |
| S8@1.0 | baseline-docs | Sonnet 5.5 | r1 | 0.3163 | 119 s | 18 | 0 | 23/23 | 7/7 | 16/16 | — |
| S8@1.0 | openspec | Sonnet 5.5 | r1 | 0.7580 | 228 s | 59 | 0 | 23/23 | 6/7 | 16/16 | — |
| S8@1.0 | openspec-docs | Sonnet 5.5 | r1 | 0.2651 | 92 s | 17 | 0 | 23/23 | 7/7 | 16/16 | — |
| S8@1.0 | speckit | Sonnet 5.5 | r1 | 0.3430 | 149 s | 20 | 0 | 23/23 | 7/7 | 16/16 | — |
| S8@1.0 | speckit-docs | Sonnet 5.5 | r1 | 0.2708 | 112 s | 20 | 0 | 23/23 | 7/7 | 16/16 | — |
| S8@1.0 | wingfoil | Sonnet 5.5 | r1 | 0.4174 | 151 s | 30 | 0 | 23/23 | 7/7 | 16/16 | — |

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
