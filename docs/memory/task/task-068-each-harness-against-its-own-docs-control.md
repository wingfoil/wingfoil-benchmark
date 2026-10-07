---
id: task-068-each-harness-against-its-own-docs-control
type: task
title: "Each harness against its own docs control"
status: in-progress
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-SCO-14, REQ-RES-03]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

Split from [task-067](task-067-docs-control-per-harness-and-harness-against-its-control.md) by the approver in chat on
2026-10-06 ("Dividere"): task-067 delivers the speckit-docs control and the harness setup pages, which W12's "Ends
with" needs; this task delivers the comparison that uses the controls, before v0.2's calibration (W13).

**Scope:**

- **each harness arm compared with its own docs control** (REQ-SCO-14, T3), metric by metric and by the same rules as
  the comparison with the baseline; the aggregate stores it with both groups' runs. The pairing comes from the docs
  control's `docs_of`, recorded where the aggregator can read it (the runs or the aggregate), since today it reads only
  what the execution committed;
- **the category pages** (REQ-RES-03 as amended in 1.26) show each harness against its control beside the comparison
  with the baseline; an aggregate written before this task reads "not measured";
- the method page's comparisons paragraph names the second comparison.

It serves F7.1, but `features` stays empty: no `competitors.feature` scenario states this comparison, and a task that
names a feature and no scenario would require every scenario of the feature (traceability per scenario, task-064).

**No real agent, no spending.** **Done** means: an execution with a harness and its docs control shows the comparison
in its aggregate and on its category pages; v0.1's published execution still builds, reading "not measured".

## Acceptance criteria

- The aggregate and the category page hold each harness against its control. **Red-first.**
- An older aggregate still builds its site, the comparison "not measured". **Characterization.**

## Design

### The pairing, recorded by the run

A docs control's `run.json` records **`docs_of`**, the harness arm its environment was generated from (REQ-RUN-11).
The aggregator reads only what the execution committed, so the pairing is read from there. A run that does not
record it, such as v0.1's baseline-docs runs, pairs with nothing, and its comparison reads "not measured".

### The comparison rules move down to `results`

The category map and the comparison rules move from `src/site/rules.ts` to a new `src/results/compare.ts`:
`MetricId`, `Better`, `MapEntry`, `CATEGORY_MAP`, `Figures`, `Summary`, `Outcome`, `Certainty`, `readMetric`,
`summarize` and `compare`. `site/rules.ts` re-exports them and keeps the sentences: the headline, "not covered",
the formats. Two reasons:

- REQ-SCO-14 has the aggregate store this comparison, and `results` sits below `site`;
- W14's campaign comparison (REQ-SCO-13) reads the same map and rules.

The rules themselves do not change. So "by the same rules" (REQ-SCO-14) is the same code.

### The aggregate: `controls`

`aggregate.json` gains an optional `controls`, so `aggregate_version` stays 1 and a v0.1 aggregate still reads. It
holds one entry per default-model group of a docs control that records `docs_of`, when its harness arm has a group
on the same scenario version and model. Slices are left out, as the site's comparisons are.

```json
{ "scenario": "S8", "version": "1.0", "model": "…", "harness": "wingfoil", "control": "baseline-docs",
  "runs": { "harness": ["…"], "control": ["…"] },
  "metrics": [ { "metric": "M-Q1", "outcome": "same", "delta": 0, "certainty": "preliminary",
                 "harness": { "n": 1, "mean": 1, "min": 1, "max": 1 },
                 "control": { "n": 1, "mean": 1, "min": 1, "max": 1 } } ] }
```

- `metrics` holds every metric of the category map (M-Q1, M-K1, M-D3, M-E1, M-F1) that both groups measure.
- A metric one side cannot compare (M-E1 not comparable) is left out with its note: `{ "metric": "M-E1",
  "note": "not comparable: …" }`.
- The harness is the compared side, its control the reference, as the baseline is for every arm.
- Entries are in the site's order: scenario, version, harness.
- The aggregate is still deterministic: the same execution gives the same bytes.

### The site

- **Category pages (REQ-RES-03 as amended in 1.26).** Under each metric, a harness arm's line gains a second
  value, "against <control>", with the same delta, outcome and certainty markup as the comparison with the
  baseline. A harness arm that ran in the execution with no `controls` entry reads "against its docs control: not
  measured". A harness arm is one whose runs recorded a `harness` (the site model's records).
