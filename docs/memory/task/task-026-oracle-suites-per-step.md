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

### W6 plan-phase decisions (accepted by the approver, 2026-09-28, `39c6344`)

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
- REQ-FMT-09 — a change in any suite's file changes the version's hash. **characterization** (design:
  the hash already covers the whole version directory)
- REQ-ARC-03 / dl-001 — a hold-out file outside a declared suite id is a validation issue, named by
  path only. **red-first**
- `scenarios.feature` @F3.1, @F3.2 and @F3.4 stay green on the migrated fixtures. **characterization**

## Design

**Classification confirmed**, with one change: REQ-FMT-09 is characterization — `scenarioHash`
(task-018) hashes every file of the version directory, so a suite anywhere in it is covered already; a
test fixes it for a second suite. Everything else is red-first.

### The format — `oracle.suites` (REQ-FMT-04 as amended)

```yaml
oracle:
  suites:
    - { id: pointer, dir: oracle/pointer, after_steps: [1] }
    - { id: patch,   dir: oracle/patch,   after_steps: [2, 3, 4] }
  checks: [...]        # unchanged
  third_party: [...]   # unchanged
```

In `scenarioSchema` (`src/core/scenario.ts`), `public_tests` is removed — as an unknown key it is then
refused by the strict object, with no special message, since no stored scenario uses it. `suites` is
**required and may be empty**: T0–T2 have no hidden tests (T1's `oracle/public/` holds only a
`.gitkeep`), and a scenario that scores nothing says so explicitly with `suites: []`; what scoring does
with it (no M-Q1 value) is task-027's. A suite is a strict object:

- `id`: kebab-case, like a capability. It names the suite in `score.json` (task-027) and is the
  hold-out's directory for the suite (below), so it must be a single path segment.
- `dir`: a relative path inside the version directory (the existing `relativePath`).
- `after_steps`: a non-empty list of distinct integers.

Checks on the whole file, in a `superRefine` on the `oracle`-bearing object because they need `steps`,
each an issue on the offending entry:

- `oracle.suites[i].after_steps[j]`: `must be a declared step: the scenario has steps 1–N`;
- `oracle.suites[i].id`: `repeats the id of oracle.suites[k]`;
- `oracle.suites[i].dir`: `repeats the directory of oracle.suites[k]` (compared with `samePathKey`).

No order is imposed on `after_steps`; the loaded scenario holds them sorted, so the order in the file
changes nothing downstream (it still changes the hash, as any edit does).

**The final snapshot is not a field.** M-Q1 is also measured "on the final snapshot" (experiment design
§4.1); which suites run on it — those bound to the last step, or every suite — is scoring's rule, not
the format's, and is decided in task-027's design. dl-001 needs no such field either.

### The loader (`src/scenario/load.ts`) and the `Scenario` type

`Scenario.oracle.publicTestsDir` becomes `suites: readonly { id; dir; afterSteps }[]`, `dir` absolute,
`afterSteps` sorted. Each suite dir is a declared path `oracle.suites[i].dir`, kind `directory`: it
must exist and stay inside the version directory (`fileIssues`), and it joins the paths the seed and the
prompts must not overlap (`overlapIssues`, which already treats every `oracle.` path as hidden). Two new
overlap rules, on real paths:

- suites are pairwise disjoint: a test file in two suites would be scored after the steps of both,
  which no one declared;
- a check is not inside a suite: a check is a pattern file (REQ-SCO-06), not a test to run.

### The leak scan (REQ-FMT-08)

`oracleFiles(scenario)` becomes the files under every suite dir, in declaration order, then the checks.
The label of a finding stays the file's path relative to the version directory, so it already names the
suite's directory. A literal found only in the second suite is found — the red test.

### The hold-out's layout (REQ-ARC-03, dl-001)

A hold-out file of a scenario version must sit under `<suite-id>/` for a declared suite id:
`<holdout>/scenarios/<id>/<version>/<suite-id>/…`. `holdoutSuiteIssues(scenario, additions)` in
`src/scenario/holdout.ts` returns one issue per file outside one — `{ path: 'holdout', message: "'x.ts'
is under no declared suite (patch, pointer)" }` — naming the file only, never its content.
`bench scenario validate` reports them after the existing count checks and before the leak scan.
`loadHoldoutAdditions` stays as it is; which suite an addition belongs to is its first path segment,
which task-028 reads.

Hold-out **checks** have no place in this layout: dl-001 speaks of suites only, and no v0.1 scenario
spec asks for a hidden check. Should S2 or S3 need one when REQ-SCO-06 is built (W8), its layout is
decided then; until then a hold-out `checks/` directory is a file under no suite and is refused.

### Fixtures and tests

- T0, T1, T2: `suites: []`; T1's empty `oracle/public/` with its `.gitkeep` is removed.
- T3: `suites: [{ id: orders, dir: oracle/public, after_steps: [1, 2] }]`. Its content hash changes; T3
  has no stored campaign result, and the fixtures that pin a hash (if any) are updated with it.
- `completeScenarioYaml` (`test/support/scenario-fixture.ts`) declares two suites, so that every
  multi-suite rule has a complete file to start from.
- Hold-out fixtures move under a suite id (`hidden/refund.test.ts` → `orders/refund.test.ts`, and so
  on); the acceptance test's expected message follows.

### The amendment — requirements.md 1.7

REQ-FMT-04's `oracle` bullet becomes "`oracle`: `suites[]` as `{id, dir, after_steps[]}` — each suite
declared once, with the steps after which it is scored — checks, third-party pins with licenses";
REQ-ARC-03 adds that the hold-out's additions for a scenario version sit under the ids of its suites.
The version goes to 1.7 with an "Amendment 1.7" section citing dl-001 and this task; its review
decision is the approver's at this task's review, recorded there as 1.6's was at task-013's. The
traceability matrix is unaffected. dl-001 stays `approved`; its Consequences are met by this task and
the release element says so when W6 is recorded.

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
