---
id: task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate
type: task
title: "The wingfoil verdict hook records WingFoil's refusal, and the arm's manual commits an element's edits before a gate"
status: in-progress
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
3. **Red-first (a test of the manual's text):** the wingfoil manual's gate rule says to commit every change, code and
   documents, before asking for an approval, because the verdict is carried out on what is committed; within 120
   columns; the arm's new digest recorded here, the old one (`cc009b5a52a9`) kept by the profiles of the runs that
   used it.
4. A note on r2 in campaign-008's Results review, citing both bugs.
5. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites through the load watcher; an
   independent review (dl-020).

## Design

- **The hook** (`arms/wingfoil/verdict.sh`): WingFoil's stderr goes to a temporary file instead of `/dev/null`; on
  `refused` and `search-failed` the JSON line gains `detail`, WingFoil's last `error:` line (else its last non-blank
  line), cut at 500 characters; `done`, `no-target`, `ambiguous` and `unknown-verdict` are unchanged. The approver's
  identity still reaches only WingFoil's command.
- **The runner** (`src/runner/run.ts`, `deliver`/`hookAnswer`): reads `detail` when it is a string and records it in
  `carried_out`; other fields of the answer are still dropped.
- **The scoring** (`src/scoring/governance.ts`): the ledger schema names `detail` as optional; it was already
  accepted (zod drops unknown keys), so its test is a characterization: a ledger with it scores as one without.
- **The manual** (`arms/wingfoil/manual.md`, *At a gate*): one sentence, commit every change before asking, since the
  verdict is carried out while the agent waits and WingFoil refuses to move a document with uncommitted edits. Not "do
  not edit a submitted document": the manual asks to submit the task before building and to record the outcome in
  it, so the edit after the submit is the expected path; leaving it uncommitted is the defect. The shared preamble
  ("committed for you when the request ends") is every arm's and stays. baseline and baseline-docs are unchanged
  (no hook, no gate verbs): digests `964b1354526c` and `64e37c838830`.
- **The arm's digest:** `cc009b5a52a9` → `927ab3adb0bb`. No profile is changed: `claude-step-a*.yaml` and
  `s10-calibration.dry-run.yaml` describe runs already made; the next campaign's file pins the new digest.

## Execution notes

- The hook's test runs WingFoil 0.3.1 from `node_modules` (the arm's harness release) in a scratch Kanban project with
  a developer and Dana as the approver, as the setup declares them: a pending task with an uncommitted body edit is
  refused with `error: refusing to commit …: it carries uncommitted modifications…`, as campaign-008's r2 was; about
  one second a case. The failing search uses a stub on the hook's PATH.
- Red first: the hook's two new cases and the runner's failed before the change; the manual's failed before its
  sentence; the scoring's passed (characterization, above).
