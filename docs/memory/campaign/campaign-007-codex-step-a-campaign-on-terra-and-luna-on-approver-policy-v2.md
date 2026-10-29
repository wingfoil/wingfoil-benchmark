---
id: campaign-007-codex-step-a-campaign-on-terra-and-luna-on-approver-policy-v2
type: campaign
title: "Codex step-A campaign on Terra and Luna, on approver policy v2"
status: reviewed
release: v0.3
campaign_file: campaigns/codex-terra-step-a.yaml
campaign_id: 697e79b75e41
wingfoil_commit: bd27f62afe4379dd521a386f9fa8ef260a1a64ed # v0.3.1
tags: ["campaign","codex","wingfoil","v0.3"]
---

## Purpose

The step-A wingfoil arm on Codex
([dl-027](../decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md)),
with a weak-model slice
([dl-031](../decision-log/dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13.md)):
does WingFoil 0.3.1, its workflow's cycle driven by the session agent in each step's role (dl-021 step A,
[task-114](../task/task-114-the-step-a-wingfoil-arm-on-wingfoil-0.3.1-baseline-docs-with-every-role-s-directives-dl-021-dl-027.md)),
improve Codex against its docs control and the baseline, on `gpt-5.6-terra` and on the weak `gpt-6-luna`? A campaign
outside the release cycle (dl-022), in [plan-005](../../plans/plan-005-release-v0-3.md)'s W15; its runs are lines of
`docs/calibration/v0.3-ledger.md`. It must finish by **2026-11-13**, the Codex credential's end (dl-024).

- **The file:** `campaigns/codex-terra-step-a.yaml`, extending `presets/harness-vs-docs.yaml`; id `697e79b75e41`.
- **The arms:** baseline (`964b1354526c`), baseline-docs with every role's directives (`64e37c838830`) and wingfoil
  at step A (`cf70ad7ed9aa`, WingFoil v0.3.1, `bd27f62a`), on Codex CLI 0.162.1 at `model_reasoning_effort` medium,
  approver policy v2 (dl-026).
- **The default model, `gpt-5.6-terra`:** S1 × 3, S2, S3, S8 × 1, 18 runs (dl-027): the bridge with
  [campaign-006](campaign-006-codex-harness-vs-docs-campaign-on-terra-on-approver-policy-v2.md), whose wingfoil arm
  ran v0.2's manual on WingFoil 0.3.0. That execution's wingfoil arm carries bug-036's erratum (12 of its 27 steps
  resumed on `gpt-6.1-sol`); no rerun (the approver, 2026-10-28), so the comparison carries the same note.
- **The slice, `gpt-6-luna`:** the three arms, every scenario × 3, 36 runs (dl-031): the weak model, a stand-in for
  local models, the approver's aim. Read within Luna, arm against arm (T14); preliminary.
- **What it does not measure:** governance, which needs scenarios of gates and roles (dl-029, v0.4); M-R across
  agents (no Claude Code execution of the step-A arms yet: W17).
- **The credential:** ChatGPT Plus under dl-024, as dl-025, dl-027 and dl-031 widen it (REQ-RUN-15 as amended in
  1.42), until 2026-11-13; cost API-equivalent (`price-table`), 0 € spent.
- **The cut order** (dl-031 item 5), if not every run fits: Luna's S2, S3, S8 repetitions 2 and 3 first, then the
  default model's S3, S1 × 3, S2, S8; Luna's first repetitions last.

## Estimate and budget

**The dry runs** (the approver's consent in chat, 2026-10-28, "sì, procedi con i 14 dry run, prima Luna"): the 14
missing, one at a time from the main checkout (dl-024 bound 1), `campaigns/codex-terra-step-a.dry-run.yaml`, each to
its end; scored with the hold-out; a ledger line each (`1595cf7e`, `787afcdd`). The baseline's Luna dry runs are
campaign-004's (`dry-runs/68`, 72–74: same digest, model and effort, so the estimate's key reads them, dl-031 item
4); S1's Terra dry runs of baseline-docs and wingfoil are task-114's (96, 97; baseline-docs also reads 91, the same
digest). Figures below are generated from the runs' files.

