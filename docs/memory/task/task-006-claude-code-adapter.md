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
rejection_reason: "Independent review: two blockers and five majors. The token reaches run.json and stderr through processFailure when docker create fails (REQ-NFR-01); the F2.3 acceptance passes against a runner that invents usage, the third occurrence of covered-but-unasserted; a failed step discards the usage it already spent; the session guard compares an id with itself; terminal_reason never decides an outcome; the whole credential path and the remaining-cost arithmetic are unpinned. Back to build."
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

**Scrubbing (REQ-NFR-01).** Before anything a run produces is stored, every known secret value is
replaced with a fixed marker: **the credential this campaign passed into the container**. Known
values only — the scrubber removes what we can name, and the design says so rather than implying it
catches anything else. It covers the transcript **and the step patches**: the agent runs with
`bypassPermissions` and the credential in its own environment, so a patch is as reachable as a
transcript. The spike found no leak path, which is weaker than proof.

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

### Build

- **TDD order, in the history:** the parser, scrubber and token tests against the spike's real
  streams (red `9e30d8a`) → `readSession`/`scrub`/`loadAgentToken` (`7bb1595`); the fake's replay
  (red, then `65b3182`); the acceptance `@F2.3` (red) → the runner's writes (`636754e`); the
  adapter's command line (red) → `claudeCodeAgent` and the spending opt-in (`5f1dca0`).
- **A test of my own that could not fail.** The first version of "sums the result events of a step"
  asserted only that two invocations cost *more than one*. A parser keeping just the **last** result
  event also costs more than the first, so the mutation survived: 13 tests green with the sum
  removed. It now asserts the exact sum of cost, turns, tokens and duration. Found by mutating, not
  by reading — the method the task-005 review taught, applied before a reviewer had to.
- **Mutations run against the new code**, each reverted after: the outcome read from `subtype`
  instead of `is_error`; a missing `result` event treated as zero usage; the last result instead of
  the sum; the scrubber disabled; the token's whitespace kept; `usage.json` written empty; the
  transcript written without its lines; `run.json` without the approver policy. **Eight mutations,
  eight reds.**
- **`AVAILABLE_AGENTS` was deleted rather than extended.** With `claude-code` given an adapter, the
  check had no reachable failure: `agent.name` is an enum of exactly the two agents, and both run.
  Keeping it would have left a branch no valid campaign can reach — the defect W1's review named.
  What it protected is now a narrower guard about money (`--allow-spending`), recorded as amendment 2
  of adr-001.
- **The credential goes in at container creation and nowhere else.** `CreateRequest` gained `env`,
  and the docker port's test asserts both that the variable is passed **and** that the container
  still has exactly one mount — the isolation of REQ-RUN-02 is untouched by giving the agent a token.
- **task-005's shape assertion did its job.** Adding `remainingCostUsd` to `StepRequest` broke it, as
  task-005 predicted it would, and updating it cost the one line that was forecast.
- **The spike paid for itself here.** Seven fixtures under `test/fixtures/sessions/` are trimmed real
  streams, re-scanned for credentials before being committed. Every decision the parser makes —
  `subtype` can lie, a stream can end with no result, usage is per invocation — is tested against
  output the agent actually produced, and none of it cost a token in this task.
- **Suites after the build:** `npm test` 347 passed, coverage **100% statements** / 97.56% branches /
  100% functions; `npm run test:bin` 4; `npm run test:docker` 1; `npm run lint` clean.

### Review, round 1

- **Reviewer:** independent, read-only, on an export of HEAD, every finding proved by a probe. A new
  reviewer rather than task-005's: that one's context was already large, and a fresh one does not
  arrive looking for the previous task's defects.
- **Result: not approvable.** 2 blockers, 5 majors, 7 minors, 2 nits.

#### The two blockers

1. **The token reached `run.json` and stderr.** `dockerCli` put `--env ANTHROPIC_AUTH_TOKEN=<token>`
   on the command line, and `processFailure` renders the command line into the message it throws;
   the runner logs that message and `record()` writes it into `run.json`, which is committed. A name
   clash or a stopped daemon was enough. **Fixed:** only the variable **name** goes on the command
   line, and the value is handed to the `docker` process in its own environment. The same argv was
   also visible in `ps`.
2. **`@F2.3` passed against a runner that invents usage.** The doubles returned canned usage and the
   test compared the written files to the same literals. Replacing both writes with constants left
   all 347 tests green. **Fixed:** the scenario now drives a real run through the fake replaying two
   streams the agent produced during the spike, and asserts that what is on disk is what
   `readSession` computes from them — the two transcripts proved different, so one step's snapshot
   cannot stand in for another's.

