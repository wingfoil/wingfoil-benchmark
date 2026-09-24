---
id: adr-002-w2-runner-and-adapter-conventions
type: adr
title: "W2 runner and adapter conventions"
status: pending
---

## Context

Wave W2 of release v0.1 puts the agent in the loop (task-005 F2.2, task-006 F2.3, task-007 F2.4).
[adr-001](adr-001-w1-toolchain-and-runner-conventions.md) fixed the toolchain and the W1 runner;
it did not cover sessions, usage, credentials or the shape of a step's output.

This ADR records two kinds of decision, kept apart on purpose:

- **the defaults the approver accepted in the W2 plan phase** (2026-09-23), before anything was
  built, recorded in task-004's Context;
- **what the spike** ([task-004](../task/task-004-waiting-for-input-and-credentials-spike.md))
  **found** against Claude Code 2.1.280 in the run image, which changed two of them.

## Decision

### Authentication (REQ-RUN-15)

1. **The default is a long-lived token in `ANTHROPIC_AUTH_TOKEN`**, created by the approver with
   `claude setup-token`, kept in a file of their own outside the repository, read by the runner at
   container creation and passed as an environment variable. It is never mounted, never written to
   the workspace, the logs, the transcripts or the results.
2. **`ANTHROPIC_API_KEY` is not interchangeable with it.** The spike put the same token in it: the
   agent emitted `system/api_retry` events in a loop and produced no `result` event at all. The
   variable is part of the decision, not an implementation detail.
3. **A credential is sanitised or refused.** Whitespace, including an embedded line break left by a
   paste, is stripped before the value is passed; a value that is still malformed is refused with a
   message naming the problem, rather than after a session has been started and billed.
4. **The read-only mount of REQ-RUN-15 stays a documented variant, not the default**, and it does not
   work as the requirement describes it: mounting only `.credentials.json` makes Docker create
   `/home/node/.claude` owned by `root`, where the agent cannot write. Choosing that variant requires
   the run image to create that directory owned by `node` first. With the token default the agent
   creates it itself and keeps `projects/` and `sessions/` there — which is what `--resume` needs.

### Isolation

5. **The container keeps exactly one mount: the run's workspace.** The plan-phase default foresaw an
   allow-list of two, the second being the credential mount. With decision 1 there is no second
   mount, so W1's check (REQ-RUN-02, verified against Docker itself) stays as it is. This supersedes
   the condition written into task-006's approval; the intent of that condition — that credentials
   never widen isolation — is met more strictly by not mounting them at all.

### Reading a session (REQ-RUN-09, F2.3)

6. **A step's outcome is read from `is_error` and `terminal_reason`, never from `subtype`.** The
   spike recorded a failed session whose result event read `"subtype": "success"` together with
   `"is_error": true`.
7. **A stream with no `result` event is a failed step.** The adapter never assumes one arrives.
8. **Usage is summed over a step's invocations** — the step and every resume of it. `--resume`
   reports its own usage, not the session's total, so reading the last result event would
   under-report exactly the steps that needed an intervention.
9. **A run's model is the campaign's pin.** `modelUsage` keyed one session under both
   `claude-haiku-4-5` and `claude-haiku-4-5-20251001`; the keys are not an identity to record.
10. **A run's transcript is the concatenation of its invocations.** A resumed stream does not replay
    the earlier turns.

### Output and caps

11. **Per-step artefacts go in their REQ-FMT-06 places** from W2:
    `results/<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>/steps/<NN>/{usage.json,
    transcript.jsonl, diff.patch}`, plus a minimal `run.json`. F5.1 (W7) completes the layout.
    Transcripts are git-ignored from W2 (REQ-RES-06); compressing them and attaching them to a
    release is W10.
12. **`--max-budget-usd` is emitted in W2 and enforced in W5.** The flag exists in the pinned version
    and means what REQ-RUN-04 assumes, so the run cap does not have to be re-implemented in the
    runner.
13. **The fake agent replays recorded stream-json sessions.** It replaces W1's command script and is
    what lets every later wave exercise the whole pipeline without spending.

## Consequences

- **An amendment to REQ-RUN-15 is proposed to the approver** with this ADR: the long-lived token in
  an environment variable becomes the default, and the read-only mount is kept as a variant with
  decision 4's condition attached. Nothing is changed in the requirement until the approver accepts.
- **task-006's approval carried a condition that decision 5 supersedes.** It is recorded here rather
  than silently dropped, because the approval commit is the record of what was agreed.
- **adr-001 default 7** ("only `fake` is registered; `claude-code` is refused") is spent in task-006,
  where a campaign naming `claude-code` starts running. Until F1.3 (W5) exists, spending stays behind
  an explicit opt-in on the command line.
- **A session has a fixed cost floor.** A one-word reply cost about a cent, almost all of it the
  agent's own system prompt — some 20 000 cached tokens before the step's prompt is read. The W5
  budget and M-K3 have to model a per-session floor, not a per-token slope alone.
- Changing any decision here is a new ADR that supersedes this one, as adr-001 established.
