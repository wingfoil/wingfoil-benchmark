---
id: campaign-009-v0.3-reference-campaign-thirteen-arms-on-sonnet-5.5-with-a-haiku-5.5-slice-and-the-review-loop
type: campaign
title: "v0.3 reference campaign, thirteen arms on Sonnet 5.5 with a Haiku 5.5 slice and the review loop"
status: reviewed
release: v0.3
campaign_file: campaigns/v0-3-reference.yaml
campaign_id: 1f70fcaf2ec2
wingfoil_commit: 870bd4406f3b9bba5ecde7a5f8198b80c2a98583 # v0.3.1
tags: ["campaign","claude-code","reference","v0.3"]
---

## Purpose

v0.3's reference campaign, [plan-005](../../plans/plan-005-release-v0-3.md) step 5: every arm on every scenario at
1.1, after the calibration ([task-154](../task/task-154-calibration-v0.3-plan-005-step-3-the-1.1-dry-runs-scored-the-reference-campaign-with-its-loop-and-haiku-slice-the-revised-budget-and-the-hypotheses.md), [v0.3.md](../../calibration/v0.3.md) §6) and the validation
([task-159](../task/task-159-validation-of-v0.3-the-suites-and-one-real-agent-run-per-arm-on-s1-the-scenario-with-the-largest-step.md), `2ee46ad9e617/1`). The file is
[`campaigns/v0-3-reference.yaml`](../../../campaigns/v0-3-reference.yaml), from
[`presets/reference.yaml`](../../../campaigns/presets/reference.yaml), with the approver's choices of 2026-11-17:

- **Thirteen arms:** baseline, baseline-docs, wingfoil (WingFoil v0.3.1, digest `a25772055b1d`), speckit (v1.1.0),
  speckit-docs, openspec (1.14.0), openspec-docs and the six configured variants; Claude Code 2.1.300 at effort
  medium; approver policy v5.
- **The matrix:** S1 × 3 repetitions and S2, S3, S8 × 1 on `claude-sonnet-5-5`, 78 runs; the slice
  `claude-haiku-5-5` on S1 and S3 in `baseline` and `wingfoil`, 4 runs: **82 runs**.
- **The review loop** after the last step of every run (W19): reviewer Claude Code on Sonnet 5.5 at effort medium,
  at most 5 rounds, 2 € a session.

