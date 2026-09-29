---
id: task-034-results-store-and-aggregation
type: task
title: "Results store and aggregation"
status: backlog
release: v0.1
wave: W7
features: [F5.1]
acceptance: [results.feature, scenarios.feature]
requirements: [REQ-FMT-06, REQ-FMT-07, REQ-RES-01, REQ-RES-06, REQ-SCO-03, REQ-SCO-09, REQ-SCO-10]
---

## Context

Fourth and last task of wave **W7 — First content** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
The wave's "Ends with" ("S1 and S2 scored in all three arms") holds after task-033; this task adds the
aggregate the wave check then reads. The W7 plan-phase decisions are in
[task-031](task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md).

Scope of F5.1 (experiment design §4.6):

- **`aggregate.json`** in `results/<campaign-id>/<n>/` (REQ-FMT-06), computed from the execution's
  `score.json` files only: every value with the list of run paths it came from and its `n`
  (REQ-FMT-07), each run named by campaign, scenario version, arm, model id and repetition — the
  `results.feature` @F5.1 lineage.
- **What W5 and W6 left to aggregation** (decision 7):
  - dry runs (`results/dry-runs/`) are never read (REQ-RES-01), even when scored;
  - an **expected failure** counts as a loss, with its missing capability named (REQ-SCO-10, W6
    decision 6); so does a step or final snapshot `not_reached` (adr-004), with the reason named;
  - the **Opus 5 slice** is aggregated apart from the same-model runs, never mixed (T14);
  - **hold-out** results apart from public ones (REQ-SCO-09), with `holdout.scored: false` shown as
    "not scored", never as zero;
  - `n = 1` is marked preliminary with no variance; with `n ≥ 3`, the range (min–max).
- **Regressions (M-D3), added by task-032's design:** the tests of a suite that failed at a step and not
  at an earlier step bound to the same suite — S1's Patch suite after step 4 against step 3 (Q-D3),
  S2's seed and regression suites — read from each step's `failed` list in `score.json`. To be confirmed
  in this task's design.
- **What the aggregate covers in W7:** the metrics `score.json` holds today — M-Q1 per suite, step and
  final, public and hold-out, and M-K1/M-K2 — grouped by scenario version, arm and model. Metrics of
  W8–W10 join the same structure later. Per-category rows and "beyond variance" are the site's reading
  of this file (F5.5, W11); whether the file already holds them is this task's design.
- **How it is produced:** REQ-CLI lists no aggregation command. Whether `bench score <campaign-id>/<n>`
  writes it after scoring every run, or a command of its own does (a requirements amendment, REQ-CLI),
  is the design's; either way deterministic, like scoring (REQ-SCO-03), and refusing an execution with
  an unscored run.
- **What is committed** (REQ-RES-06): `aggregate.json` beside `run.json`, `score.json`, `usage.json`
  and `diff.patch`, transcripts not.

Out of scope: run detail and comparison (F5.3, W10), finding notes (F5.4, W10), the site (F5.5, W11),
determinism metrics (F4.5, W10).

**Done** means: a scored campaign execution has an `aggregate.json` whose every value names its runs and
its `n`, with dry runs out, expected failures and unreached snapshots as losses, the slice and the
hold-out apart; aggregated twice, the same bytes; tests, coverage and lint pass. Then the W7 wave check
(decision 4).

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `results.feature` @F5.1 "Every aggregate links to the runs behind it". **red-first**
- `results.feature` @F5.1 "Dry runs never enter campaign results". **red-first**
- `scenarios.feature` @F3.6 "… it is published as a loss, never skipped" — the aggregation half.
  **red-first**
- REQ-FMT-07 — every value with its run paths and `n`; `n = 1` preliminary, `n ≥ 3` with its range.
  **red-first**
- T14 — the model slice aggregated apart from the same-model runs. **red-first**
- REQ-SCO-09 — hold-out values apart, "not scored" shown when the hold-out was not configured.
  **red-first**
- REQ-SCO-03 — the aggregate identical when computed twice. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `dec5d68`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W7 tasks of release v0.1` (`02edf51`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-034-results-store-and-aggregation` → `cdd282d`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
