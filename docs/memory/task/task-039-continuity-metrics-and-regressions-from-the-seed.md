---
id: task-039-continuity-metrics-and-regressions-from-the-seed
type: task
title: "Continuity metrics and regressions from the seed"
status: pending
release: v0.1
wave: W9
features: [F4.7]
acceptance: [scoring.feature]
requirements: [REQ-SCO-02, REQ-SCO-03, REQ-SCO-06, REQ-RUN-09, REQ-FMT-04, REQ-FMT-07]
---

## Context

First task of wave **W9 — Quality** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). The wave's
"Ends with" is "the full quality and cost picture per run". This task delivers **F4.7 continuity
metrics**, both of them (features 1.2):

- **M-F1**, decision consistency (experiment design §4.3);
- **M-F2**, next-change cost.

It also delivers W7's carry-over, **the full M-D3**: the hidden tests that passed on the seed and fail
at the end (experiment design §4.1). Both metrics read hidden tests by name, which is why they share a
task.

W8 delivered M-F1's parts, and M-F1 itself was left to W9 (W8 decision 3):

- **The outcome half.** S3's hidden tests name their decision as the last element of their path,
  `D<n>: …`. They are spread across the suites:
  - bookings: D1–D4;
  - availability: D4;
  - discount: D1;
  - hourly: D1–D4;
  - cancellation: D1, D5.

  `score.json` lists each failing public test as `file > describe > name`.
- **The content half:** D3's check `d3-revision` (content, step 4), in `score.json`'s `checks`.

M-F2's inputs are already per step in `score.json`: `cost.steps` and M-Q1. The seed is run only to
take the census of test keys. Its pass/fail is thrown away (`censusOf`, `src/scoring/score.ts`).

Scope:

- **M-F1 in `score.json`.** For each decision the scenario's oracle lists, the result is one of:
  - **respected**: every public `D<n>:` test passes on the final snapshot;
  - **explicitly revised**: the outcome half holds and the decision's content check passes. For S3 this
    is D3 and `d3-revision`;
  - **failed**: anything else, a silent revision included.

  M-F1 is the share respected or explicitly revised. A run whose final snapshot is not reached reports
  M-F1 as not reached, never as a share. Hold-out tests stay counts only (REQ-SCO-09) and do not enter
  M-F1. Where the list of decisions comes from is this task's design: inferred from the `D<n>:`
  names, or declared in `scenario.yaml` with the decision's check (a REQ-FMT-04 amendment).
- **M-F2 in `score.json`:** for each step after the first, its M-K1 cost and its M-Q1 pass rate, beside
  the cost and M-Q1 of the steps they are attributed to. Whether this is a view in `score.json` or only
  in the aggregate is the design's call. The data is already there.
- **Full M-D3.** `score.json` gains the seed's result for each suite: passed, total, and `failed` in the
  same key form. M-D3 counts the tests that passed on the seed and fail on the final snapshot. It is
  reported beside W7's step-to-step regressions, which stay.
- **Aggregation:** M-F1 per decision and as a share, M-F2 per step, and M-D3, each a `Value` with its
  runs and `n` (REQ-FMT-07). `SCORE_VERSION` and `aggregate_version` stay 1 when keys are only added.
  The aggregate's reader schema accepts the new keys as optional, so older score files still
  aggregate.
- **Acceptance:** `scoring.feature` @F4.7 has three scenarios: next-change cost, an explicit revision
  counted as consistent, and a silent revision counted as a failure. They get tests titled
  `@F4.7 <Scenario name>` (the traceability gate). They run on S3 with the reference and with variants.

Out of scope:

- M-K3 and M-K4: task-040.
- M-Q2: task-041.
- M-D1 and M-D2: not in W9's features.
- S3's content: S3@1.0 is not changed. It stays changeable until calibration registers it (W8
  decision 4), but this task needs no change to it.

**Done** means:

- M-F1, M-F2 and the full M-D3 are in `score.json` and `aggregate.json` for S1–S3 and S8. M-F1 is
  meaningful where the scenario lists decisions, which is S3 in v0.1. Scenarios that list none report
  it as not applicable.
