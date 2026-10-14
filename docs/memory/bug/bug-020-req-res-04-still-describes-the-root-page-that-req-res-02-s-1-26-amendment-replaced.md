---
id: bug-020-req-res-04-still-describes-the-root-page-that-req-res-02-s-1-26-amendment-replaced
type: bug
title: "REQ-RES-04 still describes the root page that REQ-RES-02's 1.26 amendment replaced"
status: fixed
fixed_by: task-089-requirements-1-30-req-res-04-describes-the-root-index-and-the-published-executions-it-keeps
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
---

## Context

Found by task-085's independent review (round 1, nit 8), recorded in its Review notes as a follow-up for the
approver; the approver asked for the correction in chat on 2026-10-14.

## Expected

REQ-RES-04 describes what `bench site publish` checks and pushes now that REQ-RES-02, as amended in 1.26, makes
`site/index.html` an index of every built execution:

- the copy's files are exactly each execution's pages, the stylesheet and the root index of those executions;
- the commit names every execution under `site/`;
- a remote `gh-pages` that publishes an execution `site/` does not hold is refused, so that a permanent URL is never
  dropped (REQ-RES-02 as amended, task-085).

## Actual

REQ-RES-04's 1.22 text still says the copy's files are the union of the builds' "(each execution's pages, the
stylesheet, the root page of the execution it leads to)" and that the commit is `site: publish <id>/<n>[, …]`
"naming the root page's execution". The 1.26 amendment only says the check "accepts the page kinds of REQ-RES-02 as
amended in 1.26". The refusal to drop a published execution is not in any requirement's text.

The code is right and tested: `src/site/publish.ts` `checkSiteCopy` compares `site/index.html` with `rootIndex` of
the executions it finds; the push refuses `publishes <id>/<n>, which site/ does not hold`; the commit message is
`site: publish <every execution>` with "The root index lists N executions." (`test/unit/site/publish.test.ts`,
the task-085 block).

## Evidence

- `docs/02_specification/requirements.md` (1.29), REQ-RES-04's row.
- task-085's Review notes, round 1, item 8.
- `src/site/publish.ts`: `checkSiteCopy` and the `gh-pages` listing before `update-ref`.

## Suggested handling

A specification amendment, 1.30: REQ-RES-04 gains an "Amended in 1.30" paragraph with the three points above, and the
amendment section records it. No code changes.

## Resolution

Fixed by [task-089](../task/task-089-requirements-1-30-req-res-04-describes-the-root-index-and-the-published-executions-it-keeps.md)
(merged in `fc76122`): requirements 1.30. REQ-RES-04 states the root index of every execution, the commit naming every
execution under `site/`, and the refusal to drop an execution `gh-pages` already publishes. No code changed.
