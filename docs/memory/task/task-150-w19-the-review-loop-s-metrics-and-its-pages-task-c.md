---
id: task-150-w19-the-review-loop-s-metrics-and-its-pages-task-c
type: task
title: "W19: the review loop's metrics and its pages (task C)"
status: done
release: v0.3
wave: W19
features: [F4.9]
acceptance:
  - "scoring.feature#Rounds to clean are read from the loop"
  - "scoring.feature#A finding on a line the previous fix changed is fix-induced"
  - "scoring.feature#No finding after round 1 leaves M-V2 undefined"
  - "scoring.feature#The loop's cost is apart from the run's"
  - "results.feature#The method page states the review loop"
  - "results.feature#A run's page shows its rounds"
requirements: [REQ-SCO-16, REQ-SCO-14, REQ-FMT-06, REQ-FMT-07, REQ-RES-02, REQ-RES-03, REQ-RES-06]
fixes: []
tags: ["v0.3","review-loop","w19"]
---

## Context

W19's task C, after [task-149](task-149-w19-the-review-loop-in-the-runner-task-b.md) (task B: the loop in the
runner and its records under `review/`). It reads M-V1 to M-V3 as REQ-SCO-16 states (requirements 1.58) into the
aggregate, compares them per arm with the baseline and the docs control, and publishes the loop as REQ-RES-02 states:
the method page, the result pages and a run's page. Task D adds the estimate's loop keys (REQ-CLI-02, REQ-CLI-03) and
runs the dry runs on the approver's consent; that work ends W19.

State read on 2026-11-16 (main `8632409c`): the aggregate (`src/results/aggregate.ts`, version 2) reads each run's
`run.json` and `score.json`, never `review/`; `compare.ts` compares the five metrics of `CATEGORY_MAP` by one rule,
and the aggregate pairs each harness with its docs control by it (REQ-SCO-14). The site is generated from
`aggregate.json` alone, and has no page for a single run: REQ-RES-02's "a run's page" is new here. No execution holds
a `review/` yet. Code and tests only, with fixtures written by the tests; no session, nothing spent.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

The four `scoring.feature` and two `results.feature` scenarios drafted in
[task-147](task-147-w19-s-requirements-and-acceptance-the-review-loop-f4.9.md)'s Execution notes, each added to its
feature file with its test red first (`test/acceptance/scoring.test.ts`, `test/acceptance/results.test.ts`):

1. **M-V1** ("Rounds to clean are read from the loop"): per run, the round that closed its loop `clean`; per group,
   the median and range of the clean loops, their n, the loops `not clean at <max_rounds>` counted and named apart
   (never valued as the cap), and every other outcome (`failed`, `no fix`, `interrupted`, `quota exhausted`,
   `no loop`) counted by outcome with no value.
