---
id: task-027-hidden-test-oracle
type: task
title: "Hidden-test oracle"
status: backlog
release: v0.1
wave: W6
features: [F4.1]
acceptance: [scoring.feature]
requirements: [REQ-CLI-06, REQ-SCO-01, REQ-SCO-02, REQ-SCO-03, REQ-FMT-06, REQ-ARC-01, REQ-ARC-02, REQ-ARC-04]
---

## Context

Second task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the
"pass/fail" half of its "Ends with". It builds on task-026's `oracle.suites` (dl-001). The W6
plan-phase decisions are in [task-026](task-026-oracle-suites-per-step.md).

Scope of F4.1:

- **`bench score <campaign-id>/<n> [--holdout <path>]` (REQ-CLI-06)** scores every run of one campaign
  execution and writes each run's `score.json` beside its `run.json` (REQ-FMT-06). `--holdout` is
  accepted and validated here (task-016's `checkHoldoutRoot`); running the hold-out tests is task-028's.
- **The `scoring` module (REQ-ARC-01)**, beside `runner`: `cli` → `scoring` → (`scenario`, `results`) →
  `core`, never importing `runner`, nor the reverse (REQ-ARC-02, enforced by the lint rule of
  task-001).
- **A scoring container (REQ-SCO-01):** its own image, never a run container; each step snapshot
  copied into it, the oracle mounted **read-only**. Docker through the existing port (REQ-ARC-04), so
  acceptance tests use the fake.
- **Hidden tests with `node:test` and `tsx` (REQ-SCO-02)**, both pinned in the scoring image,
  independent of the test tool the agent chose.
- **M-Q1** (experiment design §4.1): passed ÷ total, for every step some suite scores
  (`after_steps`) and for the final snapshot, per suite and in total.
- **Deterministic (REQ-SCO-03):** the same snapshot and oracle version give a byte-identical
  `score.json`; timestamps only as metadata, outside any metric.

Left to the design phase: how a step snapshot is rebuilt from what a run stores (plan-phase
decision 5: seed plus each step's `diff.patch`, with the setup commit, versus the git-ignored
workspace); how a hidden test finds the snapshot's code (a fixed mount point and an import
convention); what a test that hangs or a snapshot that does not compile counts as (a failure, bounded
by a timeout, never a scoring error); the shape of `score.json`, which task-028 to task-030 extend;
and whether dry runs can be scored here too, which F6.x needs in W7 ("the public oracle scores the dry
runs without errors").

**Done** means: `bench score` on a campaign execution made with the fake agent writes, for each run, a
`score.json` with M-Q1 per scored step and for the final snapshot; scoring it twice gives identical
files; no run container is used; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scoring.feature` @F4.1 "Hidden tests run outside the container on each snapshot". **red-first**
- `scoring.feature` @F4.1 "Scoring the same snapshot twice gives the same result". **red-first**
- REQ-CLI-06 — the command, its argument, and its errors (unknown campaign execution, a run without
  its steps, an invalid `--holdout`). **red-first**
- REQ-SCO-01 — the scoring container holds the snapshot copy and the read-only oracle, and no run
  container is created or reused. **red-first**
- REQ-SCO-02 — hidden tests run under `node:test` with `tsx`, whatever the snapshot's own test setup.
  **red-first**
- REQ-ARC-02 — `scoring` and `runner` never import each other (the lint rule). **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `c1c12c6`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-027-hidden-test-oracle` → `3054664`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
