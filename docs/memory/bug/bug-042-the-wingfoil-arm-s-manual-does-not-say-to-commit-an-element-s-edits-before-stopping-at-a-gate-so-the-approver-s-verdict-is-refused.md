---
id: bug-042-the-wingfoil-arm-s-manual-does-not-say-to-commit-an-element-s-edits-before-stopping-at-a-gate-so-the-approver-s-verdict-is-refused
type: bug
title: "The wingfoil arm's manual does not say to commit an element's edits before stopping at a gate, so the approver's verdict is refused"
status: fixed
fixed_by: task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate
tags: ["v0.3","wingfoil","s10"]
---

## Context

Found reading [campaign-008](../campaign/campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md)'s results (`33b54dd89e8b/1`, 2026-10-31), S10's wingfoil run on Haiku 5.5, r2. At
step 1 the agent submitted task-001, then edited its body and left the edit uncommitted, finalized the workflow's
`build` step and asked for the approval. The verdict hook's `memory approve`, run as Dana, was refused by WingFoil:
a state-transition commit records the status change and nothing else, and the task's file carried uncommitted
modifications. task-001 stayed `pending`, no release moved past 1.4.0, and with task-002 and task-003 submitted later
every following delivery was `ambiguous`: M-E3 1 of 3 and M-E3a 0 of 3 in that run come from it. Reproduced on a
copy of the workspace with WingFoil 0.3.1.

## Expected

An agent in the wingfoil arm that stops at a gate leaves the documents it asks about committed, so the approver's
verdict, carried out while it waits, can change their state.

## Actual

The arm's manual (`arms/wingfoil/manual.md`) says that whatever is left in the working tree "is committed for you when
the request ends", and, at a gate, to finish the work before asking; it does not say that the approver's verdict is
carried out before the request ends, on what is committed, nor that WingFoil refuses a state change on a document
with uncommitted edits. Nothing in WingFoil is wrong: the refusal is its rule.

## Fix (the approver's choice, 2026-11-01)

The manual's gate rule says to commit every change (the code and the documents) before asking for an approval, and
not to edit a submitted document afterwards. It changes the arm's digest. (Considered and not chosen: the runner
committing the working tree before running the hook, which would write the agent's work under the runner.)

**Note (task-120, 2026-11-01):** the "not to edit a submitted document afterwards" clause is not implemented: the
manual asks to submit the task before building and to record the outcome in it, so an edit after the submit is the
expected path, and leaving it uncommitted was the defect. Raised with the approver at task-120's gate.
