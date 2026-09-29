---
id: task-039-continuity-metrics-and-regressions-from-the-seed
type: task
title: "Continuity metrics and regressions from the seed"
status: backlog
release: v0.1
wave: W9
features: [F4.7]
acceptance: [scoring.feature]
requirements: [REQ-SCO-02, REQ-SCO-03, REQ-SCO-06, REQ-SCO-11, REQ-RUN-09, REQ-FMT-04, REQ-FMT-07]
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

Classified in the design phase.

- `scoring.feature` @F4.7 "Next-change cost is attributed to later steps": `score.json`'s `m_f2` holds
  steps 2 to 5 of S3, each with its cost and its M-Q1. **red-first**
- `scoring.feature` @F4.7 "Decision consistency counts explicit revisions as consistent": S3's
  reference, scored through the local scoring double. D3 is `revised`, and M-F1 is 5/5. **red-first**
- `scoring.feature` @F4.7 @error "A silent revision counts as a failure": the same reference without
  step 4's record. Its D3 tests all pass and `d3-revision` fails, so D3 is `failed`, and M-F1 is 4/5.
  **red-first**
- REQ-FMT-04 as amended: `oracle.decisions` is validated. The validator refuses:
  - an id that is not unique;
  - a `revised_by` that names no content check;
  - a revision check that is not scored after the step it revises.

  **red-first**
- Scoring refuses a declared decision that has no public test in the census, naming the decision.
  **red-first**
- Experiment design §4.1 M-D3: a public hidden test that passed on the seed and fails on the final
  snapshot is counted, and one that already failed on the seed is not. `score.json` records the seed's
  own tally per suite. **red-first**
- M-F1 and M-D3 are `not reached` when the final snapshot is. **red-first**
- Scenarios with no `decisions` get no `m_f1` key; S1, S2 and S8 are the ones today. **characterization**
- REQ-SCO-03: the same run scored twice gives the same `score.json` bytes, with the new keys.
  **characterization**
- REQ-FMT-07: M-F1 (per decision and as a share), M-F2 per step, and M-D3 are in `aggregate.json`, each
  with its runs and `n`. A final not reached counts as a loss, as task-034 decided. **red-first**
- An older `score.json` without the new keys still aggregates. **characterization**

## Design

Three findings shaped this design:

- **The seed's pass/fail is already computed, then dropped.** `censusOf` runs every suite, public and
  hold-out, on the seed exactly once per `bench score`. It keeps only the keys of the tests that ran. The
  seed's verdicts cost nothing more to keep: the same report gives them.
- **A decision's name alone cannot say how it is revised.** The `D<n>:` names give the outcome half.
  But which check records D3's revision is a fact about the scenario, and nothing in the check file or
  the test names states it. Inferring it, for example from a check id starting `d3-`, would make a file
  name part of the format.
- **M-F2 is a reading of what `score.json` already holds:** `cost.steps` and each step's `m_q1`.
  Nothing new is measured. It is written as its own key only so that the metric has a name that
  aggregation and the site can point to.

### The decisions an oracle lists (REQ-FMT-04 as amended)

`scenario.yaml`'s `oracle` gains an optional list, empty by default:

```yaml
oracle:
  decisions:
    - { id: D1 }
    - { id: D2 }
    - { id: D3, revised_by: d3-revision }
    - { id: D4 }
    - { id: D5 }
```

- `id` matches `^[A-Z][A-Za-z0-9]*$` and is unique. A decision's tests are the public hidden tests
  whose **last name element starts with `<id>:`**, as S3's already do. A test that names no decision is
  an ordinary test.
- `revised_by`, when given, is the id of a `content` check of the same scenario. The scenario states
  that its steps revise this decision, and that check is the record of the revision.
- The loader refuses an unknown or non-content `revised_by`, and an id declared twice.
- Scoring refuses a decision with no test in the public census:
  `oracle.decisions[D6] has no public hidden test named 'D6: …'`. It cannot be checked at validation,
  since a test's name exists only when its suite runs.
