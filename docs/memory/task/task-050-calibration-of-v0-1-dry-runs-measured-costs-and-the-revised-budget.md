---
id: task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget
type: task
title: "Calibration of v0.1: dry runs, measured costs and the revised budget"
status: in-progress
release: v0.1
wave: calibration
features: []
acceptance: []
requirements: [REQ-CLI-05, REQ-RES-01, REQ-RUN-08, REQ-RUN-16, REQ-NFR-06]
---

## Context

The second and last task of plan-003 step 3, **calibration**, in release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
after [task-049](task-049-wingfoil-v0-2-2-as-the-harness-under-test.md) made the released WingFoil v0.2.2 the
harness under test. It runs the `release-cycle` phase `calibration` (version 2): dry-run every scenario of the
release in every arm with the real agent, record the measured costs, revise the budget (K4). Like a spike, it
delivers no feature (`features: []`): its products are a profile, measurements and a report.

**What it produces:**

- `scenarios/dry-run.yaml`, the benchmark's dry-run profile (task-021): the wingfoil harness `v0.2.2`; agent
  `claude-code` **2.1.280** (REQ-RUN-16 as amended; the approver's choice of 2026-10-02, and the version the
  reference campaign is to pin, so that its estimate reads these costs); model `claude-sonnet-5`, with
  `claude-opus-5` given by `--model` for the slice; approver policy `v1`; the caps and the rate (design phase).
- **15 dry runs**, each stored under `results/dry-runs/<n>/` (REQ-RES-01) and committed, transcripts excepted
  (git-ignored), each a line of the [v0.1 ledger](../../calibration/v0.1-ledger.md):
  S1, S2, S3, S8 × baseline, baseline-docs, wingfoil on Sonnet 5 (12), and S1 × the three arms on Opus 5 (3;
  task-021 decision 2: no cost is scaled between models).
