---
id: task-035-check-format-and-content-checks
type: task
title: "Check format and content checks"
status: draft
release: v0.1
wave: W8
features: []
acceptance: [scoring.feature, scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-03, REQ-SCO-06, REQ-FMT-07]
---

## Context

First task of wave **W8 — Continuity and governance** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
whose "Ends with" is "S3 and S8 scored". It delivers the first half of F4.8 (tool-neutral governance
metrics): **the format of a check and the content checks** of REQ-SCO-06. The feature is declared by
[task-037](task-037-directive-checks-and-tool-neutral-governance-metrics.md), which completes it (as
task-016/task-024 left a feature to the task that finishes it).

Today `oracle.checks` is a list of paths (`src/core/scenario.ts`) that nothing reads, and no requirement
says what a check file holds. S2@1.0 declares `checks: []`: the approver decided on 2026-09-29 (task-033,
a change to W7 decision 6) that **F4.8's task writes S2's two checks and their format into S2@1.0**. S2
is registered only after calibration (W7 decision 3), so that is not a new version.

Scope:

- **The check format**, one file per check under `oracle/`, outside every suite (the loader rule), with
  at least a kind, the steps it applies to, and its body. Two kinds here:
  - **`content`** — REQ-SCO-06 as written: case-insensitive patterns matched against the git-tracked
    text files changed in the step and the step's commit messages; never a harness's path or format;
  - **`unchanged`** — named files (or ranges) **of the seed** that must be byte-identical after a step.
    Seed paths are the scenario's, not a harness's, so it stays tool-neutral. It exists for S2's false
    report (S2.md §6: "the related code was not changed"), the approver's choice at W8 planning.
  - Room for task-037's AST and dependency kinds (REQ-SCO-05) without a format change; their bodies are
    task-037's.
- **The loader and the validator:** each check file parsed and validated (unknown kind, empty patterns,
  a step the scenario lacks, an `unchanged` path absent from the seed); the check files are oracle
  material for the leak scan (REQ-FMT-08) — every quoted string of 8+ characters in a check is an
  oracle literal, so patterns must not appear in prompts or seed.
- **Scoring:** `bench score` runs each check on its steps' snapshots, in the scoring container
  (REQ-SCO-01: read-only oracle, no network), deterministically (REQ-SCO-03); results in `score.json`
  per check and step, pass or fail with what matched (file or commit), never a hold-out name. A `not
  reached` step is reported as such. `score.json`'s version and task-034's reader schema follow.
- **Aggregation:** check results join `aggregate.json` in task-034's `Value {n, runs, …}` shape
  (REQ-FMT-07), per check.
- **S2's two checks** in `scenarios/S2/1.0/oracle/`: the duplicate (content, step 3) and the false
  report (unchanged, the related seed code). `bench scenario validate S2@1.0 --holdout …` stays green.
- **Requirements 1.12:** REQ-SCO-06 gains the file format and the `unchanged` kind; REQ-FMT-04 names the
  check file. A review decision recorded with the approver's reason.

Out of scope: AST and dependency checks, M-E1 (task-037); S3's D3 check (task-036 writes it in this
format); M-F1 (F4.7, W9 — W8 decision 3).

**Done** means: a check file is validated and scored per step into `score.json` and aggregated; S2@1.0
carries both checks and still validates and scores; requirements amended; tests, coverage, lint pass.

### W8 plan-phase decisions (proposed; accepted by the approver at pending → backlog)

1. **Four tasks, in this order, infrastructure just before its first use** (the approver's choice,
   2026-09-29): task-035 check format and content checks (with S2's two); task-036 S3 multi-session
   evolution scenario (F6.3), whose D3 revision is a content check; task-037 directive checks and M-E1
   (REQ-SCO-05, declares F4.8); task-038 S8 directive compliance scenario (F6.8). The wave's "Ends
   with" holds after task-038, and the wave check is made once, then.
2. **S2's false-report check is a second kind, `unchanged`**, on the seed's own paths (the approver's
   choice, 2026-09-29), rather than dropping it for the outcome half alone. REQ-SCO-06 is amended.
3. **W8 delivers the D3 content check, W9 computes M-F1** (the approver's choice, 2026-09-29). The
   `scoring.feature` @F4.8 scenario "Governance checks do not depend on a harness's format" is
   implemented on D3's content-check result in `score.json` — recorded in a WingFoil decision-log in
   one run, in a plain notes file in the other, consistent in both. M-F1 (outcome plus content, the
   share of D1–D5) is F4.7's, W9; the @F4.7 scenarios stay W9's.
4. **The content tasks follow `scenario-authoring`** from goal to validate, as W7's did. **`calibrate`
   and `register` are calibration's** (plan-003 step 3): S3@1.0 and S8@1.0 stay changeable until then.
5. **The wave check and the `scenarios.feature` outline run on the fake agent**, which replays each
   scenario's reference solution, in a temporary repository, as W7's did: S3 and S8 validated,
   dry-run and scored in the three arms, with M-E1 and the checks in `score.json` and the aggregate.
   **No real-agent half** (`real-agent-check` not taken) and **no spending in W8.** The fake replays
   the same commands in every arm, so S8's compliance difference between arms is not shown here: that is
   calibration's and the campaign's.
6. **Hold-out content** (S3's boundary tests and mixed overlap matrix; S8's functional edge cases and
   check variants) is written only in `WingFoil2-Benchmark-HoldOut`, under suite ids, as siblings of the
   public suites; this repository records counts and the hold-out commit. Reference solutions are
   public (S3's and S8's oracles are, unlike S2's answer key), in `test/fixtures/reference/`.
7. **What W7 learned applies to S3 and S8** (rel-v0-1, W7 "Due before"): no quoted oracle string that
   the API or the seed also uses; `scenarios/*/*/` outside prettier; Node 22's `--test` with a glob and
   native type stripping for a seed with no install; the local scoring double and `referenceScript`
   serve both; `READY` in the outline test gains S3 and S8.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- REQ-SCO-06 — a content check passes when a pattern matches a text file changed in the step or the
  step's commit message, case-insensitively, and fails otherwise. **red-first**
- REQ-SCO-06 as amended — an `unchanged` check fails when a named seed file changed in the step.
  **red-first**
- REQ-SCO-06 — a check never matches on a path or a harness's file format: the same content in a
  WingFoil decision-log and in a plain notes file both pass. **red-first**
- REQ-FMT-04 / REQ-FMT-08 — an invalid check file is refused by `bench scenario validate`, naming it;
  a check's pattern quoted in a prompt is a leak. **red-first**
- REQ-SCO-03 — scoring the same run twice gives the same `score.json` bytes with checks. **characterization**
- REQ-FMT-07 — check results in `aggregate.json` with their runs and `n`. **red-first**
- S2@1.0 validates with its two checks and scores in the three arms; `scenarios.feature` @F6.2 stays
  green. **characterization**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
