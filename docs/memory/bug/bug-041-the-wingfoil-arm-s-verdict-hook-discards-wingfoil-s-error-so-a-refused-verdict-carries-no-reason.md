---
id: bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason
type: bug
title: "The wingfoil arm's verdict hook discards WingFoil's error, so a refused verdict carries no reason"
status: fixed
fixed_by: task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate
tags: ["v0.3","wingfoil","s10"]
---

## Context

Found reading [campaign-008](../campaign/campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md)'s results (`33b54dd89e8b/1`, 2026-10-31): in S10's wingfoil run on Haiku 5.5, r2,
the verdict hook's approval at step 1 came back `refused`, and nothing in the run said why. The cause had to be
rebuilt by hand, re-running the hook's command on a copy of the workspace ([bug-042](bug-042-the-wingfoil-arm-s-manual-does-not-say-to-commit-an-element-s-edits-before-stopping-at-a-gate-so-the-approver-s-verdict-is-refused.md)).

## Expected

When WingFoil refuses the verb the hook runs (`memory approve` or `memory reject`), or a search fails, the run's
`verdicts.json` records WingFoil's own reason beside the outcome, so a refused verdict can be read from the stored
results.

## Actual

`arms/wingfoil/verdict.sh` runs the verb with `> /dev/null 2>&1` (and the searches with `2>/dev/null`), and answers
only `{"outcome": "refused", "target": …}`; the runner records that line (`src/runner/run.ts`, `deliver`), and the
reason is lost. In r2 it was "refusing to commit docs/memory/task/task-001-….md: it carries uncommitted modifications
this transition does not own [git status ' M'] — the body".

## Fix (proposed)

The hook keeps WingFoil's `error:` line (bounded in length) and prints it in its JSON line as `detail`; the runner
records it in `carried_out`; the scoring's ledger schema accepts it. The hook is part of the arm, so its digest
changes.
