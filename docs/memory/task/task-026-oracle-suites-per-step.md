---
id: task-026-oracle-suites-per-step
type: task
title: "Oracle suites per step"
status: backlog
release: v0.1
wave: W6
features: []
acceptance: [scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-FMT-09]
---

## Context

First task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), whose
"Ends with" is "pass/fail and cost per run, with expected failures marked". It delivers no feature: it
implements [dl-001](../decision-log/dl-001-per-step-oracle-mapping-in-the-scenario-format.md)
(approved), which W1 left "due before W6 and W7". The scorer (F4.1, task-027) must know which tests
apply after which step, and today's format cannot say it: `oracle.public_tests` is one directory with
no link to steps.

Scope, as dl-001 decided (option 3, declared suites):

- **`oracle.suites: [{ id, dir, after_steps: [n…] }]` replaces `oracle.public_tests`** in
  `scenario.yaml` (`src/core/scenario.ts`). Each suite is declared once; the validator refuses an
  `after_steps` value that is not a declared step, a repeated suite id, and two suites on the same
  directory. `checks` and `third_party` stay where they are.
- **The amendment of requirements.md (REQ-FMT-04)**, with the review decision recorded, as dl-001's
  Consequences require: the next amendment after 1.6. The traceability matrix is unaffected.
- **The leak scan (REQ-FMT-08) reads every suite's files** where it read `public_tests` (task-017's
  `oracleFiles`); the content hash (REQ-FMT-09, task-018) covers them as it covered the one directory.
- **Hold-out additions mirror the suite ids** (dl-001, REQ-ARC-03): the additions of a suite sit under
  `<holdout>/scenarios/<id>/<version>/<suite-id>/`. Only the layout is fixed here, and a hold-out file
  outside a declared suite id is a validation issue; task-028 runs them.
- **The fixtures T0–T3** move to `oracle.suites`. No scenario version with stored campaign results
  exists outside the tests, so no stored result is affected (dl-001; F3.4 would refuse a changed
  version that had one).

**Done** means: a scenario declares its suites and the steps they score; `bench scenario validate`
refuses a suite bound to a missing step; the leak scan and the hash cover every suite; requirements
amended; tests, coverage and lint pass.

### W6 plan-phase decisions (proposed to the approver)

1. **Five tasks, in this order:** task-026 oracle suites per step (dl-001); task-027 hidden-test
   oracle (F4.1: `bench score`, the scoring container, M-Q1, `score.json`); task-028 hold-out tests in
   scoring (the scoring half of F3.5, REQ-SCO-09, which W4 left to W6); task-029 cost metrics (F4.3);
   task-030 expected failures (F3.6). The wave's "Ends with" holds after task-030.
2. **dl-001 is its own task, first.** It changes the scenario format, the validator and the hash, and
   amends an approved document: a review of its own, not a side effect of F4.1's. It is small, and
   task-027 builds on the format it leaves.
3. **The hold-out half is its own task, after F4.1** and declaring F3.5, as task-016 left it ("the
   task that delivers it declares F3.5"). It reads the additions through task-016's
   `loadHoldoutAdditions` and adds a second result set to the `score.json` task-027 defines.
4. **Scoring runs on runs made with the fake agent.** The fake's scripted sessions write files into the
   workspace, so a run's step snapshots hold code the hidden tests can pass or fail; W6's wave check
   scores such a run. **No real-agent half** (`real-agent-check` not taken) and **no spending in W6**:
   scoring never runs an agent (REQ-SCO-01), and the "Ends with" names no behaviour only a real session
   shows.
5. **Scoring reads the same stored run it will read in W7.** What a run leaves (`run.json`, each step's
   `usage.json` and `diff.patch`) is the input; nothing the runner keeps only locally (the workspace
   under `runs/`, git-ignored) may be required to score a run from a checkout of the repository
   (REQ-RES-06). How a step snapshot is rebuilt from it is task-027's design.
6. **"Published as a loss" is W7's** (F5.1, aggregation, REQ-SCO-10's last clause). W6 marks a run
   `expected failure` in its record and in its score, naming the missing capabilities; aggregation
   counting it as a loss is carried to W7 in the release element.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- REQ-FMT-04 as amended — `oracle.suites` with `id`, `dir`, `after_steps`; `public_tests` refused as an
  unknown key. **red-first**
- REQ-FMT-04 — a suite bound to a step the scenario does not declare, a repeated suite id, two suites
  on one directory: each an issue naming the suite. **red-first**
- REQ-FMT-08 — the leak scan finds an oracle literal from any suite, not only the first. **red-first**
- REQ-FMT-09 — a change in any suite's file changes the version's hash. **red-first**
- REQ-ARC-03 / dl-001 — a hold-out file outside a declared suite id is a validation issue, named by
  path only. **red-first**
- `scenarios.feature` @F3.1, @F3.2 and @F3.4 stay green on the migrated fixtures. **characterization**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `0cf12dd`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-026-oracle-suites-per-step` → `8878098`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
