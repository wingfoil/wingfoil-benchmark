---
id: task-091-the-v0-2-campaign-files-the-reference-campaign-and-the-bridge-with-calibration-s-values-as-placeholders
type: task
title: "The v0.2 campaign files: the reference campaign and the bridge, with calibration's values as placeholders"
status: in-progress
release: v0.2
wave: calibration
features: []
acceptance: []
requirements: [REQ-FMT-01, REQ-FMT-13, REQ-FMT-11, REQ-RUN-16]
tags: ["calibration","campaign","dl-017","dl-007"]
---

## Context

v0.2's two campaign files, as [dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md)
and [dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md) shape them, recorded in experiment
design 1.3 §6 (task-090): the reference campaign (`campaign-002`) and the bridge. The approver asked for it on
2026-10-14, after task-090, as the first task of calibration (plan-004 step 3): calibration's dry runs read the
campaigns' keys, so the files come first.

**Requirements, the nearest ones:**

- **REQ-FMT-01** (as amended in 1.26): the campaign file's fields; the bridge a campaign of its own, with its own file,
  `harnesses` and `arm_digests`; `arm_digests` required for every arm of a v0.2 campaign;
- **REQ-FMT-13**: each arm's digest, which `validate` recomputes and refuses on a mismatch;
- **REQ-FMT-11**: every harness arm's tool admitted in the eligibility register at the pinned version (wingfoil
  v0.2.2, speckit v1.1.0 and openspec 1.14.0 are; v0.3 is not yet);
- **REQ-RUN-16** (as amended in 1.27): the agent pinned at a release, the effort per model (dl-015).

