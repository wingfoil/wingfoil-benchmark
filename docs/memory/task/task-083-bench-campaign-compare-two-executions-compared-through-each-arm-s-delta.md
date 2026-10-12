---
id: task-083-bench-campaign-compare-two-executions-compared-through-each-arm-s-delta
type: task
title: "bench campaign compare: two executions compared through each arm's delta"
status: in-review
release: v0.2
wave: W14
features: [F5.2]
acceptance:
  - "comparison.feature#Two campaigns are compared through each arm's delta against its own baseline"
  - "comparison.feature#A comparison across models is marked"
  - "comparison.feature#A group whose scenario changed is not compared"
  - "comparison.feature#Only aggregated campaign executions can be compared"
requirements: [REQ-SCO-13, REQ-CLI-12]
fixes: []
---

## Context

F5.2, the command and the comparison record.

**Scope:**
- `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>` (REQ-CLI-12): earlier, then newer, as the maintainer
  orders them; writes `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json`; refuses a dry run, an unaggregated
  execution, the same execution twice;
- REQ-SCO-13: group by group (scenario version and arm present in both), each side's value, each arm's delta against
  its own execution's baseline, and the change of that delta (T7); differing pins listed; **cross-model** rows
  (T14); a changed scenario hash is not compared; ranges and certainty as REQ-RES-03 (task-082); tokens read as
  task-069 recorded them.

**Done** means: the four scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

All four are **red-first**: nothing compares two executions today, and `bench campaign compare` does not exist.
- `comparison.feature#Two campaigns are compared through each arm's delta against its own baseline`
- `comparison.feature#A comparison across models is marked`
- `comparison.feature#A group whose scenario changed is not compared`
- `comparison.feature#Only aggregated campaign executions can be compared`

## Design

**Fixes:** none.

**1. The command** (REQ-CLI-12): `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>`.
- The first execution named is the earlier one, the second the newer, as the maintainer orders them.
- `main` dispatches it before the campaign verbs that take a file.
- It writes `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json`. Its stdout gives:
  - the file;
  - how many groups were compared and how many were not;
  - `cross-model` when that applies;
  - each pin that differs.
- It exits 0.
- **Refusals, each naming what was given, exit 1:**
  - a target not of the form `<campaign-id>/<n>`, or `dry-runs/<n>`: "a dry run is never compared";
  - an execution that does not exist;
  - one with no `aggregate.json`: "is not aggregated: score it first";
  - the same execution twice.
- A wrong number of arguments is a usage error, exit 2.

**2. The comparison** (REQ-SCO-13), a pure function in `src/results/campaign-compare.ts` over the two executions'
committed files:
- `aggregate.json`;
- `campaign.yaml`, for the pins;
- each group's runs' `run.json`, for the scenario hash and the harness;
- the scenario's primary category, from `scenarios/` (the category map, REQ-RES-03).

**3. Groups:**
- A group is a scenario version and an arm present in both executions.
- The default model's groups are compared with each other. Each slice is compared with the other side's slice of the
  same model; a slice without one is listed as not compared, saying "no slice of model *m* in *execution*".
- A scenario version whose recorded hash differs is not compared. Its groups read
  `not compared: scenario hash <earlier> in <earlier execution>, <newer> in <newer execution>`.
- A scenario version or an arm present on one side only is listed under `only_in`, so that nothing disappears
  silently.

**4. Each compared row**, for each metric of the scenario's primary category's map (`CATEGORY_MAP`, as the site
reads it). A harness arm and its docs control are both arms here, each against the baseline; the baseline itself has
no delta. For each side:
- the arm's and the baseline's values (`n`, `mean`, `min`, `max`);
- `delta`, the arm's mean less its own execution's baseline's (T7);
- `certainty` of that delta, by REQ-RES-03 as amended (`certaintyOf`, task-082).

Then `change`, the newer delta less the earlier. The range is meaningful from n = 3 and is shown by the site from
there (task-084). A metric a side does not measure reads "not measured".

**5. Cross-model and pins:**
- `cross_model: true` on every default row when the two executions' default models differ (T14); a slice row is
  never cross-model, since it pairs the same model.
- `pins_differ` lists, by name, the pins whose values differ, read from each `campaign.yaml`:
  - `models.default`;
  - `agent.version` (and `agent.name`);
  - `agent.effort.<model>`;
  - `harnesses.<arm>` (tool, version, commit).