#### The five majors

1. **A failed step threw away what it had spent.** The adapter threw, so `usage.json`,
   `transcript.jsonl` and the step's entry in `run.json` were never written: real money, `steps: []`,
   and the transcript — the only evidence of *why* — discarded. An agent now **reports** a failed
   session; the runner stores it, then fails the run.
2. **The session guard could never fire.** The parser kept the **first** `session_id`, which is the
   one the init event echoes back from `--session-id` — so the runner compared an id with itself. It
   now takes the id from the `result` event. This is the same defect I had claimed to remove by
   deleting `AVAILABLE_AGENTS`, written ten lines further down.
3. **`terminal_reason` never decided an outcome**, though adr-002 decision 6 says it does. A session
   cut off by `--max-budget-usd` — reachable in W2, since this task emits the flag — was scored as a
   completed step with truncated work. A session now completes only when `is_error` is not `true`
   **and** `terminal_reason` is `completed`.
4. **The whole credential path was unpinned:** dropping `containerEnv`, dropping `env` from the
   create request, or building the adapter with an empty token each left 347 tests green — the first
   two silently unauthenticate every run, the third silently disables the scrubber. The credential is
   now required whenever the agent is not the free one, **injected ports included**: requiring it
   only for real ports is what left the path untested.
5. **`remaining()` was asserted by nothing.** Returning the cap unconverted, or never subtracting
   what previous steps spent, both passed. The command-line test pinned the *formatting* of a
   hand-supplied number. It is now asserted across two steps.

#### Minors and nits, all fixed

A line parsing to `null` crashed the parser instead of failing the session; `diff.patch` was neither
scrubbed nor ignored, while the agent runs with `bypassPermissions` and the credential in its own
environment; the Design promised a scrubber wider than the one built (corrected to what it does, and
patches are now scrubbed too); `run.json`'s contents were unpinned; adr-002 decision 13 was never
exercised end to end (B2's fix does it); `realPorts` handed the Claude Code adapter to **any**
non-`fake` agent, so adding one to the enum would have given it this command line and this
credential — the selection is now exhaustive over the enum and a new agent is a build error;
`AgentPort` lived in the fake adapter with the real one importing it from there, and now lives in
`agents/port.ts`; `--allow-spending` was silently accepted by `validate`; and the notes said eight
fixtures where there are seven.

#### What I take from it

The review confirmed my eight mutations were real — it re-ran all eight. That was never the problem.
**I mutated what I already had in mind.** Two blockers and five majors lived where I had not thought
to look, and the one I had flagged to the reviewer as my weakest point (the `@F2.3` doubles) I
flagged instead of fixing. A mutation I choose is a test of my imagination, not of the code.

#### Mutations re-run after the fixes

Each made, observed, reverted: the token back on the argv (2 red); the runner writing constants for
usage and transcript (1 red); `remaining()` unconverted (1 red); `remaining()` never subtracting
(1 red); `run.json` without its steps (1 red); `containerEnv` dropped (1 red); `env` dropped from the
create request (1 red); the adapter built with an empty token (1 red); the patch left unscrubbed
(1 red); a third agent added to the campaign enum (a **type error**, as intended).

**Suites after the round:** `npm test` 356 passed, coverage 100% statements / 98.26% branches;
`npm run test:bin` 4; `npm run lint` clean.

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

### Back into review

- **`npm run test:docker` green** (1 test, 2.6 s), once the machine was rebooted. It had been failing
  on a container left behind by a test run I killed with a wrapper timeout — filed as
  [bug-003](../bug/bug-003-an-interrupted-run-leaves-its-container-behind.md), not fixed here.
- **A wrong diagnosis of mine, corrected in bug-003.** I wrote that the stale container had wedged
  Docker. It had not: the host was in a kernel-level stall — ~300 threads uninterruptible on ACPI
  embedded-controller queries, load average 327, `systemd` itself in `D` — so containerd could not
  reap a zombie shim and every `docker rm` queued behind a `runc create` that would never return. I
  had taken `docker version` still answering as evidence that the daemon was healthy; that call does
  not touch the stuck container and proved nothing either way. The same shape as the defects this
  task's review found: a check that cannot fail, read as if it had passed.
- **Suites at HEAD:** `npm test` 356 passed, 100% statements / 98.26% branches; `npm run test:bin` 4;
  `npm run test:docker` 1; `npm run lint` clean.
