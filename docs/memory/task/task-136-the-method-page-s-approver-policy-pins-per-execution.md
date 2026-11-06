---
id: task-136-the-method-page-s-approver-policy-pins-per-execution
type: task
title: "The method page's approver-policy pins, per execution"
status: approved
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

- **Red first:** `test/unit/site/method-approver-policies.test.ts` (two cases), run before the text: 2 failed; after
  it, `test/unit/site/` 177/177.
- **The pins are read from each execution's results, not from `campaigns/`** (a departure from the Design): every
  catalogue execution keeps the campaign file that ran as `results/<id>/<n>/campaign.yaml`, its preset resolved, so
  the test reads the policy that ran, and an edit of a campaign file after its run cannot change it. The seven
  published executions: `v1` for `c82a5e74885b/2`, `81ebb2691f9c/1`, `bf3a1ac7dff5/1` and `4682bcc65d6b/1`; `v2` for
  `13fda3099afa/1` and `697e79b75e41/1`; `v5` for `33b54dd89e8b/1`. campaign-005's execution is not in the catalogue
  (bug-035): the page says that an execution of the wingfoil arm on v1 under Codex was not published.
- **`#approver-classifier`:** its last sentences replaced: each campaign pins a version, shown in "This execution"
  (linked); the published executions by version, by their ids; the unpublished v1 execution. The rest unchanged.
- **`#approver-verdicts` re-read** against `src/core/approver.ts` (`V3`, `V4`, `V5`, task-117 and task-119): v3's
  scripted verdicts, v4's narrow wait once a step, v5's broad wait with verdicts already given aside, as the page says;
  no correction.
- No figure added; `results/`, `site/`, campaign files, arms and scenario versions unchanged.
- **Full suites** (the approver's go, 2026-11-05; the load watcher from 21:02, the suites 2026-11-06 00:40–00:47,
  `env -u BENCH_HOLDOUT_PATH BENCH_WINGFOIL_REPO=… bash scripts/full-suites.sh task/task-136-…`):
  `1c0318d2: LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0`, green.

## Review

**Round 1** (a fresh read-only agent on a clone, `ec07db29` against main `937ec234`; main's HEAD and reflog unchanged
after): no blocker, one should-fix, three nits. It confirmed every id under its pinned version, the groups against the
catalogue, campaign-005 never published, the "This execution" row, criterion 3, and the departure from the Design.

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | should-fix | "which missed its approval requests" reads as all of them; v1 caught one of seven (bug-035) | Fixed: "missed most of its approval requests" |
| 2 | nit | an id listed under a wrong version and again under its own passed the test | Fixed: an id listed twice fails; checked by the mutation that adds `33b54dd89e8b/1` to the v2 list |
| 3 | nit | the clause parser could stop at an inner ". " or "; " and drop ids | Fixed: a clause's ids are read inside its brackets |
| 4 | nit | "the Codex executions of the harness arms, the v0.2 manual's and the step-A one" is hard to read | Fixed: "Codex's two executions of WingFoil against its docs control, with v0.2's manual and at step A" |

The paragraph was rewrapped within 120 columns after the fixes.

**Round 2** (a fresh agent on a new clone, `cb536d38`; main's HEAD and reflog unchanged after): no findings. Round 1's
four fixes verified (bug-035's one of seven; the mutations of a duplicate and a dropped id fail; text with ". " and
"; " inside the brackets is read; the v2 wording against the catalogue); the rewrap changed only line breaks in the
untouched sentences.

