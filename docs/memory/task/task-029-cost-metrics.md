---
id: task-029-cost-metrics
type: task
title: "Cost metrics"
status: pending
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

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

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
