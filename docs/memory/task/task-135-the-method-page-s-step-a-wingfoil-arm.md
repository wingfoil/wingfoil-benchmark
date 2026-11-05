---
id: task-135-the-method-page-s-step-a-wingfoil-arm
type: task
title: "The method page's step-A wingfoil arm"
status: in-review
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

- **Red first:** `test/unit/site/method-wingfoil-step-a.test.ts` (seven cases) and `#wingfoil-step-a` in
  `method-statements.test.ts`'s anchors, run before the text: 8 failed, 4 passed; after it, `test/unit/site/` 173/173.
  Its `paragraph()` reads the whole paragraph before an anchor (`#other-agents` spans several lines).
- **`#wingfoil-step-a`** states dl-021's step A from the step-A manual (`arms/wingfoil/manual.md`) and `arm.yaml`
  (`provides.workflow-engine`: records and routes, executes none, task-107), task-114's baseline-docs row, F-047 as a
  limit, and the executions per manual: campaign-002 and campaign-003 the v0.2 manual, campaign-007 and campaign-008
  the step-A one. The manual changed after campaign-008 (bug-044, bug-045): the paragraph names no version of it and
  sends the reader to the setup page, which shows each execution's manual by its digest.
- **`#wingfoil-manual-process`** keeps its text, plus a closing sentence linking `#wingfoil-step-a`; **`#other-agents`**
  splits Codex's wingfoil arm (campaign-005 and campaign-006 the v0.2 manual, campaign-007 the step-A one);
  **`#threat-t10`** adds v0.3.1 and the engine the agent drives. The gate's sentence links `#approver-classifier`.
- No figure added; `results/`, `site/`, arms, campaign files and scenario versions unchanged.
- **Full suites** (the approver's go, 2026-11-05; the load watcher, then `env -u BENCH_HOLDOUT_PATH
  BENCH_WINGFOIL_REPO=… bash scripts/full-suites.sh task/task-135-the-method-page-s-step-a-wingfoil-arm`, 18:57–19:05):
  `f55d54db: LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0`, green.

## Review

**Round 1** (a fresh read-only agent on a clone, `167da22b` against main `5ad262b2`; main's HEAD and reflog unchanged
after): no blocker, two should-fix, six nits, one uncertain.

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | should-fix | "every change committed" before the gate is task-120's rule, added after campaign-008 | Fixed: dropped from the gate's sentence, stated as a correction made after campaign-008; a test pins it |
| 2 | should-fix | "any reply but "Approved. Proceed." is no approval" omits S10's own approver (bug-039, before campaign-008) | Fixed: the exception stated; a test pins it |
| 3 | nit | `#other-agents`: campaign-007 ran an earlier step-A revision than campaign-008 | Fixed: "at a revision before campaign-008's" |
| 4 | nit | F-047 read as a WingFoil document | Fixed: "a limit, not a measured result, which the benchmark has reported to WingFoil in its feedback note F-047" |
| 5 | nit | the paragraph is long for a lay reader | Kept: one anchored statement as the page's other paragraphs (`#wingfoil-manual-process` is longer); the commands are what the reader meets in the published manual |
| 6 | nit | `#approver-classifier` still says the executions ran policy v1 (campaign-007 ran v2, campaign-008 v5) | Outside this diff: proposed to the approver as a follow-up |
| 7 | nit | no test pins the paragraph's position | Fixed: a test that `#wingfoil-step-a` follows `#wingfoil-manual-process` |
| 8 | uncertain | campaign-007's `wingfoil_commit` `bd27f62a`, not `870bd440` | No change: WingFoil's `bd27f62a` is contained in `v0.3.1` and resolves to `870bd440`, the tag's commit |

**Round 2** (a fresh agent on a new clone, `9aff59d3`; main's HEAD and reflog unchanged after): round 1's fixes
verified against the manual's history (`ba091f79` after campaign-008's `cc009b5a52a9`; bug-039's clause before it;
campaign-007 on `cf70ad7ed9aa`); no blocker, no should-fix, two nits; #5 and #6 judged reasonable, #6 to be filed.

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | nit | "A correction made after campaign-008" is singular; three corrections followed it (task-120, task-124, task-125) | Fixed: "One of the corrections made after campaign-008" |
| 2 | nit | "dl-021's step A" could be read as dl-021's rejected Option A | Kept: "step A" is dl-021's own name for it, used across the repository, and the same sentence says "no driver written by the benchmark" |
