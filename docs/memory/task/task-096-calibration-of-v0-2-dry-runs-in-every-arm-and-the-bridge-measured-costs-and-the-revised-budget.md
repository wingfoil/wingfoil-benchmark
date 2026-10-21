---
id: task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget
type: task
title: "Calibration of v0.2: dry runs in every arm and the bridge, measured costs and the revised budget"
status: approved
release: v0.2
wave: calibration
features: []
acceptance: []
requirements: [REQ-CLI-05, REQ-CLI-02, REQ-RES-01, REQ-RUN-08, REQ-RUN-16, REQ-NFR-06, REQ-FMT-01]
fixes: [bug-023-the-openspec-arm-ends-every-request-after-openspec-s-propose-and-writes-no-code, bug-024-the-dry-run-s-expected-cost-line-quotes-a-dry-run-of-another-arm-digest-or-harness-pin]
tags: ["calibration","budget","dry-run"]
---

## Context

plan-004 step 3 (calibration, `release-cycle` › calibration, role scenario-author): "`docs/calibration/v0.2.md`: dry
runs of S1, S2, S3 and S8 in every arm (the two new ones included) on the campaign's models, measured costs and each
step's transcript size (validation's scenario is the largest, `release-cycle` 3), revised budget, hypotheses restated
on the model they read; with WingFoil v0.3, the bridge's dry runs where the reference campaign has none of the same
key (dl-017)". Gate: the approver approves the revised budget, and every real-agent run.

What is settled before it:

- **WingFoil v0.3.0** admitted and pinned in `campaigns/v0-2-reference.yaml` (task-095, `c8b64fa`); the bridge
  (`campaigns/v0-2-bridge.yaml`) keeps v0.2.2, its wingfoil arm read from history by its pinned digest
  (`680b19f27c9f`); dry runs read the arm their profile pins, and the estimate counts a dry run only of the pinned arm
  digest and harness pin (requirements 1.33).
- **The agent pin:** Claude Code **2.1.300** (task-093: earlier versions overprice Sonnet 5.5's cache reads).
- **dl-018** (approved `cb84b61`): Sonnet 5.5's cache reads at 0.10 USD/M; the weak-model rung on **Haiku 5.5**
  (S1 and S3, baseline and wingfoil); effort **`medium`** for Sonnet 5.5, Opus 5.5 and Haiku 5.5. Its consequences are
  this task's: dl-007's price table and Haiku rung amended (W-07), the campaign files' Haiku slice and efforts,
  experiment design §6 and plan-004's dl-007 row, the method page's levels.
- **dl-015:** the effort per model is set at calibration with the approver; **dl-012:** the estimate with a margin, a
  campaign-wide ceiling, the minimum n; **dl-017:** the bridge, not cut to fit the budget.
- The placeholders both campaign files carry: `agent.version`, `agent.effort`, `caps`, `budget`, `currency`,
  `fail_fast`.

**Done** means: the dry runs stored, scored and in the ledger (or the stages stopped where the approver says);
`docs/calibration/v0.2.md` with the measured costs, times and transcript sizes, the revised budget and the hypotheses
restated; both campaign files with no placeholder left and valid (their estimate reads the dry runs); dl-018's
consequences carried out; the approver's approval of the revised budget.

## Acceptance criteria

<!-- A calibration: no Gherkin scenario and no product code planned. If a defect is found, it becomes a bug, and a
     fix to code goes through its own red test. -->

1. `campaigns/v0-2-reference.yaml` and `v0-2-bridge.yaml` validate with no placeholder left, and `bench campaign
   estimate` prices every key of each from the stored dry runs (no key missing). **Characterization** (the existing
   campaign tests, updated to the set values).
2. The two dry-run profiles are the campaigns' pins (agent, effort, harnesses, caps, rate; the bridge's arm digest).
   **Characterization** (a test reading the profiles against the campaign files).
3. bug-024: `bench scenario dry-run`'s expected-cost line quotes only a dry run of the arm digest the run will use
   and of the harness pin its profile pins (for a docs control, its source arm's): with a stored dry run of the same
   scenario, arm and model but another digest or another pin, it prints "no dry run yet". **Red-first** (a CLI test
   with the fake agent and two stored dry runs).
4. bug-023: the openspec arm's manual tells the agent that a request is carried through propose, apply and archive
   in its one session, so that OpenSpec's propose skill ending with "wait for a new user request" does not end it;
   the arm's digest changes and the reference campaign pins the new one. **Red-first** (a test of the arm's manual
   and of the campaign's pinned digest against the arm's); the behaviour itself is checked by the openspec dry runs
   (stage 6), not by a fake-agent test, which cannot follow a skill.

## Design

### The profiles