**The hypotheses it reads** are v0.3.md §6.3's, written before any run from the 1.1 dry runs. The comparison with
campaign-002 (v0.2's reference campaign) goes through a bridge or a recalibration
([dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)):
the scenarios moved 1.0 → 1.1 and the wingfoil arm moved to step A, so it is a reading in the results review, not a
measured effect.

## Estimate and budget

`bench campaign estimate campaigns/v0-3-reference.yaml` (the step and loop keys from the 1.1 dry runs 155–263, as
v0.3.md §6.1 lists them):

```text
estimate: low 48.7585, mean 51.3623, high 57.0310 USD; high 50.8545 EUR at 0.8917 EUR/USD, API-equivalent
budget guard: 0.0000 + 50.8545 = 50.8545 EUR (warn 65 EUR, ceiling 80 EUR)
```

- **The budget** is the approver's, in chat, 2026-11-18 (v0.3.md §6.2): warn 65 €, ceiling 80 €, `run_cost_eur` 3,
  the loop's `session_cost_eur` 2, `fail_fast` `same_error: 3`.
- **The limit that applies** is the subscription's weekly quota: the agent's credential is the maintainer's Claude
  plan, so the euros are API-equivalent and nothing is billed per token. The run was timed to spend the allowance
  that expired at the weekly reset (2026-11-20 05:00 local): 84 % used at the start, 85 % after the first ten runs.
- **Time** from the dry runs: about 6.3 h of agent time one run at a time, 6–8 h with setup and scoring.

## Execution

- **The element was filed after the run.** The approver consented in chat (the budget on 2026-11-18; the go on
  2026-11-20 at 00:33 local, "avvia adesso"), and the agent launched the campaign without first filing this element
  and passing its `pending → approved` gate. The spending gate is recorded afterwards, with that consent as its reason.
- Launched from the main checkout at `d6f0d053`,
  `bench campaign run campaigns/v0-3-reference.yaml --allow-spending`, behind the load gate (1-minute load ≤ 4,
  5-minute ≤ 6, twice in a row).
- **`1f70fcaf2ec2/1`**, three legs (UTC):
  1. 2026-11-19 23:40 – 2026-11-20 05:26: 78 runs completed. At 05:26 systemd-oomd killed the maintainer's whole
     desktop session (user memory pressure 62 % > 50 %; the desktop app and the browser held most of it), and the
     campaign with it, inside run 79 (S1 baseline on Haiku 5.5). Its container stayed up and was removed.
  2. 07:08 – 07:55, `--resume 1f70fcaf2ec2/1`: the 4 Haiku runs; 3 completed, S3 baseline on Haiku 5.5 failed at its
     step 3 with `api_error` (a network drop on the maintainer's machine).
  3. 09:12 – 09:17, `--resume` again (it reruns `failed` runs, keeps completed ones): that run completed. The machine
     had suspended between the legs; the resume waited in the load gate until it woke.
- **Outcome:** 82 runs completed, 0 failed; the failed attempt is kept in the run's `attempts/1/`. No cap reached.
  Review loops: 55 clean at round 1, 18 at round 2, 8 at round 3; none reached the 5-round cap. **One loop failed:**
  S1 openspec-docs-configured r3 on Sonnet 5.5, round 1's findings did not parse ("neither JSON alone nor a fenced
  json block"). The reviewer wrote a prose summary and then the findings object, unfenced, after it; the object holds
  one should-fix (`createPatch`'s LCS table grows as n × m on large, mostly different arrays), so that finding was
  never handed to a fixer. The run stays `completed`; the loop's outcome is `failed`. A note, not a rerun, as for [campaign-008](campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md);
  whether the findings parser should accept a trailing object is a question for a bug.
- **Cost:** 52.4510 USD, 46.7706 EUR at 0.8917 EUR/USD, API-equivalent (steps 38.2719 €, review loops 8.4987 €),
  against the estimate's mean 51.3623 and high 57.0310 USD; under the 65 € warning. It includes the two earlier
  attempts: S3 baseline on Haiku 5.5's failed one (0.0165 USD) and S1 baseline on Haiku 5.5's, killed during its
  step 5 with no `run.json` (its four finished steps' `usage.json`, 0.0568 USD; the step it was in left nothing, so
  its cost is unrecorded). A ledger line per run in `docs/calibration/v0.3-ledger.md`.
- **Secret scan** of `results/1f70fcaf2ec2/1/` and `runs/1f70fcaf2ec2/1/` (the credential's value by `grep -rlFf`,
  Anthropic and OpenAI key shapes, JWTs, `access_token`/`refresh_token`/`id_token` values, in plain files and in
  every git object of the 198 workspace repositories): clean.
- **Scored** (`bench score 1f70fcaf2ec2/1 --holdout ../WingFoil2-Benchmark-HoldOut`): `aggregate.json`, 52 groups and
  4 slices; determinism measured in 13, n = 1 in 43. The hold-out checkout was unchanged by the scoring.
- **Transcripts** (`bench transcripts pack 1f70fcaf2ec2/1`, with the credential file for the leak check):
  `releases/1f70fcaf2ec2-1/transcripts.tar.gz`, 540 transcripts (378 of the steps, 150 of the review loops, 12 of the
  configuring sessions), nothing missing, `sha256:8d7479f1c444f410caf73b0df77ec8c4f12fb2ec06591d782186e5693b934d99`;
  the digest is in each `run.json`. The release that carries it is step 6's.

## Results review

### The agent's analysis (2026-11-20, input to the approver's review)

**Completeness.** 82 of 82 runs completed and scored; no cap reached; one run rerun for an infrastructure failure (S3
baseline on Haiku 5.5, a network drop), none for a result. **Anomalies, none rerun:**

- S1 openspec r1 on Sonnet 5.5: 150/165 public and 38/48 hold-out, the only S1 run below the maximum (its r2 and r3
  165/165, 48/48), as S1's step 5 varied by run in campaign-002.
- S1 openspec-docs-configured r3's review loop `failed` on unparsed findings (Execution).
- S1 baseline on Haiku 5.5's first attempt, killed with the desktop session: its cost is in the totals, one partial
  step unrecorded.

**Per key** (generated by `node scripts/hypotheses-reading.mjs <root>` over a scratch view that presents the 82 runs
as numbered dry runs, symbolic links outside the repository; the means are over a key's runs, n stated; cost is the
run's steps, not the review loop):

| Scenario | Model | Arm | n | Cost € (mean) | Turns | M-Q1 final | Hold-out final | Checks | M-F1 |
|---|---|---|---|---|---|---|---|---|---|
| S1@1.1 | claude-haiku-5-5 | baseline | 1 | 0.1068 | 74 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-haiku-5-5 | wingfoil | 1 | 0.1384 | 144 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | baseline | 3 | 0.3648 | 24 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | baseline-docs | 3 | 0.4785 | 31 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | openspec | 3 | 0.9428 | 79 | 160/165 | 44.7/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | openspec-docs | 3 | 0.3309 | 26.3 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | speckit | 3 | 0.5017 | 31.7 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | speckit-docs | 3 | 0.3385 | 26 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | wingfoil | 3 | 0.6566 | 65 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | baseline-docs-configured | 3 | 0.5665 | 31.3 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | openspec-configured | 3 | 1.0429 | 77.3 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | openspec-docs-configured | 3 | 0.4266 | 25 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | speckit-configured | 3 | 0.7072 | 46.3 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | speckit-docs-configured | 3 | 0.4922 | 31.7 | 165/165 | 48/48 | — | — |
| S1@1.1 | claude-sonnet-5-5 | wingfoil-configured | 3 | 0.7244 | 70 | 165/165 | 48/48 | — | — |
| S2@1.1 | claude-sonnet-5-5 | baseline | 1 | 0.2619 | 26 | 24/24 | 17/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | baseline-docs | 1 | 0.2371 | 23 | 24/24 | 17/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | openspec | 1 | 0.4372 | 46 | 23/24 | 15/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | openspec-docs | 1 | 0.1767 | 24 | 24/24 | 17/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | speckit | 1 | 0.2165 | 20 | 24/24 | 17/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | speckit-docs | 1 | 0.2369 | 32 | 23/24 | 16/17 | 0/3 | — |
| S2@1.1 | claude-sonnet-5-5 | wingfoil | 1 | 0.3511 | 43 | 24/24 | 17/17 | 3/3 | — |
| S2@1.1 | claude-sonnet-5-5 | baseline-docs-configured | 1 | 0.2476 | 21 | 24/24 | 17/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | openspec-configured | 1 | 0.6346 | 62 | 22/24 | 16/17 | 1/3 | — |
| S2@1.1 | claude-sonnet-5-5 | openspec-docs-configured | 1 | 0.1954 | 21 | 24/24 | 17/17 | 2/3 | — |
| S2@1.1 | claude-sonnet-5-5 | speckit-configured | 1 | 0.3056 | 28 | 23/24 | 16/17 | 0/3 | — |
| S2@1.1 | claude-sonnet-5-5 | speckit-docs-configured | 1 | 0.2571 | 24 | 22/24 | 16/17 | 0/3 | — |
| S2@1.1 | claude-sonnet-5-5 | wingfoil-configured | 1 | 0.3644 | 44 | 24/24 | 17/17 | 3/3 | — |
| S3@1.1 | claude-haiku-5-5 | baseline | 1 | 0.0400 | 65 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.1 | claude-haiku-5-5 | wingfoil | 1 | 0.0938 | 122 | 37/37 | 17/17 | 1/1 | 5/5 |
| S3@1.1 | claude-sonnet-5-5 | baseline | 1 | 0.2445 | 21 | 37/37 | 17/17 | 0/1 | 4/5 |
| S3@1.1 | claude-sonnet-5-5 | baseline-docs | 1 | 0.3934 | 40 | 37/37 | 17/17 | 0/1 | 4/5 |
| S3@1.1 | claude-sonnet-5-5 | openspec | 1 | 1.0399 | 88 | 37/37 | 17/17 | 0/1 | 4/5 |
| S3@1.1 | claude-sonnet-5-5 | openspec-docs | 1 | 0.2741 | 26 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.1 | claude-sonnet-5-5 | speckit | 1 | 0.3734 | 32 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.1 | claude-sonnet-5-5 | speckit-docs | 1 | 0.2455 | 24 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.1 | claude-sonnet-5-5 | wingfoil | 1 | 0.5529 | 66 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.1 | claude-sonnet-5-5 | baseline-docs-configured | 1 | 0.4149 | 42 | 37/37 | 17/17 | 0/1 | 4/5 |
| S3@1.1 | claude-sonnet-5-5 | openspec-configured | 1 | 0.9130 | 86 | 37/37 | 17/17 | 1/1 | 5/5 |
| S3@1.1 | claude-sonnet-5-5 | openspec-docs-configured | 1 | 0.3078 | 26 | 35/37 | 16/17 | 0/1 | 3/5 |
| S3@1.1 | claude-sonnet-5-5 | speckit-configured | 1 | 0.6242 | 56 | 30/37 | 15/17 | 0/1 | 2/5 |
| S3@1.1 | claude-sonnet-5-5 | speckit-docs-configured | 1 | 0.3298 | 32 | 30/37 | 15/17 | 0/1 | 2/5 |
| S3@1.1 | claude-sonnet-5-5 | wingfoil-configured | 1 | 0.5700 | 69 | 35/37 | 16/17 | 0/1 | 3/5 |
| S8@1.1 | claude-sonnet-5-5 | baseline | 1 | 0.2258 | 17 | 23/23 | 7/7 | 12/16 | — |
| S8@1.1 | claude-sonnet-5-5 | baseline-docs | 1 | 0.2813 | 21 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | openspec | 1 | 0.6605 | 63 | 23/23 | 6/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | openspec-docs | 1 | 0.2305 | 20 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | speckit | 1 | 0.3521 | 27 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | speckit-docs | 1 | 0.2247 | 16 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | wingfoil | 1 | 0.4449 | 50 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | baseline-docs-configured | 1 | 0.2923 | 19 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | openspec-configured | 1 | 0.7524 | 64 | 23/23 | 6/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | openspec-docs-configured | 1 | 0.2744 | 19 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | speckit-configured | 1 | 0.3801 | 27 | 23/23 | 6/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | speckit-docs-configured | 1 | 0.2694 | 17 | 23/23 | 7/7 | 16/16 | — |
| S8@1.1 | claude-sonnet-5-5 | wingfoil-configured | 1 | 0.5126 | 54 | 23/23 | 7/7 | 16/16 | — |

**claude-haiku-5-5**

| # | Reads | wingfoil | wingfoil-configured |
|---|---|---|---|
| H1 | cost ÷ baseline, per scenario | S1 1.3×, S3 2.35×; mean 1.82× | — |
| H2 | turns ÷ baseline on S1 | 1.95× (n 1/1) | — |
| H3 | M-F1 on S3 | 5/5 | — |
| H4 | S2's checks | — | — |
| H5 | S8's checks; hold-out final | —; — | —; — |
| H6 | M-Q1 final; hold-out final, per scenario | S1 165/165; 48/48, S3 37/37; 17/17 | — |
| H8 | cost ÷ its docs control | — | — |

H10 on claude-haiku-5-5, arms whose checks are not saturated: S3 1 of 2

**claude-sonnet-5-5**

| # | Reads | wingfoil | wingfoil-configured |
|---|---|---|---|
| H1 | cost ÷ baseline, per scenario | S1 1.8×, S2 1.34×, S3 2.26×, S8 1.97×; mean 1.84× | S1 1.99×, S2 1.39×, S3 2.33×, S8 2.27×; mean 1.99× |
| H2 | turns ÷ baseline on S1 | 2.71× (n 3/3) | 2.92× (n 3/3) |
| H3 | M-F1 on S3 | 3/5 | 3/5 |
| H4 | S2's checks | 3/3 | 3/3 |
| H5 | S8's checks; hold-out final | 16/16; 7/7 | 16/16; 7/7 |
| H6 | M-Q1 final; hold-out final, per scenario | S1 165/165; 48/48, S2 24/24; 17/17, S3 35/37; 16/17, S8 23/23; 7/7 | S1 165/165; 48/48, S2 24/24; 17/17, S3 35/37; 16/17, S8 23/23; 7/7 |
| H8 | cost ÷ its docs control | S1 1.37×, S2 1.48×, S3 1.41×, S8 1.58×; mean 1.46× | S1 1.28×, S2 1.47×, S3 1.37×, S8 1.75×; mean 1.47× |

H10 on claude-sonnet-5-5, arms whose checks are not saturated: S2 11 of 13, S3 12 of 13, S8 1 of 13

**H11** (the wingfoil arm minus the baseline, per model)

| Model | S1 M-Q1 (tests) | S3 M-Q1 (tests) | S3 M-F1 |
|---|---|---|---|
| claude-haiku-5-5 | 0 | +2 | +2 |
| claude-sonnet-5-5 | 0 | -2 | -1 |

**The verdicts on claude-sonnet-5-5** (v0.1.md §11's "Holds when")

| # | Holds when | wingfoil | wingfoil-configured |
|---|---|---|---|
| H1 | the ratio falls on at least three of the four scenarios, and below 1.5× on S1 | not met: S1 1.8×, falls on 2 of 4 | not met: S1 1.99×, falls on 1 of 4 |
| H2 | the ratio falls on S1, from 1.8× | not met: 2.71× | not met: 2.92× |
| H3 | M-F1 ≥ 4/5 and D3 recorded, in every wingfoil run | not met: 0 of 1 runs | not met: 0 of 1 runs |
| H4 | 3/3 in every wingfoil run | met: 1 of 1 runs | met: 1 of 1 runs |
| H5 | 16/16 kept, and hidden tests at the docs control's level or above | met: 1 of 1 runs keep every rule check; public 23 against 23, hold-out 7 against 7 | met: 1 of 1 runs keep every rule check; public 23 against 23, hold-out 7 against 7 |
| H6 | no scenario falls below its v0.1 wingfoil value by more than one test | not read against v0.1 (other scenario versions); more than one test below the baseline: S3 wingfoil r1 (35/37 against 37) | not read against v0.1 (other scenario versions); more than one test below the baseline: S3 wingfoil-configured r1 (35/37 against 37) |
| H7 | `workflow-engine: true`, and a scenario that requires it is not an expected failure | met: `arms/wingfoil/arm.yaml`; scenarios that require it: none | — |
| H8 | the mean at most 1.1× the docs control, with M-F1 ≥ 4/5 and S2's checks 3/3 | not met: mean 1.46×; M-F1 held in 0 of 1 runs, S2's checks in 1 of 1 | not met: mean 1.47×; M-F1 held in 0 of 1 runs, S2's checks in 1 of 1 |
| H9 | the advantage grows from L1 to L3 | not read: these scenarios are L1 | not read: these scenarios are L1 |
| H10 | every arm at the maximum on S2's, S3's and S8's checks | not met: arms below it: S2 11 of 13, S3 12 of 13, S8 1 of 13 | — |
| H11 | the wingfoil arm's gain over the baseline is larger on Haiku 5.5 than on Sonnet 5.5 | met: larger on 2 of 3 readings, smaller on 0 | — |

**The chain to campaign-002** (dl-021; wingfoil ÷ baseline cost on Sonnet 5.5, one change at a time):

| Scenario | campaign-002 (`81ebb2691f9c/1`): v0.3.0, v0.2's manual, scenarios 1.0 | campaign-008 (`33b54dd89e8b/1`): v0.3.1 step A, 1.0 | this campaign: v0.3.1 step A, 1.1 |
|---|---|---|---|
| S1 | 1.70× | 1.96× | 1.80× |
| S2 | 1.22× | 1.73× | 1.34× |
| S3 | 1.87× | 2.32× | 2.26× |
| S8 | 1.65× | 1.96× | 1.97× |

The step from campaign-002 to campaign-008 is the manual (v0.2's by hand → step A driving the engine) on the same
scenario version; it raised the ratio on every scenario. The step from campaign-008 to this campaign is the scenario
version (1.0 → 1.1, with content checks v2) on the same arm; S1 and S2 fall, S3 and S8 stay. Approver policy
(campaign-002 v1, the others v5) and the review loop (here only, outside the run's cost) differ too, so the chain is a
reading, not a measured effect.

**The review loops** (generated by `node scripts/review-loop-figures.mjs --markdown <root>` over the same view): 82
loops, 8.4987 €; M-V1 1 in 55, 2 in 18, 3 in 8, none in the failed one. M-V2: 17 loops fixed past round 1, 21 of
their 31 later findings induced by a fix. By arm, mean rounds and mean M-V3 €:

| Arm | Loops | Mean rounds | Mean M-V3 € |
|---|---|---|---|
| baseline | 8 | 1.25 | 0.0820 |
| baseline-docs | 6 | 1.67 | 0.1172 |
| wingfoil | 8 | 1.50 | 0.1190 |
| speckit | 6 | 1.50 | 0.1003 |
| speckit-docs | 6 | 1.50 | 0.0847 |
| openspec | 6 | 1.50 | 0.1370 |
| openspec-docs | 6 | 1.17 | 0.0643 |
| wingfoil-configured | 6 | 1.17 | 0.0903 |
| baseline-docs-configured | 6 | 1.00 | 0.0601 |
| speckit-configured | 6 | 2.00 | 0.1643 |
| speckit-docs-configured | 6 | 1.33 | 0.0887 |
| openspec-configured | 6 | 1.67 | 0.1693 |
| openspec-docs-configured | 6 | 1.17 | 0.0723 |

**Reading, preliminary** (n = 3 on S1 Sonnet, n = 1 elsewhere):

- **Correctness is near saturated on L1**: S1 165/165 and S8 23/23 in every arm but one run; the arms differ on S2's
  and S3's checks and M-F1. wingfoil and wingfoil-configured are the only arms at 3/3 on S2's checks; speckit-docs,
  speckit-configured and speckit-docs-configured fall to 0/3 and below the maximum on S2's tests (22–23/24), as
  openspec-configured does to 1/3 and 22/24.
- **The engine's hypotheses still fail on cost** (H1, H2, H8): wingfoil costs 1.8× the baseline (1.3–2.3×) and 1.46×
  its docs control; turns 2.7× on S1. The configured variant does not lower it (1.99×).
- **H4 and H5 hold, H3 does not:** S3's M-F1 3/5 on Sonnet in both wingfoil arms (the baseline 4/5); H6's one signal
  is S3 wingfoil r1, 35/37 against the baseline's 37/37.
- **H11 holds** (2 of 3 readings): on Haiku 5.5 wingfoil gains +2 tests and +2 M-F1 on S3 over the baseline, where on
  Sonnet 5.5 it loses 2 and 1; S3's single check 1/1 on Haiku with wingfoil only. n = 1 on Haiku.
- **The configured variants**: openspec-configured is the only Sonnet arm at S3's maximum with M-F1 5/5 and the check;
  speckit-configured and speckit-docs-configured are the lowest on S3 (30/37, M-F1 2/5).

**The agent's recommendation:** publishable as v0.3's preliminary reference result, no rerun, with the anomalies
above stated on the site.

## Findings

The approver accepted the results (scored → reviewed, `c5ae2d5a`) and asked, in chat on 2026-11-20, for the three
candidates to be exported. Written only in this repository; filing the first two in WingFoil is the approver's (dl-009).

1. **[M-K1 on S1@1.1, baseline against wingfoil](../../../findings/1f70fcaf2ec2-1-s1-1.1-m-k1-baseline+wingfoil.md)**,
   as a **decision-log** (`bench finding 1f70fcaf2ec2/1 --scenario S1@1.1 --metric M-K1 --arms baseline,wingfoil --as
   decision-log`): the wingfoil arm costs 0.6499–0.6665 € a run against the baseline's 0.3438–0.3810 € (n = 3 each),
   1.80× the mean, above dl-147's 1.5× target; the re-measure dl-207 asked for, now with step A driving the engine.
2. **[M-F1 on S3@1.1, baseline against wingfoil](../../../findings/1f70fcaf2ec2-1-s3-1.1-m-f1-baseline+wingfoil.md)**,
   as a **bug**, preliminary (n = 1): on Sonnet 5.5 wingfoil 3/5 against the baseline's 4/5, D3 failed in both and D5
   in wingfoil only. `bench finding` reads the campaign's default model only, so H11's other side (on Haiku 5.5
   wingfoil 5/5 against 3/5) is not in the export; it is in the results review above.
3. **[bug-055](../bug/bug-055-a-reviewer-s-findings-after-prose-unfenced-end-the-review-loop-as-failed-and-its-should-fix-never-reaches-a-fixer.md)**, the benchmark's own: a reviewer's findings after prose, unfenced, end the loop as `failed`
   (S1 openspec-docs-configured r3). Pending the approver's choice of fix.
