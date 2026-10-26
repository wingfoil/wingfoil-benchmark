---
id: task-106-classifier-v2-an-approval-request-needs-a-requester-and-codex-s-requests-are-recognised
type: task
title: "Classifier v2: an approval request needs a requester, and Codex's requests are recognised"
status: in-progress
release: v0.3
wave: W15
features: [F2.4]
acceptance: []
requirements: [REQ-RUN-06, REQ-RUN-07]
fixes: [bug-027-the-approval-classifier-v1-reads-an-account-of-pending-documents-as-an-approval-request, bug-035-the-approval-classifier-v1-misses-codex-s-approval-requests]
tags: ["v0.3","approver","codex"]
---

## Context

[campaign-005](../campaign/campaign-005-codex-harness-vs-docs-campaign-on-terra.md)'s results review: classifier v1
missed six of Codex's seven approval requests in the wingfoil arm
([bug-035](../bug/bug-035-the-approval-classifier-v1-misses-codex-s-approval-requests.md)), so `c4c49685911c/1`
measures v0.2's manual with v1 on an unattended Codex, not WingFoil on Codex. v1 also reads an account of pending
documents as a request
([bug-027](../bug/bug-027-the-approval-classifier-v1-reads-an-account-of-pending-documents-as-an-approval-request.md),
the approver's decision of 2026-10-23: classifier v2). Planned in W16 of
[plan-005](../../plans/plan-005-release-v0-3.md); **brought ahead into W15 by the approver** (2026-10-26), after
campaign-005 and before task-103, so that dl-022's arm B can be rerun on policy v2 before the ChatGPT Plus subscription
ends on 2026-11-13.

No real-agent session: the task is offline, on the transcripts already committed. **Spending: 0 €.** The rerun is a new
campaign, consented separately in `campaign-cycle`.

**Done** means: approver policy v2 in the runner beside a frozen v1, its classifier fixing bug-027 and bug-035 on a
corpus of real final messages (Claude Code and Codex), its decision recorded, and the rerun's campaign file validating
on v2.

## Acceptance criteria

1. Policy `v2` is implemented beside `v1`; `v1`'s patterns, replies and cap are unchanged, so every published campaign
   that pins `v1` still reconstructs its interventions (dl-004). **Red-first** (`approverPolicy('v2')` defined; v1's
   pinning test untouched).
2. bug-027: under v2 an approval pattern counts only when the agent asks the requester (a first-person request, a
   phrase addressed to the reader); an account of documents pending approval ("the decision-log needs approval", "the
   task and decision log have been submitted and are pending approval") is not waiting. **Red-first**, on bug-027's
   v0.2 message and Codex's accounts from campaign-005's completed steps.
3. bug-035: under v2 the six requests v1 missed in `c4c49685911c/1` are waiting: five approvals ("Please reply:
   **Approved. Proceed.**" and its variants) and one question (S3 step 5, a question followed by an example).
   **Red-first**, on their final messages as fixtures.
4. **The corpus:** every final message of the v0.1, v0.2 and Codex executions (campaign-004, campaign-005) read by v1
   and v2; a test pins the messages whose reading changes, each named with the bug it answers; no other reading
   changes. **Characterization.**
5. REQ-RUN-06 amended (requirements 1.38: the classifier's version v2 and its requester rule) and classifier v2's
   decision-log drafted on dl-004's model, for the approver's gate. **Characterization** (documents).
6. The rerun's campaign file (`campaigns/codex-terra-harness-vs-docs-v2.yaml`, campaign-005's file with
   `approver_policy: v2`) and its dry-run profile validate, and the Codex scope (`src/cli/codex-scope.ts`, dl-025)
   accepts them. **Characterization**, red-first if the scope refuses them.

## Design

- **`src/core/approver.ts`:** `CLASSIFIER_V2` and `V2` beside v1's, which stay frozen; `POLICIES` gains `v2`. v2's
  rules, in order:
  1. an addressed request anywhere (v1's ANYWHERE patterns, plus "please reply", "reply (exactly) with/:" and
     "once you approve");
  2. "need/require … approval" only in a first-person or second-person sentence ("I need approval", "requires your
     approval"), not with a document as its subject (bug-027);
  3. a question: a sentence ending in `?` in the closing paragraph, not only on its last line (bug-035's S3 case).
  Code spans and fences removed as in v1. The exact patterns are settled on the corpus (criterion 4) and recorded in
  the decision-log; a pattern changed after it is v3.
- **Replies and cap** as v1's ("Approved. Proceed.", the question reply, 3 interventions): only the classifier changes,
  so v1 and v2 differ only in when the runner answers.
- **Fixtures:** the final messages only (text, no transcript), from committed results, under
  `test/fixtures/approver/`; a secret scan of them before the commit.
- **Not touched:** the presets keep `approver_policy: v1` — a preset change would change the identity of every
  campaign that extends it, campaign-005's included. The rerun's file sets `v2` itself.
- **Docs:** REQ-RUN-06 (1.38); the method page's approver paragraph names v1 and v2 and which campaigns pin which;
  campaign-005's Results review points to this task.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