- **The reference's:** `scenarios/dry-run.yaml` (the default profile), rewritten from calibration's v0.1 pins to
  v0.2's: `harnesses` wingfoil `v0.3.0`, speckit `v1.1.0`, openspec `1.14.0`; `agent: { name: claude-code, version:
  2.1.300, effort: { claude-sonnet-5-5: medium, claude-opus-5-5: medium, claude-haiku-5-5: medium } }`;
  `models.default: claude-sonnet-5-5` (the slices' dry runs: `--model`); `approver_policy: v1`; `caps: { step_time_s:
  3600, step_tokens: 20000000, run_cost_eur: <the stage's cap> }`; `currency.usd_to_eur`: the ECB euro reference rate
  of the day stage 1 starts (`eurofxref-daily.xml`), the same in both campaign files.
- **The bridge's:** `campaigns/v0-2-bridge.dry-run.yaml`, the same pins but `wingfoil: v0.2.2` and `arm_digests: {
  wingfoil: 680b19f27c9f }`, run with `--profile`. The estimate then prices the bridge's wingfoil and baseline-docs
  keys from these dry runs only.
- A stage whose consent sets another cap changes `run_cost_eur` in its own commit; every dry run keeps the copy it
  ran with.

### The stages (each needs the approver's consent before it starts)

Every dry run is one real session per step of one scenario in one arm, from the **main checkout** (its git-ignored
transcripts outlive the branch), one at a time, with `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token` (never read
here), `BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO`, `BENCH_HOLDOUT_PATH` for scoring. Cheapest first: each stage's
measured costs set the next stage's caps.

| Stage | Dry runs | Model | Cap per run | Ceiling | Consent |
|---|---|---|---|---|---|
| 1 | S3 × the seven arms (7) | Sonnet 5.5 | 4 € | 28 € | **this task's pending → backlog approval** |
| 2 | S2, S8 × the seven arms (14) | Sonnet 5.5 | from stage 1 | from stage 1 | the approver, in chat, before it starts |
| 3 | S1 × the seven arms (7) | Sonnet 5.5 | from stages 1–2 | from stages 1–2 | the approver, in chat |
| 4 | the bridge: S1, S2, S3, S8 × wingfoil and baseline-docs on v0.2.2 (8) | Sonnet 5.5 | from stages 1–3 | from stages 1–3 | the approver, in chat |
| 5 | the slices: S1 × baseline, baseline-docs, wingfoil on Opus 5.5 (3); S1, S3 × baseline, wingfoil on Haiku 5.5 (4) | Opus 5.5, Haiku 5.5 | from stages 1–4 | from stages 1–4 | the approver, in chat |

- **Expected** (v0.1's measured runs on Sonnet 5 and Opus 5, Sonnet 5.5's cheaper cache reads, `medium`): stage 1
  about 5–15 €; the whole calibration about **80–160 €** in all, Opus 5.5 the least certain; **2–3 days** of
  calendar, about 7–13 hours of agent time. Stage 1 replaces this with measurements.
- **Stops:** a stage that reaches its ceiling stops, even with dry runs left; a failed dry run is recorded and not
  repeated without new consent; a dry run costing more than twice its stage's expected per-run cost stops the stage
  and asks.
- **After each dry run:** its cost, outcome and pins checked against `results/dry-runs/<n>/` (agent 2.1.300, model,
  effort, harness commit, `arm_digest`, `dry_run: true`); a secret scan of its stored files (`grep -rlFf <(…)` over
  the token file, the value never printed); a ledger line in `docs/calibration/v0.2-ledger.md` (date, `task-096`,
  dry run, the stage's consent, model, cap, cost in USD and EUR, source); `bench score dry-runs/<n> --holdout …` (no
  spending).
- **Watched** (task-093, dl-018): which Haiku Claude Code calls for its own work, in every `modelUsage`; the price
  basis of every model (`costBasis`, bug-016); Haiku 5.5's two price tiers; Opus 5.5's cost per run.

### Stage 6 and the two fixes (added 2026-10-21, the approver's choice in chat)

Stage 1 found bug-023 (the openspec arm writes no code) and stage 4 bug-024 (the pre-spending line ignores the arm
digest and the harness pin); the approver approved both and chose to fix them in this task, since its criterion 1
needs the openspec keys priced. On this task's branch, each fix red-first:

- **bug-024:** `src/cli/dry-run.ts` builds `latestDryRun`'s key as the estimate does: the arm's digest (the one it
  will run: the profile's pin, else the tree's), and the harness its profile pins for the arm or the docs control's
  source arm. The harness part of the key moves to one function both the estimate and the dry run call.
- **bug-023:** `arms/openspec/manual.md` says that each request is to be carried through, in this session, from
  propose to apply to archive: once propose has presented its change, the request itself is the user's request to
  apply it. Not a change to OpenSpec's installed skills (the arm keeps OpenSpec as its documentation installs it).
  The arm's new digest goes into `campaigns/v0-2-reference.yaml` (REQ-FMT-13).
- **Stage 6:** the openspec arm's four dry runs (S3, S2, S8, S1 on Sonnet 5.5), from the main checkout after the
  merge of the fixes' commits to main, with the approver's consent in chat (caps then). If S3 still writes no code, the
  stage stops and the approver decides.

### What the report holds (`docs/calibration/v0.2.md`)

- Per dry run: cost (USD, EUR), wall time and turns per step, tokens per step (every kind), interventions, outcome,
  score; the transcript size of each step, the largest step named (validation's scenario, `release-cycle` 3).
- The estimate of both campaigns (`bench campaign estimate`), with dl-012's margin; the **revised budget**:
  `budget.warn_eur` and `ceiling_eur` per campaign, the campaign-wide ceiling covering both (dl-012, dl-017);
  `caps.run_cost_eur` from the dearest dry run with a margin; `step_time_s` and `step_tokens` from the measured
  steps; `fail_fast`.
- The hypotheses (experiment design) restated on Sonnet 5.5, Opus 5.5 and Haiku 5.5; what the calibration says about
  the competitor arms (Spec Kit, OpenSpec) headless on S1–S8; anything found, filed as a bug or a decision-log.
- dl-018's consequences: dl-007 amended by hand (`Approver:`/`Reason:`, W-07); both campaign files (Haiku slice on
  `claude-haiku-5-5` with its effort; agent 2.1.300; efforts `medium`); experiment design §6 and plan-004's dl-007
  row naming Haiku 5.5; the method page stating the effort levels and that the comparison with v0.1 changes the effort
  with the model and Claude Code (dl-015's C).

### What is committed

The profiles; `results/dry-runs/<n>/` as the runner and the scorer write them, transcripts excepted; the ledger
lines; the report; the campaign files' set values; the documents dl-018 amends. Committed on main by the stages as
they run (their results are main's), the documents on this task's branch, merged at the end.

### Review, checks

- Day checks (lint read in full, `tsc`, the touched tests). The report and the set values reviewed by an independent
  read-only agent, rounds until clean. Full suites when the approver asks; green on the offered commit before
  approval.
- After approval: tell the approver the campaign step (plan-004 step 5) can be planned.

## Execution notes

- `npx wingfoil memory add --type task --title "Calibration of v0.2: dry runs in every arm and the bridge, measured
  costs and the revised budget" --tags "calibration,budget,dry-run"`, on main. Declared: the element from the
  template in `draft`, one commit. Observed: `4450778`, `status: draft`, `tags` written, the other fields empty
  (W-02). Matches.
