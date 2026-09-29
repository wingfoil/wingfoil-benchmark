---
id: task-040-setup-cost-and-break-even
type: task
title: "Setup cost and break-even"
status: draft
release: v0.1
wave: W9
features: [F4.4]
acceptance: [scoring.feature]
requirements: [REQ-RUN-03, REQ-RUN-12, REQ-SCO-03, REQ-SCO-08, REQ-FMT-07]
---

## Context

Second task of wave **W9 — Quality** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). The W9
plan-phase decisions are in [task-039](task-039-continuity-metrics-and-regressions-from-the-seed.md). This
task delivers **F4.4 setup/step split and break-even**:

- **M-K3**, setup cost;
- **M-K4**, break-even per scenario (experiment design §4.2).

It also delivers W6's and W7's carry-overs: the setup's cost beside the steps', and M-K3 and M-K4 in
the aggregate's `cost`.

What exists:

- `run.json` records `setup: {duration_ms, usage, …}`. `usage` is always zero in v0.1, because no setup
  runs an agent (adr-003 decision 11). The manual is recorded as `manual: {file, bytes, tokens, …}`
  (REQ-RUN-12).
- Scoring's `StoredRun` reads only `setup.tree`. `cost` in `score.json` holds the steps and the run.
  The run total is the sum of the steps, and the setup's time is not in it (W6's carry-over).
- The aggregate groups by scenario, version, arm and model, and reads only `cost.run`. No value compares
  two arms yet.

Scope:

- **M-K3 in `score.json`:** `cost.setup` holds the M-K1 and M-K2 values of the setup phase, and the
  operating manual's tokens:
  - tokens by kind, and the API-equivalent cost in euro, all 0 in v0.1;
  - wall time.

  `StoredRun` reads `setup.duration_ms`, `setup.usage` and `manual`. `cost.run` stays the sum of the
  steps, so the setup is reported beside it and never folded in. A run stored before the manual was
  recorded says so, and gets no invented value.
- **M-K4 in `aggregate.json`.** This is a new per-scenario section, since break-even compares two arms.
  For each scenario version, model and arm with a harness, it is computed against the baseline arm of
  the same scenario version and model, following §4.2 (W9 decision 2):
  - n* = the arm's setup cost ÷ (the baseline's mean step cost − the arm's mean step cost);
  - "not applicable" when the arm's M-Q1 is lower than the baseline's;
  - "never" when the arm's mean step cost is not lower.

  The value carries the runs of both groups and their `n`.
- **The design settles:**
  - which M-Q1 compares quality: the final pass rate, or every step's;
  - what "mean step cost" averages over: reached steps across runs;
  - how an expected-failure arm is treated, since it counts as a loss (REQ-SCO-10);
  - the baseline-docs arm: it is an arm with no harness, so whether it gets a break-even against the
    baseline too.
- **M-K3 in the aggregate's `cost`** per group, as a `Value` (REQ-FMT-07).
- **Requirements:** a REQ-SCO-08 amendment. It states what a break-even of 0 means in v0.1 (W9
  decision 2) and the choices above. The review decision is recorded.
- **Acceptance:** `scoring.feature` @F4.4 "Break-even is computed only when quality is not worse", and
  the outline "Break-even special cases" (not applicable, never), with tests titled `@F4.4 <Scenario
  name>`. They run on S3 with synthetic step costs.

Out of scope:

- pricing the manual as a setup cost (rejected, W9 decision 2);
- what the site shows of M-K4 (W11);
- M-F2 (task-039) and M-Q2 (task-041).

**Done** means:

- M-K3 is in `score.json` and in the aggregate per group;
- M-K4 is in the aggregate per scenario, arm and model, with its special cases;
- the @F4.4 scenarios are green;
- REQ-SCO-08 is amended;
- tests, coverage and lint pass.

## Acceptance criteria

<!-- Classified in the design phase. -->

- `scoring.feature` @F4.4 "Break-even is computed only when quality is not worse"
- `scoring.feature` @F4.4 "Break-even special cases" (not applicable; never)
- REQ-RUN-03 / M-K3: the setup's usage, wall time and cost in `score.json`, beside the steps and outside
  `cost.run`, with the manual's tokens
- REQ-FMT-07: M-K3 and M-K4 in `aggregate.json`, each with its runs and `n`
- REQ-SCO-03: the same runs scored and aggregated twice give the same bytes

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