- **The landing page and its headline are unchanged:** the headline counts comparisons with the baseline only. A
  second headline is not in REQ-RES-03.
- **The method page:** the comparisons paragraph (`{#comparisons}` or the one that states the comparison rule)
  names the second comparison. Its statement test gains the source REQ-SCO-14.

### Tests

- **unit:**
  - `compare.ts` moved, with its tests;
  - the aggregate's `controls`, including no `docs_of`, no harness group, a slice, and M-E1 not comparable;
  - the run records `docs_of`;
  - the category page shows "against" lines, and "not measured" for an old aggregate.
- **acceptance:** the two criteria.
- `test:bin`: the site's file list is unchanged.
- `test:docker`: the run records `docs_of` (W3's test).

## Execution notes

- `npx wingfoil memory add --type task --title "Each harness against its own docs control"`. Declared: creates the
  element from the template and commits it. Observed: `wf(task): add task-068-each-harness-against-its-own-docs-control`,
  `status: draft`. Matches.
- `npx wingfoil memory submit task-068-…` (backlog → in-progress), after the Design commit. Declared: moves the task
  to its next state and commits it. Observed: `wf(task): submit task-068-…`, `status: in-progress`. Matches.
- Build, test first:
  - **the aggregate:** red (the four `controls` tests), then the comparison rules moved to
    `src/results/compare.ts` and `controlComparisons`. One red test was wrong on its own: `undefined` passed to a
    parameter with a default takes the default. It now uses `null`.
  - **the run:** red (`docs_of` in run.json), then the runner records it.
  - **the site:** red (the category page, the older aggregate), then the model's `against` and the page's line.
    - The site's fixture runs record no `harness`; real ones do (REQ-RUN-14). The two site tests add it to the
      wingfoil runs, rather than changing the shared fixture that the method tests read.
  - **the method page:** `{#harness-against-control}` and its statement's sources.
  - **the W3 Docker test:** asserts `docs_of`.
- Lint found an unused import left by the move (fixed in b5508b8).
- Review round 1 fixes:
  - the site checks every field of `controls` it prints, and escapes `outcome` and `certainty`;
  - the headline test reads `index.html` and the stdout sentence;
  - the M-E1 note names each run with its arm;
  - a control group whose runs disagree on `docs_of` pairs nothing;
  - an ordering test with two harnesses;
  - method.md no longer lists only two harnesses.
- **v0.1's published execution** (`c82a5e74885b/1`), built from a `git archive` of this branch with its CLI:
  17 pages. The headline is the same as main's CLI gives. Only the category pages C–F differ: they gain "against its
  docs control: not measured" under each wingfoil value (6 lines).
- The first full `test:docker` run was stopped together with a duplicate suite chain that shared the worktree's
  coverage directory (my mistake: a `nohup` chain left running). Its dry-run container
  (`bench-dry-3d36656b8281-…`, the W7 test's) stayed up and failed the next run's W7 and W8 tests. It was removed,
  and `test:docker` ran again alone.

## Review notes

Independent read-only agents reviewed `git diff main...HEAD` against the Design, REQ-SCO-14 and REQ-RES-03 as
amended in 1.26.

- Round 1 (b5508b8): design coverage met; the direction is right (delta = harness − control); no blocker.
  - Should-fix:
    1. `controls` read from the file was not validated, and `outcome`/`certainty` were printed unescaped;
    2. the headline test asserted on stdout for a string it never holds;
    3. the M-E1 note did not say which side's `r1` was meant.
  - Nits:
    4. two docs controls of one harness: only the first is shown;
    5. a group with mixed `docs_of` was decided by its first run;
    6. v0.1's execution was not built;
    7. method.md named only two harnesses;
    8. the determinism test was weak on ordering.
  - Fixed in f1016b0: 1, 2, 3, 5, 6 (recorded above), 7 and 8.
  - Item 4 was left: REQ-RUN-11 as amended has one docs generator per harness.
- Round 2 (f1016b0): every fix verified. The shape accepts what the aggregator writes, and nothing is
  double-escaped. **Clean.**
