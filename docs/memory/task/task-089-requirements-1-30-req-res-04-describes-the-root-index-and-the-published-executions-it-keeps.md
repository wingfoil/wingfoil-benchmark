---
id: task-089-requirements-1-30-req-res-04-describes-the-root-index-and-the-published-executions-it-keeps
type: task
title: "Requirements 1.30, REQ-RES-04 describes the root index and the published executions it keeps"
status: in-review
release: v0.2
wave: W14
features: [F5.6]      # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-RES-04, REQ-RES-02]
fixes: [bug-020-req-res-04-still-describes-the-root-page-that-req-res-02-s-1-26-amendment-replaced]
---

## Context

Fixes [bug-020](../bug/bug-020-req-res-04-still-describes-the-root-page-that-req-res-02-s-1-26-amendment-replaced.md),
task-085's review follow-up. The approver asked for it in chat on 2026-10-14, after W14's delivery was closed
(`56bbcc3`). It is filed under W14, as task-087 and task-088 were, and is not one of W14's eight planned tasks.

**No real agent, no spending, no code.** **Done** means: requirements 1.30 merged on main, REQ-RES-04's text matching
what `bench site publish` does since task-085.

## Acceptance criteria

All **characterization**: the behaviour exists and is tested since task-085; this task changes text only.

- REQ-RES-04 gains "**Amended in 1.30 (v0.2):**" saying: (1) with REQ-RES-02 as amended in 1.26, `site/index.html`
  is the index of every built execution, so the copy's files must be exactly each execution's pages, the stylesheet
  and that index, recomputed from the executions' `execution.json`, byte for byte; (2) the commit is
  `site: publish <id>/<n>[, …]` naming every execution under `site/`; (3) when the remote's `gh-pages` publishes an
  execution `site/` does not hold, the push is refused, naming the `bench site build` that restores it, so that a
  permanent URL is never dropped. The `publish` tests (`test/unit/site/publish.test.ts`) stay green: each point is
  one of their cases.
- The 1.22 and 1.26 text stays as it was: an amendment adds, as 1.26 to 1.29 did.
- The header becomes **Version:** 1.30, with the date; an "Amendment 1.30" section follows 1.29's, with its source.
  The traceability matrix is unaffected: REQ-RES-04 already traces to F5.6.

## Design

- `docs/02_specification/requirements.md`: the paragraph at the end of REQ-RES-04's row, the header, and
  `### Amendment 1.30 (delivery, W14 task-089, <date>)`.
- Before writing, the three points are read against `src/site/publish.ts` and the task-085 block of
  `test/unit/site/publish.test.ts`, and each is named in the Execution notes with the test that shows it.
- Branch and worktree as every task; day checks: prettier on the file, the `publish` tests; an independent review that
  checks the text against the code. The full suites only if the approver asks: the diff is one document.
- After the merge: push only on the approver's go.

## Execution notes

- `npx wingfoil memory add --type bug` and `--type task` on 2026-10-14. Declared: create a draft with the type's
  scaffold and commit it. Observed: `bug-020-…` and `task-089-…` as drafts, required fields empty (W-02); filled in
  `docs(…)` commits before `submit` (W-01).
- `npx wingfoil memory submit` for both (draft → pending). Declared: moves the element to its next state and commits
  it. Observed: `status: pending`. Matches. The approver approved bug-020 (`6f38856`) and task-089 (`e3b41ea`).
- `npx wingfoil memory submit task-089-…` (backlog → in-progress) on main. Observed: `status: in-progress`. Matches.
- Worktree `../WingFoil2-Benchmark-wt/task-089-…`, its own `npm ci` (exit 0).
- The three points read against the code and its tests before writing:
  1. the root index: `checkSiteCopy` compares `site/index.html` with `rootIndex(root, executions)`
     (`src/site/publish.ts`); test "refuses a stale root index, naming one execution to build again";
  2. the commit: `site: publish ${executions.join(', ')}` with "The root index lists N execution(s)." in its body;
     the test at `test/unit/site/publish.test.ts:66` (one execution). No test publishes two executions at once; the
     text states `[, …]` as 1.22 did, from the code;
  3. the drop: the `gh-pages` listing before `update-ref`; test "refuses to drop from gh-pages an execution it
     published, which a site/ without it would".
- Amendment (`1eba497`): REQ-RES-04's row gains "Amended in 1.30"; the header is 1.30, 2026-10-14; "Amendment 1.30"
  follows 1.29's. 1.22's and 1.26's text unchanged (17 insertions, 3 deletions: the header's two lines and the row).
- Day checks, niced: prettier on the file; `publish`, `traceability` and `method-statements` tests 46 of 46;
  `npm run lint` 0. No code changed, so no typecheck is needed beyond lint's.

## Review notes

An independent read-only agent reviewed `git diff main...HEAD` against the Design, bug-020, `src/site/publish.ts`,
`src/site/profiles.ts` and `test/unit/site/publish.test.ts`.

- **Round 1** (859dfbc): **clean**, two nits. Every claim of the 1.30 paragraph holds in the code and its tests; 1.22
  and 1.26 unchanged; the header and the amendment section as 1.27–1.29; the notes' shas, counts and tests right;
  46 of 46 re-run; prettier clean. Nothing else in `method.md`, `traceability.md` or the features names the root page.
  - **Nit 1, fixed** (970631d): an execution without `execution.json`, as v0.1's, is listed with its end date not
    recorded; the paragraph now says so.
  - **Nit 2, left for the approver:** REQ-RES-04's 1.22 text says a refused entry is named "and the `bench site
    build` to run"; for a stray file the code says "remove it, or rebuild site/". It predates this task and is
    outside bug-020.
- **Round 2** (970631d): **clean.**
- **Suites:** the diff is one specification document and the task; prettier, lint and the `publish`, traceability and
  method-statements tests stand in, as for task-087 and task-088. The full suites run if the approver asks.
- `npx wingfoil memory submit task-089-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
