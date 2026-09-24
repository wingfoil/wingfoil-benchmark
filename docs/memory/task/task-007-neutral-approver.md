---
id: task-007-neutral-approver
type: task
title: "Neutral approver"
status: in-progress
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

The Claude Code command line is the one the spike **measured** (P6), with the remaining cap. **W3 must
add the wingfoil arm's `--mcp-config` / `--strict-mcp-config` to this line as well as to the step's**,
or a resumed session would run without the arm's tools:
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
- **Invocations are combined in the runner.** `readSession` reads one stream; the step and its
  resumes are separate streams, so the step's work is their sum and its transcript their
  concatenation, in order. *(Corrected in review, see below: the cost is **not** summed — a resume
  reports the session's running total, so the step's cost is the latest. adr-002 amendment 1.)*
  The transcript is concatenated — a resumed stream does not replay earlier turns (task-004
  question 3), so what is not concatenated is lost. Asserted on the **step's** files, not only on
  the parser.
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
(the ids in `run.json` differ), the `step 01`–`step 03` commits in the workspace's own `git log`, a
patch per step, a `usage.json` per step equal to what the parser reads from its recordings together,
and two interventions with their kinds, replies and `approver_policy: v1`. It lives beside W1's in
`test/docker/`. bug-003 is live: the test must not be interrupted mid-run.

### Tests

- **Unit** (`core/approver`): both real wordings of dl-004 (the approval one is the test a
  trailing-question rule fails); each approval pattern; the order (a message that is both → approval);
  a pattern inside a code fence or inline code does not match; `?` only mid-message is not a question;
  trailing emphasis (`**…?**`) is; the `within one sentence` patterns do not match across a full stop.
- **Unit** (`agents`): `finalMessage` from the fixtures; the resume command line argument by argument;
  the fake's scripted resumes, including one it does not foresee.
- **Unit** (`runner`): work summed, cost the latest, transcript concatenated over a step's invocations; the cap at
  **3 and at 4** waiting sessions (the off-by-one); the run continuing after a capped step; the remaining
  cap passed to a resume; the id guard on a resume; a failed resume failing the run with its evidence kept.
- **Acceptance**, `@F2.4` × 4, through the fake replaying real recordings. The replies are asserted
  against the **literal strings of the feature file**, never against the constants under test; "the
  same in every arm" also asserts that the three runs were three different arms.

### What this task does not do

No real agent runs here, and nothing is spent. The intervention **cost** against the budget is W5;
governance metrics over interventions (F4.8) are W8; the method page is W11.

## Execution notes

### Build

- **Handoff asked for, not assumed.** Before the design, the W2 session that delivered task-004–006 was
  asked what they left for this one. Its answers shaped four decisions here: waiting stays out of the
  parser; the cap must not travel in `StepOutcome.error`, or a capped step fails its run; summing moves
  into the runner, where the parser's own test cannot see it; and the resume's cap must include the
  step so far. It also named the defects most likely to recur — an assertion comparing a value with
  itself, a double answering from its own argument, a vacuous "same in every arm" — and the tests were
  written against them.