| Model | Scenario | Arm | Dry run | Final, hold-out | Interventions | Cost | Agent time |
|---|---|---|---|---|---|---|---|
| gpt-6-luna | S1 | wingfoil | `dry-runs/98` | 158/165, 43/48 | 5 | 0.0512 USD | 7.6 min |
| gpt-6-luna | S1 | baseline-docs | `dry-runs/99` | 165/165, 48/48 | 0 | 0.0216 USD | 3.1 min |
| gpt-6-luna | S2 | wingfoil | `dry-runs/100` | 23/24, 16/17 | 3 | 0.0359 USD | 4.7 min |
| gpt-6-luna | S2 | baseline-docs | `dry-runs/101` | 21/24, 16/17 | 0 | 0.0221 USD | 2.0 min |
| gpt-6-luna | S3 | wingfoil | `dry-runs/102` | 37/37, 17/17 | 5 | 0.0589 USD | 7.0 min |
| gpt-6-luna | S3 | baseline-docs | `dry-runs/103` | 34/37, 16/17 | 0 | 0.0309 USD | 3.7 min |
| gpt-6-luna | S8 | wingfoil | `dry-runs/104` | 20/23, 6/7 | 3 | 0.0335 USD | 4.0 min |
| gpt-6-luna | S8 | baseline-docs | `dry-runs/105` | 13/23, 4/7 | 0 | 0.0255 USD | 3.0 min |
| gpt-5.6-terra | S2 | wingfoil | `dry-runs/106` | 23/24, 16/17 | 3 | 0.6966 USD | 6.4 min |
| gpt-5.6-terra | S2 | baseline-docs | `dry-runs/107` | 23/24, 16/17 | 0 | 0.4116 USD | 3.1 min |
| gpt-5.6-terra | S3 | wingfoil | `dry-runs/108` | 34/37, 16/17 | 5 | 1.2277 USD | 11.6 min |
| gpt-5.6-terra | S3 | baseline-docs | `dry-runs/109` | 37/37, 17/17 | 0 | 0.7569 USD | 9.1 min |
| gpt-5.6-terra | S8 | wingfoil | `dry-runs/110` | 23/23, 6/7 | 4 | 0.8573 USD | 5.5 min |
| gpt-5.6-terra | S8 | baseline-docs | `dry-runs/111` | 23/23, 6/7 | 0 | 0.5828 USD | 5.7 min |

- gpt-6-luna: 8 dry runs, 0.2797 USD, 34.9 min of agent time.
- gpt-5.6-terra: 6 dry runs, 4.5329 USD, 41.5 min of agent time.

- **Every wingfoil gate** (28 interventions in the seven wingfoil dry runs) got "Approved. Proceed.", and `memory
  approve` ran only in the turn after the reply: a script over the transcripts, counts only.
- **Secret scan** of `results/dry-runs/98`–`111` and `runs/dry-runs/98`–`111` (plain files and every git object of
  the workspaces; Anthropic and OpenAI key shapes, JWTs, `access_token`/`refresh_token`/`id_token` values): clean.
- **Read nothing into these yet** (n = 1 each): on Luna the wingfoil arm is below its docs control in S1 (158/165,
  43/48) and above it in S2, S3 and S8; on Terra the two arms are even in S2 and S8 and wingfoil below in S3.

`bench campaign estimate campaigns/codex-terra-step-a.yaml`, at `787afcdd` of main:

