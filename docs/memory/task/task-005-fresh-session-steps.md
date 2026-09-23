---
id: task-005-fresh-session-steps
type: task
title: "Fresh-session steps"
status: pending
release: v0.1
wave: W2
features: [F2.2]
acceptance: [runner.feature]
requirements: [REQ-RUN-04, REQ-RUN-05, REQ-ARC-04, REQ-NFR-03]
---

## Context

Second task of wave **W2 — Agent in the loop** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It builds on task-003 (one container per run) and does not need the spike's answers: everything here
runs against a fake agent.

Scope of F2.2:

- **One session per step.** `AgentPort` stops being "run these commands" and becomes "run one
  session": the request carries the step's prompt, the model and the session id; the outcome carries
  the session id, its events and whether the session ended while waiting for input. Nothing of a
  session reaches the next one — only the repository carries state (REQ-RUN-04, partly: the real
  command line is task-006).
- **A snapshot per step (REQ-RUN-05).** After each step the runner commits the workspace with the
  message `step <NN>`, in the same isolated git environment as the seed commit, and stores that
  commit's patch as `steps/<NN>/diff.patch`. A step that changed nothing still gets its commit, so
  every step leaves a snapshot to score (experiment design §3.4).
- **The fake agent becomes a recorded-session fake.** Its script declares, per scenario and step, a
  session: the events it emits and the commands it runs in the container. It replaces the W1 script
  seam, which task-003 declared temporary. This is what lets W2's "Ends with", and later waves, run
  the whole pipeline without spending a token.
- **A multi-step fixture** (a T-scenario with five steps) for the acceptance test. `runner.feature`
  @F2.2 names S3, which is benchmark content and arrives in W8; the fixture stands in for it until
  then, with the same shape (five steps).
- Per-step artefacts are written in their REQ-FMT-06 places under
  `results/<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>/steps/<NN>/`. F5.1 (W7)
  completes the layout (`run.json` in full, `score.json`, `aggregate.json`).

Out of scope: usage and transcripts of a real agent (task-006), interventions and the approver policy
(task-007), cap enforcement (W5), arm setups (W3).

**Done** means: `runner.feature` @F2.2 passes against the fake ports — five sessions for a five-step
scenario, no state carried, a `step <NN>` commit and a `diff.patch` per step; tests, coverage and
lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.2 "Each step starts a new agent session" — one session per step, no
  conversation state from one to the next, and a commit per step naming only the step number.
  **red-first**
- REQ-RUN-05 — the commit message is exactly `step <NN>`, and `steps/<NN>/diff.patch` holds that
  commit's patch. **red-first**
- REQ-RUN-05 error path — a step that changes nothing is still committed and still has a (empty)
  patch, so step numbering never skips. **red-first**
- REQ-NFR-03 — a session that fails ends its run without stopping the campaign, as in W1.
  **characterization** (task-003's behaviour, kept honest across the new session seam)

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `f8a35c0`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W2 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-005-fresh-session-steps` → `7ef149e`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
