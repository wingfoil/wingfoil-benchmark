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

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

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
