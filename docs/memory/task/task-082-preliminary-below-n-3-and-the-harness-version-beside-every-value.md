---
id: task-082-preliminary-below-n-3-and-the-harness-version-beside-every-value
type: task
title: "Preliminary below n = 3 and the harness version beside every value"
status: in-progress
release: v0.2
wave: W14
features: [F5.5]
acceptance:
  - "results.feature#Preliminary results are labelled"
requirements: [REQ-RES-03, REQ-SCO-14]
fixes: []
---

## Context

REQ-RES-03 as amended in 1.26 (dl-012, T15), not yet built: today a comparison is preliminary only when a
side has n = 1 (`src/results/compare.ts`).

**Scope:**
- a comparison is preliminary unless both sides have **n ≥ 3**;
- each arm's harness version is shown beside its values on the landing and category pages (T15);
- the harness-against-control comparisons (REQ-SCO-14) follow the same rule.

Before task-083, whose campaign comparison reuses these rules. **Done** means: the scenario's test, amended to the
n ≥ 3 rule, is green; v0.1's published execution re-renders with its comparisons preliminary where n < 3.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `results.feature#Preliminary results are labelled`: **red-first**. The scenario's test exists since W9. It is amended
  to REQ-RES-03 as amended in 1.26, and fails today:
  - a comparison whose sides have n = 2 is labelled preliminary, where today it reads "within variance";
  - each harness arm's version is shown beside its values;
  - the headline says "n < 3" where it says "n = 1".
  The scenario's own words (a single repetition gives a "preliminary" badge and "n = 1") hold as they are.

## Design

**Fixes:** none.

**1. Certainty** (`src/results/compare.ts`):
- `compare` labels a comparison `preliminary` unless both sides have **n ≥ 3**: today it does so only when a side has
  n = 1;
- `beyond variance` keeps its rule (both n ≥ 3, ranges apart), and `within variance` is then the rest at n ≥ 3;
- harness against control (REQ-SCO-14, task-068) uses the same function (`aggregate.ts`'s `controls`), so it follows
  without a change of its own. A test pins it;
- `aggregate.json`'s per-value `preliminary` flag (a single run, experiment design §4.6) is a property of a value, not
  of a comparison: it stays as it is, and `aggregate_version` does not change. The certainty it records for control
  comparisons does change, from the next scoring on.

**2. What the pages say:**
- a value keeps its `preliminary` badge at n = 1. That is REQ-RES-03's unamended "preliminary at n = 1", and the
  scenario's words;
- a comparison that is preliminary while the value has n > 1 already says `preliminary` beside its outcome
  (task-045). With the new rule, that now includes n = 2;
- the headline's parenthesis reads `(preliminary: n < 3 in …)`;
- the landing page's legend reads "a comparison is preliminary unless both sides have n ≥ 3";
- the method page's statement of the rule, if it states it, is updated the same way.

**3. The harness version beside each arm's values** (T15):
- read from the runs' records (`run.json` `harness`): the tool, the version when the record has one (v0.2's do), and
  the commit's first 7 characters, e.g. `wingfoil 12537b6` for v0.1's runs and `speckit 1.1.0 · f1d3a4f` for v0.2's;
- an arm whose runs recorded more than one harness lists each, sorted. That is determinism's "pins differ" case,
  which the page then shows instead of hiding;
- the baseline and the docs controls record no harness and show none;
- **landing page:** under the arm's name in the table's column header, which sits above every value of the arm;
- **category pages:** beside the arm's name, on every line that carries one of its values: the metrics, each suite,
  the hold-out, and "against its docs control";
- the site model's `RunRecord.harness` gains `version`, optional.

**4. Re-rendering v0.1's published execution** ("Done"): `bench site build c82a5e74885b/2` from the task's worktree
(`site/` is git-ignored). The Execution notes say which comparisons become preliminary and that the wingfoil arm reads
`wingfoil 12537b6`. Nothing is published: publishing is plan-004's step 6.

**Tests** (red first, committed apart from the code):
- **Acceptance:** the amended @F5.5 test. The site fixture's stand-ins get a second wingfoil and baseline run in one
  category, whose comparisons must read `preliminary` at n = 2; the wingfoil column's header carries its harness; the
  headline reads `n < 3`.
