---
id: bug-035-the-approval-classifier-v1-misses-codex-s-approval-requests
type: bug
title: "The approval classifier v1 misses Codex's approval requests"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found by [campaign-005](../campaign/campaign-005-codex-harness-vs-docs-campaign-on-terra.md)'s results review
(`c4c49685911c/1`, Codex CLI 0.162.1, `gpt-5.6-terra`, the wingfoil arm; 2026-10-26). The classifier is
[dl-004](../decision-log/dl-004-waiting-for-input-classifier-v1.md)'s v1 (`src/core/approver.ts`), calibrated on
Claude Code's final messages. The wingfoil arm's manual asks the agent to request an approval and stop
(`arms/wingfoil/manual.md`, lines 62–64), so the arm relies on the neutral approver (F2.4) to go on. The converse of
[bug-027](bug-027-the-approval-classifier-v1-reads-an-account-of-pending-documents-as-an-approval-request.md)'s false
positive.

## Expected

A final message in which the agent asks the requester for an approval, or asks a question, is classed as waiting,
whatever agent wrote it, and the runner answers it (REQ-RUN-06).

## Actual

In 27 wingfoil steps Codex stopped to wait in 7; v1 recognised one (S2 step 2, "I need approval for …"). The six it
missed, read again with v1 itself:

- S1 r1 step 3, S8 steps 2 and 3: "Please reply: **Approved. Proceed.**" after "submitted … for approval" or
  "awaiting approval as required";
- S1 r3 step 5: "`dl-005-…` … awaiting approval … Please reply: **"Approved. Proceed."**";
- S8 step 4: "Implementation and tests are ready, but the import-parsing decision is pending WingFoil approval. Please
  reply exactly: **Approved. Proceed.**";
- S3 step 5: "What refund policy should `at` use? For example: …" — a question whose last line is an example, not a
  `?`.

None matches v1's patterns ("awaiting your", "please confirm", "needs … approval", …), and "please reply" is not one.
The runner sent no reply; each step ended `completed` with its work undone.

## Impact

Every loss of the wingfoil arm against its docs control in `c4c49685911c/1` coincides with a missed request (S1 r1
and r3, S3, S8); where none was missed, the arm equals its controls. The error is not neutral between arms: only a
governed arm asks for approvals, so the execution measures v0.2's manual with classifier v1 on an unattended Codex,
not WingFoil on Codex. Under Claude Code (campaigns `81ebb2691f9c`, `c82a5e74885b`) the same manual's requests were
answered.

The same messages hold accounts that must not be read as requests: in the steps that completed, Codex ends with "the
task and decision log have been submitted and are pending approval" (S1 r1 step 1, and others), which is bug-027's
case.

## Resolution

Classifier v2 with bug-027 (the approver's decision of 2026-10-23, "need/require … approval" counting only with a
requester), its corpus extended with Codex's final messages of campaign-004 and campaign-005; a request is a phrase
addressed to the requester ("please reply", "reply … Approved") or a question in the closing paragraph; an account of
pending documents alone is not. Brought ahead of W16 by the approver (2026-10-26), so that dl-022's arm B can be rerun
on policy v2 before the ChatGPT Plus subscription ends on 2026-11-13.
