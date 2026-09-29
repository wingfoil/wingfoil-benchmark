---
id: task-034-results-store-and-aggregation
type: task
title: "Results store and aggregation"
status: approved
release: v0.1
wave: W7
features: [F5.1]
acceptance: [results.feature, scenarios.feature]
requirements: [REQ-CLI-06, REQ-FMT-06, REQ-FMT-07, REQ-RES-01, REQ-RES-06, REQ-SCO-03, REQ-SCO-09, REQ-SCO-10]
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

**Classification confirmed**, all red-first. The @F3.6 criterion extends the existing acceptance test
("… is an expected failure") with its last line. The two @F5.1 scenarios go into a new
`test/acceptance/results.test.ts`, which traceability requires once F5.1 has started.

### Who writes `aggregate.json`: `bench score`, when every run is scored

`bench score <campaign-id>/<n>` already reads every run of the execution. When all of them were scored
(exit 0), it writes `results/<campaign-id>/<n>/aggregate.json` and says so on its last line. Otherwise:

- a run could not be scored: it writes none, removes a stale one, and says why ("not aggregated: 1 run
  not scored"). An aggregate over some of an execution's runs would be a number with runs missing from
  it, which REQ-FMT-07 forbids.
- `bench score dry-runs/<n>`: it never writes one (REQ-RES-01).

No command is added. REQ-CLI-06 gains the sentence (requirements 1.11), and REQ-FMT-06 already puts the
file there. The computation is a pure function over the stored files, `aggregateExecution(executionDir)`
in `src/results/`, so the site (W11) and a reader with a checkout can recompute it without Docker.

It reads **only what is committed** (REQ-RES-06):

- each run's `score.json` and `run.json`;
- the execution's `campaign.yaml` copy, for the default model.

It refuses an execution where a run has no `score.json`, a `score_version` it does not know, or a
`scenario_hash` that differs from its `run.json`'s: a score of another version of the scenario.

### The file — `aggregate.json`, version 1

```json
{
  "aggregate_version": 1,
  "campaign": "3fba3a8558fe",
  "execution": 1,
  "model": "claude-sonnet-5",
  "groups": [ Group, … ],
  "slices": [ Group, … ]
}
```

- **A group** is one scenario version × arm × model:

  ```json
  { "scenario": "S1", "version": "1.0", "arm": "wingfoil", "model": "claude-sonnet-5",
    "runs": ["3fba3a8558fe/1/runs/S1@1.0/wingfoil/claude-sonnet-5/r1", …],
    "n": 3, "preliminary": false, "losses": [ … ], "metrics": { … } }
  ```
- **A run's name** is its path under `results/`. It carries the campaign, the scenario version, the arm,
  the model id and the repetition: the lineage `results.feature` @F5.1 asks every aggregate to show.
- **Slices (T14):** a group whose model is not the campaign's default goes to `slices`, never to
  `groups`, so a cross-model number cannot sit among same-model ones.
- **Order:** groups by scenario, version, arm and model, runs by path, keys in a fixed order, and no
  timestamp. Aggregated twice, the same bytes (REQ-SCO-03).

### Every value with its runs and its `n` (REQ-FMT-07, experiment design §4.6)

Each metric is one **Value**:

```json
{ "n": 3, "runs": [ … ], "values": [ … ], "min": …, "max": … }
```

- `values` is one entry per run, in the order of `runs`.
- `min` and `max` are there only when `n ≥ 2`.
- A group's `preliminary` is `n = 1`, and a value from a single run carries no range.
- "Beyond variance" (n ≥ 3 and ranges that do not overlap) and per-category rows are the site's reading
  of these values (F5.5, W11). The aggregate stores nothing derived that the site can compute from it.
- **M-Q1 is kept as a tally** `{passed, total}`: its `min`/`max` are the runs with the lowest and
  highest ratio (the first on a tie), and no float enters the file. The cost figures are the run's own
  numbers.

`metrics`, from what `score.json` holds today:

- `m_q1.steps[k]`: M-Q1 at step k, with its suites, as Values;
- `m_q1.final`: M-Q1 on the final snapshot, with its suites, as Values;
- `holdout`: the same for the hold-out, apart (REQ-SCO-09). A run whose hold-out was not scored is left
  out of the hold-out's Values and listed in `holdout.not_scored` with its reason. If none was scored,
  the group's hold-out is `{ "scored": false, "reason": … }`, "not scored", never a zero.
- `cost`: the run's M-K1 and M-K2 (`cost_eur`, `cost_usd`, the tokens by kind, `wall_time_ms`, `turns`,
  `interventions`) as Values, each run keeping `cost_reported` beside its figure.