- each dry run scored (`bench score dry-runs/<n>`, with the hold-out), and one of them scored twice (W9's
  carry-over: M-Q2 with an agent's own tests may not be deterministic). No spending.
- `docs/calibration/v0.1.md`: measured costs per scenario, arm and model; the estimate of the reference
  campaign (21 runs) from them (`bench campaign estimate` on a draft campaign file, not run); the revised budget
  (`warn_eur`, `ceiling_eur`) proposed to the approver, and whether the Opus slice keeps three arms or shrinks
  to the wingfoil arm (experiment design §6); what the first real runs show of the items `rel-v0-1` lists for
  calibration (W7–W10: S2's and S3's checks, S8's arm difference, M-K4, M-Q2, M-R, M-R3's paths, scoring time);
  the "before the reference campaign" items task-049 settled; and, per scenario, whether its difficulty holds.
- **Registration** of S1@1.0, S2@1.0, S3@1.0 and S8@1.0 (`scenario-authoring`'s `register`), recorded in the
  report: from then on a change is a new version. A difficulty change found here is made before registration,
  in this task, and only with the approver's decision for that scenario; the scenario's dry runs then run again.

**Spending, in three stages, each with the approver's consent before it starts** (the approver's choice of
2026-10-02). The agent runs on the maintainer's subscription: costs are the API-equivalent the agent reports,
nothing is billed per token (ledger).

| Stage | Dry runs | Model | Cap per run (`run_cost_eur`) | Ceiling consented | Consent |
|---|---|---|---|---|---|
| 1 | S1 × baseline, baseline-docs, wingfoil | Sonnet 5 | 2.50 € | **7.50 €** (expected about 3.6 €) | **this task's pending → backlog approval** |
| 2 | S2, S3, S8 × the three arms (9) | Sonnet 5 | from stage 1 | from stage 1 | the approver, in chat, before it starts |
| 3 | S1 × the three arms (the slice) | Opus 5 | from stages 1–2 | from stages 1–2 | the approver, in chat, before it starts |

A dry run has no campaign ceiling: `run_cost_eur` bounds each run (REQ-RUN-08; the agent may run one turn past
its cap, task-024), so a stage's ceiling is the sum of its caps. Stages 2 and 3 are proposed with the costs
stage 1 measured; each consent is recorded with its date in the ledger's "Consent" column and in these notes.
A dry run that fails, or is killed at a cap, is still a ledger line; it is re-run only with a new consent.

**Who runs them:** the agent of this session, with `--allow-spending` and `BENCH_AGENT_TOKEN_FILE` naming the
token file the approver gives (created with `claude setup-token`). The token's content is never read, printed or
stored; the runner scrubs it from everything it keeps (REQ-RUN-15, security-secrets), and `bench transcripts
pack`'s token check is not needed here since nothing is packed.

**Out of scope:** the reference campaign and its campaign file (plan-003 step 5); validation's end-to-end run
(step 4); the site; changing a scorer rule (a finding here that calls for one is a bug or a decision-log).

**Done** means: `scenarios/dry-run.yaml` committed; 15 dry runs stored, scored and in the ledger, or the stages
the approver stopped said so; `docs/calibration/v0.1.md` written; the revised budget approved by the approver
(plan-003 step 3's gate, at this task's review); S1–S3 and S8 registered; `rel-v0-1`'s calibration checklist
line ticked at delivery.

## Acceptance criteria

<!-- A calibration task: no Gherkin scenario. What is checked at review: the profile against the schema
     (`bench scenario dry-run` accepts it), every dry run in the ledger with its consent, the report's numbers
     against the stored runs, the estimate reproducible from the report's command. -->

## Design

### The profile — `scenarios/dry-run.yaml`

```yaml
# The benchmark's dry-run profile (task-021, REQ-CLI-05), written by calibration (task-050). The pins
# are those the v0.1 reference campaign is to carry, so that its estimate reads these dry runs.
harnesses:
  wingfoil: { tool: wingfoil, version: v0.2.2 }   # task-049; the runner resolves it to 12537b62
agent: { name: claude-code, version: 2.1.280 }    # REQ-RUN-16 as amended; the approver, 2026-10-02
models: { default: claude-sonnet-5 }              # the slice's dry runs: --model claude-opus-5
approver_policy: v1
caps: { step_time_s: 1800, step_tokens: 20000000, run_cost_eur: 2.5 }
currency: { usd_to_eur: 0.8851 }                  # ECB reference rate of 2026-10-01: 1 EUR = 1.1298 USD
```

- **`run_cost_eur: 2.5`** is stage 1's consented cap. A stage whose consent sets another cap changes this
  line in its own commit before it starts; every dry run keeps the copy it ran with
  (`results/dry-runs/<n>/dry-run.yaml`), so each run's cap stays readable.
- **`step_time_s: 1800`** (30 minutes). It is a guard against a hung session, not a budget: the cost cap
  bounds spending. W3's real wingfoil step on T2 took 50 turns; S1–S8 steps are larger, and a load average up
  to about 57 on this machine slows the container. A step killed at its cap counts at its bound (task-024) and
  is reported, so the report will say if 1800 s cut a step short.
- **`step_tokens: 20000000`.** It counts every token kind, cache reads included (task-024), so on a real
  session it grows with turns × context. It is set so as not to bind before the cost cap (2.50 € ≈ 2.82 USD
  buys several million cache-read tokens); the report states each step's tokens, from which the campaign's
  value is proposed.
- **`usd_to_eur: 0.8851`**, 1 / 1.1298, the ECB's euro reference rate of 2026-10-01 (the latest published when
  the profile was written; `eurofxref-daily.xml`). The ledger's W3 line had used about 0.92; costs in USD are
  kept beside the EUR, so a later rate re-prices them without re-running.

### Running a stage

From this task's worktree, one dry run at a time (the machine is shared), on the task branch:

```bash
BENCH_AGENT_TOKEN_FILE=~/.claude/bench-token BENCH_WINGFOIL_REPO=/home/robypomper/Workspaces/WingFoil2 \
  npx bench scenario dry-run S1@1.0 --arm baseline --allow-spending
```

then `--arm baseline-docs`, `--arm wingfoil`. `~/.claude/bench-token` is the token file W3's wave check used
(`claude setup-token`); its content is never read here. After each dry run, before the next:

- the printed cost and outcome checked against `results/dry-runs/<n>/` (each step's cost, `run.json`'s
  pins: agent 2.1.280, model, harness `12537b62` for wingfoil, `dry_run: true`);
- `grep` of the stored files for the token's `sk-ant-` shape (the runner already scrubs it);
- a ledger line: date, `task-050`, `dry run`, the consent (stage and commit), model, cap, cost in USD and EUR,
  source `results/dry-runs/<n>`;
- a stage that reaches its consented ceiling stops, even with dry runs left.

Then `bench score dry-runs/<n> --holdout ../WingFoil2-Benchmark-HoldOut` (no spending). S1 in the wingfoil arm
is scored twice into a copy, to compare M-Q2.

### What is committed

