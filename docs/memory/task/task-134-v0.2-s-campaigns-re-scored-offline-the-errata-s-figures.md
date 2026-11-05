---
id: task-134-v0.2-s-campaigns-re-scored-offline-the-errata-s-figures
type: task
title: "v0.2's campaigns re-scored offline: the errata's figures"
status: approved
release: v0.3
wave: W16
features: [F4.5, F4.7, F4.4]
acceptance: []
requirements: [REQ-SCO-06, REQ-SCO-07, REQ-SCO-08]
fixes: []
tags: ["v0.3","results","w16"]
---

## Context

The last W16 task of [plan-005](../../plans/plan-005-release-v0-3.md), its "Ends with": v0.2's campaigns re-scored
offline from what their runs stored, at no spending. W16's tasks changed the method
([task-128](task-128-content-checks-v2-and-the-maintainer-s-rubric-bug-026.md) content checks v2,
[task-129](task-129-m-r2-v2-m-k3-and-m-k4-the-variance-rule-on-every-page-bug-028-bug-029-bug-030.md) M-R2 v2, M-K3,
M-K4 and the variance rule) and left the published values as published, with errata whose figures this task counts.
The approver's choices (chat, 2026-11-04): A, every execution of the site's catalogue (all scored before requirements
1.49, campaign-008 included); B, a script that writes nothing under `results/` and a versioned report, its figures
then added to the errata; C, no hold-out (none of these figures reads it); D, the site neither rebuilt nor published
here (the variance rule is presentation; rebuilding and publishing are the approver's).

## Acceptance criteria

1. **`scripts/rescore.mjs`** reads each catalogue execution's stored runs and writes nothing under `results/`; it
   runs no agent, no Docker and no hidden test, and spends nothing. Its output, by execution:
   - **content checks:** each S2@1.0 and S3@1.0 run's step re-read under the matching 1.1 version's v2 check
     (`duplicate`, `d3-revision`; the agent's own text as REQ-SCO-06 1.49 reads it), against the run's published v1
     verdict: the runs whose verdict changes, each way, and why (the v1-only matches' strings);
   - **M-R2 v2:** each group's final snapshots rebuilt from their stored patches, their interface read by the scoring
     image's `interface.mjs --v2` run locally with Node, M-R2 v2 beside the published v1 value;
   - **M-K3 and M-K4:** recomputed from the published `score.json` files with task-129's functions, beside the
     published 1.15 entries: each arm's value or reason under each rule.
2. **The report** `docs/calibration/v0.3-rescore.md`: the script's command and output, figures quoted from it, never
   typed by hand; deterministic (two runs give the same bytes).
3. **The errata** carry the figures: the method page's `#content-checks-v1-erratum` (its "added here"),
   `#m-k4-erratum` and `#m-r2`'s erratum; each catalogue note that points to them unchanged unless a figure belongs
   there.
4. **Tests** for the script's three readings on fixtures (a stored run whose v1 verdict differs from v2; a group whose
   M-R2 v1 and v2 differ; an M-K4 entry whose reason changes), and that it writes nothing under `results/`.
5. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review (dl-020); the full suites on
   the approver's go.

## Design

- `scripts/rescore.mjs`, Node, importing the built modules (`dist/`): `scoreChecks` with the 1.1 checks loaded by
  `loadScenario`, each run's stored `steps/<NN>/` and `setup/diff.patch`; the snapshots rebuilt as scoring rebuilds
  them (`src/scoring/snapshot.ts`) into a temporary directory removed after; `interface.mjs --v2`; `breakEvenEntry` and
  `mK3Of` over the runs' `score.json`. Executions and runs in path order, so its output is stable.
- `docs/calibration/v0.3-rescore.md`: one section per reading, a table per execution, the command line.
- `site-content/method.md`: the three errata extended with the totals; their method-statement sources.
- No change to `results/`, `site/`, campaign files or scenario versions.

## Execution notes

- **The script**, `scripts/rescore.mjs`, imports the built modules (`dist/`): `loadScenario`, `scoreChecks`,
  `rebuildSnapshots`, `addedText`, `breakEvenEntry`, `mK3Of`; `interface.mjs --v2` run with Node on each rebuilt final
  snapshot, in a temporary directory removed after. The paths are made absolute (git applies a run's patches from
  inside the rebuilt repository). A whole run takes several minutes; two runs gave the same bytes (`cmp`), and
  `git status --porcelain -- results` is empty after.
- **Its figures** (the report's Totals, quoted): content checks, 100 run-steps of S2 and S3 at 1.0, 8 pass under both, 4
  under v1 only, 0 under v2 only, 88 under neither, the 4 all S3's D3 revision ("changed" inside "unchanged" twice,
  "revis" inside "revisit", "replaces" in a WingFoil template comment copied into a new record by `memory add`, which v2
  leaves out as a setup line); M-R2, 64 groups, v2 lower in 6, the same in 31, higher in 27; M-K4, 88 entries, 16 change
  their value or its kind and 5 more stay not applicable for another reason. The method page's three errata carry them,
  with a link to the report.
- **Deviation:** the tests are in `test/bin/rescore.test.ts`, not under `test/unit/`: the script reads `dist/`, which
  only the bin tests build first. They read one published execution in place (`81ebb2691f9c/1`) instead of fixtures —
  a check verdict that changes, a group whose M-R2 changes, an M-K4 entry that changes — and check that `results/` is
  unchanged after. Written after the script (red-first not shown).
- **Deviation, `vitest.bin.config.ts`:** `pre-review`'s `test:bin` stage failed with `bench.test.ts` and this task's
  test building `dist/` at once (a module missing mid-import); the bin tests now run one file at a time
  (`fileParallelism: false`), each building first; green after.
- Catalogue notes left as they are: none of these figures belongs to one execution's note.
- `wingfoil memory add`, `submit` (draft → pending, backlog → in-progress): as declared.
- **Full suites** (2026-11-04, `8093499c`, under the load watcher): LINT 0, TEST 0 (2055 passed, 10 skipped), BUILD 0,
  BIN 0 (12 passed, this task's included), DOCKER 0.

### Review

**Round 1** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review1-134-L8Ea`, a clone of `79a2cf88`; no
command in either checkout). It re-ran the script (the same bytes as the report, `results/` clean after), compared
each reading with the scorer and the aggregate (the runs compared, the pairing, M-K3 across models), and spot-checked
the four changed content-check rows in their stored patches. No blocker; one should-fix and four nits:

| # | Finding | Outcome |
|---|---|---|
| S1 | M-K4's count compared values only: 5 entries stay "not applicable" with another reason than 1.15's (a lower quality) | fixed: counted and shown (1.15's not applicable read as reason `quality`); the erratum says 16 and 5 more |
| N1 | the tests asserted existence only | fixed: concrete rows of `81ebb2691f9c/1` pinned, a reason change and v1's words included |
| N2 | the content-check erratum's wording | fixed: "on S3's D3-revision check"; the comment `wingfoil memory add` copied |
| N3 | `loadScenario` twice a run | fixed: one load per version |
| N4 | the report's generated table rows over 120 | kept: tables, exempt |

**Round 2** (2026-11-04, a fresh read-only agent in `/tmp/claude-1000/review2-134-AuXd`, a clone of `81941d1c`; no
command in either checkout). It regenerated the report (identical bytes, `results/` clean), confirmed the reason
count against REQ-SCO-08 1.15 (its one "not applicable" condition, every published entry's lower M-Q1), and mutated
the script four ways, each failing exactly its test. No blocker, no should-fix; nits fixed: the test's comment says
"this execution's three"; the erratum says "replac" inside "replaces".
