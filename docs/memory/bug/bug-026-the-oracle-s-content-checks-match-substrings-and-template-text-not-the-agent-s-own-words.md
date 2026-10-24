---
id: bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words
type: bug
title: "The oracle's content checks match substrings and template text, not the agent's own words"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 2 and 3;
[calibration v0.2](../../calibration/v0.2.md) §7.4, §7.5 and §9's errata). The checks are in `src/scoring/checks.ts`.

## Expected

A content check (S3's D3 and D5, S2's duplicate) passes when the agent recorded the fact the check names, in its own
words, and fails when it did not.

## Actual

The checks match substrings over every file of the result, template text included:

- D3 passed on WingFoil v0.2.2 only because "unchanged" contains "changed", and on v0.3.0 also because WingFoil's
  template comment contains "replace"; a revision recorded in other words failed;
- S2's duplicate check missed a duplicate recognised in other words ("already" handled, `task-001` looked up).

## Impact

H3 and H4 are not measured reliably by v0.2's checks, and the template false positive favours the arms whose harness
writes templates. A published finding (S3 M-F1) was wrong because of it, and was corrected by task-099's errata.

## Resolution

Approver's decision (2026-10-23): checks on word boundaries over the agent's own text (template and harness text
excluded), plus a published human judgement with a rubric; in scenario versions 1.1, with errata for 1.0. A W16 task
of [plan-005](../../plans/plan-005-release-v0-3.md).