2. **M-V2** ("A finding on a line the previous fix changed is fix-induced", "No finding after round 1 leaves M-V2
   undefined"): per run, of the findings of rounds 2 and later, the share whose file and line fall in a new-side line
   range of the previous round's `fix.patch`; a finding with no line, or at a place the fix only deleted, is never
   fix-induced; undefined when no finding follows round 1, and that run left out of the group's summary. Unit, red
   first: the hunk reader on added, changed, deleted-only and renamed files, and on a file the patch does not touch.
3. **M-V3** ("The loop's cost is apart from the run's"): the reviewer's and the fixer's M-K1 (tokens by kind, USD,
   EUR) and M-K2 (wall time, turns; the fixer's interventions), apart and summed, from each round's
   `reviewer-usage.json` and `fixer-usage.json`; a session counted at its bound names the run as M-K1's bound runs
   are. The run's M-K1, M-K2 and every existing metric are byte-identical with and without `review/` (a test
   aggregates the same execution both ways).
4. **The comparisons** (unit, red first): M-V1 to M-V3 per arm and scenario version against the baseline and, for a
   harness, its docs control, by `compare.ts`'s rule (n, mean, range, certainty), stored with their runs and n
   (REQ-FMT-07); they enter no category's row (`CATEGORY_MAP` unchanged). M-V1's outcome is given only when neither
   side has a loop without a value; otherwise the comparison says "not compared" and names both sides' counts.
5. **The aggregate's records** (unit, red first): each group gains `metrics.m_v` and each run with a `review/loop.json`
   its loop in `review_loops` (outcome, reason, rounds with each finding's severity, file, line and title, and the
   reviewer's pins); an execution without loops writes `aggregate.json` byte-identical to today (the published
   executions re-aggregate unchanged, checked on the committed ones).
6. **The method page** ("The method page states the review loop"): for an execution whose campaign pins
   `review_loop`, the reviewer's agent, version, model and effort, both prompts quoted in full with their SHA-256,
   the closing rule, the round cap and what the reviewer's copy lacks; a prompt file whose SHA-256 differs from the
   pin refuses the build, naming the file. No section without the pin.
7. **The result pages and a run's page** ("A run's page shows its rounds"): each scenario section shows M-V1 to M-V3
   per arm when its runs have loops, each marked as read by a reviewer of the run's own model or another wherever
   runs of different models are compared (T16); each run with a loop has a page under its execution's permanent URL
   listing its rounds, each finding's severity, file, line and title, and the outcome with its reason. From an
   execution that ran hold-out content (REQ-CLI-10) the run's page shows the outcome and the counts by severity
   only, never a finding's file or title (unit, red first).
8. Characterization: the existing scoring, results and site tests stay green unchanged.
9. Checks: prettier, tsc, eslint, `scripts/pre-review.sh main`; an independent review (dl-020); the full suites on the
   approver's go.

## Design

- **Reading `review/`:** `src/results/review.ts` (new): `readLoop(runDir)` (zod over `review/loop.json` and each
  round's `findings.json`, `reviewer-usage.json`, `fixer-usage.json`; issues named against the file, as `runs.ts`
  does), `fixLines(patch)` (each file's new-side line ranges from `fix.patch`'s hunks, `+++ /dev/null` none), and
  `runReviewMetrics(loop, patches)` → `{ mV1?, mV2?, mV3 }`. A loop's figures never pass through `score.json`: the
  scores stay what they are, and REQ-SCO-16 reads `review/`.
- **The aggregate:** `Group.metrics.m_v?` (`rounds_to_clean: Value<number>`, `not_clean: string[]`,
  `no_value: { outcome, runs }[]`, `fix_induced: Value<number>` as shares, `cost: { reviewer, fixer, total }` of
  `CostAggregate`'s figures) and `Aggregate.review_loops?` (one entry per run path); both absent when no run of the
  execution holds `review/`, so `AGGREGATE_VERSION` stays 2 and nothing published changes. M-V1's median is stored
  beside `Value`'s values (an odd n its middle value, an even n the mean of the middle two).
- **The comparisons:** `MetricId` gains `M-V1`, `M-V2`, `M-V3`; `readMetric` reads them from `m_v`; a new
  `REVIEW_METRICS` list (lower is better for all three) is compared beside the categories, and the docs-control pairing
  (`aggregate.ts`, REQ-SCO-14) reads it too.
- **The site:** `site/model.ts` reads `m_v` and `review_loops`; `render.ts` a "Review loop" block per scenario section
  and `runPage` (new) at `/<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>/`; `method.ts` the loop's
  section from the execution's `campaign.yaml` and the prompts under `review/`. T16's mark compares the pinned
  reviewer model with the group's model.
- **Decided here, for the approver's gate:**
  1. **The loop's findings enter `aggregate.json`** (severity, file, line, title; never `why`), since the site reads
     nothing else (REQ-RES-02); a hold-out execution's are stored as counts only.
  2. **No aggregate version bump:** the new fields are optional and absent without loops, so every published
     aggregate stays byte-identical; a reader that predates them ignores them.
  3. **M-V1 compared only between comparable sides:** a comparison of clean loops alone would favour an arm whose hard
     runs never close; when either side has a loop without a value, the outcome is withheld and the counts shown.
  4. **A run's page only for a run with a loop record:** REQ-RES-02 asks for the rounds; pages for every run are a
     wider change, not asked.
- **Not in this task:** the estimate's loop keys, the dry runs, the transcripts' packing (REQ-CLI-11), a campaign file
  gaining the entry (task D's); `bench compare` across campaigns.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

- 2026-11-16: backlog → in-progress on main; worktree `../WingFoil2-Benchmark-wt/t150`.
- **Red first** (`3b9ce2da`): the four `scoring.feature` and two `results.feature` scenarios (F4.9 added to both
  files' traces; no version bump, as the scenarios earlier tasks added) with their tests;
  `test/unit/results/review.test.ts` (the fix's lines, the outcomes without a value, the loops' records, the
  reviewer's bound, a loop record that does not parse, the aggregate unchanged without loops, the comparisons);
  `test/support/loop-records.ts` writes a loop as task-149's runner records it. All red for the absent code. Two
  expectations of mine were wrong and corrected after: a field read as `cost.total.runs` (the runs are each figure's),
  and M-V2 over two runs of which one has no finding after round 1.
- **The work** (`c9492fa4`):
  - `src/results/review.ts` (new): `readLoop` (zod over `loop.json`, each listed round's `findings.json`, and every
    round directory's `reviewer-usage.json`, `fixer-usage.json` and `fix.patch`, so that a session that ran and ended
    the loop still counts in M-V3), `fixLines`, `runReviewMetrics`.
  - `src/results/aggregate.ts`: `Group.metrics.m_v` and `review_loops`, both appended last and absent without a loop;
    the docs-control comparisons read `REVIEW_METRICS` after the category map's metrics.
  - `src/results/compare.ts`: `M-V1`–`M-V3` in `MetricId`, `REVIEW_METRICS`, `readMetric`'s three cases, and
    `Figures.withheld` for M-V1.
  - `src/site/`: `model.ts` reads `m_v` and `review_loops` and builds each scenario's `review` block (`metricRow` gains
    the withheld note); `render.ts` the block, the runs' links and `runPage`; `build.ts` writes the run pages;
    `method.ts` the loop's section; `rules.ts` formats M-V2 as a share and M-V3 in EUR.
- **Deviations, for the gate:**
  1. **No hold-out branch.** REQ-RES-02 publishes a loop's findings "only from campaigns that run no hold-out content
     (REQ-CLI-10)", and REQ-CLI-10 says `campaign run` never reads the hold-out: no execution runs hold-out content, so
     nothing marks one, and criterion 7's counts-only page and decision 1's counts have no trigger. They are not coded;
     a later private scenario's loop is the decision of its own that REQ-RES-02 names.
  2. **M-V2 reads the `+` lines** of the previous fix's hunks, the lines it added or changed, not the hunks' context
     lines, which the fix did not touch.
  3. **`no loop` does not withhold M-V1**: no loop ran. It is still named among the outcomes without a value. M-V3
     reads the loops that ran, `no loop` left out.
  4. **T16's mark** stands in each scenario's review block, beside the reviewer's model: the block compares the arms
     of the campaign's model; the slices and the parity page, which compare across models, show no M-V.
  5. **The method page's spending** says what the loops cost, apart from the runs' cost.

## Review

- **Round 1** (a fresh read-only agent in a clone under `mktemp`, on `4f039538`, 2026-11-16): one blocker, three
  should-fix, four nits. It re-aggregated the fourteen committed executions with main's code and the branch's:
  byte-identical.
  - **Blocker, fixed:** a docs-control comparison of an M-V with no figure on a side (M-V2 when every loop closed in
    round 1; any M-V of `no loop` runs) stored a comparison with n = 0 and `null` bounds, which the site refuses.
    `controlMetric` now compares nothing when a side has no figure; tests for both cases, no `null` in the controls.
  - **Should-fix, fixed:** a path git quotes (`"b/caf\303\251.ts"`) is decoded, octal bytes as UTF-8 and C escapes;
    a unit case with a non-ASCII path, a tab and a space.
  - **Should-fix, fixed:** the method page reads a prompt changed since its pin from the newest commit that holds the
    pinned SHA-256 (`recordedFile`, as the configuring prompt), and refuses only when none does; a test with a later
    prompt in the working tree.
  - **Should-fix, for the gate:** deviations 1 and 4 remove parts of criterion 7. Deviation 4 is now closed: a slice
    group with loops shows M-V1 to M-V3 beside its M-Q1, never compared, marked by the reviewer's model against the
    slice's (T16), with links to its runs' pages (whose back link is the landing page); a test with a slice. Deviation
    1 stays, for the approver: nothing marks an execution as running hold-out content.
  - **Nits:** the result pages show M-V3's tokens, time, turns and interventions and its bound runs (fixed); the method
    page says "the records it installed" (fixed); T16's mark compares with the groups' model (fixed); untested paths
    now tested (a reported cost above its bound, a fixer's bound converted, a round directory `loop.json` does not
    list, the method page's spending). Kept: `loop.json`'s prompt digests are not compared with the campaign's pin,
    which task-149's runner already checks before it runs a loop.
- **Round 2** (a second fresh agent, on round 1's fixes, `4f039538..89e9e918`): one blocker, one should-fix, three
  nits.
  - **Blocker, fixed:** round 1's empty-side guard ran before M-E1's unreached check, so a docs-control pair whose
    side reached no directive step lost its "not comparable" note (an existing test of `aggregate.test.ts` failed;
    the pre-review's tests do not select it). The guard now runs after the note, just before the comparison. Checked
    with `test/unit/results` and `test/unit/site` whole (431 tests green), and by aggregating the fourteen committed
    executions with main's `src` and the branch's: identical.
  - **Should-fix, fixed:** M-V3's detail read zeros for an arm whose runs all recorded `no loop`; it says "no loop
    ran". The tokens, time and turns line is tested.
  - **Nits:** `unquoteC` walks by code point and keeps a lone trailing backslash (fixed, an unescaped emoji tested);
    the method page says "not found" for a prompt missing from the working tree (fixed); the round-1 tests that
    cover existing behaviour rather than a fix are kept as coverage.
- **Round 3** (a third fresh agent, on round 2's fixes, `89e9e918..9bad1903`): no blocker, one should-fix, two nits,
  all on tests; the four fixes correct, `aggregate.test.ts` whole green.
  - **Should-fix, fixed:** "no loop ran" had no test: a site whose wingfoil run recorded `no loop` now shows it, and
    no zero figures.
  - **Nits, fixed:** a prompt missing from the working tree is refused as "not found", tested; a lone trailing
    backslash in a quoted path, tested.
- **Round 4** (a fourth fresh agent, on round 3's tests, `a4253bc2`): no blocker, no should-fix; each test fails with
  its fix removed (checked in its clone). Three nits kept: one test holds two behaviours, a negative assertion that
  rests on the positive one before it, and a made-up patch header for a backslash git never writes.

Pre-review green at `779629c0`.
