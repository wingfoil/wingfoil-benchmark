---
id: task-007-neutral-approver
type: task
title: "Neutral approver"
status: backlog
release: v0.1
wave: W2
features: [F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-06, REQ-RUN-07, REQ-RUN-17]
---

## Context

Fourth and last task of wave **W2 — Agent in the loop** of release v0.1
([rel-v0-1](../release/rel-v0-1.md)). It closes the wave: "a multi-step run with usage captured and
interventions counted". It needs task-004 (the classifier's rules), task-005 (sessions) and task-006
(resuming a session).

F2.4 is the wave's high-uncertainty feature ([07_sequencer.md](../../01_vision/07_sequencer.md) 1.1):
what is uncertain is settled by task-004 before this task starts.

Scope of F2.4:

- **The classifier (REQ-RUN-06).** A fixed, versioned, rule-based classifier over the session's final
  assistant message: approval patterns first, then a trailing question. Its version is part of the
  approver policy version the campaign pins (`approver_policy: v1`), so a campaign's replies can
  always be reconstructed from what it pinned.
- **The policy (experiment design §3.5, decision 2).** An approval request gets *"Approved.
  Proceed."*; a question gets *"No further input is available. Make the most reasonable choice,
  record it, and proceed."*; after **3 interventions** the step ends with the outcome
  `intervention cap reached`.
- **The reply (REQ-RUN-07).** It resumes the same session (`--resume <session-id> -p <reply>`), and
  every reply is recorded as an intervention: step, kind and reply text. Interventions and the policy
  version are part of the run's record, so M-K2 (interventions per run) can be computed in W6.
- **The same policy in every arm.** The acceptance scenario runs a campaign with the baseline,
  baseline-docs and wingfoil arms; in W2 those arms have no environment of their own (F2.5 and F2.7
  are W3), so what the test proves is exactly what it claims: the replies, their order and the
  recorded policy version do not depend on the arm.
- **REQ-RUN-17, the W2 half.** The decision is always the neutral approver's; the agent only executes
  it. The other half — the wingfoil arm declaring a "Benchmark Approver" member and the container's
  git identity being that member — belongs to the arm definitions (F2.5, W3), and the method page's
  statement to W11. This split is recorded, not left implicit.
- **W2's "Ends with".** An integration test against the real Docker (`npm run test:docker`) runs a
  multi-step scenario whose recorded sessions include one question and one approval: it asserts one
  session per step, a `step <NN>` commit and a patch per step, usage recorded per step, and the
  interventions counted with the policy version. Recorded in `rel-v0-1` in the deliver phase, as W1's
  was.

Out of scope: the intervention **cost** against the budget (W5), governance metrics over
interventions (F4.8, W8), the method page (W11).

**Done** means: the four @F2.4 scenarios pass against fake ports, the integration test above is green
against the real Docker, the wave's "Ends with" is recorded in `rel-v0-1`, and tests, coverage and
lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.4 "The neutral approver answers an approval request" — the reply is
  *"Approved. Proceed."*, and one intervention is recorded for that step. **red-first**
- `runner.feature` @F2.4 "The neutral approver answers a question" — the reply is the question reply
  of policy v1, and one intervention is recorded. **red-first**
- `runner.feature` @F2.4 "A step ends after the maximum number of interventions" — a fourth waiting
  session in the same step gets no reply, and the step's outcome is `intervention cap reached`.
  **red-first**
- `runner.feature` @F2.4 "The policy is the same in every arm" — the same recorded session in the
  three arms receives the same replies in the same order, and each run's record names the policy
  version. **red-first**
- REQ-RUN-06 — the classifier's order is proven: a message that is both an approval request and ends
  in a question is classified as an approval request. **red-first**
- W2 "Ends with" — a multi-step run in a real container, with usage captured per step and
  interventions counted. **red-first**
- REQ-RUN-06 (versioning) — a campaign naming an approver policy the runner does not implement is
  refused at validation, rather than run under v1. **red-first** (added in the design phase)

## Design

Conventions from [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md) and
[adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md); the classifier is
[dl-004](../decision-log/dl-004-waiting-for-input-classifier-v1.md), taken as a specification: its
rules are not re-decided here. Builds on task-005's session seam and task-006's adapter.