```text
S1@1.0 baseline gpt-5.6-terra: 0.7481 USD + 35 % margin = 1.0099 USD × 3 = 3.0298 USD (1 dry run: results/dry-runs/75)
S1@1.0 baseline-docs gpt-5.6-terra: low 0.8691, mean 0.9185, high 0.9680 USD × 3 = 2.9040 USD (2 dry runs: results/dry-runs/97, results/dry-runs/91)
S1@1.0 wingfoil gpt-5.6-terra: 1.1885 USD + 35 % margin = 1.6045 USD × 3 = 4.8136 USD (1 dry run: results/dry-runs/96)
S2@1.0 baseline gpt-5.6-terra: 0.3412 USD + 35 % margin = 0.4606 USD × 1 = 0.4606 USD (1 dry run: results/dry-runs/76)
S2@1.0 baseline-docs gpt-5.6-terra: 0.4116 USD + 35 % margin = 0.5556 USD × 1 = 0.5556 USD (1 dry run: results/dry-runs/107)
S2@1.0 wingfoil gpt-5.6-terra: 0.6966 USD + 35 % margin = 0.9404 USD × 1 = 0.9404 USD (1 dry run: results/dry-runs/106)
S3@1.0 baseline gpt-5.6-terra: 0.4412 USD + 35 % margin = 0.5956 USD × 1 = 0.5956 USD (1 dry run: results/dry-runs/67)
S3@1.0 baseline-docs gpt-5.6-terra: 0.7569 USD + 35 % margin = 1.0218 USD × 1 = 1.0218 USD (1 dry run: results/dry-runs/109)
S3@1.0 wingfoil gpt-5.6-terra: 1.2277 USD + 35 % margin = 1.6575 USD × 1 = 1.6575 USD (1 dry run: results/dry-runs/108)
S8@1.0 baseline gpt-5.6-terra: 0.3775 USD + 35 % margin = 0.5096 USD × 1 = 0.5096 USD (1 dry run: results/dry-runs/77)
S8@1.0 baseline-docs gpt-5.6-terra: 0.5828 USD + 35 % margin = 0.7867 USD × 1 = 0.7867 USD (1 dry run: results/dry-runs/111)
S8@1.0 wingfoil gpt-5.6-terra: 0.8573 USD + 35 % margin = 1.1574 USD × 1 = 1.1574 USD (1 dry run: results/dry-runs/110)
S1@1.0 baseline gpt-6-luna: 0.0126 USD + 35 % margin = 0.0171 USD × 3 = 0.0512 USD (1 dry run: results/dry-runs/72)
S1@1.0 baseline-docs gpt-6-luna: 0.0216 USD + 35 % margin = 0.0292 USD × 3 = 0.0877 USD (1 dry run: results/dry-runs/99)
S1@1.0 wingfoil gpt-6-luna: 0.0512 USD + 35 % margin = 0.0692 USD × 3 = 0.2075 USD (1 dry run: results/dry-runs/98)
S2@1.0 baseline gpt-6-luna: 0.0152 USD + 35 % margin = 0.0205 USD × 3 = 0.0615 USD (1 dry run: results/dry-runs/73)
S2@1.0 baseline-docs gpt-6-luna: 0.0221 USD + 35 % margin = 0.0298 USD × 3 = 0.0895 USD (1 dry run: results/dry-runs/101)
S2@1.0 wingfoil gpt-6-luna: 0.0359 USD + 35 % margin = 0.0485 USD × 3 = 0.1455 USD (1 dry run: results/dry-runs/100)
S3@1.0 baseline gpt-6-luna: 0.0124 USD + 35 % margin = 0.0167 USD × 3 = 0.0501 USD (1 dry run: results/dry-runs/68)
S3@1.0 baseline-docs gpt-6-luna: 0.0309 USD + 35 % margin = 0.0418 USD × 3 = 0.1253 USD (1 dry run: results/dry-runs/103)
S3@1.0 wingfoil gpt-6-luna: 0.0589 USD + 35 % margin = 0.0795 USD × 3 = 0.2385 USD (1 dry run: results/dry-runs/102)
S8@1.0 baseline gpt-6-luna: 0.0119 USD + 35 % margin = 0.0161 USD × 3 = 0.0482 USD (1 dry run: results/dry-runs/74)
S8@1.0 baseline-docs gpt-6-luna: 0.0255 USD + 35 % margin = 0.0344 USD × 3 = 0.1032 USD (1 dry run: results/dry-runs/105)
S8@1.0 wingfoil gpt-6-luna: 0.0335 USD + 35 % margin = 0.0452 USD × 3 = 0.1357 USD (1 dry run: results/dry-runs/104)
estimate: low 15.1053, mean 15.2537, high 19.7765 USD; high 17.6347 EUR at 0.8917 EUR/USD, API-equivalent
budget guard: 0.0000 + 17.6347 = 17.6347 EUR (warn 40 EUR, ceiling 50 EUR)
```

**The limit that applies is the subscription's quota, not money** (sequencer decision 1): 0 € billed (ChatGPT Plus,
dl-024 as dl-027 and dl-031 widen it). Terra's 18 runs are about campaign-006's size (its 18 took two 5-hour
windows); Luna's 36 cost about a hundredth of Terra's each. If the window runs out, the execution stops at
`quota exhausted` and resumes (`--resume`) once it resets; the cut order above applies if the 2026-11-13 end comes
first.

## Execution

- **Spending approved** by the approver (`d8a31c84`), the quota read by the approver first (49 % of the 5-hour
  window, 80 % of the week); run by the agent at the approver's request in chat (2026-10-28, "lancia la campagna ora
  e programma la ripresa al reset"). **approved → running** on start (`ebb728f7`).
