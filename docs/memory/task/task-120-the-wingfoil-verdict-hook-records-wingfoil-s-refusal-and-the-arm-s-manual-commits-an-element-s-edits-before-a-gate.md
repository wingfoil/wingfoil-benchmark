---
id: task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate
type: task
title: "The wingfoil verdict hook records WingFoil's refusal, and the arm's manual commits an element's edits before a gate"
status: pending
release: v0.3
wave: W17
features: [F2.7]
acceptance: []
requirements: [REQ-FMT-05]
fixes: [bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason, bug-042-the-wingfoil-arm-s-manual-does-not-say-to-commit-an-element-s-edits-before-stopping-at-a-gate-so-the-approver-s-verdict-is-refused]
tags: ["v0.3","wingfoil","s10"]
---

## Context

Two defects found reading [campaign-008](../campaign/campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md)'s results (S10, wingfoil, Haiku 5.5, r2): the verdict hook loses
WingFoil's reason when a verb is refused ([bug-041](../bug/bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason.md)), and the arm's manual lets the agent leave a
submitted document's edits uncommitted at a gate, so the approver's verdict is refused
([bug-042](../bug/bug-042-the-wingfoil-arm-s-manual-does-not-say-to-commit-an-element-s-edits-before-stopping-at-a-gate-so-the-approver-s-verdict-is-refused.md)). The approver asked for the bugs and their task in chat (2026-11-01). Placed in
v0.3, W17, after the campaign. No real-agent spending; campaign-008 keeps its results, with a note on r2 (campaigns
are preliminary).

## Acceptance criteria

1. **Red-first:** `arms/wingfoil/verdict.sh`, run against a workspace whose one pending task carries an uncommitted
   edit of its body, answers `refused` with a `detail` holding WingFoil's `error:` line (bounded in length); a search
   that fails answers `search-failed` with its `detail`; `done`, `no-target` and `ambiguous` unchanged.
2. **Red-first:** the runner records the hook's `detail` in `verdicts.json`'s `carried_out`, and the scoring's ledger
   schema accepts it (a ledger without it, as campaign-008's, still scores the same).
3. **Red-first (a test of the manual's text):** the wingfoil manual's gate rule says to commit every change,
   code and documents, before asking for an approval, and not to edit a submitted document afterwards; within 120
   columns; the arm's new digest recorded where the profiles pin it, and the old one kept for the runs that used it.
4. A note on r2 in campaign-008's Results review, citing both bugs.
5. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites through the load watcher; an
   independent review (dl-020).

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
