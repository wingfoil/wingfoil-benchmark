---
id: campaign-009-v0.3-reference-campaign-thirteen-arms-on-sonnet-5.5-with-a-haiku-5.5-slice-and-the-review-loop
type: campaign
title: "v0.3 reference campaign, thirteen arms on Sonnet 5.5 with a Haiku 5.5 slice and the review loop"
status: pending
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
- **Cost:** 52.3942 USD, 46.7199 EUR at 0.8917 EUR/USD, API-equivalent (steps 38.2213 €, review loops 8.4987 €; the
  failed attempt 0.0165 USD), against the estimate's mean 51.3623 and high 57.0310 USD; under the 65 € warning.
- **Secret scan** of `results/1f70fcaf2ec2/1/` and `runs/1f70fcaf2ec2/1/` (the credential's value by `grep -rlFf`,
  Anthropic and OpenAI key shapes, JWTs, `access_token`/`refresh_token`/`id_token` values, in plain files and in
  every git object of the 198 workspace repositories): clean.
- **Scored** (`bench score 1f70fcaf2ec2/1 --holdout ../WingFoil2-Benchmark-HoldOut`): `aggregate.json`, 52 groups and
  4 slices; determinism measured in 13, n = 1 in 43. The hold-out checkout was unchanged by the scoring.

## Results review

<!-- Written at running → scored: anomalies, runs to rerun, and whether the results are publishable. -->

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
