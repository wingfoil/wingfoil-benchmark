---
id: task-129-m-r2-v2-m-k3-and-m-k4-the-variance-rule-on-every-page-bug-028-bug-029-bug-030
type: task
title: "M-R2 v2, M-K3 and M-K4, the variance rule on every page (bug-028, bug-029, bug-030)"
status: draft
release: v0.3
wave: W16
features: [F4.4, F4.5, F5.5, F5.7]
acceptance:
  - "scoring.feature#M-R2 v2 compares the interface the entry point exposes"
  - "scoring.feature#Break-even reads the variance on quality and on step cost"
  - "scoring.feature#M-K3 is the one-off cost per scenario version and harness"
  - "results.feature#A difference is marked only beyond the variance"
requirements: [REQ-SCO-05, REQ-SCO-07, REQ-SCO-08, REQ-RES-03]
fixes:
  - bug-028-m-r2-measures-the-file-layout-not-the-public-interface
  - bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance
  - bug-030-the-up-and-down-marks-and-the-headline-counts-flag-differences-within-the-variance
tags: ["v0.3","scoring","results","w16"]
---

## Context

The second W16 task of [plan-005](../../plans/plan-005-release-v0-3.md), after
[task-128](task-128-content-checks-v2-and-the-maintainer-s-rubric-bug-026.md):
[bug-028](../bug/bug-028-m-r2-measures-the-file-layout-not-the-public-interface.md) (M-R2 compares the file layout),
[bug-029](../bug/bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance.md) (M-K3 always zero,
M-K4's "not applicable" ignores the variance) and
[bug-030](../bug/bug-030-the-up-and-down-marks-and-the-headline-counts-flag-differences-within-the-variance.md) (▲/▼
and the headline count differences within the variance). Requirements 1.49 (task-126) state each fix: REQ-SCO-05 and
REQ-SCO-07 (M-R2 v2, the interface resolved from the entry point), REQ-SCO-08 (M-K3 per scenario version and harness;
M-K4 by the approver's reading C, the variance on quality and on step cost), REQ-RES-03 (the variance rule on every
page); experiment design 1.11 §4.2. task-126's Design drafted the scenarios and named the existing tests and source
files this task changes. The approver asked for the W16 tasks in plan-005's order (chat, 2026-11-02). No real-agent
session, no spending; the published values stay as published, and v0.2's re-scoring is W16's last task.

## Acceptance criteria

1. **Red-first, M-R2 v2** (the drafted scenario "M-R2 v2 compares the interface the entry point exposes",
   `scoring.feature` @F4.5): the interface is each name `src/index.ts` exports, followed through re-exports to its
   declaration, one entry `<name>: <signature>` with no file path, as REQ-SCO-07 1.49 states it — `export { a } from`,
   `export *`, `export * as ns`, `.js` specifiers read as `.ts`, extensionless and directory specifiers, a local
   `export { a }` of an import, overloads, `default`, a name re-exported twice once; `(no entry point)`;
   `<file>: (does not parse)`; `(unresolved <specifier>)`; a module the entry point does not reach is not counted.
   Two runs exposing the same functions from different modules have M-R2 1; the same files exposing different
   functions, below 1.
2. **Red-first, the M-R2 version:** `score.json` and `aggregate.json` record M-R2's version (2) with each value; M-R2
   values of different versions are never compared, within an execution or across two (no value, the reason named);
   a stored v1 value reads as version 1 (a `score.json` or aggregate written before this task records none).
3. **Red-first, M-K4 reading C** (the drafted scenario "Break-even reads the variance on quality and on step cost",
   `scoring.feature` @F4.4, every Given of task-126's draft): the ordered cases quality → not measured → never →
   saving within variance → value; each comparison by REQ-RES-03's rule, its runs and `n` per side, its outcome
   recorded (the same, better, worse, within the variance, preliminary, not measured), a "not applicable" its reason;
   per-run step costs (a run with no reached step left out of the step-cost comparison); the value divides M-K3 by
   the difference of the two means compared. The existing @F4.4 scenarios ("Break-even is computed only when quality
   is not worse", "Break-even special cases"), which state 1.15's rule, are replaced by it.
4. **Red-first, M-K3** (the drafted scenario "M-K3 is the one-off cost per scenario version and harness"): per scenario
   version and arm, the configuration's cost (none recorded before W18: 0, so stated) plus the mean setup cost of that
   arm's runs of the version, every model's; `aggregate.json` records it, and `break_even` reads it.
5. **Red-first, the variance rule on every page** (the drafted scenario "A difference is marked only beyond the
   variance", `results.feature` @F5.5): a comparison's outcome is, in order, the same (equal means), better or worse
   (▲/▼) beyond the variance, within the variance (n ≥ 3 a side, ranges overlapping), preliminary (n < 3 a side);
   the last two show their delta and word with no symbol, in the same markup. The headline reads "Against the
   baseline, *arm* is better in *b*, worse in *w*, the same in *s*, within the variance in *v* and preliminary in *p*
   of *n* comparisons across categories …". The landing, category, profile, comparison (`comparison.feature`
   @F5.7), across-agents and parity pages apply it.
6. **The tests task-126 named** change with the rule, not as regressions: REQ-RES-03's headline and marks in
   `test/acceptance/results.test.ts` ("Losses, ties and gaps…" expects ▲/▼ on n = 1 fixtures),
   `test/unit/site/rules.test.ts` and `test/unit/site/build.test.ts`; M-R2's in the scoring tests reading
   `<file>: <signature>`; the break-even tests of 1.15.
7. **The finding note and the method page:** `src/results/finding.ts`'s `breakEvenLine` states the reason and both
   outcomes; `site-content/method.md`'s `#m-k3`, `#m-k4`, `#m-r2` and `#comparisons` state the new rules, with the
   v1 values of M-R2 and the 1.15 break-even of the published executions as an erratum (the figures re-scored by W16's
   last task).
8. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- **M-R2 v2** in the scoring image, `docker/score-image/interface.mjs` (syntax only, the TypeScript the image pins):
  from `src/index.ts` of the final snapshot, a walk over the module graph by specifier (`.js` → `.ts`, extensionless →
  `.ts` or `/index.ts`, `.tsx`/`.mts`/`.cts` as REQ-SCO-05's sources), collecting each exported name with its
  declaration's printed signature (v1's printer reused, no file prefix), a visited set against cycles; `export * as
  ns` one entry for `ns` holding its module's names; the special entries as REQ-SCO-07 1.49 spells them. The image's
  tag follows its content (`src/scoring/image.ts`), so the scorer pin changes and v1 and v2 runs are never paired.
  `src/scoring/interface.ts` keeps its runner; `score.json` gains `m_r2_version: 2` beside the entries.
- **The version in the aggregate:** `src/results/aggregate.ts`'s similarity carries `version`; a pair of runs of
  different versions gives no value with the reason; `mRAcross` (task-094) compares versions too. `AGGREGATE_VERSION`
  becomes 2; the site and the finding read version 1 aggregates as they read them today, so published pages rebuild.
- **M-K3 and M-K4** (`src/results/aggregate.ts`): `m_k3[]` per scenario version and arm (`configuration_eur: 0`,
  `configuration: 'not recorded before F7.5'`, `setup_mean_eur`, `runs`, `value`); `BreakEven` rewritten: `value`
  (a number, `never` or `not applicable`), `reason` (`quality`, `not measured`, `saving within variance`) when not
  applicable, `quality` and `step_cost` comparisons each `{ outcome, baseline: { runs, n, mean, min, max }, arm: … }`
  read with `compare`/`certaintyOf` of `src/results/compare.ts`; the per-run mean step cost. `breakEvenLine` in
  `src/results/finding.ts` reads both shapes.
- **The variance rule:** `src/results/compare.ts` gains the reported outcome, `reported(comparison)`: `same`,
  `better`, `worse`, `within the variance`, `preliminary`, from the stored `outcome` and `certainty` (no stored data
  changes shape); `src/site/rules.ts`'s `headlineSentence` counts the five; `src/site/render.ts` and the comparison,
  profile, across-agents and parity pages render the symbol only for better and worse beyond the variance.
- **Scenarios:** the four drafted in task-126's Design, written into `scoring.feature` and `results.feature` with their
  tests, red first; the two 1.15 break-even scenarios replaced.
- **Not here:** the re-scoring of v0.2's campaigns and the erratum's figures (W16's last task); the configuration's
  cost itself (W18, F7.5).

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