`scenarios/dry-run.yaml`; `results/dry-runs/<n>/` as the runner and the scorer write them, transcripts
excepted (`results/**/transcript.jsonl` is git-ignored); the ledger lines; `docs/calibration/v0.1.md`. The draft
campaign file the estimate reads is quoted in the report with its command, and not committed: the reference
campaign's file is plan-003 step 5's.

### Choices confirmed by the approver (2026-10-02)

1. **The caps** as proposed: `step_time_s` 1800 and `step_tokens` 20 000 000, guards that should not bind
   before the cost cap; the report gives each step's time and tokens for the campaign's values.
2. **The rate:** the ECB reference rate of 2026-10-01, `usd_to_eur` 0.8851.
3. **Dry runs committed** under `results/dry-runs/`, transcripts excepted, each checked for the token first.

## Execution notes

- `npx wingfoil memory add --type task --title "Calibration of v0.1: dry runs, measured costs and the revised
  budget"` — declared: creates the element at `draft` and commits it. Observed: `2ab69d0 wf(task): add …`.
- `npx wingfoil memory submit task-050-…` (draft → pending) — declared: moves `status` and commits the file.
  Observed: `d5d1f3b wf(task): submit …`; the body committed first (`3ee70a4`).
- The approver's `memory approve` (pending → backlog), `5494e1f`, with the reason "Calibration accepted;
  consent to stage 1: S1 in baseline, baseline-docs and wingfoil on Sonnet 5, 2.50 EUR cap per run, 7.50 EUR
  ceiling" — **stage 1's consent**.

### Stage 1

- **S1@1.0 baseline** (`results/dry-runs/1`, 10:17–10:45): completed, **2.2508 USD (1.9922 €)** — steps 0.1760
  (12 turns, 82 s), 0.5299 (16 turns, 777 s), 1.3611 (22 turns, 771 s), 0.1838 USD (11 turns, 69 s); tokens per
  step 0.35 M, 0.79 M, 1.15 M, 0.39 M. Pins as profiled; no `sk-ant-` and no token literal in the stored files.
  Ledger `b22033d`.
- **The approver's consent, 2026-10-02, in chat:** the cap for stage 1's two remaining dry runs raised to **4 €**
  each, the stage's ceiling to about **10 €** (1.99 € spent + 2 × 4 €), since S1 in baseline already cost 80 % of
  the 2.50 € cap and W3 measured the wingfoil arm at about five times the baseline on T2. `run_cost_eur: 4` in
  the profile, its own commit.
- **Found:** `.gitignore`'s `runs/` ignores every directory named `runs`, `results/**/runs/` included, so no run
  record would ever be committed. The approver's choice: bug-009, fixed within this task (it blocks choice 3).
- bug-009 approved by the approver (`d0c5952` on main); fixed here: red test `7591845`, `/runs/` `315a996`;
  dry run 1's records committed `dbeb4d8`. Its Resolution is written at review.
- **S1@1.0 baseline-docs** (`results/dry-runs/2`, 10:51–11:06): **failed at step 03 with `api_error`**, after
  12 turns and 152 s; **1.2206 USD (1.0803 €)** — steps 0.4598 (35 turns, 416 s), 0.5699 (24 turns, 282 s),
  0.1908 USD. No `sk-ant-` and no token literal stored. Not re-run: a re-run needs the approver's consent.
  Stage 1 spent so far 3.0725 € of about 10 €; the wingfoil dry run not started.
- **The approver's consent, 2026-10-02, in chat:** re-run S1@1.0 in baseline-docs (cap 4 €) before the wingfoil
  dry run. With it, stage 1's worst case is about 11.07 € against the ceiling of about 10 €; the wingfoil dry
  run starts only if what is left of the ceiling covers its cap, or with a new consent.
- dry run 1 scored (`b27aaad`): S1 baseline — steps 12/12, 108/108, 108/108, 123/123, **final 135/135**,
  **hold-out 33/33**; patch already complete at step 2.
- **S1@1.0 baseline-docs, re-run** (`results/dry-runs/3`, 13:44–13:59): completed, **1.5829 USD (1.4010 €)** —
  steps 0.4117 (30 turns, 197 s), 0.6142 (19 turns, 319 s), 0.3749 (17 turns, 288 s), 0.1820 USD (14 turns,
  60 s); scored: **final 135/135, hold-out 33/33**, the same per-step tallies as the baseline. No token stored.
  Stage 1 spent 4.4735 €; the 5.52 € left of the ceiling cover the wingfoil dry run's 4 € cap, so it starts.
- dry run 2 (failed) scored: steps 12/12, 108/108, 108/108 (step 03's snapshot taken after the api_error), step 04 and final **not reached**.