- **S3@1.0's `scenario.yaml` gains the five lines above.** S3@1.0 is not registered, and no stored
  result carries its hash (W8 decision 4), so this is not a new version. The hash changes, and the
  `scenarios.feature` outline and the Docker tests pick it up. Nothing else in S3 changes.

### M-F1 (experiment design §4.3)

For each declared decision, on the **final** snapshot, with only public tests (hold-out results are
counts, REQ-SCO-09):

| The decision's tests | `revised_by` | Its check at its last step | Outcome |
|---|---|---|---|
| all pass | none | — | `respected` |
| all pass | a check | passed | `revised` |
| all pass | a check | failed or not reached | `failed` (a silent revision) |
| any fails | either | — | `failed` |

A decision with `revised_by` is one the scenario revises **by construction**: S3's step 4 asks for
hourly rentals. Its tests assert what must survive the revision, so a run whose tests pass but that
records nothing has revised it silently. Choice 1 below is about this row.

```json
"m_f1": {
  "consistent": 5, "total": 5,
  "decisions": [
    { "id": "D1", "outcome": "respected", "failed": [] },
    { "id": "D3", "outcome": "revised", "failed": [], "check": "d3-revision" }
  ]
}
```

- `failed` lists the decision's failing test keys, in `score.json`'s usual form.
- `m_f1` is `{ "not_reached": true }` when the final snapshot is not reached.
- `m_f1` is absent when the scenario declares no decision. Absent keeps the older `score.json` files
  and the scenarios without decisions alike.

### M-F2 (experiment design §4.3)

```json
"m_f2": { "steps": [ { "n": 2, "cost_eur": 0.12, "m_q1": { "passed": 16, "total": 16 } } ] }
```

- It covers each step after the first, with the step's `cost_eur` from `cost.steps` and its `m_q1`
  from `steps`.
- A step not reached is `{ "n": 3, "not_reached": true }`.
- A step no suite scores has no `m_q1`, as in `steps`.
- It is written for every scenario with more than one step, and is absent for a single-step scenario.
- "Attributed to the code left by the previous steps" is the metric's meaning, not a computation. The
  method page says so (W11).

### M-D3 from the seed (experiment design §4.1)

- **The census becomes `{ keys, failedOnSeed }`** per suite. `Census` is the exported cache type, used
  by `cli/score.ts` and the unit tests. Its value changes shape, and nothing else about it changes.
  `failedOnSeed` is the counted census keys the seed's report does not pass.
- **`score.json` gains `seed`,** the public suites on the seed, in `final`'s shape:
  `{ suites: [{ id, passed, total, failed }], m_q1 }`. The hold-out's seed is not added (see below).
- **`m_d3`** is `{ count, tests }`:
  - `tests` are the public keys that passed on the seed and fail on the final snapshot, sorted;
  - it is `{ "not_reached": true }` when the final snapshot is not.
- **The hold-out is left out of M-D3.** A hold-out regression could only be a count, and none of v0.1's
  hold-outs is scored on the seed by design. S2's regressions are public: its seed suite and its
  regression suite (S2.md §6).
- **W7's step-to-step regressions stay as they are,** in the aggregate. `m_d3` is the metric §4.1
  defines. The step-to-step view is a diagnostic beside it.

### Aggregation (REQ-FMT-07)

The reader schema in `src/results/aggregate.ts` takes `seed`, `m_f1`, `m_f2` and `m_d3` as optional.
`Group.metrics` gains:

- **`m_f1`** (only when some run of the group has it):
  - `share`, a `Value<Tally>` (consistent over total);
  - per decision, `consistent`, a `Value<Tally>` of one per run, like checks;
  - the counts of each outcome;
  - `not_reached`.

  A final not reached **counts as 0 consistent** in `share`, and is also listed as `not_reached`,
  as task-034 counts a loss's M-Q1.
