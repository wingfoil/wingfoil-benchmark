---
id: dl-026-waiting-for-input-classifier-v2
type: decision-log
title: "Waiting-for-input classifier v2"
status: draft
tags: ["v0.3","approver"]
---

## Context

[dl-004](dl-004-waiting-for-input-classifier-v1.md)'s classifier v1 was written from Claude Code 2.1.280's sessions.
Two faults found since:
[bug-027](../bug/bug-027-the-approval-classifier-v1-reads-an-account-of-pending-documents-as-an-approval-request.md)
(an account of documents pending approval read as a request: v0.2's reference, a wasted round trip) and
[bug-035](../bug/bug-035-the-approval-classifier-v1-misses-codex-s-approval-requests.md) (six of Codex's seven
requests in [campaign-005](../campaign/campaign-005-codex-harness-vs-docs-campaign-on-terra.md)'s wingfoil arm
missed, so that execution measured the manual's stops more than WingFoil). The approver decided a classifier v2 for
bug-027 on 2026-10-23 and brought it ahead of W16 on 2026-10-26
([task-106](../task/task-106-classifier-v2-an-approval-request-needs-a-requester-and-codex-s-requests-are-recognised.md)).

v2 was settled on a corpus, not on imagined wording: every final message of every invocation in the local results'
transcripts, 1048 (Claude Code 788, Codex 260; `test/fixtures/approver/corpus.json`, extracted by
`scripts/approver-corpus.mjs`). Every message whose reading differs between v1 and v2 was read by hand.

## Decision

**Classifier v2**, over the final assistant message, with v1's preparation (code removed, case-insensitive) and order
(approval before question). `approver_policy: v2` denotes v2 with v1's replies and cap; **v1 stays implemented and
frozen**, so every campaign that pinned it still reconstructs its interventions.

**Rule 1 — approval request.** v1's patterns, except "need/require … approval", plus:

- `please (reply|respond|approve|review)`; `please provide … approved`
- `reply|respond … approved`, but not after `your` ("using your reply …" is an account)
- `(can|could|would|will) you (please) (approve|review)`
- `pending your`; `your go-ahead`
- `(once|when|after|until) … (is|are|gets|been) approved`; `(once|when|after|if) you approve`
- within one sentence: `need(s)/require(s) … your … approval`; `I (need|require) … approval`; `I am asking …
  approval`; `approval … I (don't|haven't) (have|got|received)`; v1's `let me know … (proceed|continue|approve)`

"need/require … approval" with a document as its subject ("these … need their own approval", "the task … is pending
approval") is no longer a request: it is bug-027's case.

**Rule 2 — question.** Otherwise, a `?` that ends a sentence anywhere in the **last two paragraphs** (v1: the last
line only), so that an example after a question does not hide it (bug-035's S3 case). A request for information
("can you send …?") is a question, never an approval: its reply would make no sense.

**Rule 3.** Otherwise not waiting. A failed session is never classified (unchanged).

**The corpus's readings.** 47 of 1048 change (`test/fixtures/approver/v1-to-v2.json`, pinned by a test): 35 approval
requests and 6 questions v1 missed (Codex 16, Claude Code 25), 3 accounts no longer read as requests (bug-027), and 3
requests asked as questions now read as approval requests. No other reading changes.

**Versioning.** Frozen with this decision: a pattern added or changed is `v3`.

## Consequences

- A rerun of dl-022's arm B on v2 (`campaigns/codex-terra-harness-vs-docs-v2.yaml`, `13fda3099afa`) measures WingFoil
  on Codex with its requests answered; its estimate reads campaign-005's dry runs (the policy is not in a dry run's
  key).
- Executions on v1 and v2 are not compared across agents: M-R across needs the same approver policy (REQ-SCO-07),
  so the v2 rerun is read within Codex, arm against arm.
- v2 answers more often than v1, for Claude Code too (25 of the corpus's messages): a v0.3 campaign of Claude Code
  pinning v2 is not comparable, intervention for intervention, with v0.2's on v1.
- Still a rule list: it will be wrong at the edges. Conditional offers after finished work ("tell me and I'll change
  it") are deliberately not requests.