- **`697e79b75e41/1`**, `bench campaign run campaigns/codex-terra-step-a.yaml --allow-spending` from the main
  checkout (dl-024 bound 1), in three legs, each resumed (`--resume 697e79b75e41/1`) by a script five minutes after
  the reset Codex named in the stopped step ("try again at …", read as UTC):
  1. 2026-10-28 17:09–18:16 UTC: 5 runs completed; S1 baseline-docs r3 (Terra) stopped at the quota at step 3 (its
     attempt kept in `attempts/1`, 0.3179 USD). Codex named the reset as a time with no date ("try again at 8:41
     PM"), which the script did not parse: it resumed at its fallback, 20:50 UTC, from the approver's quota page.
     Leg cost 4.5696 USD.
  2. 20:50–22:28 UTC: 11 runs completed; S8 baseline-docs r1 (Terra) stopped at the quota at its first step (its
     attempt in `attempts/1`, 0 USD). Leg cost 9.6266 USD.
  3. 2026-10-29 01:55–03:54 UTC: the 38 other runs completed (Terra's last two, then Luna's 36); the execution
     `completed`. Leg cost 2.6271 USD.
- **Outcome:** 54 runs completed, 0 failed; two on a second attempt after a quota stop. No cap reached. Cost: 16.8233
  USD, 15.0013 EUR at 0.8917 EUR/USD, API-equivalent (`price-table`), the three legs' totals (the runs' 16.5054
  USD and the two stopped attempts'); against the estimate's mean 15.2537 and high 19.7765 USD. 0 € spent (ChatGPT
  Plus, dl-024 as dl-027 and dl-031 widen it). A ledger line per run. The secret scan of `results/697e79b75e41/1/`
  and `runs/697e79b75e41/1/` (plain files and every git object of the 54 workspaces) after each leg and at the end:
  clean.
- **Interventions (approver policy v2):** the wingfoil arm 27 in its 27 steps on Terra and 50 in its 51 on Luna,
  every one "Approved. Proceed."; `memory approve` ran only in the turn after the reply, in every wingfoil step (a
  script over the transcripts). Baseline and baseline-docs 0. The one wingfoil step with no intervention is Luna's
  S1 r3 step 3: the session submitted its task twice, the second `memory submit` was refused (the task already
  pending, its forward edge an approval), and it ended on a statement, with no code and no request; step 4 asked,
  got the reply and approved task-003 and task-004.
- **Scored** (`bench score 697e79b75e41/1 --holdout ../WingFoil2-Benchmark-HoldOut`): `aggregate.json`, 12 groups
  and 12 slices; determinism measured in 15, n = 1 in 9.

**gpt-5.6-terra**

| Scenario | Run | baseline | baseline-docs | wingfoil |
|---|---|---|---|---|
| S1 | r1 | 164/165, 45/48 | 164/165, 45/48 | 165/165, 48/48 |
| S1 | r2 | 159/165, 48/48 | 164/165, 46/48 | 164/165, 46/48 |
| S1 | r3 | 164/165, 45/48 | 164/165, 45/48 | 165/165, 48/48 |
| S2 | r1 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 |
| S3 | r1 | 34/37, 16/17, checks 0/1, M-F1 3/5 | 37/37, 16/17, checks 0/1, M-F1 4/5 | 34/37, 16/17, checks 0/1, M-F1 3/5 |
| S8 | r1 | 23/23, 6/7, checks 12/16 | 23/23, 7/7, checks 16/16 | 23/23, 7/7, checks 16/16 |

**gpt-6-luna**

| Scenario | Run | baseline | baseline-docs | wingfoil |
|---|---|---|---|---|
| S1 | r1 | 149/165, 46/48 | 105/165, 37/48 | 164/165, 46/48 |
| S1 | r2 | 164/165, 45/48 | 165/165, 48/48 | 164/165, 45/48 |
| S1 | r3 | 163/165, 44/48 | 158/165, 43/48 | 164/165, 46/48 |
| S2 | r1 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 |
| S2 | r2 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 |
| S2 | r3 | 23/24, 16/17, checks 0/3 | 23/24, 16/17, checks 0/3 | 22/24, 16/17, checks 0/3 |
| S3 | r1 | 34/37, 16/17, checks 0/1, M-F1 3/5 | 34/37, 16/17, checks 0/1, M-F1 3/5 | 37/37, 17/17, checks 0/1, M-F1 4/5 |
| S3 | r2 | 35/37, 16/17, checks 0/1, M-F1 3/5 | 35/37, 16/17, checks 0/1, M-F1 3/5 | 34/37, 16/17, checks 1/1, M-F1 4/5 |
| S3 | r3 | 34/37, 16/17, checks 0/1, M-F1 3/5 | 32/37, 14/17, checks 0/1, M-F1 3/5 | 37/37, 17/17, checks 0/1, M-F1 4/5 |
| S8 | r1 | 23/23, 7/7, checks 13/16 | 23/23, 7/7, checks 16/16 | 21/23, 5/7, checks 16/16 |
| S8 | r2 | 13/23, 5/7, checks 13/16 | 13/23, 5/7, checks 16/16 | 23/23, 7/7, checks 16/16 |
| S8 | r3 | 23/23, 6/7, checks 13/16 | 23/23, 7/7, checks 16/16 | 23/23, 6/7, checks 16/16 |

| Model | Arm | Runs | Steps | Interventions | Cost (USD) | Run cost range (USD) |
|---|---|---|---|---|---|---|
| gpt-5.6-terra | baseline | 6 | 27 | 0 | 3.7730 | 0.39–0.84 |
| gpt-5.6-terra | baseline-docs | 6 | 27 | 0 | 4.6218 | 0.50–0.97 |
| gpt-5.6-terra | wingfoil | 6 | 27 | 27 | 7.0947 | 0.90–1.41 |
| gpt-6-luna | baseline | 12 | 51 | 0 | 0.1569 | 0.01–0.02 |
| gpt-6-luna | baseline-docs | 12 | 51 | 0 | 0.2629 | 0.01–0.03 |
| gpt-6-luna | wingfoil | 12 | 51 | 50 | 0.5961 | 0.04–0.07 |

Total: 54 runs, 16.5054 USD, 14.7178 EUR at 0.8917; per model: gpt-5.6-terra 15.4894 USD, gpt-6-luna 1.0159 USD

Each cell: final public tests, hold-out, then checks and M-F1 where the scenario has them; from the scoring's output.
Costs from the runs' usage files.

## Results review

### The agent's analysis (2026-10-29, input to the approver's review)

Sums over the repetitions, from the scoring's output (final public tests; hold-out); wingfoil against its docs
control is `aggregate.json`'s `controls` for Terra, read from the per-run table for Luna (the slices carry no
controls).

