---
id: task-150-w19-the-review-loop-s-metrics-and-its-pages-task-c
type: task
title: "W19: the review loop's metrics and its pages (task C)"
status: pending
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
