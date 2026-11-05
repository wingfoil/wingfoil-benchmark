---
id: task-113-release-cycle-7-the-retrospective-phase-ends-at-the-approver-s-approval-dl-030
type: task
title: "release-cycle 7: the retrospective phase ends at the approver's approval (dl-030)"
status: in-progress
release: v0.3
wave: W16
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["v0.3","wingfoil","governance"]
---

## Context

[dl-030](../decision-log/dl-030-what-closes-release-cycle-s-retrospective-phase-on-wingfoil-0.3.md) (approved
2026-10-27, option B): `release-cycle`'s retrospective phase drops its `produces` and ends at the approver's approval,
as the validation and publishing phases do. Since task-109 (`release-cycle` 6) its `produces` names the release
element, which exists from planning, so the phase's evidence is always present on WingFoil 0.3. **No real-agent
session. Spending: 0 €.**

**Done** means: the retrospective is complete when the approver says so, recorded in git with a reason, and the
`wingfoil-cli` directive no longer describes the vacuous evidence.

## Acceptance criteria

1. **`release-cycle` 7:** the retrospective phase has no `produces` and has `approval: { by_role: approver }`; the
   header records version 7 (dl-030, this task). `npm run -s wingfoil -- workflow list --format json` exits 0 with
   `diagnostics: []`, and `workflow show release-cycle` prints the phase with its approval. **Characterization.**
2. **The directive:** `wingfoil-cli`'s W-19 drops the retrospective's vacuous evidence (the rule on path patterns
   stays); its version bumped. **Characterization.**
3. **The record:** the inbox README, the release-cycle's other phases and any document describing the retrospective's
   evidence (`git grep "Retrospective section"`) say the same. **Characterization.**

## Design

- One file changes in `.wingfoil/workflows/custom/` (`release-cycle.yaml`), one directive; no code.
- `workflow list` and `workflow show` read the configuration committed at `HEAD`: run them after the commit.
- **Not in this task:** running `release-cycle` on WingFoil's engine.

## Execution notes

- **`release-cycle` 7** (`.wingfoil/workflows/custom/release-cycle.yaml`): the retrospective phase's `produces` removed,
  `approval: { by_role: approver }` added, the header's version 7 line (dl-030 option B). After the commit, `npm run -s
  wingfoil -- workflow list --format json` exits 0 with `diagnostics: []`, and `workflow show release-cycle` prints the
  phase as `{"role": "facilitator", "produces": [], "approval": {"byRole": "approver"}}`. Run before the commit, both
  warn `W_UNCOMMITTED_INPUTS` (they read `HEAD`, as the Design says).
- **The directive** `wingfoil-cli` 1.2: W-19 keeps its rule on path patterns and drops the retrospective's vacuous
  evidence.
- **The record:** `git grep "Retrospective section"` finds no document describing the phase's evidence besides
  F-045, which records WingFoil 0.3's observed refusal and stays as written; the inbox README and the other phases need
  no change.
- `wingfoil memory submit` (backlog → in-progress): as declared.

### Review

**Round 1** (2026-11-05, a fresh read-only agent in `/tmp/claude-1000/review1-113-wHCd`, a clone of `1f36a8a0`; no
command in either checkout). The phase, the version, dl-030's option B (its approve commit's Reason) and the
directive's W-19 confirmed; `workflow list` exits 0 with `diagnostics: []` and `workflow show` prints the phase with its
approval; no other document needs changing. No blocker, no should-fix; its one nit, fixed: the workflow's header says
completion is also read from approvals.