**WingFoil v0.3 is not released** (2026-10-14). The reference campaign pins **v0.2.2 for now**, and says so: the task
that admits v0.3 (dl-017's Consequences; the deadline 2026-10-31) moves the pin, the wingfoil arm's manual and its
digest. Until then both files hold WingFoil v0.2.2, so the offline comparison of bridge and reference changes nothing
but the arms the bridge lacks.

**No real agent, no spending.** **Done** means: both files on main, valid, with a test that holds them to dl-017's
shared pins, and an offline run of both with the fake agent recorded below.

## Acceptance criteria

- **red-first** — a new test, `test/unit/campaign/v0-2-campaigns.test.ts`, fails before the files exist and passes
  after:
  1. `checkCampaign` accepts `campaigns/v0-2-reference.yaml` and `campaigns/v0-2-bridge.yaml`: schema, consistency,
     harness coverage, the eligibility register and every arm digest;
  2. the reference campaign: S1, S2, S3 and S8 @1.0; arms baseline, baseline-docs, wingfoil, speckit, speckit-docs,
     openspec and openspec-docs; harnesses wingfoil `v0.2.2`, speckit `v1.1.0`, openspec `1.14.0`; default model
     `claude-sonnet-5-5`; slices `claude-opus-5-5` (S1; baseline, baseline-docs, wingfoil) and `claude-haiku-4-5`
     (S1 and S3; baseline, wingfoil), one repetition each; repetitions S1 3, S2, S3 and S8 1;
  3. the bridge: arms baseline, baseline-docs and wingfoil; harness wingfoil `v0.2.2`; no slices;
  4. **dl-017's shared pins:** the bridge's `scenarios`, `repetitions`, `agent` (name, version and effort),
     `models.default`, `approver_policy`, `caps` and `currency` equal the reference campaign's; the bridge's arms are
     a subset of the reference's, and each shared arm's `arm_digests` entry is the same.
- **characterization** — the placeholders validate as they are: the agent `claude-code` 2.1.291 (task-062's
  recommendation: 2.1.280 misprices Sonnet 5.5), effort `high` for Sonnet 5.5 and Opus 5.5 and `none` for
  Haiku 4.5 (dl-015's example), v0.1's caps and rate, a placeholder budget. `missingEffort` finds no model without an
  effort, so `run` would not refuse them for that.
- **characterization** — the offline run with the fake agent (Design, "The offline verification"): both campaigns
  validate, their dry runs, both run with every run completed, both scored, `bench campaign compare <bridge>/1
  <reference>/1` and `bench site build` exit 0; nothing of the temporary repository reaches this one; no `bench-`
  container left.

## Design

**The files** (`campaigns/`, beside v0.1's two):

- `v0-2-reference.yaml`: the header comment names its sources (dl-007 B + E, dl-012, dl-015, dl-017; experiment
  design 1.3 §6) and **what calibration sets**: the agent's version (re-pinned at calibration, task-062: 2.1.291 or
  later), the effort per model (dl-015), the caps, the budget (warn and ceiling, from the revised budget, covering
  the bridge too, REQ-FMT-01), and the rate (the ECB reference rate of calibration's day). Each placeholder carries an
  end-of-line comment `# placeholder: calibration sets it`. The wingfoil harness carries `# v0.2.2 until v0.3 is
  released and admitted (dl-017): the task that admits it moves this pin and the arm's digest`.
- `v0-2-bridge.yaml`: the same header sources, "a campaign of its own" (REQ-FMT-01, dl-017 point 2), "every pin but
  the arms equals v0-2-reference.yaml's, and both run from the same benchmark commit, recorded in both campaign
  elements" (dl-017 point 3), and the same placeholders. WingFoil v0.2.2 is final here: dl-017 holds it.
- `arm_digests`: every arm's, computed with `armDigest(repoRoot, arm).slice(0, 12)` (the runner's check) on the
  committed arms. The test fails if an arm changes without its digest, which is the point: the v0.3 task updates them.
- No `fail_fast` for now: whether the paid campaign stops on repeated errors is calibration's decision too; the header
  names it among calibration's.
- Budget placeholder: reference warn 85, ceiling 100 EUR (the first sizing's 75–85 €, rel-v0-2 Goal); bridge warn 35,
  ceiling 45 EUR (dl-017's 35–40 €). Caps: v0.1's (3600 s, 20,000,000 tokens, 30 EUR per run). Rate: v0.1's 0.8851.

**The test** (`test/unit/campaign/v0-2-campaigns.test.ts`, red first, committed alone): `checkCampaign` on both files
(`repoPath`), the shapes of criteria 2 and 3, the shared pins of criterion 4, and `missingEffort` empty for the
default model and both slices.

**The offline verification**, as W14's in rel-v0-2, niced, from the main checkout's built CLI on the merged commit:

- a temporary repository in the scratchpad from `git archive main`, without `results/`; `git init` and a commit;
- in it only: both campaign files rewritten to `agent: {name: fake, version: 1.0.0}` (a campaign of the fake agent
  needs no effort), and the dry-run profile `scenarios/dry-run.yaml` pinning the fake agent and the three harnesses;
- `BENCH_FAKE_SCRIPT` replaying `test/fixtures/reference/` (S1, S3, S8) and the hold-out's `reference/S2/`;
  `BENCH_HOLDOUT_PATH` the hold-out; `BENCH_WINGFOIL_REPO` and `BENCH_SPECKIT_REPO` the clones W12 and W14 used;
  OpenSpec from the npm registry, as W13;
- `bench scenario validate`; `bench campaign validate` for both (expected: 4 scenarios, 7 arms; 4 scenarios, 3 arms);
- `bench campaign run` refuses first, naming the dry runs missing; the dry runs of every missing key (expected: 28 on
  Sonnet 5.5, 3 on Opus 5.5, 4 on Haiku 4.5; the bridge's keys are the reference's, so none of its own while both pin
  v0.2.2); then both campaigns run (expected: 49 runs and 18 runs);
- `bench score <id>/1 --final --holdout …` for both; `bench campaign compare <bridge>/1 <reference>/1` (expected: 12
  groups matched, the reference's slices and four arms not in the bridge listed as not compared, no pin differing but
  the arms); `bench site build <reference>/1`;
- `docker ps -a --filter name=bench-` empty at the end; the temporary repository removed after its outputs are
  summarised in the Execution notes. It runs in the background, niced, about 100 container runs; I check its log
  after the first stage and stop at the first failure.

**Checks:** the new test, `test/unit/runner/campaign*`-adjacent tests untouched; `npm run lint`; `npx tsc --noEmit
-p .`. No CLI output changes, so no `test:bin`. Independent review until clean. Full suites only if the approver asks.

**Out of scope, for the v0.3 task:** the bridge must keep task-086's manual while the reference moves to v0.3's.
Both read `arms/wingfoil/`, so the two cannot then share one arm directory: the v0.3 task decides how (a second arm,
or the bridge run before the arm changes, both from the same benchmark commit as dl-017 requires, which the second
option cannot meet). It is named here so that it is not found at calibration.

## Execution notes

- `npx wingfoil memory add --type task --title … --tags calibration,campaign,dl-017,dl-007` on 2026-10-14, on main.
  Declared: create a draft with the type's scaffold and commit it. Observed: `task-091-…` as a draft (`38d156e`),
  required fields empty (W-02); filled in a `docs(task)` commit before `submit` (W-01).
- `npx wingfoil memory submit task-091-…` (draft → pending) on main. Declared: moves the element to its next state and
  commits it. Observed: `status: pending` (`045bbde`). Matches. The approver approved it (pending → backlog).
- `npx wingfoil memory submit task-091-…` (backlog → in-progress) on main. Declared: the same. Observed:
  `status: in-progress` (`f63f6d5`). Matches.
- Worktree `../WingFoil2-Benchmark-wt/task-091`, its own `npm ci` (exit 0).
- **Red** (`068a326`): `test/unit/campaign/v0-2-campaigns.test.ts`, 5 tests, all failing because
  `checkCampaign` refuses the missing files. Committed alone.
- **Green** (`1979daa`): `campaigns/v0-2-reference.yaml` and `campaigns/v0-2-bridge.yaml`. The arm digests were
  computed with `armDigest(repoRoot, arm).slice(0, 12)` on the committed arms: baseline `964b1354526c`, baseline-docs
  `2ac51091da99`, wingfoil `680b19f27c9f`, speckit `3f2ec815ac70`, speckit-docs `b2fbe79ca773`, openspec
  `79f81183dbbe`, openspec-docs `52d8775dd78c`. The bridge's `agent.effort` names all three models, as the
  reference's does, so that `agent` is one pin shared whole (criterion 4). The new test 5 of 5; `test/unit/campaign` and
  `traceability` 132 of 132; `npm run lint` 0; `npx tsc --noEmit -p .` 0. CLI output unchanged: no `test:bin`.
- **The offline verification, on 2026-10-14, 18:37–19:37,** niced, with the worktree's built CLI (`npm run build`).
  **Deviations from the Design:** the CLI was the worktree's build, not the main checkout's, and the temporary
  repository came from `git archive` of the task branch's head (`1979daa`), not of main: main does not hold the files
  before the merge.
  - The temporary repository in the scratchpad, `results/` removed, committed. In it only: both campaigns'
    `agent` rewritten to `{name: fake, version: 1.0.0}` (no effort), and `scenarios/dry-run.yaml` pinning the fake
    agent, WingFoil v0.2.2, Spec Kit v1.1.0 and OpenSpec 1.14.0 on `claude-sonnet-5-5`.
  - `BENCH_FAKE_SCRIPT`: one file replaying the references of S1 (5 steps), S3 (5) and S8 (4) from
    `test/fixtures/reference/` and S2's (3) from the hold-out's `reference/S2/`, encoded as
    `test/support/reference.ts` does. `BENCH_HOLDOUT_PATH` the hold-out; `BENCH_WINGFOIL_REPO` `../WingFoil2` (tag
    `v0.2.2` present, no `v0.3` tag); `BENCH_SPECKIT_REPO` the Spec Kit clone at `v1.1.0` (`f1d3a4f`); OpenSpec from the
    npm registry.
  - `bench scenario validate` → S1@1.0, S2@1.0, S3@1.0 and S8@1.0 valid with the hold-out.
  - `bench campaign validate` (the ids are those of the fake-agent copies, not of the committed files nor of
    campaign-002) → `campaign c3bfbd22bc87 is valid (4 scenarios, 7 arms)` (reference) and
    `campaign 0cfa0f9dc83f is valid (4 scenarios, 3 arms)` (bridge), each preflight line `set`.
  - `bench campaign run`, both, before any dry run → exit 1, `campaign: not started: its cost cannot be estimated`,
    naming each missing dry run.
  - **35 dry runs** from the two estimates' refusals, deduplicated, each exit 0 (28 on Sonnet 5.5, 3 on Opus 5.5, 4 on
    Haiku 4.5), as the Design expected. The bridge needed none of its own: its estimate reads the reference's dry
    runs (`results/dry-runs/29`, `35`), the same keys while both pin WingFoil v0.2.2. Estimates: 0.0000 USD, the
    guards `warn 85 EUR, ceiling 100 EUR` and `warn 35 EUR, ceiling 45 EUR`.
  - `bench campaign run` → reference `49 runs completed, 0 failed`; bridge `18 runs completed, 0 failed`; cost
    0.0000 USD.
  - `bench score <id>/1 --final --holdout …` → exit 0: reference `28 groups, 7 slices; determinism measured in 7`;
    bridge `12 groups, 0 slices; determinism measured in 3`. Every arm scores the reference's result (S8, for
    example: final 23/23, hold-out 7/7, checks 16/16).
  - `bench campaign compare 0cfa0f9dc83f/1 c3bfbd22bc87/1` → exit 0,
    `results/comparisons/c3bfbd22bc87-1/0cfa0f9dc83f-1.json (12 groups matched, 12 rows with a change, 0 rows without,
    7 groups not compared)`. The JSON: `not_compared` the 7 slice groups ("no slice of model … in 0cfa0f9dc83f/1");
    `only_in` the 16 groups of the four arms the bridge lacks; `pins_differ` 7: the slices, the speckit and openspec
    harnesses, and those four arms' digests. No other pin differs: the agent, the model, the effort and WingFoil are
    shared, as dl-017 requires. The Design had put the four arms under "not compared"; the comparison lists them
    under `only_in`, as REQ-SCO-13 does.
  - `bench site build c3bfbd22bc87/1` → exit 0; the headline compares each arm with the baseline, "the same in 6 of 6",
    preliminary in D, E and F; 32 HTML files under `site/`. **Not checked:** the comparison page
    (`compare-0cfa0f9dc83f-1.html`, `src/site/build.ts`) was not looked for under `site/c3bfbd22bc87/1/` before the
    temporary repository was removed; `site build` writes one page per comparison whose newer side is the execution.
  - `docker ps -a --filter name=bench-` → 0 containers left. The worktree unchanged (`git status` clean). The
    temporary repository removed; its logs stay in the session's scratchpad, outside the repository.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design, dl-007, dl-015, dl-017,
experiment design 1.3 §6, REQ-FMT-01, -11, -13, REQ-RUN-16, -19 and the campaign and digest code.

- **Round 1** (8dd7b64): **clean**, four nits. The model ids, the shapes, the shared pins and the seven digests
  (recomputed) verified; red-first visible (`068a326` the test alone, `1979daa` the files alone); the test not
  tautological; `test/unit/campaign` 105 of 105; the offline verification meets the third criterion.
  - **Nit 1, fixed** (`e7fcef4`): the reference's header and its wingfoil comment name dl-017's fallback: v0.2.2 final
    and no bridge if v0.3 is not released by 2026-10-31. Comments only: the campaign's id is unchanged.
  - **Nit 2, fixed** (`e7fcef4`): `fail_fast` joins the shared pins in the test, so that calibration cannot set it in one
    file only.
  - **Nit 3, fixed:** the Execution notes name both deviations, the worktree's CLI and the archive of the task branch.
  - **Nit 4, fixed:** the notes say the ids quoted are those of the fake-agent copies.
- Re-checked after the fixes: `test/unit/campaign` 105 of 105; `npx tsc --noEmit -p .` 0; `npm run lint` 0.