- **The trimmed fixtures had lost the message the approver reads.** Found by reading them for this task:
  `question.jsonl` and `approval.jsonl` kept a `thinking` event but not the assistant's text. Their
  `result` event still carries it, and in the four untrimmed spike streams (P2, P4, P5, P6, in the
  shared checkout's `spikes/task-004/out/`) that field equals the last assistant text byte for byte.
  The fixtures were not re-trimmed; the design reads the field that is there.
- **TDD order, in the history:** every test red first (`5f8857a`, 61 red); the classifier and the
  policy, with the campaign refusing an unknown version (`196d8a9`); the port's `resume`, the parser's
  `finalMessage`, the adapter's resume line and the fake's scripted resumes (`e6548f5`); the step loop
  and `run.json` (`edc6539`); W2's "Ends with" against the real Docker (`a67bd5f`).
- **One existing acceptance test changed, on purpose.** `@F2.3` replayed `question.jsonl` as its second
  step; with the approver in place that session is answered, and the fake had no resume scripted for
  it. It now replays `completed-sonnet.jsonl`: a finished session from another model, so the two
  transcripts still differ. The scenario is about what a session records, not about who answers it.
- **The Docker test was written after the code, so its red is shown by mutation**, not by history:
  with the fake no longer passing the final message on, the run completes with no interventions and the
  test fails on them. It needs no credential and spends nothing (the plan-time decision).
- **The runner's policy guard was unreachable by the suites until tested directly**: validation refuses
  an unknown version first, so the runner's own check is exercised with a `CheckedCampaign` built by
  hand. A branch nothing can reach is what W1's review named a defect.
- **Mutations, each made, observed and reverted — 23, all red:** the cap tested with `>` instead of `>=`
  (2); the step's usage and transcript taken from the last invocation only (4, 4); a resume's cap
  ignoring the step so far (2); the id guard off on a resume (1); the cap reported as an error (2); the
  classifier's rules swapped (2); code not stripped (2); emphasis not stripped (1); a within-sentence
  pattern crossing a full stop (1), or stopping at a single line break (1); the replies swapped (6); a
  cap of 4 (4); the first result's message instead of the last (1); the fake or the adapter dropping the
  final message (6, 2); the fake's resume replaying the step's own session (4); `--model` added to the
  resume line (1); `run.json` without interventions (5) or with a constant step outcome (2); an unknown
  policy accepted by validation (1); a failed session classified anyway (1); and an intervention not
  recorded before the reply (the loop never ends: red by timeout). These are the mutations **I**
  thought of; the review is asked for the ones I did not.
- **Suites after the build:** `npm test` 423 passed, coverage 100% statements / 98.18% branches / 100%
  functions / 100% lines; `npm run test:bin` 4; `npm run test:docker` 2; `npm run lint` clean.

### Review, round 1 (before submitting)

- **Reviewer:** independent, on an export of HEAD, every finding proved by a probe; asked explicitly
  for mutations I had **not** listed. Result: 1 blocker, 9 minors, 2 nits.
- **B1, the blocker: a resumed step's cost was counted twice.** On a resume, `total_cost_usd` is the
  session's running total, not the invocation's: the spike's own P6 reports P4's cost plus its own.
  My build summed it — as adr-002 decision 8 said to, and as task-006's parser test pinned with two
  **unrelated** sessions, `completed.jsonl` + `resumed.jsonl`, for which summing is right. The one real
  session-and-resume pair, `question.jsonl` + `resumed.jsonl`, was in the same directory. Filed by the
  W2 session as [bug-004](../bug/bug-004-session-cost-is-cumulative-so-summing-it-double-counts.md)
  (its defect, merged in task-006) and fixed here by agreement, with that pair and literal figures:
  work summed, cost the latest (largest) total. adr-002 **amendment 1** records the corrected fact,
  with `duration_ms` shown per invocation by the span of P6's own events (the W2 session's
  measurement) and `duration_api_ms` left unmeasured and unused. Mutations: cost summed in the parser
  (2 red), in the runner (3), last-only in the runner (2).
- **What I take from it:** my Design cited "task-004 question 3" and adr-002 decision 8 as facts, and I
  re-read the spike's streams for this task — for the final message, not for the cost. Checking the
  one number that an intervention changes, against the one recording that has an intervention in it,
  was the obvious probe and I did not make it.
- **Minors fixed:** a dot inside a word (`config.yaml`, `v1.2`) ended a sentence, a false negative
  (m1); a closing fence carrying an info string closed the block, against CommonMark (m3); nothing
  pinned v1's pattern list, so adding a pattern left the suite green — now listed by a test (m4);
  twelve classifier mutations left green — case, `?`/`!` as sentence ends, indented, longer and tilde
  fences, fence character matching, the unclosed fence, blank lines of spaces, a whitespace-only last
  line, `\b` at both ends — all now red, plus two the review did not name (a lone backtick pairing
  across lines; the within-sentence order) (m5); the order of the intervention cap and the cost cap
  when both are reached, now pinned: the cap ends the step first (m6); the within-sentence patterns
  were quadratic — 400 KB of trigger words took 24 s — and are now read sentence by sentence, the
  last line trimmed by a loop (m7).
- **Minors recorded, not changed:**
  - **m2, rule 2 misses a question followed by punctuation or markup** — `(Which one?)`, `A or B?"`, a
    trailing HTML comment. This is dl-004's rule as written (trailing whitespace and emphasis only), so
    changing it is v2. A candidate for v2, named here so it is not rediscovered.
  - **m8, the resume line has no MCP flags** — W3's, now said in the Design above.
  - **m9, omitting `--model` on a resume rests on one Haiku session**, and Haiku is also the agent's
    own auxiliary model, so the evidence that a resumed *Sonnet* session stays on Sonnet is weak. Not
    changed without a measurement either way: **the release's validation run with the real agent
    (plan-003 step 4) must check the resumed stream's `init` model** on Sonnet 5.
  - Nits: a later result event with no `result` text clears an earlier message — deliberate, the last
    session's message is the one that counts (tested); "the same in every arm" cannot prove more than
    W2's arms allow, which the task already says.
- **Suites after the round:** `npm test` 436 passed, 100% statements / 98.25% branches / 100%
  functions / 100% lines; `npm run test:bin` 4; `npm run test:docker` 2; `npm run lint` clean.

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
- `npx wingfoil memory search --type task --status in-progress` → no match: the WIP slot was free.
- `npx wingfoil memory submit task-007-neutral-approver` → `fa4e69d`, on `task/task-007-neutral-approver`
  after the design commit `d1f55f6`. Declared: `backlog → in-progress`, a plain `submit` by the agent,
  one commit `wf(task): submit <id>`. Observed: exit 0, JSON `{from: backlog, to: in-progress}` on
  stdout, 1 file, diff limited to the `status` line. Matches.