- `regressions` (M-D3's step-to-step half, carried from task-032): per public suite and step, how many of
  the suite's tests failed there and not at the previous step it is scored at. That is the step's
  `failed` list minus the previous one's. S1's "Patch after step 4 as after step 3" is `patch` at step
  4.

  M-D3 as the experiment design defines it — tests that passed **on the seed** and fail at the end —
  needs each test's result on the seed, which `score.json` does not keep. It is not computed here. For
  S2 its regression suite passes on the seed by construction, so its failures at the end are M-D3. The
  general metric is carried to W9, with the rest of the quality picture.

### Losses — never skipped, never hidden (REQ-SCO-10, adr-004, @F3.6)

`losses` lists each run that counts as a loss, with its reason:

- **`expected failure (missing workflow-engine)`**: the run was executed and scored, and its measured
  values stay in `values`. The loss is a mark for the reader and the site, which compare arms. It is not
  a number changed.
- **`final not reached`**, a run that did not complete: its final M-Q1 enters `values` as `{passed: 0,
  total: <the suites' census total>}`. Leaving it out would make the arm look better for failing to
  finish. The census total is the same for every run of a scenario version. A step not reached is left
  out of that step's Values, named in the step's `not_reached` list, and is not a loss by itself.

This is the reading of adr-004's "decides how `not_reached` counts — as a loss, like an expected
failure", to be confirmed at review.

### Acceptance and unit tests

- **Acceptance, `results.test.ts`:**
  - "Every aggregate links to the runs behind it": an execution of two scenarios in two arms, stored with
    task-027's `storedRun` fixture generalised to several runs, scored with the doubles. Every Value of
    `aggregate.json` names runs that exist under the execution, and `n` equals their number.
  - "Dry runs never enter campaign results": the same, with scored dry runs of the same scenario under
    `results/dry-runs/`. The aggregate names none of them, and `bench score dry-runs/<n>` writes no
    `aggregate.json`.
- **Acceptance, @F3.6:** the existing test goes on to aggregate. The wingfoil group lists the loss with
  `missing workflow-engine`, and its values are there.
- **Unit, `src/results/aggregate.ts`:**
  - grouping, and the slice apart;
  - Values: `n`, `min`/`max` only from 2;
  - a not-reached final as a zero loss, and a not-reached step left out;
  - the hold-out apart, "not scored" when so;
  - step-to-step regressions;
  - refusals: missing `score.json`, unknown version, hash mismatch;
  - byte-identical twice.
- **CLI:** the aggregate is written after a complete scoring, a stale one is removed after an incomplete
  one, and a dry run gets none.

### The W7 wave check, after this task (decision 4)

In a temporary repository holding S1, S2 and the benchmark's arms, with the fake replaying S1's and
S2's references (one script for both):

1. `bench scenario dry-run` of S1 and S2 in the three arms: the costs the estimate needs.
2. A campaign of S1 and S2 in the three arms, WingFoil `3df305e`: `bench campaign run`.
3. `bench score <id>/1 --holdout ../WingFoil2-Benchmark-HoldOut`: every run scored, and the aggregate
   written.

Recorded in `rel-v0-1`'s W7 section, with the carry-overs to W8 and W9.

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
- `npx wingfoil memory approve … [pending → backlog]` → `dc3dc4f`, run by the approver.
- Design committed by hand on `task/task-034-results-store-and-aggregation` (`9f2f75a`), so that `submit`
  carries only the state change (N13).
- `npx wingfoil memory submit task-034-results-store-and-aggregation` → `e466401`. Declared: `backlog →
  in-progress`, one commit `wf(task): submit <id>`. Observed: exit 0, empty stderr, 1 file, diff limited
  to `status: backlog` → `status: in-progress`. Matches (N9).
- `npx wingfoil memory submit task-034-results-store-and-aggregation` → `0481397`. Declared: `in-progress →
  in-review`, one commit `wf(task): submit <id>`. Observed: exit 0, empty stderr, 1 file, diff limited to
  `status: in-progress` → `status: in-review`. Matches (N9).

### Build

Commits:

- `b10eaa2`: the tests, red — no `aggregateExecution`, and F5.1's acceptance missing, which traceability
  reported.
- `0e757ab`: `src/results/aggregate.ts` and `bench score`'s aggregation.
- `559905d`: requirements 1.11.

**As designed**, with these points found in the build:

- **`results/` reads `score.json` with a schema of its own.** REQ-ARC-02 lets `results` (the middle
  layer) never import `scoring` (the top), so it reads the file as it reads `run.json`. The schema
  covers only what aggregation uses.
- **The group order** is a sort on the joined key (scenario, version, arm, model, NUL-separated), which
  orders as the parts do. The first version had a comparator with an unreachable branch.
- **The traceability matrix is not edited.** It is approved at 1.0. F5.1's row already names REQ-FMT-06
  and REQ-FMT-07, and REQ-CLI-06's feature column in requirements 1.11 gains F5.1.
- **`storedRun` writes several runs** — arm, repetition, and a `dry-runs/<n>` execution — into one
  repository. Its `campaign.yaml` now names the default model, and a dry run's gets `dry-run.yaml`.
- **Expectations that changed with the aggregate line:** four exact-output tests of `bench score` (unit,
  acceptance @F3.5 and @F3.6) and W6's Docker test, which now also checks the aggregate of its real run.

**Checks:**

- `npm test`: 877/877 (+15). Coverage 99.17% statements, 94.89% branches, 100% lines.
- `npm run lint`: clean.
- `npm run test:bin`: 5/5.
- `npm run test:docker`: 11/11, with no container and no `dry-` image left.

**A rehearsal of the W7 wave check**, on this branch's built CLI, in a temporary repository with S1, S2
and the benchmark's arms. The fake replays S1's reference and the hold-out's S2 reference, from one
script, and `BENCH_WINGFOIL_REPO` points at `../WingFoil2`.

1. Six dry runs, S1 and S2 in the three arms: `completed, 0.0000 USD` each (`results/dry-runs/1`–`6`).
2. `bench campaign validate` → `campaign 27e28fe609f6 is valid (2 scenarios, 3 arms)`.
3. `bench campaign run` → `6 runs completed, 0 failed`, cost 0.
4. `bench score 27e28fe609f6/1 --holdout ../WingFoil2-Benchmark-HoldOut` → six lines, exit 0:
   - S1: `step 01 12/12, step 02 105/108, step 03 108/108, step 04 123/123, final 135/135; hold-out final
     33/33` in each arm;
   - S2: `step 01 19/19, step 02 22/22, step 03 24/24, final 24/24; hold-out final 17/17` in each arm;
   - then `aggregate: results/27e28fe609f6/1/aggregate.json (6 groups, 0 slices)`.
5. The aggregate: six groups, each `n` 1 and `preliminary`, with no loss and the hold-out scored. The
   regressions are all 0 — S1's `patch` at steps 3 and 4, and S2's suites from step to step. The file
   names no dry run.
6. Scored again: the same bytes. No `bench-` container left.

The official check is made on main once this task is merged (kanban-delivery, deliver phase).

No real agent, no spending. No `wingfoil` command in the build phase.

