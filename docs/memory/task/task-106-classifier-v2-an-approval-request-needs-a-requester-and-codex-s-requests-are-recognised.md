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

- bug-035 and this task drafted on main (2026-10-26), approved by the approver (`4013f0bf`, `e8a855ef`);
  `memory submit` (backlog → in-progress, `d11841ba`) on main; worktree `../WingFoil2-Benchmark-wt/task-106`, branch
  `task/task-106`, its own `npm ci`.
- **The corpus, a deviation from the Design:** transcripts are git-ignored (published as release assets), so "from
  committed results" was not possible. `scripts/approver-corpus.mjs` reads the main checkout's local
  `results/**/transcript.jsonl` read-only: Claude Code's `result` events, Codex's last `agent_message` per thread;
  1048 messages (Claude Code 788, Codex 260), committed as text only in `test/fixtures/approver/corpus.json` (left out
  of prettier, being generated). Secret scan before the commit: the Codex credential's values (extracted in memory),
  token-shaped strings and the maintainer's names: clean. **For the approver:** the fixture makes public, once
  pushed, the final messages of executions never published (the dry runs, campaign-005); see the review question.
- **Red-first:** `0a39d12f` (policy v2, bug-027's accounts, bug-035's six requests) before `f60644a0`; `2811edaa` (the
  corpus's requests a first draft missed, accounts it must not read) before `c841b268`.
- **Settled on the corpus, by hand:** a first draft changed 45 readings; three were wrong ("using your reply
  "Approved. Proceed."" read as a request, twice; "can you send …?" read as an approval) and one request was lost
  ("it needs an approval I don't have"). A search of v2's negatives with approval words in their closing paragraphs
  found three more requests (Codex's "Please provide: Approved. Proceed.", "once you approve", "on your go-ahead",
  the last hidden from v1 by a code span). After review round 1: 48 of 1048 readings change (`v1-to-v2.json`,
  pinned), dl-026's counts. Conditional offers after finished work ("tell me and I'll change it") are left out on
  purpose.
- **v1's tests touched only where they named v2 as unimplemented:** `approver.test.ts` ("knows no other version"),
  `load.test.ts`, `run.test.ts` now name v3 (`95614027`); v1's patterns and its frozen-pattern test unchanged.
- **Criterion 6:** `campaigns/codex-terra-harness-vs-docs-v2.yaml` validates (`13fda3099afa`), inside dl-025's scope,
  differs from campaign-005's resolved file in `approver_policy` only (test). **No dry-run profile:** the estimate's
  key is scenario, arm, model and effort, not the policy, so campaign-005's dry runs serve its estimate (13.43 USD
  mean, 16.16 € high, API-equivalent); a v2 profile would only be needed for new dry runs.
- **A consequence found:** M-R across compares only executions on one approver policy (`campaign-compare.ts`), so the
  v2 rerun is not comparable across agents with the v1 Claude Code baselines; stated in dl-026 and on the method page.
- **Docs:** requirements 1.38 (REQ-RUN-06); the method page's {#approver-classifier} names v1's miss and v2, its source
  line updated — every published method page changes again at the next `bench site publish` (task-105's note
  stands); dl-026 drafted and submitted (draft → pending) on main.
- `wingfoil` commands (0.2-pre-3df305e): `memory add` (bug, task, decision-log) and `memory submit` behaved as
  declared, each auto-committing; no spurious output.
- **Checks:** `scripts/pre-review.sh main` green (after wrapping the method paragraph at 120); every unit test green,
  niced, 2 workers (1667 passed, 8 skipped).

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, from a `mktemp` directory; both checkouts' reflogs unchanged after it):
  v1 unchanged, dl-026's counts, the campaign file's claims, the extraction and the corpus's secret scan verified.
  - **should-fix, fixed:** the v2 campaign's estimate presented as campaign-005's without saying it is a lower bound
    for the wingfoil arm (9 of its dry runs' 17 steps stopped at a request v2 answers; checked; now stated in the
    campaign file and dl-026); `your … approval` quadratic on a long sentence (2.5 s at 200 KB; now from the first
    "your" only, an atomic lookahead, and a timing test); a reply asked for in backticks with no "please" missed (now
    a reply at a sentence's start); accounts after a reply read as requests ("with the reply …", "the approver's
    reply …", "with your go-ahead", "had been approved", "in reply to", "approval … I don't have anything", now
    pinned as negatives). Red first (`434efaa5`), then `812ca246`; one more request of the corpus read ("**Decision
    needed:** … Once approved, I will"), 48 readings.
  - **nits, fixed:** the question rule pinned in `CLASSIFIER_V2` and the frozen test, which compared v1's objects with
    themselves, now compares strings; the fixture's causes name task-106 for Claude Code's misses, bug-035 for
    Codex's; "pending your" stated as deliberate (dl-004); the corpus script's header says failed invocations are
    included; REQ-RUN-06's examples by agent; the method page says which campaigns pin which policy.
  - **nits, recorded:** the question rule reads the last **two** paragraphs, where bug-035 and the Design said the
    closing one, which misses bug-035's own S3 case (stated in dl-026); `f60644a0` to `564b5055` fail `load.test.ts`
    and `run.test.ts`, which named v2 as unimplemented, until `95614027` (the history is left as it is).
- **Round 2** (the same agent, the fix's diff only; reflogs unchanged): round 1's findings fixed or recorded as stated,
  the 48 readings and dl-026's counts verified, the 48th change a genuine request.
  - **should-fix, fixed:** the sentence-start `reply` pattern never matched "Reply:" or "Reply exactly:" (Codex's form
    without "please") and was cubic on a full stop followed by a long run of spaces (2.1 s at 40k); now one whitespace
    class per position, bullets and quotes included, and the spaces case in the timing test. Accounts the round-1
    patterns let back in ("On your go-ahead I approved …", "Once approved, dl-003 moved …", "if the reply is empty",
    "Reply received: …"): `once approved` and `on your go-ahead` now need a future form, `if the reply is` a quoted
    "Approved", `reply received|was|is` excluded; pinned as negatives. Red first (`0df1460d` before `55c88285`); the
    corpus's readings unchanged at 48.
  - **nits, fixed:** the method paragraph names every campaign on v1 (campaign-004 was left out); dl-026's wording
    matches the regexes (`a`/`an`, `approver's`) and says the account words are a list.

