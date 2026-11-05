---
id: task-136-the-method-page-s-approver-policy-pins-per-execution
type: task
title: "The method page's approver-policy pins, per execution"
status: backlog
release: v0.3
wave: W17
features: [F5.8]
acceptance: []
requirements: [REQ-RES-02, REQ-RUN-06]
fixes: []
tags: ["v0.3","site","w17"]
---

## Context

A follow-up of task-135's review (round 1, finding 6; round 2 asked for it to be filed), the approver's choice in chat
(2026-11-05): a separate W17 task. The method page's `#approver-classifier` (`site-content/method.md`), which task-135's
`#wingfoil-step-a` now links, still says "every execution so far, from v0.1 to v0.3's Codex campaigns, ran on v1; the
rerun of the Codex campaign of the wingfoil arm runs on v2". The campaign files say otherwise: campaign-006
(`codex-terra-harness-vs-docs-v2.yaml`) and campaign-007 (`codex-terra-step-a.yaml`) pin `v2`, campaign-008
(`claude-step-a.yaml`) pins `v5`; the others pin `v1` or inherit it from their preset. Each execution's pin is already
shown in its generated section "This execution" (`src/site/method.ts`, the "Approver policy" row).

## Acceptance criteria

1. **`#approver-classifier`'s sentence replaced** (red-first): each execution's approver policy is one of its pins,
   shown in "This execution"; the published executions by version, read from their campaign files as loaded (an
   `extends:` preset's value included), campaign-005 marked deprecated (bug-035). No other sentence of the paragraph
   changes.
2. **A test** reads the catalogue's executions (`site-content/catalog.yaml`), loads each one's campaign file as the
   runner does, and checks that the page's list names each execution under its pinned version and no other; a new
   execution on a version the list does not hold turns it red.
3. **`#approver-verdicts`** (v3, v4, v5) re-read against task-117 and task-119; a correction only where it is wrong,
   recorded in the Execution notes.
4. No figure added; no change to `results/`, `site/`, campaign files, arms or scenario versions; the site neither
   rebuilt nor published here.
5. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- `site-content/method.md`: `#approver-classifier`'s last sentences, on the paragraph's lines.
- The test in `test/unit/site/`, with the campaign loader of `src/campaign/` (the `extends:` resolution of task-101), in
  the form of `method-statements.test.ts`; `#approver-classifier`'s source in `method-statements.test.ts` extended.

## Execution notes

## Review