**Classification confirmed:** every criterion is **red-first**, and one is added (the last below).
Nothing of the approver exists yet. The traceability test turns red the moment this task starts,
because `@F2.4` has four scenarios and no acceptance test: that is the first red.

### What the recordings say, and one thing they do not

The spike's streams are the test material again, and reading them for this task turned up a gap.
The trimmed fixtures `question.jsonl` and `approval.jsonl` kept the `system` and `result` events and
one `thinking` event, but **not the assistant's text** — the very message dl-004 classifies. What they
still hold is the `result` event's `result` field. In the four untrimmed spike streams kept in the
shared checkout (P2, P4, P5, P6), that field is **byte-identical to the last assistant text** in every
case. So:

- **the final assistant message is read from the last `result` event's `result` field.** It is one
  field the agent writes for exactly this purpose, it is present in the fixtures, and a session with no
  `result` event is already a failed step (adr-002 decision 7), which the classifier never sees;
- the transcript that is stored stays the bytes the agent produced. Stripping code before matching is
  the **classifier's** preparation (dl-004), not the extraction's.

### Where "waiting" lives

**Not in the parser.** A waiting session ended `is_error: false`, `terminal_reason: "completed"`,
exactly like one that finished (dl-004 observation 1). `readSession` keeps its two outcomes; it only
additionally returns `finalMessage`, and `StepOutcome` carries it. Whether that text is waiting is the
approver's reading, not the agent's: that is what makes the policy the same whatever the agent or arm.

### The approver (`core/approver.ts`)

Pure, with no I/O, in `core` so that the campaign schema can check a version against it:

- `classify(message): 'approval' | 'question' | undefined` — dl-004 v1 verbatim: code fences and
  inline code removed, case-insensitive; rule 1 (approval patterns, **anywhere**, `…` meaning within
  one sentence) before rule 2 (the last non-empty line, trailing whitespace and Markdown emphasis
  removed, ends with `?`);
- `APPROVER_POLICIES = { v1: { classify, replies: { approval, question }, maxInterventions: 3 } }` —
  the replies of experiment design §3.5 byte for byte.

**A campaign naming a policy that does not exist is refused** at validation (`approver_policy: v2` →
"is not an approver policy this runner implements: v1"). Without it a `v2` campaign would silently run
v1 and its interventions could not be reproduced from what it pinned — the failure dl-004's versioning
exists to prevent. This is the added criterion.

### Resuming (REQ-RUN-07)

`AgentPort` gains `resume(request)`, beside `runStep`. `StepRequest` is left alone: F2.2's shape
assertion is what keeps a conversation history off a *fresh* step, and a resume is a different
request, not a step with an extra field. `ResumeRequest` holds the scenario, the step, the intervention
number, the session id, the reply, the remaining cap and `run`.

The Claude Code command line is the one the spike **measured** (P6), with the remaining cap:
`claude --resume <id> -p <reply> --output-format stream-json --verbose --permission-mode
bypassPermissions --setting-sources project --max-budget-usd <remaining>`. **No `--model`**: the spike
resumed without it and the session kept its pinned model (the resumed init reads the dated id of the
same Haiku), and adding a flag nobody measured with `--resume` is the kind of thing task-006 learned
not to do with `--max-budget-usd 0`. The id guard applies to a resume as to a step: the session that
answers must be the one that was resumed.

The fake's scripted step gains `resumes: [{ commands?, events }]`, one per expected intervention; a
resume the script does not foresee is an error, as an unscripted step already is.

### The step loop

For one step: run the session; then, while it did not fail, classify its final message:

1. not waiting → the step is `completed`;
2. waiting and fewer than 3 interventions so far → record `{ step, kind, reply }`, resume with the
   policy's reply, and classify the resumed session in turn;
3. waiting with 3 interventions already made → no reply; the step's outcome is
   **`intervention cap reached`**.

Decisions, with the reasons:

- **The cap is not an error.** `StepOutcome.error` fails the run; §3.5 says the step ends and §3.6
  that a step hitting a cap is scored as it stands. So a step has an outcome of its own —
  `completed`, `intervention cap reached` or `failed` — and **the run goes on to the next step** after
  a capped one. Only `failed` stops the run.
