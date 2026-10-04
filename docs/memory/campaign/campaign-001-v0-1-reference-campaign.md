---
id: campaign-001-v0-1-reference-campaign
type: campaign
title: "v0.1 reference campaign"
status: running
release: v0.1
campaign_file: campaigns/v0-1-reference.yaml
campaign_id: c82a5e74885b
wingfoil_commit: 12537b627ce0517222da762e8fa90997a1208a4b # v0.2.2
rejection_reason: "Sent back by the approver: 3 of 19 runs failed at S1 step 03 from bug-011 (agent output cut at 1 MiB); fix bug-011, then re-run the full campaign as a new execution with a new spending consent"
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

**Spending consent:** the approver's `memory approve` (pending → approved), `1800b1d`, 2026-10-03: "Reference campaign
c82a5e74885b approved: 19 runs (option A), estimate 60.32 EUR, warn 65, ceiling 85, run cap 30". Then `memory submit`
(approved → running), `86bc355`.

**Execution `c82a5e74885b/1`**, from the main checkout, on main's built CLI (`86bc355`):

- First start, 23:31: refused before any spending, `BENCH_WINGFOIL_REPO: is not set`. The campaign file holds a
  harness, so the WingFoil clone must be named, as calibration did (task-050); validation's campaign had no
  harness and did not need it. Restarted with `BENCH_WINGFOIL_REPO=/home/robypomper/Workspaces/WingFoil2`.
- Ran 2026-10-03 23:32 → 2026-10-04 05:31 (6.0 h). The CLI: `19 runs`, `16 runs completed, 3 failed`, `cost: 46.5755
  USD, 41.2240 EUR at 0.8851 EUR/USD, API-equivalent` (estimate 60.32 €; ceiling 85 €). Exit status 1, from the
  failed runs.
- No rate-limit wait, no cap reached, no container left behind. Interventions only in the wingfoil arm (0–5 a run)
  and in S2 baseline-docs (1).
- **Three runs failed at S1's step 03:** S1 baseline r1 and r3 (Sonnet 5), and the Opus 5 slice. The step's
  stream-json output passed 1 MiB, and `execFile`'s default `maxBuffer` cut it: the transcript ends mid-line, and
  "a line of the session is not valid JSON". The step's cost was never reported. This is
  [bug-011](../bug/bug-011-an-agent-step-whose-output-passes-1-mib-is-killed-by-execfile-s-default-maxbuffer-and-its-cost-is-lost.md).
  The approver was told at the first failure. The campaign was not stopped (the agent's own attempt was refused by
  its permissions; the approver did not stop it), so it ran to its end.

| Run | Outcome | Cost USD (EUR) |
|---|---|---|
| S1 baseline r1 / r2 / r3 | **failed** step 03 / completed / **failed** step 03 | 0.8886 / 2.7781 / 0.7217 |
| S1 baseline-docs r1 / r2 / r3 | completed ×3 | 2.1439 / 2.6097 / 2.7259 |
| S1 wingfoil r1 / r2 / r3 | completed ×3 | 4.3926 / 3.7877 / 4.1672 |
| S2 baseline / baseline-docs / wingfoil | completed ×3 | 1.0786 / 1.2089 / 1.7521 |
| S3 baseline / baseline-docs / wingfoil | completed ×3 | 1.0411 / 1.9103 / 2.5269 |
| S8 baseline / baseline-docs / wingfoil | completed ×3 | 1.0907 / 1.8500 / 2.3718 |
| S1 wingfoil **Opus 5** r1 | **failed** step 03 | 7.5295 |
| **Total reported** | 16 completed, 3 failed | **46.5755 (41.2240 €)**, plus the three unreported step 03s |

Each run is a line of the [v0.1 ledger](../../calibration/v0.1-ledger.md).

**Token check** on the stored files (`results/c82a5e74885b/`): no `sk-ant-` shape and no match for the token file's
value (file names only printed: none).

**Scoring:** `node dist/cli/main.js score c82a5e74885b/1 --holdout ../WingFoil2-Benchmark-HoldOut`, 4 min 31 s,
exit 0. `aggregate: results/c82a5e74885b/1/aggregate.json (12 groups, 1 slice; determinism measured in 2, n = 1 in
11)`. Final hidden tests, hold-out and checks:

| Scenario | baseline | baseline-docs | wingfoil |
|---|---|---|---|
| S1 (r1, r2, r3) | not reached, 164/165 (45/48), not reached | 158/165 (43/48) ×3 | 165/165 (48/48), 158/165 (43/48) ×2 |
| S2 | 24/24 (17/17), checks 2/3 | 24/24 (17/17), checks 2/3 | 24/24 (17/17), checks 3/3 |
| S3 | 34/37 (16/17), checks 0/1, M-F1 3/5 | 34/37 (16/17), checks 0/1, M-F1 3/5 | 34/37 (16/17), checks 1/1, M-F1 4/5 |
| S8 | 23/23 (7/7), checks 12/16 | 23/23 (6/7), checks 16/16 | 20/23 (6/7), checks 16/16 |
| S1, Opus 5 (wingfoil) | | | not reached |

