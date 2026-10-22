---
id: campaign-002-v0-2-reference-campaign
type: campaign
title: "v0.2 reference campaign"
status: running
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

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
