---
id: task-030-expected-failures
type: task
title: "Expected failures"
status: backlog
release: v0.1
wave: W6
features: [F3.6]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-10, REQ-FMT-05, REQ-SCO-10]
---

## Context

Fifth and last task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
the "with expected failures marked" part of its "Ends with". The W6 plan-phase decisions are in
[task-026](task-026-oracle-suites-per-step.md).

Scope of F3.6:

- **Arms declare `provides` (REQ-FMT-10)** in `arm.yaml`, the harness capabilities the arm offers;
  the wingfoil arm at `3df305e` declares `workflow-engine: false` (K5: the v0.2 pre-release has no
  workflow engine). REQ-FMT-05 lists the arm's fields and gains `provides`.
- **Scenarios already declare `capabilities`** (REQ-FMT-04, task-001); nothing reads them yet.
- **A run is marked `expected failure` (REQ-SCO-10)** when the scenario's `capabilities` are not all in
  the arm's `provides`, naming the missing ones. The run is **executed normally** and **scored** —
  never skipped — and the mark is in its `run.json`, decided when the run is planned, and carried into
  its `score.json`.
- **Counted as a loss in aggregation** is W7's (F5.1; W6 plan-phase decision 6), carried in the
  release element.

Left to the design phase: `provides` as a map (`workflow-engine: false`, REQ-FMT-10's example) or a
list (its wording, `provides[]`), and what an undeclared capability means (not provided); whether the
capabilities an arm provides depend on the harness version it pins, so that a later WingFoil can
provide `workflow-engine` without a new arm; whether the baseline arms provide nothing, and so whether
every scenario with a capability is an expected failure there too — which REQ-SCO-10 implies and the
method page (W11) must then say; and whether `bench campaign validate` or the estimate should print the
expected failures a campaign will have.

**Done** means: a run of a T-scenario declaring `workflow-engine` in the wingfoil arm is executed,
scored, and marked `expected failure` naming `workflow-engine`; tests, coverage and lint pass. With
task-027 to task-029 done, this is W6's "Ends with".

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F3.6 "A scenario that needs a missing harness capability is an expected
  failure" — its "published as a loss" clause is W7's. **red-first**
- REQ-FMT-10 / REQ-FMT-05 — `provides` in `arm.yaml`, validated; an unknown key still refused.
  **red-first**
- REQ-SCO-10 — the mark and the missing capabilities in `run.json` and `score.json`; the run executed
  and scored. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `5445c1d`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-030-expected-failures` → `5f2f25a`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