The records are committed without the transcripts, which are git-ignored and stay in the main checkout.
`transcripts pack` waits for publishing.

**Sent back** by the approver (scored → running, `1ab1d67`): 3 of 19 runs failed from bug-011. Before the re-run:

- bug-011 was fixed by task-053 (merged `7fad7b8`);
- task-054 (merged `cfc9274`) records the models each step used, so that the re-run shows them.

**Execution `c82a5e74885b/2`**, the whole campaign again, on main's built CLI (`3a1704c`, 1225 tests green).

- **Spending consent:** the approver in chat, 2026-10-04: "riesegui la campagna completa".
- **Estimate:** 60.32 € (68.15 USD), as for `/1`.
- **Budget:** the campaign file's per execution: warn 65 €, ceiling 85 €, run cap 30 €. With `/1`'s 41.22 €, the
  campaign as a whole may come to about 101 €. That is above the 85 € approved for one execution, and was stated
  to the approver before the consent.

**Execution `c82a5e74885b/2`, outcome:**

- Ran 2026-10-04 08:33 → 14:44 (6.2 h), with the same command and variables as `/1`. The CLI: `19 runs completed, 0
  failed`, `cost: 69.3517 USD, 61.3832 EUR at 0.8851 EUR/USD, API-equivalent`.
  - The estimate was 60.32 €, so +1.8 %. The ceiling is 85 €.
  - Together with `/1`'s 41.22 €, the campaign has cost **102.61 €** in all, as stated before the consent.
- No rate-limit wait, no cap reached, no container left behind. Interventions only in the wingfoil arm (2–4 a run;
  3 in the Opus run).
- **The Opus 5 slice:** 26.2846 USD (23.26 €) in 73.8 min, below its 30 € cap. Calibration's dry run 19 was 24.08
  USD.
- **bug-011's fix at work:** two step transcripts passed 1 MiB and were read whole, S1 baseline r3 (1.07 MB) and the
  Opus run (1.94 MB). Both would have failed in `/1`.
- **Models observed** (task-054), summed over the steps: `claude-sonnet-5` 42.90 USD, `claude-opus-5` 26.27 USD, and
  `claude-haiku-4-5-20251001` **0.19 USD**, which Claude Code called for its own work in several Sonnet runs.

| Run | Cost USD | Minutes |
|---|---|---|
| S1 baseline r1 / r2 / r3 | 1.9474 / 2.1351 / 4.2813 | 16.4 / 17.8 / 27.7 |
| S1 baseline-docs r1 / r2 / r3 | 2.4754 / 2.7111 / 2.3330 | 19.8 / 19.3 / 18.7 |
| S1 wingfoil r1 / r2 / r3 | 4.0869 / 4.6537 / 4.1996 | 28.0 / 32.4 / 29.6 |
| S2 baseline / baseline-docs / wingfoil | 0.9412 / 1.0894 / 1.8451 | 5.9 / 6.5 / 9.3 |
| S3 baseline / baseline-docs / wingfoil | 0.9997 / 2.0273 / 2.2624 | 6.5 / 12.6 / 13.0 |
| S8 baseline / baseline-docs / wingfoil | 1.3162 / 1.5239 / 2.2383 | 8.2 / 9.7 / 13.4 |
| S1 wingfoil **Opus 5** | 26.2846 | 73.8 |
| **Total** | **69.3517 (61.3832 €)** | |

Each run is a line of the [v0.1 ledger](../../calibration/v0.1-ledger.md), whose total is now 192.1459 USD.

**Token check** on `results/c82a5e74885b/2/`: no `sk-ant-` shape, and no match for the token file's value.

**Scoring:** `node dist/cli/main.js score c82a5e74885b/2 --holdout ../WingFoil2-Benchmark-HoldOut`, 5 min 6 s, exit 0.
It reports `aggregate.json (12 groups, 1 slice; determinism measured in 3, n = 1 in 10)`.

| Scenario | baseline | baseline-docs | wingfoil |
|---|---|---|---|
| S1 r1 / r2 / r3: final (hold-out) | 164/165 (45/48), 165/165 (48/48), 165/165 (48/48) | 164/165 (45/48), 163/165 (45/48), 158/165 (43/48) | 164/165 (45/48), 158/165 (43/48), 165/165 (48/48) |
| S2 | 24/24 (17/17), checks 2/3 | 24/24 (17/17), checks 2/3 | 24/24 (17/17), checks 3/3 |
| S3 | 34/37 (16/17), checks 0/1, M-F1 3/5 | 35/37 (16/17), checks 0/1, M-F1 3/5 | 35/37 (16/17), checks 1/1, M-F1 4/5 |
| S8 | 23/23 (6/7), checks 12/16 | 23/23 (6/7), checks 16/16 | 23/23 (6/7), checks 16/16 |
| S1, Opus 5 (wingfoil) | | | 165/165 (48/48) |

`/2` is the execution proposed for publication. `/1` stays committed as the record of bug-011, and is not published.

## Results review

<!-- Anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
