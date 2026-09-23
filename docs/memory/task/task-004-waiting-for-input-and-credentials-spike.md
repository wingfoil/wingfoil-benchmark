---
id: task-004-waiting-for-input-and-credentials-spike
type: task
title: "Waiting-for-input and credentials spike"
status: backlog
release: v0.1
wave: W2
features: [F2.3, F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-06, REQ-RUN-15, REQ-NFR-01]
---

## Context

First task of wave **W2 — Agent in the loop** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It is the spike the specification asks for by name: REQ-RUN-06 ("waiting-for-input detection, spike
in W2") and REQ-RUN-15 ("whether a read-only mount lets the agent refresh its token is to be verified
in the W2 spike"). F2.4 is the one high-uncertainty feature of the wave
([07_sequencer.md](../../01_vision/07_sequencer.md) 1.1).

It is a **knowledge task**: it adds no behaviour and no code under `src/`. It implements none of the
scenarios of `runner.feature`; it is traced to that file because its findings are what W2's @F2.3 and
@F2.4 scenarios will be built against. Its probes are throwaway scripts, kept outside the package.

It is the only task of W2 that spends tokens. The approver authorised **up to about 1 € equivalent**
on the maintainer's Claude subscription (plan phase, 2026-09-23). If the questions below are not
settled within that, the spike stops and reports what is still open rather than spending more.

### Questions to answer

1. **Does a headless session ever block?** With `claude -p … --permission-mode bypassPermissions`
   inside the run container, does the process ever wait for input, or does it always exit? This
   decides whether "waiting" is an observed state or, as REQ-RUN-06 assumes, an inference from the
   final assistant message.
2. **What does the stream-json stream look like** for the pinned agent version: the shape of the
   final assistant message, and the fields of the `result` event that carry tokens by kind, cost in
   USD, turns and duration (REQ-RUN-09).
3. **Does `--resume <session-id> -p <reply>` continue that same session** after the first process has
   exited, in the same container, and does the resumed part appear in the transcript (REQ-RUN-07)?
4. **Are the REQ-RUN-04 flags accepted as written** by the pinned version (`--output-format
   stream-json --verbose --model --session-id --permission-mode bypassPermissions --setting-sources
   project --max-budget-usd`), and does any of them behave differently from its documentation?
5. **Credentials (REQ-RUN-15):** does a read-only mount of the subscription's credential file let the
   agent run, and what happens when the token needs refreshing? What the API-key fallback needs.
6. **What is there to scrub (REQ-NFR-01):** which secret values appear in the stream-json output, in
   the transcript and in the workspace.
7. **How real approval requests and questions are worded**, as the material the classifier's rules
   are written from, and which agent version was probed (the candidate for the campaign's
   `agent.version`, REQ-RUN-16).

### W2 plan-phase decisions (accepted by the approver, 2026-09-23)

Recorded here because they shape task-005, task-006 and task-007, and they are written up with the
spike's answers in the ADR below.

1. **The spike is its own task, first of the wave**, so that the consent to spend is a gate of its
   own and the answers precede the design of F2.3 and F2.4.
2. **Spending:** up to about 1 € equivalent, on the subscription, for this task only.
3. **W2's "Ends with" is verified with the real Docker and a fake agent that replays recorded
   sessions**, not with a real agent. The evidence that a real agent behaves the way the fake
   replays it comes from this spike; the end-to-end run with a real agent stays in the release's
   validation phase ([plan-003](../../plans/plan-003-release-v0-1.md) step 4).

### Produces

- a **decision-log** with the waiting-for-input classifier v1: its rules, their order (approval
  patterns first, then a trailing question), and how its version binds to the approver policy version
  (REQ-RUN-06);
- **adr-002**, the W2 runner and adapter conventions: what this spike found, plus the design defaults
  of W2 (per-step artefacts written in their REQ-FMT-06 places, the credential mount and the mount
  allow-list, the recorded-session fake agent, `--max-budget-usd` emitted but not enforced until W5);
- a note against REQ-RUN-15 and, if the observed behaviour departs from the specification, an
  amendment proposal for the approver rather than a silent deviation.

**Done** means: the seven questions are answered with evidence from a real run, the decision-log and
adr-002 are written, the spending is reported, and nothing of the maintainer's credentials reached
the workspace, the logs, the transcripts or this repository.

## Acceptance criteria

No Gherkin criterion and no classification: this task adds no behaviour, so there is nothing to
test-drive. Its exit criteria are the seven questions above, each answered with the command that was
run and what it printed, recorded in the Execution notes.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `678c6a2`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W2 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-004-waiting-for-input-and-credentials-spike` → `f7b7d9e`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- `npx wingfoil memory approve task-004-waiting-for-input-and-credentials-spike --reason "…"` → `80ccf67`, run after the
  approver's explicit consent in chat. Declared: `pending → backlog` gate, approver role checked,
  subject with `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0,
  empty stderr, subject `wf(task): approve task-004-waiting-for-input-and-credentials-spike [pending → backlog]`,
  both trailers present, 1-line diff. Matches.
