---
id: task-006-claude-code-adapter
type: task
title: "Claude Code adapter"
status: backlog
release: v0.1
wave: W2
features: [F2.3]
acceptance: [runner.feature]
requirements: [REQ-RUN-04, REQ-RUN-09, REQ-RUN-15, REQ-RUN-16, REQ-ARC-04, REQ-NFR-01]
---

## Context

Third task of wave **W2 — Agent in the loop** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It needs task-005 (the session seam) and the answers of task-004 (the spike): the command line, the
event shape and the credential path are all settled there before any code is written here.

Scope of F2.3:

- **The adapter** `agents/claude-code.ts`, an `AgentPort` like the fake one (REQ-ARC-04), which runs
  the agent **inside the run's container** through the Docker port, with the command line of
  REQ-RUN-04: `-p <prompt> --output-format stream-json --verbose --model <id> --session-id <uuid>
  --permission-mode bypassPermissions --setting-sources project --max-budget-usd <remaining run cap>`.
  The wingfoil arm's `--mcp-config` / `--strict-mcp-config` arrive with the arms in W3.
- **Usage (REQ-RUN-09):** tokens by kind, cost in USD converted with the campaign's `usd_to_eur`,
  turns and wall time, taken from the stream-json `result` event and written to
  `steps/<NN>/usage.json`. The API-equivalent cost is recorded whatever the billing (sequencer
  decision 1), so a subscription run still reports what it would have cost on the API.
- **Transcript:** the full event stream in `steps/<NN>/transcript.jsonl`, scrubbed of known secret
  values before it is stored (REQ-NFR-01) and **git-ignored** (REQ-RES-06; compressing it and
  attaching it to a release is W10).
- **Credentials (REQ-RUN-15):** the subscription's credentials mounted read-only at run time, or an
  API key through an environment variable. W1's isolation check accepts exactly one mount; it becomes
  an **allow-list of exactly two** — the run's workspace, and the credential mount, read-only and
  outside the repository. Everything REQ-RUN-02 and REQ-CLI-10 forbid stays forbidden, and the check
  keeps asking Docker rather than trusting what the runner asked for.
- **The image installs the agent** at the campaign's `agent.version` (REQ-RUN-16); the Dockerfile
  already does this when the campaign names `claude-code`. `bench campaign run` stops refusing that
  campaign, which spends adr-001 default 7 and needs an **amendment to adr-001**.
- **Spending stays deliberate.** Until the budget guard exists (F1.3, W5), a campaign with a real
  agent runs only with an explicit opt-in on the command line; without it the command refuses, naming
  what it would have spent against. This keeps plan-003's rule ("no run with a real agent without the
  approver's explicit consent") true of the code and not only of the process.

**Two decisions of [adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md) land here, and
nowhere else in W2.** Added after task-005's review raised them (approver, 2026-09-24): decision 11
says the per-step artefacts include a **minimal `run.json`** from W2, and decision 13 says the fake
agent **replays recorded stream-json sessions**. Task-005 does neither, and says so in its own
Design — which is correct for that task but leaves the wave able to end without them. They are named
here so that it cannot: this task is not done until both hold, or until adr-002 is amended by the
approver.

Out of scope: cap enforcement and the campaign ceiling (REQ-RUN-08, W5), quota exhaustion
(REQ-RUN-13, W5), the setup phase and its separate cost (F2.5, W3), the results store (F5.1, W7).

**Done** means: `runner.feature` @F2.3 passes against fake ports — usage and transcript recorded for
every session — the adapter's command line matches REQ-RUN-04 token by token, no secret appears in
any stored file, and tests, coverage and lint pass. No real agent runs in this task: the real-agent
evidence is task-004's.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.3 "The Claude Code adapter records usage and the transcript of every session"
  — input, output and cache tokens, the API-equivalent cost, wall time and turns per session, and the
  full transcript stored with the run. **red-first**
- REQ-RUN-04 — the command line is built exactly as specified, with the model, the session id and the
  remaining run cap. **red-first**
- REQ-RUN-09 — the USD cost of the `result` event is converted with the campaign's rate, and is
  recorded even when the run is billed to a subscription. **red-first**
- REQ-RUN-15 — credentials reach the container only as a read-only mount or an environment variable,
  and the mount allow-list still refuses any third mount. **red-first**
- REQ-NFR-01 — a known secret value present in the event stream is not in the stored transcript.
  **red-first**
- REQ-RUN-16 / adr-001 default 7 — a campaign naming `claude-code` is no longer refused, and runs
  the pinned version; without the explicit opt-in it is refused for spending, not for availability.
  **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `0ae42bd`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W2 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-006-claude-code-adapter` → `7fd597c`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- `npx wingfoil memory approve task-006-claude-code-adapter --reason "…"` → `d7e7da8`, run after the
  approver's explicit consent in chat. Declared: `pending → backlog` gate, approver role checked,
  subject with `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0,
  empty stderr, subject `wf(task): approve task-006-claude-code-adapter [pending → backlog]`,
  both trailers present, 1-line diff. Matches.
