---
id: task-135-the-method-page-s-step-a-wingfoil-arm
type: task
title: "The method page's step-A wingfoil arm"
status: draft
release: v0.3
wave: W17
features: [F2.7, F2.6, F5.8]
acceptance: []
requirements: [REQ-RES-02, REQ-FMT-05]
fixes: []
tags: ["v0.3","site","w17"]
---

## Context

What step A leaves to W17 in [plan-005](../../plans/plan-005-release-v0-3.md) (Delivery order, item 3: "its reading in
calibration, the method page"). Since task-114
([its file](task-114-the-step-a-wingfoil-arm-on-wingfoil-0.3.1-baseline-docs-with-every-role-s-directives-dl-021-dl-027.md))
the wingfoil arm runs WingFoil 0.3.1 and its session agent drives the workflow engine (dl-021 step A,
[dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md));
campaign-007 (Codex) and campaign-008 (Claude Code) ran it. The method page (`site-content/method.md`) still
describes the wingfoil arm only as the v0.2 manual on WingFoil 0.3.0, the engine never started:
`#wingfoil-manual-process`, `#other-agents` (Codex's wingfoil arm "the same as Claude Code's in v0.2") and
`#threat-t10` stop at 0.3.0. Only the baseline-docs table already has the step-A row (task-114).

The approver's choices (chat, 2026-11-05): the step-A paragraph is new, after `#wingfoil-manual-process`, which keeps
describing v0.2's executions; the calibration's step-A reading is a separate W17 task, after this one. This task adds
no figure to the page; the site is neither rebuilt nor published here (both the approver's). W17's "Ends with" (an S1
dry run whose agent drives the engine) is task-114's `dry-runs/94` and `95`; with this task and the calibration one
done, `rel-v0-3`'s W17 row is Verified.

## Acceptance criteria

1. **`#wingfoil-step-a`**, a new paragraph right after `#wingfoil-manual-process` (red-first), stating:
   - from v0.3 the step-A arm runs WingFoil 0.3.1, and the session agent drives its workflow cycle (status, next, the
     step's role, a stop at the workflow's gate, finalize), with no driver written by the benchmark (dl-021);
   - the step-A manual's choices: one workflow instance per request; the step's work completed before stopping at the
     gate; at a gate, the request "Please approve <id>." for each document `next` lists, and no approval on any reply
     but "Approved. Proceed.";
   - that baseline-docs gets every role's directives, each labelled with its roles (the table's step-A row);
   - what the engine does and does not do at 0.3.1, as task-107's spike and task-114's dry runs observed it: it records
     and routes the cycle's steps, and the agent carries each step out, so the process's cost stays in the agent's own
     context (WingFoil feedback F-047, cited as a limit, not as a result);
   - which executions ran which manual: campaign-002 and campaign-003 the v0.2 manual; campaign-007 and campaign-008
     the step-A manual.
2. **`#wingfoil-manual-process` unchanged** but for one closing sentence that points to `#wingfoil-step-a`
   (characterization: the v0.3.0 test stays green).
3. **`#other-agents`:** Codex's wingfoil arm is the v0.2 manual in campaign-005 and campaign-006, and the step-A manual
   in campaign-007 (red-first).
4. **`#threat-t10`:** v0.3's step-A executions run 0.3.1, whose engine the agent drives; v0.2's v0.3.0 and v0.2.2
   stay in the same paragraph (red-first; `method-wingfoil-v0-3.test.ts` stays green).
5. **Tests:** `test/unit/site/method-wingfoil-step-a.test.ts` for criteria 1, 3 and 4, written before the text;
   `#wingfoil-step-a` added to `method-statements.test.ts`'s anchors; the method page renders (the site's build tests).
6. **No figure** is added to the page, so none is typed by hand; no change to `results/`, `site/`, arms, campaign
   files or scenario versions.
7. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- `site-content/method.md`: one new paragraph with its anchor `{#wingfoil-step-a}`, on one line as the page's other
  paragraphs (`method-wingfoil-v0-3.test.ts` reads a paragraph as the line that holds its anchor); `#other-agents`'
  last sentence and `#threat-t10` amended in place.
- The statements come from the evidence, re-read before writing, never from memory: the step-A manual
  (`arms/wingfoil/` at the digest campaign-008 pinned), task-107's and task-114's execution notes, campaign-007's and
  campaign-008's elements, `docs/calibration/wingfoil-tokens.md` and F-047.
- `test/unit/site/method-wingfoil-step-a.test.ts`, in the form of `method-wingfoil-v0-3.test.ts`.

## Execution notes

## Review
