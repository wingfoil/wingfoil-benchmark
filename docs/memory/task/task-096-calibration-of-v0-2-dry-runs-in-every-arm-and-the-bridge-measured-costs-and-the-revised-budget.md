---
id: task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget
type: task
title: "Calibration of v0.2: dry runs in every arm and the bridge, measured costs and the revised budget"
status: in-progress
release: v0.2
wave: calibration
features: []
acceptance: []
requirements: [REQ-CLI-05, REQ-CLI-02, REQ-RES-01, REQ-RUN-08, REQ-RUN-16, REQ-NFR-06, REQ-FMT-01]
fixes: []
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
