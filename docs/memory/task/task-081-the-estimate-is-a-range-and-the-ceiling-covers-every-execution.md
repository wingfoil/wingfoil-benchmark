---
id: task-081-the-estimate-is-a-range-and-the-ceiling-covers-every-execution
type: task
title: "The estimate is a range and the ceiling covers every execution"
status: in-progress
release: v0.2
wave: W14
features: [F1.2, F1.4]
acceptance:
  - "campaign.feature#The cost is estimated before any run starts"
  - "campaign.feature#The ceiling covers every execution of a campaign"
requirements: [REQ-CLI-02, REQ-CLI-03]
fixes: []
---

## Context

dl-012 (approved, option C) at v0.2's triage: "estimate and guard tasks in W14 with F1.4".

**Scope** (REQ-CLI-02 and REQ-CLI-03 as amended in 1.26):
- the estimate reads every completed dry run of a key and prints the lowest, the mean and the highest; from a single
  dry run it adds a stated 35 % margin; no model is priced from another;
- the figure compared with `warn_eur` and `ceiling_eur` is the highest, added to what every earlier execution of the
  same campaign spent, so that a resume (task-080) counts against the ceiling.

After task-080, whose executions it sums. **Done** means: both scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `campaign.feature#The cost is estimated before any run starts`: **red-first**. The scenario's test exists since W5.
  Its expectations are amended to REQ-CLI-02 as amended in 1.26 (the lowest, mean and highest of every dry run; one
  dry run with a stated 35 % margin) and fail today, since the estimate prices the latest dry run only.
- `campaign.feature#The ceiling covers every execution of a campaign`: **red-first**. Today the guard compares the
  whole campaign's estimate with the ceiling, and ignores what earlier executions spent.

## Design

**Fixes:** none (dl-012 C).

**1. Every dry run of a key** (REQ-CLI-02 as amended):
- `findDryRuns` (results) returns every dry run that counts for a key, by the rules `findDryRun` applies today
  (completed, the version's hash, the key's effort, a cost the agent priced), newest first.
- `findDryRun` and `latestDryRun` become its first element, so the dry-run command's "the latest dry run cost …" is
  unchanged.
- A key is never priced from another model's dry run: the model is part of the dry run's path. This already holds and
  is pinned by a characterization test.

**2. The estimate's figures**, for each key and in total:
- `low`, `mean` and `high` of its dry runs' costs, times the key's repetitions;
- **with one dry run**, `low` = `mean` = its cost, and `high` = its cost plus a margin of 35 %
  (`ESTIMATE_MARGIN = 0.35`). The line says so. With two or more, there is no margin: their spread is the range;
- `Estimate` carries `lowUsd`, `meanUsd`, `highUsd` and `highEur` (the old `totalUsd` and `totalEur` go), and each
  line carries its dry runs (their count and directories) and whether the margin applied.
- **Printed:**
  - one dry run: `S1@1.0 baseline m: 0.1000 USD + 35 % margin = 0.1350 USD × 3 = 0.4050 USD (1 dry run: results/dry-runs/4)`;
  - two or more: `S1@1.0 baseline m: low 0.1000, mean 0.1500, high 0.2000 USD × 3 = 0.6000 USD (3 dry runs: results/dry-runs/9, …)`.
  - the `= …` figure is the line's high times the repetitions. The provenance notes stay; they read the newest dry run.
  - the total: `estimate: low L, mean M, high H USD; high H' EUR at r EUR/USD, API-equivalent`.

**3. The budget guard's figure** (REQ-CLI-02 and REQ-CLI-03 as amended): what every execution of the campaign spent,
plus the high estimate of what is left.
- **Spent:** every `run.json` under `results/<campaign-id>/*/runs/`, earlier attempts included, counted as the runner
  counts spending: a step at what it reported, or at its bound when it was killed. A new `campaignSpendingEur` in
  `results/` computes it. The runner's `recordedSpendingEur` (task-080) moves there too, so that the guard and the run
  count alike. An unreadable record is an error naming its path.
- **What is left:**
  - for `run`, every run of the campaign;
  - for `run --resume`, only the runs the resume will run, per key: the runner's selection (task-080), read without
    running anything. A key with nothing left needs no dry run.
- **`estimate` and `run`** both print the spent figure and the guard's: `spent by earlier executions: S EUR` (only when
  S > 0), then `budget guard: S + H' = G EUR (warn W, ceiling C)`.
- **`run`** compares `G` with `warn_eur` (confirmation) and `ceiling_eur` (refusal, no override), as it compares the
  estimate today.

**4. The campaign's ceiling while it runs** (REQ-RUN-08: the campaign "stops starting runs when its cumulative cost
reaches `ceiling_eur`"):
- its count starts from what every execution of the campaign spent, not only the resumed one (task-080), so that a new
  execution of the same file does not get a fresh ceiling either;
- a dry run is no campaign's execution and starts from zero, as today.

**5. Tests whose figures change by the amendment:** the tests that price a campaign from one stored dry run see a 35 %
margin. They pin the guard's figures and messages (`test/acceptance/campaign.test.ts` @F1.2 and @F1.3,
`test/unit/runner/estimate.test.ts`, `test/unit/cli/main.test.ts`, `test/bin/bench.test.ts`), and are amended to the
new figures in the red commit, each change named in the Execution notes.