- **Unit:**
  - `compare` at n = 1, 2 and 3, apart and overlapping;
  - the control comparison at n = 2;
  - the harness label, with and without a version, and with two commits;
  - the headline sentence;
  - the method page's rule, if stated there.
## Execution notes

**WingFoil commands, declared vs observed:** `npx wingfoil memory submit task-082-…` on main (`bde1e21`), after the
Design's own commit (`8369e7a`, W-01): declared backlog → in-progress; observed `{"from": "backlog", "to":
"in-progress"}`, exit 0, one `wf(task): submit …` commit (W-14).

**Build** on `task/task-082` (worktree `../WingFoil2-Benchmark-wt/task-082`, its own `npm ci`):
- red first:
  - `4509b8c` amends the @F5.5 acceptance tests. The headline reads `n < 3`. A dedicated site of TC has two runs a
    side, the wingfoil runs recording `wingfoil 0.2.2` at `12537b6`, and must read `preliminary` with the harness
    beside wingfoil.
  - It also adds unit tests for `compare` at n = 1, 2 and 3, the control comparison at n = 2 (`aggregate.test.ts`,
    whose `within variance` at n = 2 is amended), `harnessLabel`, the headline and the method page's rule. All of them
    failed for the expected reasons.
- `44a5054` holds the implementation and `site-content/method.md`'s `#preliminary`, `#headline` and
  `#beyond-variance` paragraphs.
- Checks, run niced with 2 workers: `tsc` and `npm run lint` are clean; `test/unit` and `test/acceptance` are green
  (1483 passed, 8 skipped).

**v0.1's published execution re-rendered** ("Done"): `npm run build`, then `node dist/cli/main.js site build
c82a5e74885b/2` in the worktree (`site/` is git-ignored, nothing published), giving 17 pages.
- C (S1, n = 3 a side) keeps its four comparisons `within variance`.
- D, E and F (n = 1) were already preliminary. Their headline parenthesis now reads `(preliminary: n < 3 in D, E and
  F)` for both arms.
- No v0.1 comparison has n = 2, so none changes certainty.
- The wingfoil column and every wingfoil line read `wingfoil 12537b6`. v0.1's runs recorded no harness version, only
  its commit.

**Decisions taken in the build, inside the Design:**
- The value badge stays at n = 1 (REQ-RES-03's unamended "preliminary at n = 1", and the scenario's words). A
  comparison at n = 2 says `preliminary` beside its outcome, as task-045 made a preliminary comparison of a value with
  n > 1 say.
- The method page does not describe the harness label. No anchor is added, since `method-statements.test.ts` registers
  every anchor with its source, and the label is shown where it applies.

## Review notes

### Review

**Round 1** — a fresh independent read-only agent (`Plan` subagent), on `4181118`. Verdict: not clean (three
should-fix). All fixed in `d1d329e`; their tests were written with the fixes, each failing on the code before it:
1. should-fix: v0.1's runs recorded only a commit, so its pages showed no version although its campaign pins
   `v0.2.2` → **fixed**: a run without a recorded version takes its arm's pin from the execution's `campaign.yaml`,
   unless the pin is a commit (`wingfoil v0.2.2 · 12537b6` for v0.1; v0.2's runs record the pin itself). A departure
   from the Design's "version when the record has one", taken because T15 asks for the version.
2. should-fix: a stored harness-against-control certainty was shown as recorded, so an aggregate written before this
   task kept "within variance" at n = 2 → **fixed**: the site reads it with the current rule (`certaintyOf`, the one
   `compare` uses), as REQ-RES-02 as amended treats labels as presentation.
3. should-fix: slice lines showed no harness → **fixed**: labels come from every group, slices included.
4. nit: the chart legend → **fixed**: `wingfoil (wingfoil 0.2.2 · 12537b6)`.
5. nit: the method page did not say the labels are presentation → **fixed** in `#preliminary`.
6. nit: the method-statements sources → **fixed** for `beyond-variance`, `preliminary` and `headline`.
7. nit: three comments → **fixed**.
8. nit: thin coverage → **fixed**: every wingfoil line labelled, none on the baseline, the legend, the pin fallback
   and the control's recomputed certainty.
9. nit: no style for `.harness` → **fixed**, the smaller size of its neighbours.

