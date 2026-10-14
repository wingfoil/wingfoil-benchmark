---
id: task-089-requirements-1-30-req-res-04-describes-the-root-index-and-the-published-executions-it-keeps
type: task
title: "Requirements 1.30, REQ-RES-04 describes the root index and the published executions it keeps"
status: draft
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

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