**Tests** (red first, committed apart from the code):
- **Acceptance:**
  - "The cost is estimated before any run starts": three dry runs of one key and one of another, giving the range
    line, the margin line and the totals;
  - "The ceiling covers every execution of a campaign": a first execution spends part of the ceiling. A new `run` is
    refused once that spending plus the high estimate passes the ceiling. A `--resume` of a stopped execution is
    guarded on what it has left.
- **Unit:**
  - `findDryRuns` order and rules;
  - the margin;
  - low, mean and high totals;
  - another model never priced;
  - `campaignSpendingEur` with attempts and cost bounds;
  - the in-run ceiling counting an earlier execution;
  - the resume's estimate over what is left only.

## Execution notes

**WingFoil commands, declared vs observed:** `npx wingfoil memory submit task-081-…` on main (`5c41c69`), after the
Design's own commit (`87e197c`, W-01). Declared: backlog → in-progress. Observed: `{"from": "backlog", "to":
"in-progress"}`, exit 0, one `wf(task): submit …` commit (W-14).

**Build** on `task/task-081` (worktree `../WingFoil2-Benchmark-wt/task-081`, its own `npm ci`):
- red first, `216cc75`:
  - the two acceptance scenarios: the W5 estimate test amended to the range, and the new ceiling-across-executions
    test;
  - the @F1.3 guard messages amended, their fixture priced by two equal dry runs (`priceCampaign(file, usd, 2)`), so
    that the scenarios keep their 42 and 130 EUR;
  - unit tests for `findDryRuns`, the range, the margin, what is left, `campaignSpendingEur` and the in-run ceiling.
  All failed for the expected reasons.
- `4aca995`, the implementation and the README. Three test files pinned the old output, and are amended in the same
  commit, which names them:
  - `test/unit/runner/estimate.test.ts`: the margin on single dry runs, the range fields;
  - `test/unit/cli/main.test.ts`: the `budget guard:` line, and the guard messages, whose fixture now prices with two
    dry runs;
  - `test/bin/bench.test.ts`: the same.
  This departs from the Design, which put them in the red commit: their exact text is the implementation's.
- Checks, niced, with 2 workers: `tsc` clean and `npm run lint` clean. `test/unit` and `test/acceptance` green: 1478
  passed, 8 skipped.

**Decisions taken in the build, inside the Design:**
- The guard's messages name its parts: `the budget guard, S + H = G EUR, is above the ceiling, C EUR`, and the same
  above the warning threshold. The old `the estimate, X EUR` would now be untrue whenever earlier executions spent
  something.
- `campaign run` prints the estimate's total line and the guard's lines, not every key's line, as before.
- The margin is exact in the code (`cost × 1.35`). Tests compare rounded figures, since 1.35 is not exact in binary
  floating point.
- `executionSpendingEur` names an unreadable record relative to `results/`. The runner's spending seed reads records
  through it now, replacing task-080's `recordedSpendingEur`; task-080's test of an unreadable record still holds.

## Review notes

### Review

**Round 1**: a fresh, independent, read-only agent (a `Plan` subagent), on `fefb546`. Verdict: not clean. Outcomes:
1. should-fix: an unreadable `run.json` during `--resume` crashed `campaign run` (`runsLeftToResume` outside any
   catch) → **fixed**: refused as `campaign: not started: <path> cannot be read`, tested through the command line for
   a run and a resume (`69a1897`).
2. should-fix: the spending test claimed attempts and bounds but proved neither (zero-cost attempts, no bound) →
   **fixed**: attempts that spent, a bound above the reported cost at 0.5 EUR/USD, and an unreadable record named
   under `results/`. The amended spending test passed on the code as it was, so it pins that behaviour; the unreadable
   record test was red.
3. nit: `{} as RunnerOptions` hid any future use of a port → **fixed**: `runsToResume` takes `Pick<RunnerOptions,
   'log'>`.
4. nit: a `run.json` of `null` gave a pathless TypeError → **fixed**: named as unreadable.
5. nit: the guard's failure in `run` lacked `not started:` → **fixed**.

**Round 2**: a fresh, independent, read-only agent, on `b6d0b1a`. It verified the five round-1 outcomes and checked the
whole diff again against REQ-CLI-02/03 and REQ-RUN-08, the scenarios, and `bench campaign estimate` with an unreadable
record. Verdict: clean, with two nits, both **fixed** in `1edad7a`:
1. a `run.json` of `null` read by a resume's selection still gave a pathless TypeError. The runner's `readRecord` now
   refuses a non-object with its path, and the command-line test covers it; the test was written with the fix.
2. the spending seed's comment still spoke of a resume only. It now says every execution.

**Round 3**: a fresh, independent, read-only agent, on `1edad7a`. It found both fixes correct, the null case reaching
the new branch, and every caller type-checked. Verdict: clean, with two optional nits, both **no change**:
1. a cast in `runsToResume` that is now redundant: harmless.
2. a `run.json` holding an array passes the object check, and reads as a record with no outcome, as `{}` already does:
   an edge case outside the review's ask.

