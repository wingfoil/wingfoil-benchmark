---
id: task-006-claude-code-adapter
type: task
title: "Claude Code adapter"
status: in-progress
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

Conventions from [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md) and
[adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md), whose decisions 1–13 were settled by
the spike ([task-004](task-004-waiting-for-input-and-credentials-spike.md)). Builds on task-005's
session seam.

**Classification confirmed:** every criterion is **red-first**. Nothing here exists yet.

### What this task does not have to discover

The spike ran the real agent, so the following are facts rather than assumptions, and the design
rests on them instead of on the documentation: every REQ-RUN-04 flag exists in 2.1.280 and
`--max-budget-usd` means what the requirement says; a headless session exits rather than blocking;
the `result` event carries `session_id`, `total_cost_usd`, `usage.{input_tokens, output_tokens,
cache_creation_input_tokens, cache_read_input_tokens}`, `num_turns`, `duration_ms` and
`duration_api_ms`; `subtype` can read `success` on a failed session; a stream can end with **no**
`result` event at all; and `ANTHROPIC_AUTH_TOKEN` authenticates while `ANTHROPIC_API_KEY` does not.

**The spike's recordings become this task's fixtures.** `spikes/task-004/out/*.jsonl` are real
streams from the pinned agent: a trivial session, the same on Sonnet 5, a session ending in a
question, one ending in an approval request, a resumed session, and two authentication failures (one
of which has no `result` event). Trimmed copies go under `test/fixtures/sessions/`, so the parser is
tested against output the agent actually produced rather than against output we imagined. P8 already
scanned them: no credential appears in any of them, and the trimming is re-scanned before they are
committed.

### The adapter (`agents/claude-code.ts`)

A second `AgentPort` beside the fake one (REQ-ARC-04). It runs the agent **inside the run's
container**, through the Docker port, and parses what comes back.

**The command line (REQ-RUN-04):** `claude -p <prompt> --output-format stream-json --verbose --model
<id> --session-id <uuid> --permission-mode bypassPermissions --setting-sources project
--max-budget-usd <remaining run cap>`. Asserted argument by argument, as the Docker and git ports
already are. The wingfoil arm's `--mcp-config` / `--strict-mcp-config` are W3.

`StepRequest` gains **one** field, the remaining run cap in USD, which is what `--max-budget-usd`
needs. Task-005's shape assertion lists the request's keys exactly and will fail until it is updated:
that is the tripwire working, and updating it is the one line task-005 predicted.

**Reading a session** (adr-002 decisions 6–10):

- the outcome comes from `is_error` and `terminal_reason`, **never from `subtype`** — the spike
  recorded `"subtype": "success"` on a session that authenticated nothing;
- a stream that ends with no `result` event is a **failed step**, not a step with zero usage;
- usage is **summed over a step's invocations**. Only one invocation exists until task-007 adds
  resumes, so the seam is built here and exercised there: `runStep` returns the sum of the result
  events it saw, not the last one;
- the model recorded is the campaign's pin, not a key of `modelUsage`, which the spike saw holding
  both an alias and a dated id for one session.

**What it writes**, under the run's output directory (REQ-FMT-06):

- `steps/<NN>/usage.json` — tokens by kind, the API-equivalent cost in USD **and** in EUR converted
  with the campaign's `usd_to_eur` (REQ-RUN-09, sequencer decision 1: the API-equivalent cost is
  recorded whatever the billing), turns, wall time;
- `steps/<NN>/transcript.jsonl` — the full event stream, scrubbed, **git-ignored** (REQ-RES-06);
- `run.json` — minimal: the run's identity, the campaign and execution it belongs to, the agent and
  model pinned, the approver policy version, and the per-step outcomes. This is adr-002 decision 11,
  named in this task's Context so the wave cannot end without it. F5.1 (W7) completes it.

**Scrubbing (REQ-NFR-01).** Before a transcript is stored, every known secret value is replaced with
a fixed marker: the token the runner passed, and any value of `ANTHROPIC_*` in the runner's own
environment. Known values only — the scrubber removes what we can name, and the design says so rather
than implying it catches anything else. The spike found no leak path, which is weaker than proof.

### Credentials (REQ-RUN-15, as amended in requirements 1.3)

The token is read at container creation from a file the operator names (`BENCH_AGENT_TOKEN_FILE`),
whitespace stripped, and passed as `ANTHROPIC_AUTH_TOKEN` in the container's environment. A value
that is empty after stripping is refused **before** a container starts, with a message naming the
file — the spike lost a session to a pasted newline and learned it only from the agent's own error.
Nothing is mounted, so W1's single-mount check (REQ-RUN-02) stays exactly as it is (adr-002
decision 5).

### The image and the command

The Dockerfile already installs the agent when the campaign names it, so nothing changes there.
`bench campaign run` stops refusing `claude-code` — which spends **adr-001 default 7** and needs an
amendment to that ADR, recorded with this task.

**Spending stays deliberate.** Until the budget guard exists (F1.3, W5), a campaign whose agent is
not `fake` runs only with `--allow-spending` on the command line. Without it the command refuses,
naming the campaign's own ceiling so the operator sees what they would be authorising. This keeps
plan-003's rule true of the code and not only of the process.

### The fake agent replays recorded sessions (adr-002 decision 13)

The scripted step gains an optional `events` file: a recorded stream the fake replays instead of
inventing one. The same parser reads it, so the acceptance tests exercise the real path end to end
with no agent and no spending. This is the other decision named in this task's Context.

### What this task does not do

No real agent runs here. The evidence that the parser matches reality is task-004's recordings; the
end-to-end run with a real agent stays in the release's validation phase
([plan-003](../../plans/plan-003-release-v0-1.md) step 4). **This task spends nothing.**

### Tests

- **Acceptance** (`test/acceptance/runner.test.ts`), `@F2.3`: usage and transcript recorded for every
  session, against fake ports fed by a recorded stream.
- **Unit:** the command line, argument by argument; the parser against each recorded fixture,
  including the stream with no `result` event and the one whose `subtype` lies; the USD→EUR
  conversion with the campaign's rate; the scrubber, with a token planted in a stream; the credential
  file (missing, empty, whitespace-only, with an embedded newline); the CLI's refusal without
  `--allow-spending` and its acceptance with it.
- **No Docker test is added.** W2's "Ends with" is task-007's, and it covers this path.

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