- **On Luna, the weak model, WingFoil's step A helps, preliminary (n = 3).** S1: wingfoil 492/495 (hold-out
  137/144) against baseline-docs 428/495 (128/144) and the baseline 476/495 (135/144); without baseline-docs' r1
  (105/165), the docs control is 323/330, so most of S1's gap is one bad run, but wingfoil's three runs are the most
  even (164 each). S3: 108/111 (50/51), M-F1 4/5 in every run, against 101/111 (46/51) and 103/111 (48/51), M-F1
  3/5 in every run. S8: 67/69 against 59/69 for both controls, the rules' checks 48/48 as baseline-docs (the
  baseline 39/48). S2: the same (68 to 69/72; checks 0/9 in every arm).
- **On Terra, the strong model, small or none, n = 1 but S1:** S1 wingfoil 494/495 (142/144) against 492/495
  (136/144), M-Q1 better within the variance; S2 and S8 the same; **S3 worse**: 34/37, M-F1 3/5, against
  baseline-docs' 37/37, 4/5 (the baseline 34/37, 3/5). The bridge with campaign-006 (v0.2's manual on 0.3.0):
  there the wingfoil arm had S3 37/37, M-F1 5/5; that execution carries bug-036's erratum (12 of its wingfoil
  steps resumed on `gpt-6.1-sol`), so the difference is noted, not read.
- **The cost:** M-K1 worse wherever measured: on Terra the wingfoil arm's 6 runs cost 7.09 USD against
  baseline-docs' 4.62 and the baseline's 3.77 (S1 beyond the variance); on Luna 0.60 USD against 0.26 and 0.16 for
  12 runs each. The difference is the cycle: 77 approval round trips, and the task documents.
- **The process held on the weak model:** 77 of the wingfoil arm's 78 steps asked at the gate with "Please approve
  …", got "Approved. Proceed." and approved only after it; none self-approved (the failure of dry-runs/93). The one
  exception, Luna's S1 r3 step 3, a refused double `memory submit`, ended its step with no work and no request; the
  next step recovered it.
- **Anomalies, none blocking:** Luna S8 r2 at 13/23 in both the baseline and baseline-docs (wingfoil 23/23); Luna's
  baseline-docs S1 r1 at 105/165; S2's checks 0/3 in every arm and run (bug-026, lexical); two runs on a second
  attempt after a quota stop (fresh attempts, scored on them). No rerun proposed (campaigns are preliminary).
- **What it does not measure:** governance (dl-029, v0.4); M-R across agents. Every Terra group but S1 is n = 1,
  Luna's n = 3: preliminary throughout.
- **Publishable, in the agent's reading,** as a Codex execution read arm against arm within each model, with the
  caveats above and the bridge note on campaign-006.

## Findings

<!-- Finding notes produced (F5.4) and where they went in WingFoil. -->
