---
id: task-029-cost-metrics
type: task
title: "Cost metrics"
status: in-progress
release: v0.1
wave: W6
features: [F4.3]
acceptance: [scoring.feature]
requirements: [REQ-RUN-09, REQ-SCO-03]
---

## Context

Fourth task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the
"cost per run" half of its "Ends with". The W6 plan-phase decisions are in
[task-026](task-026-oracle-suites-per-step.md).

Scope of F4.3 (experiment design §4.2):

- **M-K1 and M-K2 per step and summed per run**, into the `score.json` of task-027: tokens by kind
  (input, output, cache read, cache creation), the API-equivalent cost in USD and in euro at the
  **campaign's** rate (REQ-RUN-09), wall time, turns and interventions.
- **From what the run stored** — each step's `usage.json` and the interventions in `run.json` — never
  from transcripts, which are git-ignored and attached to a release (REQ-RES-06). No container: cost
  scoring reads files.
- **The sums follow what W2 and W5 fixed:** a step's cost is its session's latest total, never the sum
  of cumulative totals (bug-004, adr-002 amendment 1); resumes count in the step's cost (task-007); a
  step killed at `step_time_s` counts at its bound, as the runner recorded it (task-024).
- **Deterministic (REQ-SCO-03):** the metrics are the stored values and their sums; wall time is
  measured by the run and stored, never by scoring.

Out of scope: the setup phase's cost and the step/setup split (M-K3, M-K4: F4.4, W9) — the setup's
time stays in `run.json` and is not summed into the run's step cost here; M-F2 next-change cost (F4.7,
W9).

Left to the design phase: whether a run's total includes the setup's wall time (M-K2) or reports it
apart; how a step with no usage (the agent never started) is recorded.

**Done** means: `bench score` records M-K1 and M-K2 for each step and for the run, and the run's sums
equal the steps'; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scoring.feature` @F4.3 "Cost metrics are recorded per step and per run". **red-first**
- REQ-RUN-09 — euro at the campaign's rate, API-equivalent whatever the billing. **red-first** (in
  scoring; the runner's half is **characterization**)
- REQ-SCO-03 — cost metrics identical when scored twice. **red-first**

## Design

**Classification confirmed.** The runner's half of REQ-RUN-09 (usage from the stream, EUR at the
campaign's rate) is characterization: nothing in the runner changes.

### Where the numbers come from

Only what the run stored (W6 plan-phase decision 5), no container:

- each step's `steps/<NN>/usage.json`: tokens by kind, `costUsd` (the session's latest total, bug-004),
  `costEur` at the rate the run used, `turns`, `durationMs` — its invocations together (task-007);
- `run.json`: each step's `outcome`, its number of `interventions`, and, for a step killed at
  `step_time_s` that reported no cost, `cost_bound_usd` (task-024);
- the rate: `currency.usd_to_eur` of the pins the execution ran with, the copy beside its runs
  (`campaign.yaml`, or a dry run's `dry-run.yaml`). REQ-RUN-09 converts with **the campaign's** rate,
  and a stored `costEur` already is; the rate is read only to convert a cost bound, and is recorded.

### The metrics (experiment design §4.2)

Per step the run reached, in `score.json` under `cost`:

- **M-K1:** `tokens` — `input`, `output`, `cache_creation`, `cache_read`; `cost_usd`, `cost_eur`;
- **M-K2:** `wall_time_ms` — the duration the agent reported for the step's invocations, summed; `turns`;
  `interventions`;
- the step's `outcome`, so a reader sees a `time cap reached` beside its numbers.

**A step killed at its time cap** (task-024) counts **at its bound**, as the budget counted it:
`cost_usd` is the larger of what it reported and `cost_bound_usd`, `cost_eur` that at the rate, and
`cost_reported: false` says so. Its wall time is what was reported before the kill; the cap it hit is in
the campaign file.

**The run** is the sum of its reached steps, with `cost_reported: false` if any step's was not. A step
not reached is `not_reached` and costs nothing. Money is rounded to 6 decimals (a millionth of a unit,
far below anything priced), so that float noise from summing never shows; tokens, turns, milliseconds
and interventions are integers.

**Out of scope:** the setup (M-K3) and the step/setup split (M-K4) are F4.4's, in W9. The setup's time
stays in `run.json`, apart, and is not in the run's wall time here.

### `score.json`

```json
"cost": {
  "usd_to_eur": 0.92,
  "steps": [
    { "n": 1, "outcome": "completed", "tokens": { "input": 10, "output": 200, "cache_creation": 0, "cache_read": 5 },
      "cost_usd": 0.0681, "cost_eur": 0.062652, "cost_reported": true, "wall_time_ms": 41250, "turns": 7,
      "interventions": 1 },
    { "n": 2, "not_reached": true }
  ],
  "run": { "tokens": { … }, "cost_usd": …, "cost_eur": …, "cost_reported": true, "wall_time_ms": …, "turns": …,
           "interventions": … }
}
```

A new key, so `score_version` stays 1 (adr-004 decision 12). The command line's line does not grow: the
cost is in `bench campaign run`'s own output already (task-022).

### Where the code goes

`scoring/cost.ts`, `costMetrics(runDir, executionDir)`: pure reads and sums, no port. `readStoredRun`
(results) gains each step's `outcome`, `interventions` and `cost_bound_usd`; a reader of `usage.json` and
of the pins' rate sits beside it in `results/`. `scoreRun` adds `cost` after the hidden tests; a missing or
unreadable `usage.json` of a reached step, or a missing rate, is an issue naming the file.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `0420931`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-029-cost-metrics` → `4272269`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