- **`m_f2`:** per step after the first, `cost_eur` as a `Value<number>` and `m_q1` as a
  `Value<Tally>`, with `not_reached`. It reads `cost.steps`, which the reader schema now parses
  (optional, since older files have it too).
- **`m_d3`:** a `Value<number>` of regressions per run. For a final not reached, the value is
  **every test that passed on the seed**, taken from the run's `seed` (a loss), and the run is listed
  in `not_reached`.

`SCORE_VERSION` and `AGGREGATE_VERSION` stay 1 (W9 decision 5). Every value is a new key, and no
existing value changes how it is computed.

### Modules

- `src/core/scenario.ts`: the `decisions` schema and the `Decision` type on `Scenario.oracle`.
- `src/scenario/load.ts`: `revised_by` resolved against the loaded checks.
- `src/scoring/score.ts`: the census's new value, `seed`.
- `src/scoring/continuity.ts` (new): three pure functions. `mF1(scenario, final, checks)`,
  `mF2(steps, cost)`, `mD3(seed, final)`. No container and no clock.
- `src/results/aggregate.ts`: the reader schema and three aggregators.
- `scoreSummary` gains `; M-F1 5/5` when there is an `m_f1`, and `; M-D3 0` always when the final
  snapshot was reached.
- Tests: unit tests per function; `test/acceptance/scoring.test.ts` @F4.7 ×3, on S3's reference through
  the local scoring double, like the @F6.x outline; the outline's S3 row gains M-F1 5/5 and M-D3 0.

### Requirements 1.14

- **REQ-FMT-04:** `oracle.decisions`.
- **REQ-SCO-11 (new):** the continuity metrics and M-D3:
  - M-F1's four rows;
  - M-F2 as the reading of steps 2 to n;
  - M-D3 from the seed's public results;
  - a final not reached, in `score.json` and in aggregation.
- **Traceability 1.1** (an amendment to the approved 1.0):
  - REQ-SCO-11 joins the rows of Q-F1, Q-F2 and Q-D3 in §1;
  - it joins F4.7's and F4.1's rows in §2. M-D3 is not F4.7's metric, and in v0.1 it has no feature of
    its own. The matrix already traces Q-D3 to `scoring.feature` @F4.1.

### Choices to confirm

1. **A declared revision that is not recorded counts as a failure**, even when the agent did not revise
   the decision at all. S3 revises D3 by construction (step 4 asks for hourly rentals). An agent that
   ignored the request keeps D3's tests green, and loses on `hourly`'s M-Q1 and on D3.
   - *Alternative:* count `respected` when nothing was revised. That needs a way to tell "not revised"
     from "revised silently", such as "the hourly suite fails". A second rule per decision, bound to one
     suite.
2. **Decisions are declared in `scenario.yaml`**, with their revision check, and S3@1.0 gains five
   lines, with no new version.
   - *Alternative:* infer them from the `D<n>:` names, with a naming rule linking D3 to `d3-revision`.
     No format change, but a check file's name becomes part of the format.
3. **M-D3 on public tests only**, with `seed` recorded for the public suites.
   - *Alternative:* a hold-out M-D3 as a count. It costs little, but v0.1 has no hold-out test that is
     scored on the seed by design.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` for task-039 (`8130aea`), task-040 (`e3698da`) and
  task-041 (`fd5d3cf`).
  - Declared: one commit `wf(task): add <id>`, and one new file from the template with `status:
    draft`. The id is `task-{n}-{slug}`.
  - Observed: exit 0 each time, and exactly that commit with 1 file. Matches.
- Content filled and committed by hand in `docs(task): scope the W9 tasks of release v0.1` (`de6d534`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit <id>` for task-039 (`0618a5b`), task-040 (`33ed776`) and task-041
  (`53dcabe`).
  - Declared: `draft → pending`, required fields checked, one commit `wf(task): submit <id>`.
  - Observed: exit 0 each time, 1 file, and a diff limited to `status: draft` → `status: pending`.
    Matches (the subject names no transition: N9).
