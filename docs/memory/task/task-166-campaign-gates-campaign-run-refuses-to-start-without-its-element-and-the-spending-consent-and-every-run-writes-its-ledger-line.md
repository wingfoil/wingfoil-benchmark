---
id: task-166-campaign-gates-campaign-run-refuses-to-start-without-its-element-and-the-spending-consent-and-every-run-writes-its-ledger-line
type: task
title: "Campaign gates: campaign run refuses to start without its element and the spending consent, and every run writes its ledger line"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-CLI-03, REQ-NFR-06]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["campaign","gates","ledger","v0.4"]
---

## Context

[rel-v0-3](../release/rel-v0-3.md)'s Retrospective, "What to change" 1, and the approver's decision of 2026-11-22: a second
`memory approve` passed campaign-004's publish gate; campaign-009's element was filed after its launch, so its
spending gate was recorded afterwards; campaign-004's runs were missing from the ledger (added by task-161).

**Done** means: the gates the approver rules cannot be passed around by the campaign runner, and the ledger holds a
line for every run without a hand step.

## Acceptance criteria

1. Red first: `campaign run` refuses to start (non-zero, with the reason) when the campaign file names no
   element, the element does not exist, or the element records no spending consent in the state the gate requires.
2. Red first: every finished run, whatever the agent (Claude Code, Codex, the fake agent in tests), appends its line
   to the release's ledger through `scripts/ledger-lines.mjs`'s format; a resumed run writes one line per attempt.
3. A dry run (`--dry-run`) checks the same gates and writes nothing.
4. The `campaign-cycle` workflow and the requirements name the check.
5. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
