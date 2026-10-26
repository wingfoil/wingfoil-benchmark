---
id: bug-027-the-approval-classifier-v1-reads-an-account-of-pending-documents-as-an-approval-request
type: bug
title: "The approval classifier v1 reads an account of pending documents as an approval request"
status: fixed
fixed_by: task-106-classifier-v2-an-approval-request-needs-a-requester-and-codex-s-requests-are-recognised
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 5;
[calibration v0.2](../../calibration/v0.2.md) §7.6): Opus 5.5, S1, step 2. The classifier is
[dl-004](../decision-log/dl-004-waiting-for-input-classifier-v1.md)'s v1 (`src/core/approver.ts`). v0.1's task-007 left
candidates for a v2.

## Expected

A final message is classed as waiting for approval only when the agent asks the requester for it.

## Actual

The agent's account of documents still pending ("the decision-log needs approval") was read as a second approval
request, and the runner answered it.

## Impact

One spurious intervention, counted in M-K2 and in the step's cost; the same wording can occur in any governed arm, so
the error is not neutral between arms.

## Resolution

Approver's decision (2026-10-23): classifier v2, "need/require … approval" counting only with a requester; checked on
a corpus of v0.1 and v0.2 final messages. A W16 task of [plan-005](../../plans/plan-005-release-v0-3.md).
