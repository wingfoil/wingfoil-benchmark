---
id: task-182-fix-bug-056-the-bin-and-docker-fixtures-file-an-approved-campaign-element
type: task
title: "Fix bug-056: the bin and docker fixtures file an approved campaign element"
status: pending
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-CLI-03]
fixes: [bug-056-the-campaign-gate-refuses-every-campaign-of-test-bin-and-test-docker-whose-fixtures-name-no-campaign-element]
tags: ["bug","campaign-gates","v0.4"]
---

## Context

[bug-056](../bug/bug-056-the-campaign-gate-refuses-every-campaign-of-test-bin-and-test-docker-whose-fixtures-name-no-campaign-element.md): task-166's campaign gate (REQ-CLI-03 as amended) refuses every campaign that `test:bin`
(1 test) and `test:docker` (10 tests) start, because their fixtures write no campaign element. Found by task-167's
full suites at `ac6d130b`; while it stands, every task's full suites are red and task-167's `full-suites-gate.sh`
blocks every move to in-review. Triaged by the approver on 2026-11-26 with the bug's Fix option 1, before task-167
resumes. W20, beside task-166's campaign gates.

**Done** means: `test:bin` and `test:docker` are green on the branch with the gate unchanged, each failing test still
checks what it was written for.

## Acceptance criteria

1. Red first: the 11 tests bug-056 lists fail on `main` today with the gate's refusal (`no campaign element … names
   campaigns/<file>.yaml`); after the change each passes with its own assertion, unchanged.
2. Characterization: W5's test (`test/bin/bench.test.ts`) still reaches the budget guard's refusal and its estimate;
   the gate's own tests (`test/unit/cli/campaign-gates.test.ts`) keep their outcomes; `src/` is not touched.
3. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go
   (`test:bin` and `test:docker` included); an independent review (dl-020).

## Design

Bug-056's Fix option 1: every bin and docker fixture that writes a campaign file also writes the campaign element
that names it, at `approved`, with `writeCampaignElement` from `test/support/campaign-fixture.ts` (added by task-166
for the unit tests). No bypass of the gate, no change to `src/`. Where a docker test builds its repository by another
helper, that helper calls `writeCampaignElement` once, so the tests themselves change as little as possible.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
