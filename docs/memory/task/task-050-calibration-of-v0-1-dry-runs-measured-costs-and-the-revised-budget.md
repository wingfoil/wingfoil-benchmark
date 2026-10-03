---
id: task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget
type: task
title: "Calibration of v0.1: dry runs, measured costs and the revised budget"
status: approved
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
- **15 dry runs** (as planned; in the event **19**, see the Execution notes: two failures re-run, S1's three
  Sonnet dry runs repeated after its step 5, and the Opus slice dry-run in two arms), each stored under `results/dry-runs/<n>/` (REQ-RES-01) and committed, transcripts excepted
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
- **S1@1.0 wingfoil** (`results/dry-runs/4`, 14:00–14:26): completed, **3.7455 USD (3.3152 €)** — steps 0.5981
  (42 turns, 237 s), 0.9805 (41 turns, 374 s), 1.7069 (42 turns, 765 s), 0.4600 USD (31 turns, 167 s); 1.73 M to
  3.42 M tokens a step; harness `12537b62`; interventions 1, 0, 1, 1. No token stored. Scored: **final 135/135,
  hold-out 33/33**, the same tallies as the other arms.
- **Scored twice** (W9's carry-over): the two `score.json` byte-identical — M-Q2 coverage 280/313 with the
  agent's own tests passing both times, lint 0 findings. One pair, not a proof of determinism.
- **Stage 1 done:** 4 dry runs, **7.79 €** (8.80 USD) against the ceiling of about 10 €. Measured S1 costs per
  completed run: baseline 1.99 €, baseline-docs 1.40 €, wingfoil 3.32 €.

### Stage 2

- **The approver's consent, 2026-10-02, in chat:** stage 2 — S2, S3, S8 × baseline, baseline-docs, wingfoil on
  Sonnet 5 — with a cap of **5 €** per run and a ceiling of **30 €** (expected about 20 €). A dry run starts only
  while the stage's spending plus its cap stays within the ceiling. S1's difficulty is decided after stage 2.
- **Stage 2 ran** 14:30–16:03, one dry run at a time (`results/dry-runs/5`–`13`); **12.86 €** against the 30 €
  ceiling. Eight completed; **S8 wingfoil failed at step 03 with `api_error`** (`results/dry-runs/13`, 1.4464 €),
  the second `api_error` at a step 03 (dry run 2). No `sk-ant-` and no token literal stored. Scored with the
  hold-out:

  | Dry run | Scenario | Arm | Cost | Final hidden | Hold-out | Checks | M-F1 |
  |---|---|---|---|---|---|---|---|
  | 5 | S2 | baseline | 0.9374 € | 24/24 | 17/17 | 2/3 | — |
  | 6 | S2 | baseline-docs | 1.4142 € | 24/24 | 17/17 | 2/3 | — |
  | 7 | S2 | wingfoil | 1.4194 € | 24/24 | 17/17 | **3/3** | — |
  | 8 | S3 | baseline | 0.8413 € | 35/37 | 16/17 | 0/1 | 3/5 |
  | 9 | S3 | baseline-docs | 1.9732 € | 34/37 | 16/17 | 0/1 | 3/5 |
  | 10 | S3 | wingfoil | 2.2925 € | 34/37 | 16/17 | **1/1** | **4/5** |
  | 11 | S8 | baseline | 1.0483 € | 23/23 | 7/7 | 12/16 | — |
  | 12 | S8 | baseline-docs | 1.4840 € | 23/23 | 6/7 | **16/16** | — |
  | 13 | S8 | wingfoil | 1.4464 € (failed) | not reached | not reached | 12/12 (steps 1–3) | — |
- **The two `api_error`s, from the step 03 transcripts:** dry run 2 — HTTP **429**, "This request would exceed
  your account's rate limit" (`error: rate_limit`): the subscription's rate limit, the first observed shape of
  it, classified by the runner as a plain failure. Dry run 13 — "Can't reach the API server — check your
  internet or DNS (EAI_AGAIN)" after one `api_retry`: the network.
- **The approver's decisions, 2026-10-02, in chat:** re-run S8 wingfoil within stage 2 (cap 5 €, ceiling 30 €);
  the 429 becomes **bug-010**, fixed by a task of its own before the campaign; **S1 is made harder** before its
  registration (task-050's Context: a difficulty change made here, the scenario's dry runs then run again).
- bug-010 filed on main (`5e8a6ef`, pending `03a64e9`).
- **S8@1.0 wingfoil, re-run** (`results/dry-runs/14`, 17:3x–17:51): completed, **2.4921 USD (2.2058 €)** — steps
  0.6953, 0.6121, 0.5461, 0.6386 USD; interventions 1, 1, 1, 1. No token stored. Scored: steps 11/11, **11/14,
  16/19, 20/23, final 20/23, hold-out 5/7**; **checks 16/16**. The only run so far below the reference on hidden
  tests, and with baseline-docs the only one to keep all four rules. Stage 2 spent 15.06 € of 30 €.
- **The approver's decision, 2026-10-02, in chat:** S1 is made harder by **a step 5, `createPatch(from, to)`**,
  scored by a property (applying the generated patch to `from` gives `to`) on a fixed corpus of document pairs,
  with further pairs in the hold-out; within this task, design first.

### S1's step 5 — design (to confirm before any change to `scenarios/S1/1.0/`)

S1@1.0 has no campaign result, and dry runs never freeze a version (`recordedHashes` skips `results/dry-runs`),
so it can still change. Its hash changes with it: dry runs 1–4 keep the old `scenario_hash`, are no longer
counted by the estimate (`latestDryRun` needs the current hash) nor re-scorable, and stay as ledger evidence.
S1's three Sonnet dry runs run again on the new version (stage 1b), and stage 3 (Opus) runs on it.

**The step.** `prompts/05.md`, in a product owner's voice like the others: clients want to send only what
changed; export `createPatch(from, to)` from `src/index.ts`, returning a JSON Patch (RFC 6902) that turns `from`
into `to`; it must not mutate its inputs; the patch describes what changed, not the whole document again. No
list of cases, as in step 3.

**The suite** `oracle/create-patch/` (`after_steps: [5]`), written by the benchmark, so no `third_party` entry:

- `pairs.json`: about 30 pairs `{from, to, max}` — object keys added, removed, changed; nested objects; arrays
  with insertions, deletions and reorderings at the start, middle and end; type changes (object ↔ array ↔
  scalar); `null` and empty containers; keys needing Pointer escapes (`~`, `/`); equal documents (an empty
  patch). Short keys and values, so the leak scan finds nothing of 8 characters or more in a prompt or the seed.
- `create-patch.test.mts`, adr-004's conventions (code imported inside each test, names unique,
  `#${index}`-style, inputs deep-frozen and compared afterwards), one test per pair checking:
  - **P1, round trip:** applying the returned patch to `from` gives `to`, applied by **the suite's own
    applier** (`applier.mjs` beside the test, RFC 6902, strict), not the agent's `applyPatch`, so step 5
    scores `createPatch` alone and an invalid operation fails;
  - **P2, locality:** the patch's JSON is at most `max` characters, `max` being per pair and generous (about
    twice a minimal patch's length) on pairs built as a small change in a large document, so the trivial
    `[{ "op": "replace", "path": "", "value": to }]` fails them while any reasonable diff passes;
  - inputs not mutated.
