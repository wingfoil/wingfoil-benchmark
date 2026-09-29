---
id: task-040-setup-cost-and-break-even
type: task
title: "Setup cost and break-even"
status: in-progress
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

Classified in the design phase.

- `scoring.feature` @F4.4 "Break-even is computed only when quality is not worse": the aggregate of an
  execution of S3, with a non-zero synthetic setup cost in the wingfoil runs, has M-K4 equal to the
  setup cost divided by the difference in mean step cost. **red-first**
- `scoring.feature` @F4.4 "Break-even special cases": wingfoil's final M-Q1 is lower, so M-K4 is `not
  applicable`; its quality is not lower but its step cost is not lower, so M-K4 is `never`.
  **red-first**
- REQ-RUN-03 / M-K3: `score.json`'s `cost.setup` holds the setup's tokens, its cost in USD and euro, its
  wall time and turns, and the manual's tokens. It is written beside `cost.run`, which it does not
  change. **red-first**
- M-K3 for an older run: a `run.json` without `setup` gives `cost.setup: { not_recorded: true }`, and
  one without `manual` gives no `manual_tokens`. **red-first**
- REQ-FMT-07: M-K3 in each group's `cost`, and M-K4 per scenario version, model and arm, each with its
  runs and `n`. **red-first**
- M-K4 is left out for a scenario whose execution has no baseline run on that model. **red-first**
- REQ-SCO-03: the same runs scored and aggregated twice give the same bytes. **characterization**
- An older `score.json`, with no `cost.setup` and no `cost.steps` read, still aggregates, with no
  M-K3 and no M-K4 for its group. **characterization**

## Design

Three findings shaped this design:

- **Everything M-K3 needs is already in `run.json`:** `setup.duration_ms`, `setup.usage` and `manual`.
  Scoring does not read it: `StoredRun` keeps only `setup.tree`. The usage is always zero in v0.1, but
  it is read, not assumed, so a setup that runs an agent later is counted without a change here.
- **Break-even is the only value that compares two groups.** Every other value in `aggregate.json` is
  one group's, meaning one arm's. M-K4 therefore gets its own section, keyed by scenario version, model
  and arm, pairing each arm with the baseline of the same scenario version and model.
- **The aggregate does not read per-step cost today.** Its reader schema parses `cost.run` only. §4.2's
  "mean step cost" needs `cost.steps`, which every `score.json` has had since task-029.

### M-K3 in `score.json` (REQ-RUN-03, experiment design §4.2)

`costMetrics` gains `cost.setup`, written after `cost.run`:

```json
"setup": {
  "tokens": { "input": 0, "output": 0, "cache_creation": 0, "cache_read": 0 },
  "cost_usd": 0, "cost_eur": 0, "wall_time_ms": 2213, "turns": 0,
  "manual_tokens": 463
}
```

- The values come from `run.json`'s `setup.usage` and `setup.duration_ms`. The setup's wall time is its
  duration, not `usage.durationMs`, which is an agent's and is 0 in v0.1.
- `manual_tokens` is `manual.tokens` (REQ-RUN-12, `bytes-div-4`). It is absent when `run.json` has no
  `manual`.
- `cost.setup` is `{ "not_recorded": true }` when `run.json` has no `setup`, as for a run stored
  before W3. A setup that failed (`code`) is still recorded: it ran and took time.
- `cost.run` is unchanged, the sum of the steps. The setup is never folded into it, since
  the setup's time was never in the run's cost (W6's carry-over), and M-K4 needs the two apart.
- `StoredRun` gains `setup?: { durationMs, usage }` and `manualTokens?`. The `storedRunSchema` reads
  them as optional.

### M-K4 in `aggregate.json` (REQ-SCO-08 as amended)

A new top-level `break_even` list, after `slices`, one entry per scenario version, model and arm that
is not `baseline`, where the same execution has a baseline group of that scenario version and model:

```json
{
  "scenario": "S3", "version": "1.0", "model": "claude-sonnet-5", "arm": "wingfoil",
  "value": 0,
  "setup_cost_eur": { "arm": 0 },
  "mean_step_cost_eur": { "baseline": 0.0812, "arm": 0.0613 },
  "final_m_q1": { "baseline": 1, "arm": 1 },
  "runs": { "baseline": ["…"], "arm": ["…"] }, "n": { "baseline": 1, "arm": 1 }
}
```

- **`value`** is a number, `"not applicable"` or `"never"`. The rules are checked in §4.2's order:
  1. `not applicable` when the arm's final M-Q1 is lower than the baseline's;
  2. `never` when the arm's mean step cost is not lower than the baseline's (a zero difference
     included);
  3. otherwise, the arm's mean setup cost ÷ (the baseline's mean step cost − the arm's), kept to a
     millionth.

  In v0.1 the setup costs 0, so a number is always 0: the arm is cheaper per step and has nothing to
  pay back. REQ-SCO-08 states this (W9 decision 2).
- **Final M-Q1** is the mean, over a group's runs, of each run's final pass rate, with a final not
  reached counting as 0: the same loss rule the group's `m_q1.final` already applies (task-034).
- **Mean step cost** is the mean of `cost_eur` over every reached step of every run of the group.
  A step killed at its cap counts at its bound, as it does in `cost.steps`.
- **Mean setup cost** is the mean of `cost.setup.cost_eur` over the arm's runs. A run whose setup was
  not recorded leaves the entry out: an unknown setup cost is not a zero.
- The means are ratios the aggregate has avoided so far. Here they are the metric's definition. They
  are kept to a millionth, with the runs and `n` of both groups beside them (REQ-FMT-07).
- **Slices** (T14) are paired within their own model, like every other pairing. The Opus slice on S1
  gets a break-even when it has a baseline run.

### M-K3 in the group's `cost` (REQ-FMT-07)

`CostAggregate` gains three `Value<number>`, present only when some run of the group recorded its
setup: `setup_cost_eur`, `setup_wall_time_ms` and `manual_tokens`. They are left out otherwise, so an
older execution aggregates as before.

### Modules

- `src/results/runs.ts`: `StoredRun.setup` and `manualTokens`.
- `src/scoring/cost.ts`: `SetupCost`, and `cost.setup`.
- `src/results/aggregate.ts`:
  - the reader schema takes `cost.steps` and `cost.setup` as optional;
  - `CostAggregate`'s three values;
  - `breakEven(groups)` over groups and slices together, and `AggregateFile.break_even`.
- Tests: unit tests in `cost.test.ts`, `runs.test.ts` and `aggregate.test.ts`.
  `test/acceptance/scoring.test.ts` @F4.4 ×2 (the outline as one test with its two rows) runs on
  executions of S3 written as `bench score` writes them, since the break-even reads only scores.

### Requirements 1.15

- **REQ-SCO-08:** the choices above:
  - what quality and mean step cost compare;
  - the mean setup cost;
  - the order of the special cases;
  - the pairing within a model;
  - that a v0.1 break-even is 0 or a special case.
- **REQ-FMT-07:** `break_even` is a value of two groups, so it carries both groups' runs.

### Choices to confirm

1. **Every arm other than baseline gets a break-even, baseline-docs included.** baseline-docs has no
   harness, but it has its own manual and setup. The question "does its overhead pay off?" applies to
   it the same way, and the table stays uniform.
   - *Alternative:* only arms with a harness (`requires`), which G-X1's wording ("cost of the
     harness") suggests.
2. **Quality is compared on the final M-Q1, as a mean over runs.** This is the headline pass rate, and
   n is 1 for most v0.1 groups.
   - *Alternative:* require every scored step's M-Q1 to be not lower. That is stricter and closer to
     "not worse anywhere", but a single step can then decide it.
3. **An expected-failure arm gets a break-even from what it measured,** like its M-Q1 (task-034: a loss
   keeps what it measured). The group's `losses` already name it.
   - *Alternative:* `not applicable` for an arm with an expected failure.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

### WingFoil commands (declared vs observed)

- `memory approve … [pending → backlog]` → `20e0fc9`, run by the approver. The W9 plan phase's commands
  are recorded in task-039.
- Design committed by hand (`ed45383`), then `node_modules/.bin/wingfoil memory submit
  task-040-setup-cost-and-break-even` in the task's worktree → `d02a36c`.
  - Declared: `backlog → in-progress`, one commit `wf(task): submit <id>`.
  - Observed: exit 0, 1 file, and a diff limited to `status: backlog` → `status: in-progress`.
    Matches.

### Build

Commits on `task/task-040-setup-cost-and-break-even`:

- `8b765d4` `test(scoring)` (red): 15 failing tests.
  - `run.json`'s setup and manual read;
  - `cost.setup`;
  - M-K3 in the group's cost;
  - `break_even`: its value, 0, not applicable, a final not reached, never, the means over runs,
    baseline-docs and slices, and the cases left out;
  - `scoring.feature` @F4.4 ×2.
- `d19fb51` `docs(requirements)`: requirements 1.15.
- `4a3053e` `feat(scoring)`: the implementation.

**Deviations from the Design:**

1. **@F4.4 runs on T3 standing in for S3, not on S3's own files.** It stores runs of both arms with
   `storedRun` and scores them with a real `bench score`, the scoring double judging T3, which then
   aggregates. That tests the whole path from `run.json` to `break_even`. It also needs no hidden-test
   run of S3, which @F4.7 already does. The setup cost of 0.3 EUR is synthetic, since no v0.1 setup
   costs anything.
2. **The fixture now writes what the runner writes.** `storedRun` records `setup.usage`, zero by default
   (`setupUsage` to change it), and `manual` (`manualTokens`, `null` for none), as `run.json` has held
   since W3. Before, the fixture wrote neither.
3. **Two `CostScore` literals in tests gain `setup: { not_recorded: true }`:** the summary tests' and
   `continuity.test.ts`'s. `cost.setup` is required in the type, since scoring always writes it.

**Checks:**

- `npm run typecheck` clean, and `npm run lint` clean: ESLint and Prettier.
- `npm test`: 990/990, coverage 99.11%.
  - `aggregate.ts`: 100% of lines.
  - `runs.ts`: 96% of lines. Its two uncovered lines are `readStepCommits`' error paths, from task-035,
    and were uncovered before.
- `npm run test:bin`: 5/5.
- `scoring.feature` @F4.4, through `bench score`:
  - wingfoil at 0.0375 EUR per step against 0.075, with a setup of 0.3 EUR: M-K4 = 8;
  - wingfoil not cancelling (final 0 against 1): `not applicable`;
  - wingfoil at 0.15 per step: `never`.
- `npm run test:docker`: 16/16 (377 s), run after `npm test`. The W3 to W8 runs' `score.json` files now
  carry `cost.setup` from the real runner's `run.json`.

### Review

- **Traceability.**
  - `features: [F4.4]`: both @F4.4 scenarios have tests titled as the gate requires, and
    `traceability.test.ts` is green.
  - `acceptance: [scoring.feature]`.
  - `requirements`:
    - REQ-RUN-03 and REQ-RUN-12 are read into M-K3;
    - REQ-SCO-08 is amended;
    - REQ-FMT-07 is amended for a value of two groups;
    - REQ-SCO-03: scoring and aggregation stay deterministic, with no clock, and means kept to a
      millionth.
- **W9 decisions 2 and 5 held:**
  - M-K4 follows §4.2 literally, and a v0.1 number is 0;
  - `SCORE_VERSION` and `AGGREGATE_VERSION` stay 1, since `cost.setup` and `break_even` are new keys;
  - an older `score.json` without them aggregates, with no M-K3 and no break-even.
- **For the approver's review decision:** requirements 1.15, REQ-SCO-08 and REQ-FMT-07.
- **For W11 (F5.8), the method page states:**
  - M-K4's rules and their order;
  - that a v0.1 break-even is 0 or a special case, because the harness's overhead is in each step's
    cost;
  - that baseline-docs is compared with the baseline too.
- No new bug and no new decision-log. No WingFoil usage note. No spending.