**6. The file:**
- top-level fields: `comparison_version: 1`; `earlier` and `newer`, each with campaign, execution, default model and
  the date it ended (from `execution.json`, when present); `order: "maintainer"`, the maintainer's order, as REQ-CLI-12
  asks it be recorded;
- the comparison's contents: `pins_differ`, `rows`, `not_compared`, `only_in`;
- written with sorted keys, groups in scenario order then arm order, so that the same two executions give the same
  bytes (REQ-NFR-05).

**7. Not here:** the comparison page and the landing page's link (task-084); tokens, which no metric of the category
map reads, so task-069's recording is untouched.

**8. Done, checked by hand:** `bench campaign compare c82a5e74885b/1 c82a5e74885b/2`, the two aggregated executions
of v0.1's reference campaign. The Execution notes record the result.

**Tests** (red first):
- acceptance, `test/acceptance/comparison.test.ts` (new): the four scenarios, over executions built with the
  stored-run fixtures and scored.
- unit: target parsing and refusals; the row arithmetic (`delta`, `change`, `certainty` at n = 1 and 3); a slice with
  and without a counterpart; `only_in`; `pins_differ`; same bytes twice.
## Execution notes

**WingFoil commands, declared vs observed:** `npx wingfoil memory submit task-083-…` was run on main (`cfa26d9`), after
the Design's own commit (`4f2c90d`, W-01). Declared: backlog → in-progress. Observed: `{"from": "backlog", "to":
"in-progress"}`, exit 0, and one `wf(task): submit …` commit (W-14).

**Build** on `task/task-083` (worktree `../WingFoil2-Benchmark-wt/task-083`, its own `npm ci`):
- red first:
  - `480299a` adds the four acceptance scenarios in the new `test/acceptance/comparison.test.ts`. They build two scored
    executions of TC with the stored-run fixtures.
  - `296c647` adds the unit tests. All of them failed for the expected reasons: the command does not exist, and
    neither does `compareExecutions`.
  - The unit tests then gained a `primaryOf` argument. The module boundary forbids `results` from importing
    `scenario` (`eslint/module-boundaries.js`), so the command line passes the scenario's primary category as a
    function. The tests do the same with `loadScenario`.
- `a74dce6` holds `src/results/campaign-compare.ts`, `src/cli/compare.ts` and the README. The usage text changed, so
  the two tests that pin it were updated in the same commit.
- Checks, run niced with 2 workers: `tsc` and `npm run lint` are clean. `test/unit` and `test/acceptance` are green:
  1494 passed, 8 skipped.

**Done, by hand:** `bench campaign compare c82a5e74885b/1 c82a5e74885b/2`, the two aggregated executions of v0.1's
reference campaign. It ran from the built CLI in a scratch copy of `results/c82a5e74885b` and `scenarios/`, so that
no comparison was left in the repository's `results/`.
- Output: exit 0, `9 groups compared, 0 not compared` (13 after review round 1, which counts the baselines'), no pin
  differs (the same campaign file), 14 rows, nothing `only_in`. After round 1 the opus slice of S1 reads `no baseline
  in c82a5e74885b/1 and c82a5e74885b/2`: v0.1's slice ran wingfoil only.
- On S1 (n = 3 a side) wingfoil's M-Q1 delta goes from 0.6404 to −0.0141, a change of −0.6545, `within variance`.
- Execution 1 is the one bug-013 describes, with two systematic failures at S1 step 03. A large change there is
  expected.
- The other scenarios are n = 1: preliminary.

**Decisions taken in the build, inside the Design:**
- The primary category comes in as `primaryOf`, as above.
- The file's keys follow the order the code builds them in, not a sort, which is just as deterministic. The unit test
  checks the same bytes twice.
- `groups compared` on stdout counts the distinct scenario, arm and model of the rows. The baseline has no row of its
  own.

## Review notes

### Review

**Round 1** — a fresh independent read-only agent (`Plan` subagent), on `58b5fcd`. Verdict: not clean (seven
should-fix). Red tests `3cea613` (hand-built aggregates, fast), fixes `1c5e534`:
1. should-fix: M-E1 compared where the site says "not comparable" → **fixed**: the site's words, per side, and the
   deltas now by `compare()`.
2. should-fix: the hash read from one run, and two unreadable hashes counted as equal → **fixed**: every run of the
   scenario version on each side; compared only with one hash a side, the same; `unknown` named.
3. should-fix: slice groups on one side vanished → **fixed**: `only_in` carries `model` and lists them.
4. should-fix: a scenario without a category map or unreadable vanished → **fixed**: `not compared`, saying which.
5. should-fix: an unreadable `campaign.yaml` read as no pins → **fixed**: refused; so are an unreadable
   `execution.json` and an aggregate of another shape (finding 10).
6. should-fix: a missing baseline read "not measured" → **fixed**: `no baseline in <execution>`.
7. should-fix: the same-bytes test could not fail → **fixed**: two comparisons, compared byte for byte; row
   arithmetic, pins and `only_in` both ways tested.
8. nit: stdout counted rows' groups and read cross-model from rows → **fixed**: `compared` lists every group compared,
   baselines included, and cross-model is the default models'.
9. nit: pins → **fixed**: `models.slices` and `arm_digests.<arm>` added.
10. nit: aggregate shape and execution record → **fixed** with 5.

**Round 2** — a fresh independent read-only agent, on `fe1f69d`; it also ran the command on scratch copies of the
real executions (`c82a5e74885b/1` vs `/2`, `c82a5e74885b/2` vs `d032e3e98de3/1`, `c82a5e74885b/1` vs `d032e3e98de3/1`).
Verdict: not clean (two should-fix). Red tests `9a71ee2`, fixes `5fd3986`:
1. should-fix: two unknown hashes still matched → **fixed**: an unknown hash is never compared; tested with both sides
   unknown.
2. should-fix: a row with a note dropped both sides' figures, which task-084's page needs → **fixed**: each side is
   its own — a delta, or `{ note, arm? }` keeping the arm's value — and `change` only when both have a delta.
3. nit: stdout counted groups with no row as compared → **fixed**: `N groups matched, R rows compared, K not compared`.
4. nit: no test for both hashes unknown → **fixed** with 1.
5. nit: `NotCompared`'s comment → **fixed**: it names slices with no counterpart too.
6. nit: a cross-model row named the earlier model only → **fixed**: `<earlier> → <newer>`, as `compared`.
7. nit: one unaggregated execution twice was reported three times → **fixed**: "the same execution twice", once,
   before anything is read.

v0.1's comparison after round 2: `13 groups matched, 12 rows compared, 0 not compared`; the opus slice's two rows
keep wingfoil's values beside `no baseline` on each side.

**Round 3** — a fresh independent read-only agent, on `c4d0635`: the round-2 fixes correct, the file deterministic,
the acceptance assertions still matched. Verdict: not clean, four nits only, all **fixed** in `c9a529d` (their tests with
the fixes):
1. `dry-runs/1 dry-runs/1` said "the same execution twice" → what a target is is checked first.
2. stdout left rows with a note out → `N groups matched, R rows with a change, S rows without, K groups not compared`.
3. an arm with no M-E1 figures against a baseline not comparable read "no comparison" → `not measured`, the site's
   order.
4. the README did not say what a side without a delta records, nor the other reasons not to compare → one sentence
   each.

**Round 4**: a fresh, independent, read-only agent, on `c9a529d`. It verified the four round-3 fixes, including
`sideOf`'s order against the site's `metricRow`, case by case. Verdict: clean, with two wording nits, both **fixed** in
`794892c`:
1. the README now says that a side without a delta keeps the arm's value only when the arm has one;
2. a comment in `sideOf` now limits its claim to "once there is a baseline".

**Round 5**: a fresh, independent, read-only agent, on `794892c`, which changed wording only. It checked both
statements against `sideOf` and found nothing. Verdict: clean, no findings.

### Full suites

`scripts/full-suites.sh task/task-083` on 2026-10-12, at the approver's request ("Avvia la suite"), on `d19cffb` (the
in-review submit), worktree clean: `LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0`. `npm test` 1507 passed, 8 skipped, statement
coverage 97.65 %; `test:bin` 8/8; `test:docker` 20 passed, 2 skipped. Log:
`.cache/full-suites/2026-10-12/task_task-083-d19cffb-121811.txt`. The commit after it adds only these notes.

**WingFoil command, declared vs observed:** `npx wingfoil memory submit task-083-…` on the branch: declared
in-progress → in-review; observed `{"from": "in-progress", "to": "in-review"}`, exit 0, one `wf(task): submit …`
commit (`d19cffb`). No task was `in-review` on main or on a task branch before it.