- **Regression:** `patch` and `merge-patch` also run after step 5 (`after_steps: [2, 3, 4, 5]`, `[4, 5]`).
- **Hold-out** (private repository, `scenarios/S1/1.0/create-patch/`): about 15 more pairs of the same kinds,
  larger and deeper, using the public applier through `../create-patch/`.

**Reference:** `test/fixtures/reference/S1/05/src/{create-patch.ts, index.ts}`, passing every public and
hold-out pair; its README names `05/`.

**What else changes:** `test/unit/scenarios/s1.test.ts` (steps, suites, counts, the reference's step 5);
`test/docker/run.test.ts` `s1InArm` (a fifth tally, final 135 + N); `test/acceptance/scoring.test.ts` where it
assumes step 4 is last; S1.md amendment 1.3 (card, §4, §5, §6); traceability's Q-D3 and Q-F2 rows; adr-004's
cost note. `bench scenario validate S1@1.0 --holdout …` must pass.

**Cost:** one more step per S1 run, about +0.3–0.6 € on the S1 costs measured (1.40–3.32 €).

**Choices to confirm:**

1. P1 through the suite's own applier (recommended), or through the agent's `applyPatch`, which would also
   charge step 5 with any bug of step 2–3.
2. P2 as a per-pair length bound (recommended); or no locality check (the trivial patch then scores full); or
   a stricter, structural check (every operation at a location that differs), harder to state for arrays.
3. `patch` and `merge-patch` re-run after step 5 as regression (recommended), or not.
4. About 30 public and 15 hold-out pairs.

**Confirmed by the approver, 2026-10-02:** P1 through the suite's own applier; P2 as a per-pair length bound;
`patch` and `merge-patch` re-run after step 5; about 30 public and 15 hold-out pairs.

### S1's step 5 — build

- Red `8b8cb31`; the step, its suite and the reference `9845c78`; the hold-out's 15 pairs in the private
  repository (`432db90` there); S1 1.3, traceability 1.3, adr-004's note `6b11f2d`. The test's threshold of
  bounded pairs set to 15 (19 of the 30 are bounded: the 17 small changes in a large document and the two equal-document pairs).
- Checked: `bench scenario validate S1@1.0 --holdout …` valid (leak scan clean, hold-out 5 files); the seed fails
  the 30 public and 15 hold-out pairs, the reference's step 5 passes all 45 (a local run of both suites);
  `test/unit/scenarios/s1.test.ts` 15/15; `test/acceptance/scoring.test.ts`, `scenarios.test.ts` and
  `test/unit/results` 117/117; the S1 Docker tests 2/2 (baseline; baseline-docs and wingfoil).

### Stage 1b — S1@1.0 with step 5

- **The approver's consent, 2026-10-02, in chat:** S1 × baseline, baseline-docs, wingfoil on Sonnet 5, cap **5 €**
  per run (the profile's, unchanged), ceiling **13 €** (expected 8–9 €).
- **Stage 1b ran** 19:08–20:25 (`results/dry-runs/15`–`17`), all three completed; **8.46 €** of 13 €. No token
  stored. Scored with the hold-out:

  | Dry run | Arm | Cost | Turns (steps 1–5) | Step 5 | Final hidden | Hold-out |
  |---|---|---|---|---|---|---|
  | 15 | baseline | 1.9103 € (2.1583 USD) | 17/14/22/16/18 | 153/153 | 165/165 | 48/48 |
  | 16 | baseline-docs | 2.1432 € (2.4214 USD) | 23/23/26/18/16 | **146/153** | **158/165** | **43/48** |
  | 17 | wingfoil | **4.4102 €** (4.9827 USD) | 46/36/57/41/35 | 153/153 | 165/165 | 48/48 |

  Step 5 moves one arm off the maximum (baseline-docs: 7 public and 5 hold-out `createPatch` pairs lost); the
  wingfoil run cost 88 % of its 5 € cap.

### Stage 3 — the Opus 5 slice on S1

- Estimate: Opus 5 is 2.5× Sonnet 5 per token ($5/$25 against $2/$10 per MTok, the claude-api reference cached
  2026-09-25), so stage 1b's 8.46 € gives about **21 €** (wingfoil about 11 €). The campaign as measured: about
  39 € for its 18 Sonnet runs, about 60 € with the slice in three arms, against the 30 € target.
- **The approver's consent, 2026-10-02, in chat:** S1 × baseline, baseline-docs, wingfoil on Opus 5
  (`--model claude-opus-5`), cap **13 €** per run, ceiling **25 €**. `run_cost_eur: 13` in the profile, its own commit.
- **Stage 3 ran** 20:36–21:39 and stopped after its first dry run, by its own rule (13.02 € spent; a second 13 €
  cap would pass the 25 € ceiling). **S1@1.0 baseline on Opus 5** (`results/dry-runs/18`): **cap reached during
  step 05**, **14.7150 USD (13.0243 €)** — steps 1.6819 (37 turns, 383 s), 3.8850 (47 turns, 784 s), **6.4676**
  (62 turns, 1644 s, near the 1800 s step cap), 1.0510 (22 turns), 1.6296 USD (23 turns, stopped at the cap);
  tokens per step 1.39 M, 3.29 M, 6.48 M, 0.75 M, 0.76 M. No token stored. Scored: steps 1–5 at the maximum
  (153/153 at step 5), **final not reached** (the run ended at its cap), hold-out not reached.
- **Opus 5 cost 6.8× the Sonnet 5 baseline** (13.02 € against 1.91 €), not the 2.5× of the per-token prices:
  and 3.6× the tokens on the same steps (12.68 M against 3.51 M in dry run 15). The slice's estimate from stage 1b
  was wrong by that factor.
- **The approver's consent, 2026-10-02, in chat:** one more Opus 5 dry run, **S1 wingfoil**, cap **35 €** (its
  ceiling, one run; expected about 30 €, 2.3× the Opus baseline as wingfoil was 2.3× the baseline on Sonnet), and
  for it `step_time_s` **3600** (Opus's baseline spent 1644 s of 1800 on one step). Both in the profile, their
  own commit; the step time is a value the report revisits for the campaign.
- **The approver's request, 2026-10-02, in chat:** at the end of calibration, the report gains a section
  **"Hypotheses for v0.2"** — explicit, falsifiable expectations for WingFoil with its workflow engine, written
  before v0.2 runs on the same registered scenario versions (cost against the baseline, M-F1, S2's and S8's
  checks, expected failures), as the defence against T1.
- **S1@1.0 wingfoil on Opus 5** (`results/dry-runs/19`, 21:49–23:09, started after its consent's commit `4928340`): completed, **24.0758 USD (21.3094 €)** —
  steps 3.0117 (62 turns, 623 s), 6.1785 (64 turns, 1167 s), 5.6707 (69 turns, 1201 s), 3.6906 (59 turns, 796 s),
  5.5243 USD (62 turns, 981 s); 24.88 M tokens; two neutral-approver interventions. No token stored. Scored:
  **final 165/165, hold-out 48/48**. Calibration's dry runs are done.
- **The Opus slice as dry-run:** baseline (stopped at its 13 € cap) and wingfoil (completed). Opus baseline-docs
  and a completed Opus baseline were not run: after stage 3 stopped by its ceiling rule, the approver consented to
  the wingfoil dry run alone (2026-10-02). Whether the slice needs them depends on the revised budget's option: none
  with option A or B; with option C, their consent first.

### Review

**Checks:** `npm test` 77 files, **1200 tests**, coverage 98.1 % statements, 90.8 % branches; `npm run lint` clean;
`bench scenario validate S1@1.0 --holdout …` valid; S1's hash unchanged by the lint fix (the estimate still reads
dry runs 15–19); the S1 Docker tests 2/2 before it.

**Independent review** by a fresh read-only agent on the branch (2026-10-02): no blocker. Its findings and outcome:

1. *should-fix* — §6: the longest Sonnet step was 901 s (S1 wingfoil step 3), not 777 s. **Fixed.**
2. *should-fix* — §6: the largest Sonnet step used 4.9 M tokens, not 3.4 M. **Fixed.**
3. *should-fix* — §5's margin rested on completed-against-failed pairs; the like-for-like evidence (S1's steps 1–4 run
   twice per arm) shows −23 %, +35 %, +16 %. **Fixed:** quoted, and the ceilings re-set at about +35 % (A 85 €,
   B 55 €, C 120 €), the warnings at about +10 %.
4. *should-fix* — step 5's bound in effect asks for a shift-aware (LCS) array diff, which the prompt does not state
   (baseline-docs' index-wise diff lost seven pairs, two of them small arrays). **Fixed:** said in S1.md §6 and the
   report's §8; the pairs and the prompt are unchanged (S1's hash).
5. *should-fix* — the Context's 15 dry runs and three Opus arms against the 19 run and the slice in two arms.
   **Fixed:** the Context says so, and a note above records what the slice was dry-run with and why.
6. *should-fix* — §9 quoted values the untracked draft did not hold. **Fixed:** the draft aligned (cap 30 €,
   65/85 €); §9 says it shows option A.
7. *nits* — turns "1.5× to 2.5×"; the cost per token's rise (1.9×, 2.3×) beside the list price; S8 "public hidden
   tests"; §1 names the slice's two arms; S1.md §2 softened; 19 bounded pairs, not 17; dry run 19 started 21:49,
   after its consent; the reference's `in` replaced by `Object.hasOwn`; the ESLint override narrowed to the applier.
   **Fixed.** S1.md's card ("3 arms × 1") is amended when the approver chooses the slice's option. The applier's
   `__proto__` and move-to-itself edge cases are in no pair, and the file is not edited (S1's hash): future pairs avoid
   such keys. Two consent commits (`5f4b5eb`, `e37dee2`) carry no `Approver:` line; the consents are in the notes they
   commit, and the history is not rewritten.
- `npx wingfoil memory submit task-050-…` (in-progress → in-review) — declared: moves `status` and commits the file. Observed: `2ad4591`, `status: in-review`; the body committed first (`273f38c`).
- The approver's `memory reject` (in-review → in-progress), `5063a25`, to add to the report what the
  discussion of 2026-10-03 produced. Added: §7 "Where the wingfoil arm's cost goes" (the transcripts of dry runs 7,
  10, 14, 17, 19 classed by tool call: orientation 12–19 %, recording 15–24 %, approval round trips 5–10 %; no MCP
  call; the developer's directives about 1 300 tokens), the statement that the arm's process is the manual's choice,
  and the cost by lever (role context at start, linked sessions, a workflow for agents: estimates); §8 the saturation
  rule; §10 the decision-logs to file after v0.1; §11 H8–H10, the levels of delegation and the neutral control. The
  figures were re-read against the per-run classification before the commit.
- `npx wingfoil memory submit task-050-…` (in-progress → in-review), again — observed: `d525984`, `status: in-review`; the body committed first (`66548e5`). The additions were checked against the per-run classification by this session, not by a second independent review.
- **Independent review of the additions** (`66548e5`), a fresh read-only agent at the approver's request
  (2026-10-03): no blocker; it reproduced the shares and the round trips exactly on their stated rules. Its findings
  and outcome:
  1. *should-fix* — §8 said S8 is at its maximum on hidden tests. **Fixed:** only S2 is; S8 differs for wingfoil.
  2. *should-fix* — the shares' basis: per-message output counts in the stream are partial (63–71 % of reported
     costs priced), so output and thinking are unattributed. **Fixed:** the basis stated, with the shares when output
     is spread by visible output (orientation about 3 points down, recording up to 6 up), and lever 1 at about −10 %
     on that basis.
  3. *should-fix* — lever 1 described v0.3 as injecting role context; WingFoil's design (adr-012, spec-016 §2.8) has
     the bootstrap send the agent to fetch the `{role}-session` Prompt, unverified for any agent CLI. **Fixed:** the
     mechanism described as designed, and the lever conditional on that verification.
  4. *should-fix* — H1's estimate does not reach its own 1.5× threshold on S1 (about −13 % there). **Fixed:** said in
     the row.
  5. *should-fix* — the −28 to −34 % range's bounds unstated. **Fixed:** low end half the recording; high end plus
     about 90 % of the round trips outside recording.
  6. *nits* — exploration recomputed with its rule stated (14/35/13/15 %, Opus 25 %); ratios 1.5× and 1.3× against
     baseline-docs, H8 on the mean with per-scenario values; the manual's approval rule quoted; the neutral control's
     cost with its assumption (about 40 € at one step an instance, 100–200 € at a whole scenario run); "extending
     F7.3"; one ambiguous sentence reworded. **Fixed.**
- The approver's `memory reject` (in-review → in-progress), `c4b83f4`, to apply the second review's findings above.
- `npx wingfoil memory submit task-050-…` (in-progress → in-review), after the second review — observed: `fbabb55`, `status: in-review`.

### Approval

The approver's `memory approve` (in-review → approved), `721321f`: `memory history` records `operation: approve`,
the approver and the reason — **revised budget option A** (the Opus slice reduced to wingfoil, `warn_eur` 65,
`ceiling_eur` 85, `run_cost_eur` 30), S1 1.3 and traceability 1.3 accepted, S1–S3 and S8 registered. Recorded in the
report (status Approved, §5), in S1.md and traceability.md's review decisions, and in S1.md 1.4 (the slice in the card).
bug-010's approval, run in this task's worktree by mistake (`ea21256`), was moved to main as `86327a2` at the
approver's request and dropped from this branch's tip.
