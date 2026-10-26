---
id: dl-026-waiting-for-input-classifier-v2
type: decision-log
title: "Waiting-for-input classifier v2"
status: approved
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
- `reply|respond … "approved` (the reply quoted), but not after `your`, `the`, `this`, `that`, `a`/`an`, `approver's`
  or `in`, nor as `reply received|was|is` ("using your reply …", "with the reply …", "in reply to", "reply received"
  are accounts); the excluded words are a list, and other wording of an account ("following your exact reply …") is
  still read as a request (dl-004: a false negative costs more); `if the reply is "approved`
- `reply` at a sentence's or a line's start, a bullet or a quote included, then `:`, `with`, `and`, `to
  proceed|continue|approve` or the sentence's end (the reply's words in backticks, which the preparation removes)
- `(can|could|would|will) you (please) (approve|review)`
- `pending your` — deliberately read as a request, as v1 reads "awaiting your approval" (dl-004: a false negative
  costs more than a false positive)
- `(once|when|after|until) … (is|are|gets) approved` (never "had been approved"); `once approved … I will|will|can`;
  `(once|when|after|if) you approve`; `(await|awaiting|need|want) your go-ahead` and `I will … on your go-ahead`
  (never "with", "on" or "thanks for" your go-ahead in an account)
- `approval (that) I (don't|haven't) (have|got|received)`
- within one sentence: `need(s)/require(s) … your … approval` (from the sentence's first "your" only, so that the
  match stays linear); `I (need|require) … approval`; `I am asking … approval`; v1's `let me know …
  (proceed|continue|approve)`

"need/require … approval" with a document as its subject ("these … need their own approval", "the task … is pending
approval") is no longer a request: it is bug-027's case.

**Rule 2 — question.** Otherwise, a `?` that ends a sentence (past closing emphasis, quotes or brackets) anywhere in
the **last two paragraphs**, split at blank lines (v1: the last line only), so that an example after a question does
not hide it (bug-035's S3 case; bug-035 and the task's Design said "the closing paragraph", one too few for it). A
request for information ("can you send …?") is a question, never an approval: its reply would make no sense.

**Rule 3.** Otherwise not waiting. A failed session is never classified (unchanged).

**The corpus's readings.** 48 of 1048 change (`test/fixtures/approver/v1-to-v2.json`, pinned by a test): 36 approval
requests and 6 questions v1 missed (Codex 16, Claude Code 26), 3 accounts no longer read as requests (bug-027), and 3
requests asked as questions now read as approval requests. No other reading changes. Accounts written after a reply,
which the corpus holds few of and a rerun on v2 will hold many of, are pinned as negatives by constructed cases.

**Versioning.** Frozen with this decision: a pattern added or changed is `v3`.

## Consequences

- A rerun of dl-022's arm B on v2 (`campaigns/codex-terra-harness-vs-docs-v2.yaml`, `13fda3099afa`) measures WingFoil
  on Codex with its requests answered; its estimate reads campaign-005's dry runs (the policy is not in a dry run's
  key) and is a lower bound for the wingfoil arm: in its four dry runs 9 of 17 steps stopped at a request v1 missed,
  ended without their work, and would be answered under v2.
- Executions on v1 and v2 are not compared across agents: M-R across needs the same approver policy (REQ-SCO-07),
  so the v2 rerun is read within Codex, arm against arm.
- v2 answers more often than v1, for Claude Code too (26 of the corpus's messages): a v0.3 campaign of Claude Code
  pinning v2 is not comparable, intervention for intervention, with v0.2's on v1.
- Still a rule list: it will be wrong at the edges. Known gaps, left as they are (task-106's review round 3): a
  reply asked for after a comma or an adverb ("To continue, reply with …", "If you agree, reply …") is missed; a few
  accounts read as requests ("Once approved, I implemented it and the tests will run …", "Reply came back …",
  "- Reply with 401 when …"). Conditional offers after finished work ("tell me and I'll change
  it") are deliberately not requests.