- The three @F4.7 scenarios are green.
- Requirements are amended where needed, with a recorded review decision.
- Tests, coverage and lint pass.

### W9 plan-phase decisions (proposed; accepted by the approver at pending → backlog)

1. **Three tasks, one per feature, in this order** (the approver's choice, 2026-09-29):
   - task-039, F4.7, M-F1 and M-F2, plus the full M-D3;
   - [task-040](task-040-setup-cost-and-break-even.md), F4.4, M-K3 and M-K4;
   - [task-041](task-041-static-quality-metrics.md), F4.2, M-Q2 and the scoring image's new tools.

   The order puts the highest value first, and it closes W8's carry-over. The scoring image, the
   heaviest change, comes last. No task depends on another. The wave's "Ends with" holds after
   task-041, and the wave check is made once, then.
2. **M-K4 follows experiment design §4.2 literally** (the approver's choice, 2026-09-29):
   - M-K3 records the setup's wall time, its cost in euro, and the operating manual's tokens. In v0.1
     that cost is 0, because the setup runs no agent (adr-003 decision 11).
   - M-K4 is computed from the formula, with "not applicable" and "never".
   - A REQ-SCO-08 amendment states what a break-even of 0 means: the arm is cheaper per step and has
     nothing to pay back.
   - The method page (W11) says that in v0.1 the harness's overhead is in the step cost, since each
     session reads the manual again.

   The rejected alternatives were pricing the manual's tokens as a synthetic setup cost, and deferring
   M-K4 to v0.2.
3. **M-Q2's coverage is REQ-SCO-04's, as written** (the approver's choice, 2026-09-29):
   - the snapshot's own `node --test`, under c8, in the scoring container;
   - on the final snapshot only, limited to the files the run changed;
   - 0 when the project has no tests. S1's and S3's seeds have none; S2's and S8's do.

   Coverage from the hidden tests is not added.
4. **The wave check is offline** (the approver's choice, 2026-09-29), as in W7 and W8:
   - it runs on main's built CLI, in a temporary repository, with the fake agent replaying each
     scenario's reference;
   - the fake carries a synthetic usage per arm, written in the check's fixtures, so that M-K4 shows its
     three cases: a number, "never", and "not applicable";
   - there is no real-agent half (`real-agent-check` is not taken) and no spending in W9. The real
     values are calibration's.
5. **No scoring rule changes, so `SCORE_VERSION` and `aggregate_version` stay 1.** Every metric is a new
   key. The aggregate's reader schema (`src/results/aggregate.ts`) takes each one as optional. The one
   exception is if a task's design finds that an existing value must be computed differently. That is
   a rule change: the version rises, and it is recorded in adr-004.
6. **The scoring image changes once, in task-041.** ESLint, jscpd and c8 are pinned the way TypeScript
   was in task-037 (adr-004 amendment 2):
   - in `docker/score-image/package.json` and its lockfile;
   - in the Dockerfile's COPY;
   - in `ScoringImage` and `score.json`'s `scorer`;
   - in the local scoring double's map.

   task-039 and task-040 need no new tool in the image. M-F1, M-F2, M-K3 and M-K4 read what scoring
   already has.
7. **What W8 learned applies here:**
   - never run `npm test` and `npm run test:docker` at the same time;
   - oracle `.mts` files are linted;
   - a seed-scored step suite passes 0 tests (adr-004 decision 10). M-D3 now reads the seed's own
     results, so a hidden test that passes on the seed by accident becomes visible as data.

## Acceptance criteria

<!-- Classified in the design phase. -->

- `scoring.feature` @F4.7 "Next-change cost is attributed to later steps"
- `scoring.feature` @F4.7 "Decision consistency counts explicit revisions as consistent"
- `scoring.feature` @F4.7 @error "A silent revision counts as a failure"
- Experiment design §4.1 M-D3: a hidden test that passed on the seed and fails at the end is counted;
  one that failed on the seed is not
- REQ-SCO-03: the same run scored twice gives the same `score.json` bytes
- REQ-FMT-07: M-F1, M-F2 and M-D3 in `aggregate.json`, each with its runs and `n`

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