- **Invocations are summed in the runner.** `readSession` sums the result events of one stream; the
  step and its resumes are separate streams, so the step's usage is their sum and its transcript their
  concatenation, in order — a resumed stream does not replay earlier turns (task-004 question 3), so
  what is not concatenated is lost. Asserted on the **step's** files, not only on the parser.
- **The remaining cap includes the step so far.** A resume is told the run's cap less the finished
  steps **and** this step's invocations until now, and it is refused like a step when nothing is left.
  Otherwise a resume would be offered the whole remaining cap again.
- **One snapshot per step,** after the last invocation: `step <NN>` and one patch, whatever the number
  of interventions (REQ-RUN-05).

### What the run records

`run.json` gains, per step, its `outcome` and its interventions, and at the run level the list of
interventions `{ step, kind, reply }` (REQ-RUN-07) next to the `approver_policy` it already names.
That is what M-K2 (interventions per run) needs in W6, with nothing else to recover.
`steps/<NN>/usage.json` and `transcript.jsonl` hold the step's totals across its invocations.

### REQ-RUN-17, split on purpose

This task delivers the half that is the runner's: **the decision is always the neutral approver's** —
the reply is chosen by the policy from the text alone, and the agent only receives it. The other half —
the wingfoil arm's WingFoil configuration declaring a "Benchmark Approver" member with the `approver`
role, and the container's git identity being that member — is part of the arm definitions (F2.5,
**W3**), and the method page's statement is **W11**. Recorded here, and again in `rel-v0-1` at delivery,
so that W3 cannot close without it.

### W2's "Ends with" against the real Docker

A second fixture scenario, `T1`, three steps, run by `bench campaign run` against the real Docker with
the fake replaying the spike's recordings (the approver's plan-time decision: **no credential, no
spending**):

- step 1 — `question.jsonl`, resumed with the question reply into `resumed.jsonl`;
- step 2 — `approval.jsonl`, resumed with `Approved. Proceed.` into `completed.jsonl`;
- step 3 — `completed.jsonl`, no intervention.

Each step's commands write a file, so each patch is distinct. The test asserts one session per step
(the ids in `run.json` differ, and each is the one of its resumes), the `step 01`–`step 03` commits in
the workspace's own `git log`, a patch per step, a `usage.json` per step equal to the sum of its
recordings, and two interventions with their kinds, replies and `approver_policy: v1`. It lives beside
W1's in `test/docker/`. bug-003 is live: the test must not be interrupted mid-run.

### Tests

- **Unit** (`core/approver`): both real wordings of dl-004 (the approval one is the test a
  trailing-question rule fails); each approval pattern; the order (a message that is both → approval);
  a pattern inside a code fence or inline code does not match; `?` only mid-message is not a question;
  trailing emphasis (`**…?**`) is; the `within one sentence` patterns do not match across a full stop.
- **Unit** (`agents`): `finalMessage` from the fixtures; the resume command line argument by argument;
  the fake's scripted resumes, including one it does not foresee.
- **Unit** (`runner`): usage summed and transcript concatenated over a step's invocations; the cap at
  **3 and at 4** waiting sessions (the off-by-one); the run continuing after a capped step; the remaining
  cap passed to a resume; the id guard on a resume; a failed resume failing the run with its evidence kept.
- **Acceptance**, `@F2.4` × 4, through the fake replaying real recordings. The replies are asserted
  against the **literal strings of the feature file**, never against the constants under test; "the
  same in every arm" also asserts that the three runs were three different arms.

### What this task does not do

No real agent runs here, and nothing is spent. The intervention **cost** against the budget is W5;
governance metrics over interventions (F4.8) are W8; the method page is W11.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `b3f55b7`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W2 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-007-neutral-approver` → `4fb9c8c`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- `npx wingfoil memory approve task-007-neutral-approver --reason "…"` → `9f83bd6`, run after the
  approver's explicit consent in chat. Declared: `pending → backlog` gate, approver role checked,
  subject with `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0,
  empty stderr, subject `wf(task): approve task-007-neutral-approver [pending → backlog]`,
  both trailers present, 1-line diff. Matches.