- `npx wingfoil memory approve task-096-… --reason "…"`, on main, run by this session at the approver's explicit
  request in chat (2026-10-21; the reason says so). Declared: pending → backlog, one commit. Observed: `e9b6b00`,
  `status: backlog`. Matches. The approver then consented to stage 1 again in chat, in their own words: "the seven
  real S3 dry runs (Sonnet 5.5, at most 4 € a run and 28 € in all) from the main checkout, with the token in
  `BENCH_AGENT_TOKEN_FILE`".
- `npx wingfoil memory submit task-096-…`, on main. Declared: backlog → in-progress, one commit. Observed: `3debdf3`,
  `status: in-progress`. Matches. WIP: no other task in-progress or in-review.
- **The profiles** (`ab0cb52`, on main): `scenarios/dry-run.yaml` and `campaigns/v0-2-bridge.dry-run.yaml` as the
  Design says, `run_cost_eur: 4`. The rate: the ECB's of 2026-10-20 (1 EUR = 1.1215 USD, `usd_to_eur: 0.8917`), the
  latest published when stage 1 started (the day's rate comes out at about 16:00 CET). The touched tests: 171/171.

### Stage 1: S3@1.0 in the seven arms, Sonnet 5.5 (2026-10-21, 12:20–12:41 UTC)

Each `bench scenario dry-run S3@1.0 --arm <arm> --allow-spending` from the main checkout, one at a time, with
`BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`, `BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO`; then `bench score
dry-runs/<n>` (`BENCH_HOLDOUT_PATH`). Every one: `dry_run: true`, Claude Code 2.1.300, `claude-sonnet-5-5` at
`medium` priced `list` (no other model in any step's `modelUsage`), the arm digest the reference campaign pins, one
attempt, `completed`; the token scan of `results/dry-runs/<n>/` (`grep -rlFf`, the value never printed): clean; no
`bench-` container left; a ledger line.

| Dry run | Arm | Cost | Wall time | Turns (steps 1–5) | Largest transcript | Final public | Hold-out | M-F1 |
|---|---|---|---|---|---|---|---|---|
| 22 | baseline | 0.2707 USD (0.2414 €) | 1 min 40 s | 4, 4, 4, 4, 6 | 52 KB (step 5) | 35/37 | 16/17 | 3/5 |
| 23 | baseline-docs | 0.3966 USD (0.3536 €) | 2 min 56 s | 5, 6, 8, 6, 4 | 81 KB (step 4) | 37/37 | 17/17 | 4/5 |
| 24 | wingfoil | 0.5751 USD (0.5128 €) | 4 min 19 s | 9, 6, 7, 9, 12 | 112 KB (step 5) | 35/37 | 15/17 | 4/5 |
| 25 | speckit | 0.5875 USD (0.5239 €) | 3 min 59 s | 8, 16, 7, 11, 7 | 127 KB (step 2) | 35/37 | 16/17 | 4/5 |
| 26 | speckit-docs | 0.3000 USD (0.2675 €) | 2 min 10 s | 8, 4, 4, 9, 4 | 59 KB (step 4) | 35/37 | 16/17 | 3/5 |
| 27 | openspec | 0.5701 USD (0.5084 €) | 3 min 39 s | 8, 9, 9, 8, 9 | 136 KB (step 5) | **0/37** | **0/17** | 0/5 |
| 28 | openspec-docs | 0.2781 USD (0.2480 €) | 1 min 39 s | 4, 4, 11, 8, 4 | 42 KB (step 4) | 35/37 | 16/17 | 3/5 |

- **Spent: 2.9781 USD (2.6556 €)** of the 28 € consented; the dearest run 0.5875 USD, far under the 4 € cap. Below
  the Design's expected 5–15 € for the stage: v0.1's measurements on Sonnet 5 overstated Sonnet 5.5 at `medium`.
- **Interventions:** one approval request in step 5 of baseline, wingfoil and speckit, answered by `approver_policy`
  v1 ("Approved. Proceed."); none elsewhere.
- **Found: the openspec arm writes no code.** In every step the agent ran `/opsx:propose`, wrote the change's
  `proposal.md`, `design.md`, `specs/` and `tasks.md` under `openspec/changes/`, and ended the session, saying it had
  not edited code "as the propose workflow requires"; it never ran `/opsx:apply`, though the arm's manual asks for
  propose, then apply, then archive. Scored 0/37 public, 0/17 hold-out. The openspec-docs arm (the same docs, no
  commands) implemented every step. Not repeated; filed for the approver to decide (a bug in the arm, or a measured
  outcome).

### Stage 2: S2@1.0 and S8@1.0 in six arms, Sonnet 5.5 (2026-10-21, 13:40–14:01 UTC)

The approver's consent in chat, 2026-10-21: bug-023 a bug, its fix after calibration; stage 2 on the six arms
without openspec, 2 € a run and 15 € in all (`66ccfe7` sets `run_cost_eur: 2`). One chain, one dry run at a time,
stopping on a failure, on a run above 1 € (twice the expected 0.5 €), or before a run that could cross the ceiling;
none was reached. Every one: `dry_run: true`, Claude Code 2.1.300, `claude-sonnet-5-5` at `medium` priced `list`
(no other model in any step), the pinned arm digest, one attempt, `completed`; the token scan clean; no `bench-`
container left; scored; a ledger line.

| Dry run | Scenario | Arm | Cost | Wall time | Turns per step | Largest transcript | Final public | Hold-out | Checks |
|---|---|---|---|---|---|---|---|---|---|
| 29 | S2@1.0 | baseline | 0.2131 USD (0.1900 €) | 1 min 35 s | 5, 7, 6 | 91 KB (step 3) | 24/24 | 17/17 | 2/3 |
| 30 | S2@1.0 | baseline-docs | 0.2158 USD (0.1924 €) | 1 min 15 s | 5, 5, 7 | 97 KB (step 3) | 24/24 | 17/17 | 2/3 |
| 31 | S2@1.0 | wingfoil | 0.3223 USD (0.2874 €) | 2 min 14 s | 11, 9, 8 | 113 KB (step 1) | 24/24 | 17/17 | 3/3 |
| 32 | S2@1.0 | speckit | 0.3051 USD (0.2721 €) | 1 min 51 s | 5, 12, 10 | 117 KB (step 2) | 21/24 | 16/17 | 0/3 |
| 33 | S2@1.0 | speckit-docs | 0.2019 USD (0.1800 €) | 1 min 7 s | 5, 6, 7 | 91 KB (step 3) | 24/24 | 17/17 | 2/3 |
| 34 | S2@1.0 | openspec-docs | 0.2037 USD (0.1817 €) | 1 min 14 s | 6, 4, 8 | 91 KB (step 3) | 24/24 | 17/17 | 2/3 |
| 35 | S8@1.0 | baseline | 0.2366 USD (0.2110 €) | 1 min 43 s | 5, 4, 4, 4 | 53 KB (step 1) | 23/23 | 7/7 | 12/16 |
| 36 | S8@1.0 | baseline-docs | 0.3000 USD (0.2675 €) | 1 min 39 s | 4, 4, 4, 6 | 76 KB (step 4) | 23/23 | 7/7 | 16/16 |
| 37 | S8@1.0 | wingfoil | 0.4366 USD (0.3893 €) | 3 min 31 s | 8, 8, 6, 8 | 104 KB (step 4) | 23/23 | 7/7 | 16/16 |
| 38 | S8@1.0 | speckit | 0.3353 USD (0.2990 €) | 2 min 1 s | 11, 4, 4, 5 | 97 KB (step 1) | 23/23 | 7/7 | 16/16 |
| 39 | S8@1.0 | speckit-docs | 0.2532 USD (0.2258 €) | 1 min 32 s | 5, 4, 4, 4 | 59 KB (step 2) | 23/23 | 7/7 | 16/16 |
| 40 | S8@1.0 | openspec-docs | 0.2492 USD (0.2222 €) | 1 min 32 s | 4, 4, 4, 4 | 59 KB (step 2) | 23/23 | 7/7 | 16/16 |

- **Spent: 3.2728 USD (2.9184 €)** of the 15 € consented; the dearest run 0.4366 USD (S8, wingfoil).
- **Interventions:** one approval request, in step 2 of S2 in speckit, answered by `approver_policy` v1.
- Every arm at the maximum on S8's tests and hold-out, and on S2's but speckit (21/24, 16/17, checks 0/3); the arms
  differ on the checks.
- bug-023 approved by this session at the approver's request in chat (`78d75d4`; the reason says so).

### Stage 3: S1@1.0 in six arms, Sonnet 5.5 (2026-10-21, 14:58–15:27 UTC)

The approver's consent in chat, 2026-10-21: S1 on the six arms without openspec, 3 € a run and 12 € in all
(`82d58c5` sets `run_cost_eur: 3`); the same chain and stops as stage 2, with 2 € for twice the expected. The
session ended during wingfoil's step 2: the runner stopped the dry run (`dry-runs/43`, `interrupted`; no container
left). The approver asked in chat to restart after the interruption; the chain went on from wingfoil
(`dry-runs/44`), counting what was spent. The estimate reads completed dry runs only, so `43` is a record, not a
measurement. Its step 2 ended before the agent's result, so its usage is not in `run.json`: the transcript's
messages hold about 19.7 k cache-write and 186 k cache-read tokens, about 0.07 USD at the list prices, not counted
below. Every other one: `dry_run: true`, Claude Code 2.1.300, `claude-sonnet-5-5` at `medium` priced `list`, the
pinned arm digest, one attempt, `completed`, no intervention; the token scan clean (all seven); scored; a ledger
line each, `43`'s included.

| Dry run | Arm | Outcome | Cost | Wall time | Turns per step | Largest transcript | Final public | Hold-out |
|---|---|---|---|---|---|---|---|---|
| 41 | baseline | completed | 0.3393 USD (0.3026 €) | 3 min 6 s | 4, 6, 7, 4, 4 | 62 KB (step 3) | 164/165 | 45/48 |
| 42 | baseline-docs | completed | 0.4741 USD (0.4228 €) | 3 min 43 s | 5, 7, 6, 5, 6 | 84 KB (step 2) | 164/165 | 45/48 |
| 43 | wingfoil | interrupted | 0.1028 USD (0.0917 €) | — | 8, 0 | 93 KB (step 2) | — | — |
| 44 | wingfoil | completed | 0.6498 USD (0.5794 €) | 4 min 15 s | 9, 8, 8, 9, 9 | 108 KB (step 2) | 158/165 | 43/48 |
| 45 | speckit | completed | 0.5868 USD (0.5233 €) | 3 min 30 s | 18, 5, 5, 7, 4 | 156 KB (step 1) | 164/165 | 45/48 |
| 46 | speckit-docs | completed | 0.4091 USD (0.3648 €) | 3 min 2 s | 4, 5, 8, 4, 4 | 92 KB (step 3) | 164/165 | 45/48 |
| 47 | openspec-docs | completed | 0.3657 USD (0.3261 €) | 2 min 35 s | 4, 4, 6, 4, 5 | 75 KB (step 3) | 164/165 | 45/48 |

- **Spent: 2.9276 USD (2.6107 €)** reported, of the 12 € consented, and about 0.07 USD unreported (`43`); the
  dearest run 0.6498 USD (wingfoil).
- Every arm passes steps 1–4 in full and 152/153 at step 5, but wingfoil (146/153; final 158/165, hold-out 43/48);
  the others 164/165 and 45/48.

### Stage 4: the bridge on WingFoil v0.2.2, Sonnet 5.5 (2026-10-21, 15:31–15:56 UTC)

The approver's consent in chat, 2026-10-21: the bridge's eight dry runs (S1, S2, S3, S8 in wingfoil and
baseline-docs), 2 € a run and 10 € in all (`aa8750f` sets the bridge profile's `run_cost_eur: 2`). Each `bench
scenario dry-run <scenario> --arm <arm> --profile campaigns/v0-2-bridge.dry-run.yaml --allow-spending`; the same
chain and stops, with 1.2 € for twice the expected; none reached. Every one: `dry_run: true`, Claude Code 2.1.300,
`claude-sonnet-5-5` at `medium` priced `list`, one attempt, `completed`; the stored profile pins WingFoil v0.2.2 and
`arm_digests: { wingfoil: 680b19f27c9f }`; the wingfoil runs' `arm_digest` is `680b19f27c9f…`, read from history
(`arm_source` commit `2441243b`, REQ-FMT-13); the baseline-docs runs' arm digest is the reference's
(`2ac51091da99`), their manual v0.2.2's docs (`sha256` `4bbe51dc…`); the token scan clean; no `bench-` container
left; scored; a ledger line each.

| Dry run | Scenario | Arm | Cost | Wall time | Turns per step | Largest transcript | Final public | Hold-out | Checks |
|---|---|---|---|---|---|---|---|---|---|
| 48 | S3@1.0 | wingfoil | 0.5899 USD (0.5260 €) | 4 min 56 s | 9, 10, 9, 10, 13 | 111 KB (step 5) | 37/37 | 16/17 | 1/1 |
| 49 | S3@1.0 | baseline-docs | 0.4080 USD (0.3638 €) | 3 min 13 s | 5, 7, 6, 6, 9 | 90 KB (step 5) | 37/37 | 17/17 | 0/1 |
| 50 | S2@1.0 | wingfoil | 0.3038 USD (0.2709 €) | 1 min 56 s | 9, 8, 9 | 101 KB (step 3) | 24/24 | 17/17 | 3/3 |
| 51 | S2@1.0 | baseline-docs | 0.2606 USD (0.2324 €) | 1 min 14 s | 9, 6, 8 | 98 KB (step 1) | 24/24 | 17/17 | 2/3 |
| 52 | S8@1.0 | wingfoil | 0.4429 USD (0.3949 €) | 2 min 37 s | 8, 9, 6, 7 | 103 KB (step 2) | 23/23 | 7/7 | 16/16 |
| 53 | S8@1.0 | baseline-docs | 0.3187 USD (0.2842 €) | 2 min 10 s | 6, 6, 5, 6 | 76 KB (step 4) | 23/23 | 7/7 | 16/16 |
| 54 | S1@1.0 | wingfoil | 0.6147 USD (0.5481 €) | 4 min 35 s | 9, 8, 9, 10, 9 | 99 KB (step 5) | 164/165 | 45/48 | — |
| 55 | S1@1.0 | baseline-docs | 0.4749 USD (0.4235 €) | 3 min 27 s | 5, 5, 7, 4, 5 | 86 KB (step 3) | 164/165 | 45/48 | — |

- **Spent: 3.4135 USD (3.0438 €)** of the 10 € consented; the dearest run 0.6147 USD (S1@1.0, wingfoil).
- **Found:** the line `bench scenario dry-run` prints before spending ("the latest dry run cost …", REQ-NFR-06)
  quoted, for every bridge dry run, the reference's dry run of the same scenario, arm and model (for S3 wingfoil
  `dry-runs/24`, WingFoil v0.3.0): `src/cli/dry-run.ts` looks it up without the profile's arm digest and harness
  pin, which the estimate's key has had since task-095. Filed as a bug; the estimate itself is not affected.

### Stage 5: the Haiku 5.5 and Opus 5.5 slices (2026-10-21, 16:40–17:40 UTC)

The approver's consent in chat, 2026-10-21 (with bug-024's approval, `292d3e3`): the seven dry runs, 4 € a run and
15 € in all (`7fe41c2` sets `run_cost_eur: 4`). `--model claude-haiku-5-5` (S3, S1 × baseline, wingfoil), then
`--model claude-opus-5-5` (S1 × baseline, baseline-docs, wingfoil); the same chain and stops, with twice the
expected at 0.6 € for Haiku and 3 € for Opus; none reached. Every one: `dry_run: true`, Claude Code 2.1.300, the
model at `medium`, priced `list`, the only model in every step's `modelUsage` (Claude Code called no other Haiku for
its own work); the pinned arm digest; one attempt, `completed`; the token scan clean; no `bench-` container left;
scored; a ledger line each.

| Dry run | Model | Scenario | Arm | Cost | Wall time | Turns per step | Largest transcript | Final public | Hold-out | Checks |
|---|---|---|---|---|---|---|---|---|---|---|
| 56 | Haiku 5.5 | S3@1.0 | baseline | 0.0404 USD (0.0360 €) | 3 min 27 s | 10, 8, 9, 16, 15 | 275 KB (step 4) | 35/37 | 16/17 | 0/1 |
| 57 | Haiku 5.5 | S3@1.0 | wingfoil | 0.1057 USD (0.0942 €) | 7 min 51 s | 33, 20, 17, 31, 25 | 490 KB (step 4) | 35/37 | 16/17 | 1/1 |
| 58 | Haiku 5.5 | S1@1.0 | baseline | 0.0604 USD (0.0538 €) | 5 min 34 s | 8, 9, 16, 5, 7 | 267 KB (step 3) | 164/165 | 45/48 | — |
| 59 | Haiku 5.5 | S1@1.0 | wingfoil | 0.1132 USD (0.1010 €) | 8 min 51 s | 11, 39, 27, 15, 13 | 539 KB (step 2) | 164/165 | 45/48 | — |
| 60 | Opus 5.5 | S1@1.0 | baseline | 1.9429 USD (1.7325 €) | 9 min 51 s | 5, 7, 11, 5, 14 | 242 KB (step 3) | 165/165 | 48/48 | — |
| 61 | Opus 5.5 | S1@1.0 | baseline-docs | 2.7109 USD (2.4173 €) | 12 min 39 s | 11, 13, 11, 11, 17 | 269 KB (step 5) | 165/165 | 48/48 | — |
| 62 | Opus 5.5 | S1@1.0 | wingfoil | 2.7361 USD (2.4398 €) | 11 min 43 s | 11, 14, 20, 12, 14 | 283 KB (step 3) | 165/165 | 48/48 | — |

- **Spent: 7.7096 USD (6.8746 €)** of the 15 € consented: Haiku 5.5 0.3197 USD, Opus 5.5 7.3899 USD; the
  dearest run 2.7361 USD (Opus 5.5, S1, wingfoil).
- **Haiku 5.5's price tier:** every step's cost matches the lower tier (0.10 / 0.50 USD per million, cache writes
  0.125, reads 0.01; for `dry-runs/56` step 1, 0.00994 USD from its tokens): no request passed 100 K prompt tokens.
- **Opus 5.5:** S1 at 4.2–5.7 times Sonnet 5.5's cost in the same arm; every arm 165/165 and 48/48, the only model at
  the maximum on S1.
- **Haiku 5.5:** as Sonnet 5.5 on S1 (164/165, 45/48) and S3 (35/37, 16/17), at 15–18 % of its cost in the same arm.

### Stage 6: the openspec arm after bug-023's fix, Sonnet 5.5 (2026-10-21, 18:35–18:51 UTC)

The approver's consent in chat, 2026-10-21: the fixes merged to main first (`19505e47`), then the openspec arm's four
dry runs, 2 € a run and 6 € in all (`1ae290d2` sets `run_cost_eur: 2`). S3 first, scored before the others, the chain
to stop if it passed no public test; it passed every one. The pre-spending line said "no dry run yet" for S3 (bug-024's
fix: `dry-runs/27` ran the old digest). Every one: `dry_run: true`, Claude Code 2.1.300, `claude-sonnet-5-5` at
`medium` priced `list`, the arm's new digest `1ba12def23cf…`, one attempt, `completed`, no intervention; every step
wrote `src/`, and every change was archived under `openspec/changes/archive/` with its specs under
`openspec/specs/`; the token scan clean; no `bench-` container left; scored; a ledger line each.

| Dry run | Scenario | Cost | Wall time | Turns per step | Largest transcript | Final public | Hold-out | Checks |
|---|---|---|---|---|---|---|---|---|
| 63 | S3@1.0 | 1.0012 USD (0.8928 €) | 5 min 1 s | 16, 17, 16, 15, 20 | 194 KB (step 5) | 37/37 | 17/17 | 1/1 |
| 64 | S2@1.0 | 0.5729 USD (0.5108 €) | 2 min 18 s | 16, 17, 22 | 209 KB (step 3) | 24/24 | 17/17 | 3/3 |
| 65 | S8@1.0 | 0.6867 USD (0.6123 €) | 3 min 0 s | 13, 13, 16, 17 | 173 KB (step 4) | 23/23 | 6/7 | 16/16 |
| 66 | S1@1.0 | 0.9847 USD (0.8780 €) | 5 min 13 s | 15, 19, 18, 10, 16 | 187 KB (step 2) | 164/165 | 45/48 | — |

- **Spent: 3.2455 USD (2.8939 €)** of the 6 € consented; the dearest run 1.0012 USD (S3@1.0).
- **bug-023 fixed in its effect:** the arm now proposes, applies and archives in each step; OpenSpec's full process
  costs about 1.7 times the propose-only run of stage 1 on S3 (1.0012 against 0.5701 USD).

### The fixes (on `task/task-096`)

- **bug-024:** red `9daba120` (a CLI test: a dry run after the arm changed, and a docs control's dry run after the
  profile repinned WingFoil, both print "no dry run yet"; failed on the first, quoting `dry-runs/1`), fix `40bf0e76`
  (`harnessKey` in `src/results/dry-runs.ts`, called by the estimate and `src/cli/dry-run.ts`; the dry run keys on
  the digest of the arm that runs). The touched tests 402/402.
- **bug-023:** red `37f63cee` (the openspec manual names the three commands, "in this one session" and "do not end
  the session after `/opsx:propose`"; failed), fix `61406f66`, then `27343a58` after review round 1: the manual is the
  user's standing instruction, given before the session, to run `/opsx:apply` and `/opsx:archive` after propose; the
  arm's digest `1ba12def23cf`, pinned in `campaigns/v0-2-reference.yaml`. Whether the agent goes past the skill's stop
  is stage 6's to show. The touched tests 218/218; lint 0; `tsc` clean.

### The documents (on `task/task-096`)

- **The campaign files** (`abbdaecf`, the approver's values in chat): agent 2.1.300; `medium` for the three models;
  the Haiku slice on `claude-haiku-5-5`; caps 1800 s, 10 M tokens, 5 € a run; budgets 40/50 € and 12/15 € (65 € in
  all); `fail_fast: {same_error: 3}`; the rate 0.8917. `bench campaign validate` passes on both; `bench campaign
  estimate`: the reference 35 keys, high 36.46 USD (32.51 €), the bridge 12 keys, high 9.80 USD (8.74 €), no key
  missing. The profiles' caps set to the campaigns' (the stages' own are in the stored profiles). Tests: no
  placeholder, every key priced, the set values (`aec3fd59`), the profiles' pins (criteria 1, 2); 11/11.
- **dl-018's consequences:** dl-007 amended by hand (`491b5393`, W-07 trailers); experiment design 1.6, plan-004's
  dl-007 row, the method page's effort statement (`a7e320dc`); rel-v0-2's dl-007 row (`aec3fd59`).
- **The report** `docs/calibration/v0.2.md` (`a7e320dc`, `aec3fd59`, `51c56f30`): the 45 dry runs, cost per arm,
  the slices, steps and transcripts, the estimates, the revised budget, the hypotheses restated on Sonnet 5.5 (H11 the
  weak model's), the competitor arms, what was found; an appendix with every step.

## Review notes

- **Round 1** (an independent read-only agent, the four commits `9daba120`..`61406f66`): no blocker. Should-fix: the
  manual argued that the request was the skill's "new user request", which OpenSpec's propose skill rules out ("Any
  implementation or apply instruction in that request does not carry forward"); the agent might still stop.
  Nits: the dry run always keys on the digest while an unpinned campaign's estimate does not (to be stated); a
  comment's wording; the skipped message's "the campaign pins" from the dry run (latent: `latestDryRun` discards it).
  Fixed in `27343a58` but the latent one, left.
- **Round 2** (`27343a58`): clean. The reviewer computed the arm's digest (`1ba12def23cf`, the pin); an optional nit
  on the paragraph's line break, left (it would change the digest again).
- **Round 3** (a fresh independent read-only agent, the documents `abbdaecf`, `491b5393`, `a7e320dc`): no blocker; it
  recomputed every row of the report from the stored runs. Should-fix: the Sonnet transcript range written before stage
  6 (156 KB, the largest is 209 KB); the bridge's ceiling called 1.5 times its estimate (1.72); the Design's per-step
  figures and the hypotheses on Opus 5.5 missing. Nits: wording on the docs controls, H6's hold-out, Spec Kit's S2,
  "one dry run per key", the rate's day, long lines in dl-007, no test of the set values, Haiku 4.5 named as current in
  rel-v0-2. Fixed in `aec3fd59` (an appendix with every step; §8 says why Opus is not read; a test of the values), but
  dl-008's line (v0.1's observation), left.
- **Round 4** (`aec3fd59`): clean but three nits (wraps, one sentence, an indent), fixed in `51c56f30`. It also
  reported an earlier line of rel-v0-2 (`894ee03c9`, already pushed) naming an anonymous project: left, as the
  approver chose for the pushed mentions.

- **Full suites** (`scripts/full-suites.sh task/task-096`, started by a load waiter at 22:05, the approver's request
  in chat): on `51c56f30`, not dirty, LINT 0, TEST 0 (1652 passed, 8 skipped), BUILD 0, BIN 0 (8), DOCKER 0 (22, 2
  skipped); log `.cache/full-suites/2026-10-21/task_task-096-51c56f30-220535.txt`.

## Approval notes

- **in-review → approved** (`0bad8c88`): run by this session at the approver's explicit request in chat, 2026-10-21
  ("approva tu task 96, procedi con merge e chiusura"); the reason says so. It approves the revised budget too.
- **Merge:** `9ae50f8b` (`--no-ff`, the documents; the fixes were merged earlier, `19505e47`). bug-023 and bug-024:
  `fixed_by` and Resolution (`79da7c11`), approved → fixed (`b35011d3`, `b3383696`).
- **Worktree removed:** its ignored files were `.cache/arms/` (a copy of the bridge's arm, rebuilt from history),
  `coverage/` and `dist/`: no evidence (the dry runs' transcripts are in the main checkout). Branch `task/task-096`
  deleted.
- Next: plan-004 step 5, the campaigns (campaign-cycle), can be planned.
