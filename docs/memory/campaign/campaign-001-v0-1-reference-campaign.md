---
id: campaign-001-v0-1-reference-campaign
type: campaign
title: "v0.1 reference campaign"
status: pending
release: v0.1
campaign_file: campaigns/v0-1-reference.yaml
campaign_id: c82a5e74885b
wingfoil_commit: 12537b627ce0517222da762e8fa90997a1208a4b # v0.2.2
---

## Purpose

The reference campaign of release v0.1, **the first preliminary result** ([rel-v0-1](../release/rel-v0-1.md) Goal;
[plan-003](../../plans/plan-003-release-v0-1.md) step 5, `release-cycle` › `campaign`, run through `campaign-cycle`).
It follows calibration (task-049, task-050: the revised budget's **option A**, approved `721321f`), bug-010's fix
(task-051) and validation (task-052, approved `4ead1a1`). Its scored results are what the site publishes at plan-003
step 6.

**Shape** ([09_experiment-design.md](../../01_vision/09_experiment-design.md) 1.1, calibration §5 option A):

| Part | Scenarios | Arms | Model | Repetitions | Runs |
|---|---|---|---|---|---|
| Main | S1@1.0 | baseline, baseline-docs, wingfoil | Sonnet 5 | 3 | 9 |
| Main | S2@1.0, S3@1.0, S8@1.0 | baseline, baseline-docs, wingfoil | Sonnet 5 | 1 | 9 |
| Slice (option A) | S1@1.0 | wingfoil | Opus 5 | 1 | 1 |
| | | | | | **19** |

**Pins** (calibration §1, the profile of `scenarios/dry-run.yaml`):

- WingFoil under test **v0.2.2**, commit `12537b62` (task-049). On 2026-10-03 it is still the latest WingFoil release
  (`git ls-remote --tags`: v0.2.0, v0.2.1, v0.2.2), as sequencer decision 3 requires.
- Agent Claude Code **2.1.280**; `claude-sonnet-5`, the slice `claude-opus-5`; approver policy `v1`.
- Caps: `step_time_s` 3600, `step_tokens` 20 000 000, `run_cost_eur` **30** (calibration §6).
- Rate: `usd_to_eur` 0.8851 (ECB reference rate of 2026-10-01).

## Estimate and budget

`node dist/cli/main.js campaign validate campaigns/v0-1-reference.yaml` (main's built CLI, `e6e957a`) →
`campaign c82a5e74885b is valid (4 scenarios, 3 arms)`.

`node dist/cli/main.js campaign estimate campaigns/v0-1-reference.yaml`, from the counted dry runs of calibration §2:

| Scenario | Arm | Model | Per run (USD) | × | Total (USD) | Dry run |
|---|---|---|---|---|---|---|
| S1@1.0 | baseline | Sonnet 5 | 2.1583 | 3 | 6.4750 | 15 |
| S1@1.0 | baseline-docs | Sonnet 5 | 2.4214 | 3 | 7.2643 | 16 |
| S1@1.0 | wingfoil | Sonnet 5 | 4.9827 | 3 | 14.9482 | 17 |
| S2@1.0 | baseline | Sonnet 5 | 1.0590 | 1 | 1.0590 | 5 |
| S2@1.0 | baseline-docs | Sonnet 5 | 1.5977 | 1 | 1.5977 | 6 |
| S2@1.0 | wingfoil | Sonnet 5 | 1.6036 | 1 | 1.6036 | 7 |
| S3@1.0 | baseline | Sonnet 5 | 0.9505 | 1 | 0.9505 | 8 |
| S3@1.0 | baseline-docs | Sonnet 5 | 2.2293 | 1 | 2.2293 | 9 |
| S3@1.0 | wingfoil | Sonnet 5 | 2.5901 | 1 | 2.5901 | 10 |
| S8@1.0 | baseline | Sonnet 5 | 1.1844 | 1 | 1.1844 | 11 |
| S8@1.0 | baseline-docs | Sonnet 5 | 1.6766 | 1 | 1.6766 | 12 |
| S8@1.0 | wingfoil | Sonnet 5 | 2.4921 | 1 | 2.4921 | 14 |
| S1@1.0 | wingfoil | **Opus 5** | 24.0758 | 1 | 24.0758 | 19 |

**Estimate: 68.1468 USD, 60.3167 EUR** at 0.8851 EUR/USD, API-equivalent — the 60.32 € of calibration §4.

**Budget (option A):** `warn_eur` **65**, `ceiling_eur` **85**, `run_cost_eur` **30**. The estimate is below the
warning, so `campaign run` starts without asking for a confirmation, and can run in the background without a
terminal. The ceiling leaves about 35 % over the estimate, the run-to-run spread calibration measured (§5).

**The limit that applies:** the agent runs on the maintainer's subscription; nothing is billed per token (sequencer
decision 1). The figures are the API-equivalent the agent reports, and each run is a line of the
[v0.1 ledger](../../calibration/v0.1-ledger.md). The binding limit in practice is the subscription's rate limit: a
429 is waited out and recorded in `rate_limit_waits` (task-051), not counted as a failure.

**Time:** the dry runs' agent time sums to about **6.7 h** for these 19 runs (the Opus run alone 80 min, S1 wingfoil
on Sonnet 32 min a run), plus container setup and the wingfoil harness build once per campaign. With rate-limit
waits it may run over a night. Scoring with the hold-out: well under an hour (calibration §7).

**How it runs** (as validation's chain, task-052):

1. In the main checkout, so the git-ignored transcripts stay outside any worktree: `npm run build`, then
   `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token systemd-inhibit --what=sleep node dist/cli/main.js campaign run
   campaigns/v0-1-reference.yaml --allow-spending`, in the background; no network switch, no other heavy Claude use.
2. `node dist/cli/main.js score c82a5e74885b/1 --holdout ../WingFoil2-Benchmark-HoldOut`, then `run show` per run
   and the token check on the stored files (the shape `sk-ant-` and the token file's value, names only).
3. The records under `results/c82a5e74885b/1/` committed on main without the transcripts; the ledger gets one line
   per run and its total. `transcripts pack` waits for publishing (plan-003 step 6), since it rewrites each
   `run.json` with the release's name.

**Spending consent:** the approver's approval of this element's `pending → approved` gate (`approve-spend`). A run
that fails is a ledger line and is not re-run without a new consent; a re-run is decided at `review-results`.

## Execution

<!-- Execution id(s) `<campaign-id>/<n>`, outcomes, caps reached, reruns. -->

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
