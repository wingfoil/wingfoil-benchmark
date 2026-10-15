---
id: task-094-a-codex-agent-adapter-and-s3-s-baseline-compared-across-agents-spike
type: task
title: "A Codex agent adapter and S3's baseline compared across agents spike"
status: in-progress
release: v0.2
wave: calibration
features: []
acceptance: []
requirements:
  [REQ-FMT-01, REQ-RUN-04, REQ-RUN-09, REQ-RUN-12, REQ-RUN-13, REQ-RUN-15, REQ-RUN-16, REQ-NFR-01, REQ-SCO-07, REQ-SCO-13]
fixes: []
tags: ["spike","agent","codex","determinism"]
---

## Context

plan-004 step 3-bis, approved by the approver in chat on 2026-10-15 and agreed with the coordination session WFCoord:
a **Codex agent adapter** and a small **cross-agent comparison**, kept **outside** the v0.2 reference campaign. The
Claude pin (task-093: Claude Code 2.1.300) and dl-017 do not change; the v0.2 campaign files are not touched.

- **The adapter.** `codex` (OpenAI's Codex CLI) behind `src/agents/port.ts`, beside `claude-code` and `fake`.
  `src/core/campaign.ts` accepts only `agent.name: claude-code | fake` (`AGENT_NAMES`): the schema change and a
  requirements amendment are part of this task.
- **The credential:** the maintainer's ChatGPT Plus subscription (valid until **2026-11-13**), under
  [dl-019](../decision-log/dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md)
  (approved `f10f5ce`): `auth.json` in `$HOME/.codex-bench/`, mounted read-write as a single file into a per-run
  `CODEX_HOME`, with its bounds 1–9. Codex on Plus takes no token in the environment (dl-019's context).
- **Cost:** API-equivalent whatever the billing (sequencer decision 1). `codex exec --json` reports tokens and no
  cost, so the adapter prices them from a **pinned OpenAI list-price table** and records `costBasis: price-table`,
  flagged as [bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md)
  requires. The subscription's own charge is a note in `docs/calibration/v0.2-ledger.md`, not a per-run cost.
- **The comparison:** S3@1.0 (v0.1's cheapest scenario, 0.84 € in the baseline on Sonnet 5), the **baseline arm
  only** (the other arms are Claude-specific: `CLAUDE.md`, `.claude/`, `mcp.json`, the wingfoil manual), Claude Code
  at task-093's pin against Codex, reading **M-R1 and M-R2 across agents**, as experiment design §4.5 foresees ("from
  v0.2 they also apply across agents, once a second agent exists").

**Done** means: the adapter, its schema and requirements amendment, and the across-agent M-R delivered offline and
green; the consented real sessions run, each a ledger line; M-R1 and M-R2 within and across agents reported, labelled
preliminary; dl-019's end (logout, deletion) recorded; WFCoord told the merge sha.

## Acceptance criteria

<!-- Requirement criteria; each red test is committed on its own before its code. -->

1. `agent.name: codex` is accepted, with Codex's effort levels; a level Codex does not take is refused for it, and
   `claude-code`'s levels are unchanged (REQ-FMT-01, REQ-RUN-16). **Red-first.**
2. The Codex command line of a step and of a resume (REQ-RUN-04 as amended). **Red-first.**
3. A Codex `--json` stream read as a session: tokens summed over `turn.completed`, cached input split from fresh
   input, the outcome (completed, failed, no `turn.completed`), the final message, the thread id
   (REQ-RUN-09 as amended). **Red-first**, on fixtures in the documented shape, then on P0's real stream.
4. A Codex session priced from the pinned table, `costBasis: price-table`: flagged in the aggregate as bug-016 asks,
   and accepted by the estimate as priced by the benchmark, while `unknown` is still refused (REQ-RUN-09).
   **Red-first.**
5. Codex's usage-limit and rate-limit messages reported as `quota exhausted` and `rate limited` (REQ-RUN-13).
   **Red-first**, on fixtures marked *documented, not observed* until a real session shows one.
6. The manual copied as `AGENTS.md` for `codex`; `CLAUDE.md` for `claude-code` unchanged; the leak scan reserves
   `AGENTS.md` (REQ-RUN-12). **Red-first**; Claude's path **characterization**.
7. The Codex credential (REQ-RUN-15, REQ-NFR-01 as amended, dl-019 bounds 4 and 7): `BENCH_CODEX_AUTH_FILE`
   preflighted (a regular file, mode `600`, outside the repository, every worktree and the workspace); mounted
   read-write as a single file at the per-run `CODEX_HOME/auth.json`; a `config.toml` written by the runner; no
   credential in the environment. **Red-first.**
8. Scrubbing: the token values of `auth.json` read before and after each invocation and scrubbed from the transcript
   (REQ-NFR-01). **Red-first.**
9. The runner's session id kept for a Codex step; the adapter maps it to Codex's thread id for a resume.
   **Red-first.**
10. The run image installs `@openai/codex@<version>` when `AGENT_NAME=codex` (docker test). **Red-first.**
11. `bench campaign compare` records **M-R1–M-R3 across the two executions** for each matched group whose per-run
    pins are equal (REQ-SCO-07, REQ-SCO-13 as amended): M-R1 over the pooled runs, M-R2 and M-R3 over the pairs with
    one run on each side, beside each side's own M-R. **Red-first.** Comparisons without it, and v0.2's comparison
    rows, unchanged: **characterization**.
12. End to end, offline: `bench campaign run` of S3's baseline with a `codex` stub that replays the fixtures in the run
    container (docker test), with no credential leaving the run. **Red-first.**
13. `claude-code` and `fake` unchanged: the existing suites. **Characterization.**

## Design

### What is amended first (one `docs(spec)` commit before any test)

- **Requirements 1.32:**
  - REQ-FMT-01: `agent.name` adds `codex`; `agent.effort` levels per agent (`codex`: `minimal`, `low`, `medium`,
    `high`, `xhigh`, as F2 reads them from the pinned CLI; `none` for no setting);
  - REQ-RUN-04: Codex's command line (below);
  - REQ-RUN-09: Codex's usage from `turn.completed`; the cost from the price table; `price-table` as a basis
    priced by the benchmark, flagged, not refused;
  - REQ-RUN-12: the manual's file per agent (`CLAUDE.md`, `AGENTS.md`), the same bytes;
  - REQ-RUN-13: Codex's limit messages;
  - REQ-RUN-15: a Codex paragraph (dl-019; `CODEX_API_KEY` named as the variant dl-019's option A would take);
  - REQ-NFR-01: dl-019 named as the only exception to its read-only mount;
  - REQ-SCO-07 and REQ-SCO-13: M-R across two executions (below).
- **Experiment design 1.4, §4.5** — the amendment the brief asks about. It is needed: §4.5 says M-R "also apply across
  agents" but not how groups are formed, and REQ-SCO-07 computes M-R only over runs "sharing all pins", which two
  agents never do. 1.4 makes it precise:
  - **the groups:** two executions, one per agent, with the same scenario version and the same arm; the agent's
    pins (name, version, model, effort) are the only pins that differ, and are named. Per-run pins (scenario hash,
    harness commit, scorer) must be equal, as within a group;
  - **within an agent:** each side's own M-R, as today;
  - **across agents:** M-R1 over the pooled runs (a hidden test agrees when every run of both sides gives it the same
    verdict); M-R2 and M-R3 as the mean Jaccard over the **cross pairs** only (one run from each side), so that the
    across value is read against each side's within value, not mixed with it;
  - **reading:** across lower than both within values says the agents differ beyond their own variation; with n < 3
    per side it is preliminary (§4.6) and no "beyond variance" claim is made. No threshold (§4.5).
  - The doc-versioning directive's version bump and its approval go with this task's in-review → approved.
- **plan-004** gains step 3-bis's row (this task, outside the campaign).

### The adapter (`src/agents/codex.ts`)

Mirrors `claude-code.ts`: a `readCodexSession` parser, `codexAgent(options)` behind `AgentPort`, every outcome
reported rather than thrown.

- **Step command** (inside the container, `/workspace` as the working directory):
  `codex exec --json --model <id> -c model_reasoning_effort=<level> --dangerously-bypass-approvals-and-sandbox
  --skip-git-repo-check <prompt>` (flags confirmed by F2 against the pinned CLI's `--help`; any one missing there is
  a question for the approver, not a substitute). Bypassing the sandbox is acceptable for the reason Claude's
  `bypassPermissions` is: the container is isolated (REQ-RUN-02).
- **Resume:** `codex exec resume <thread-id> --json … <reply>`, with the effort as on the step (dl-015).
- **Session id:** Codex picks its own (`thread.started`'s `thread_id`). The adapter reports the runner's id back once a
  `thread.started` was seen, keeps runner id → thread id for the resume, and leaves the thread id in the transcript.
  The runner's check (`run.ts`, "not in the one it was given") is unchanged.
- **Usage:** summed over `turn.completed` events: `inputTokens` = `input_tokens` − `cached_input_tokens`,
  `cacheReadInputTokens` = `cached_input_tokens`, `cacheCreationInputTokens` = 0, `outputTokens` = `output_tokens`.
  Whether `input_tokens` includes the cached ones, and whether `reasoning_output_tokens` is inside `output_tokens`
  (OpenAI's API counts reasoning as output), is read from P0's stream before the parser is final; a double count is
  the first thing the review checks. `turns` counts `turn.completed` events — not Claude's `num_turns` (API round
  trips): the comparison says so beside the turn count. `models` holds one key, the model, with `costBasis:
  price-table`.
- **Cost:** `src/agents/openai-prices.ts`, the pinned table (input, cached input, output, per million tokens), its
  source URL and the date read, for the model F1 names only. A model missing from it prices as `unknown` (refused by
  the estimate, bug-016).
- **The cap:** Codex has no `--max-budget-usd`. The runner's checks between invocations (`remaining <= 0`,
  `step_tokens`) and `step_time_s`'s `timeout` bound a Codex session; `remainingCostUsd` is not on its command line.
  No money is at stake on the subscription; the caps bound the plan's quota and the time.
- **Limits:** a usage-limit or rate-limit message (`error` event or a failed turn, shape from Codex's docs and
  source at the pinned tag) → `quota exhausted` / `rate limited`, waited out as REQ-RUN-13 says for Claude.
- **Scrubbing:** before and after each invocation the adapter reads the `tokens` values of the host's `auth.json`
  into memory (never logged) and scrubs the stdout of both sets.

### The runner, the image, the preflight

- `src/cli/shared.ts`: `codex` → `codexAgent`; its credential is a **mount**, not an environment variable.
- `src/cli/preflight.ts`: `BENCH_CODEX_AUTH_FILE` required for `codex` (dl-019 bound 7: refused inside the
  repository, a worktree under `../WingFoil2-Benchmark-wt/` or the workspace; not a regular file; mode wider than
  `600`). The file's content is never read by the preflight.
- `src/runner/run.ts`: for `codex`, a per-run `CODEX_HOME=/home/node/.codex-run` (outside `/workspace`) with a
  `config.toml` the runner writes (`cli_auth_credentials_store = "file"`, telemetry and history persistence off as
  F2 finds the keys; REQ-RUN-18 records them in `telemetry_off`), and `-v <auth file>:/home/node/.codex-run/auth.json`
  (read-write, dl-019 bound 4). The manual goes to `AGENTS.md`. One Codex run at a time (bound 5): the campaign file
  runs sequentially, as every campaign does today.
- `docker/run-image/Dockerfile`: `AGENT_NAME=codex` installs `@openai/codex@${AGENT_VERSION}`.
- **What Codex keeps in `CODEX_HOME`** between the steps of a run (sessions, history, memories) is listed by F3; any
  of it that a **new** session reads is turned off in `config.toml`, so that only the repository carries state between
  steps (F2.2). If it cannot be turned off, the task stops and asks.

### The across-agent M-R (`src/results/campaign-compare.ts`)

For each matched group (scenario version and arm in both; the default groups are cross-model, T14), `m_r_across`:
the runs compared on each side, the pins that differ (expected: the agent's), and M-R1–M-R3 as 1.4 says, reusing
`aggregate.ts`'s `agreement` and `similarity` over the pooled runs and the cross pairs. `comparison_version` bumps;
the comparison page is unchanged in this task (the values are read from the JSON; showing them on the site is for
v0.3 if the approver wants it).

### Free phase, before any session (no consent needed)

`spikes/task-094/probe.sh F1 F2 F3`, output in the main checkout's git-ignored `spikes/task-094/out/`:

- **F1, the release and the price.** `npm view @openai/codex dist-tags time`: the candidate is `latest` on the day
  (0.162.1, 2026-10-09, at design); its CHANGELOG / release notes for `exec --json`, `resume`, auth and effort. The
  model: Codex's default for a ChatGPT plan at that version, from its docs and source; its **OpenAI API list price**
  from OpenAI's pricing page, copied with the date into `openai-prices.ts`. If the plan's model has no published API
  price, the task stops and asks (no API-equivalent cost could be stated).
- **F2, the binary.** Image `bench-spike-task-094-codex-<version>` from `docker/run-image` with `AGENT_NAME=codex`:
  `codex --version`, `codex exec --help`, `codex exec resume --help`, the effort levels, the config keys for credential
  store, telemetry and history.
- **F3, a rehearsal with a stub.** `codex` replaced by a stub replaying the fixtures; no credential: the command lines,
  the mount, `config.toml`, the scrub (a fake `auth.json` planted and found by the scan), the refusals of
  `BENCH_CODEX_AUTH_FILE`.
- **The login (the approver, by hand; dl-019 bound 3).** In a throwaway container of F2's image, with
  `$HOME/.codex-bench/auth.json` created empty (mode `600`) and bind-mounted as a single file at
  `/home/node/.codex-run/auth.json`, `CODEX_HOME=/home/node/.codex-run codex login --device-auth`. It also tests
  bound 4: if the login cannot write through a single-file mount, the task stops and asks. I hand the exact command
  over; I never read the file.

### The real sessions (the consent is this task's pending → backlog approval)

Planned in the week of **2026-11-02 to 2026-11-06**, before calibration part 2 and the subscription's end, from the
main checkout. Every session is S3@1.0, baseline arm. Order: Codex first (no money), then Claude.

| # | Agent | Model, effort | What | Steps | Cap | Real spending |
|---|---|---|---|---|---|---|
| P0 | Codex `<F1's version>` | F1's model, `medium` | S3 step 1 by `probe.sh P0`, outside the runner: the real stream for the parser, and one `resume` | 1 | `step_time_s` 3600 s; API-equivalent ≤ 1 USD expected | **0 €** (Plus) |
| CX-D | Codex | same | `bench dry-run` of S3 baseline | 5 | `run_cost_eur` 3 € API-equivalent, between invocations | **0 €** |
| CX-1, CX-2 | Codex | same | `bench campaign run campaigns/x-codex-s3-codex.yaml`, `repetitions: 2` | 5 each | 3 € each API-equivalent; campaign ceiling 6 € | **0 €** |
| CC-D | Claude Code 2.1.300 | `claude-sonnet-5-5`, `medium` (dl-018) | `bench dry-run` of S3 baseline | 5 | `run_cost_eur` 3 € (`--max-budget-usd`) | ≤ 3 € |
| CC-1, CC-2 | Claude Code 2.1.300 | same | `bench campaign run campaigns/x-codex-s3-claude-code.yaml`, `repetitions: 2` | 5 each | 3 € each; campaign `warn_eur` 4, `ceiling_eur` 6 | ≤ 6 € |

- **Total consented:** Claude **at most 9 €** (API-equivalent on the maintainer's Claude subscription, as every ledger
  line); **expected about 2–3 €** (v0.1's S3 baseline 0.84 € on Sonnet 5, Sonnet 5.5's cache reads at half,
  `medium`). Codex **0 €** of real spending: four sessions' worth of the Plus plan's quota; their API-equivalent cost
  (expected a few euro, unknown until P0) is recorded and flagged `price-table`, not spent.
- **Stops:** a failed session or run is not repeated without new consent. If P0 fails, or its stream cannot be read
  as designed, the task stops and asks before CX-D. If CC-D costs more than 2 € (over twice the expectation), it
  stops and asks before CC-1. A run stopped by the plan's quota is recorded, not repeated.
- **The subscription's end** (WFCoord, 2026-10-15): the Plus subscription is not renewed after 2026-11-13, so every
  Codex session is planned for 2026-11-02 to 11-06, with no slot after the 13th. Extra credits are bought only for a
  run the approver names as fundamental that finds the quota exhausted: that is new spending, asked for with its
  amount, never assumed by this consent.
- **The campaign files** `campaigns/x-codex-s3-codex.yaml` and `x-codex-s3-claude-code.yaml`: S3@1.0, `arms:
  [baseline]`, `repetitions: { S3: 2 }`, the caps above, `step_time_s: 3600`, `step_tokens: 20000000`,
  `usd_to_eur: 0.8851`, approver policy v1. Their results' small files are committed on main after the runs, since
  `bench campaign compare` reads committed results; transcripts are not committed (REQ-RES-06).
- **The comparison:** `bench campaign compare <claude>/1 <codex>/1`, then `bench score … --final` for both:
  M-R1, M-R2 (and M-R3) within each agent (n = 2) and across, with the M-Q1 scores and costs beside them, all
  labelled preliminary.
- **Secret scan** closing every stage that ran Codex or Claude: `grep -rlFf <(…)` over `out/`, the run's results and
  the spike's directory, with Codex's token values extracted from `auth.json` by `jq` into a descriptor (never
  printed) and Claude's from `BENCH_AGENT_TOKEN_FILE`; an empty extraction or a `grep` error fails the stage.

### The ledger and the end

- One line of `docs/calibration/v0.2-ledger.md` per session (P0, CX-D, CX-1, CX-2, CC-D, CC-1, CC-2): date, element,
  kind, consent (this task's pending → backlog commit), agent and version, model and effort, ceiling, cost (Codex:
  API-equivalent, `price-table`, 0 € spent), source. A note: Codex's sessions drew on the ChatGPT Plus subscription,
  its own charge not a per-run cost.
- **dl-019's end** (bound 8): after CC-2's comparison, or on 2026-11-13, I hand the approver `codex logout` with that
  `CODEX_HOME` and the deletion of `$HOME/.codex-bench/`; the date goes to the ledger.

### Checks, review, WIP

- Day checks only, niced (`nice -n 19 ionice -c3`): vitest `--maxWorkers=2` on the touched tests, `npm run lint`,
  `npx tsc --noEmit -p .`; `npm run test:bin` if CLI output changes; the docker tests of criteria 10 and 12.
  The full suites (`scripts/full-suites.sh`) only when the approver asks; green suites on the offered commit gate
  in-review → approved.
- The offline work (criteria 1–13) is reviewed by an independent read-only agent **before** any real session, one
  round at a time until clean; the real sessions and the comparison get their own round before in-review.
- Anything wrong in the benchmark that the spike finds is a bug or a decision-log, not fixed here. A WingFoil friction
  is a new `docs/wingfoil-feedback/F-<nnn>-…` note.
- The worktree: `../WingFoil2-Benchmark-wt/task-094` on `task/task-094`, its own `npm ci`. The real sessions run
  with the main checkout as the working directory (its `results/`, `campaigns/` and token files), invoking the
  worktree's built CLI (`node ../WingFoil2-Benchmark-wt/task-094/dist/…`) at a commit named in each ledger line, since
  main has no `codex` adapter before the merge; `spikes/task-094/` writes into the main checkout's ignored `out/`, as
  task-093's did. The campaign files are committed on the branch and copied, unchanged, to main with the results.

## Execution notes

- `npx wingfoil memory add --type task --title "A Codex agent adapter and S3's baseline compared across agents spike"
  --tags "spike,agent,codex,determinism"`, on main. Declared: the element from the template in `draft`, one commit.
  Observed: `e2a7a10`, `status: draft`, `tags` written, the other fields empty (W-02). Matches.
- dl-019 before it: `memory add` `d3a2e74`, body `9baf6f9`, `memory submit` `0c98ad2` (`draft → pending`, `status`
  only), the approver's `memory approve` `f10f5ce` (`pending → approved`). Each matches its declaration.
- The approver's `memory approve task-094-… --reason "…"` → `de6922f` (`pending → backlog`), on main; its reason names
  the seven sessions, their caps, 0 € for Codex and at most 9 € for Claude. Matches.
- `npx wingfoil memory submit task-094-…`, in the linked worktree `WingFoil2-Benchmark-wt/task-094` with its own
  `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, `f5c3729`,
  one file, `status` only. Matches.

### The free phase (2026-10-15, no credential, no session)

Output in the main checkout's git-ignored `spikes/task-094/out/`.

- **F1, the release** (`probe.sh F1`, `111e195`): `@openai/codex` `latest` **0.162.1** (2026-10-09T19:50Z). Its source
  at `rust-v0.162.1` (`out/f1/source/`, URLs in `out/f1/sources.txt`), read for what the adapter rests on:
  - `exec_events.rs`: `thread.started` (`thread_id`), `turn.started`, `turn.completed` (`usage`: `input_tokens`,
    `cached_input_tokens`, `cache_write_input_tokens`, `output_tokens`, `reasoning_output_tokens`), `turn.failed`
    (`error.message`), `item.*` (`agent_message`, `reasoning`, `command_execution`, `file_change`, …), `error`;
  - `event_processor_with_jsonl_output.rs`: `turn.completed`'s usage is `usage.total`, the **thread's running
    total**, not the turn's;
  - `codex-api/src/sse/responses.rs`: `input_tokens` is the API's, with `cached_input_tokens` and
    `cache_write_input_tokens` inside it (its own test: 100 = 40 cached + 60 written); `reasoning_output_tokens` is
    read from `output_tokens_details`, so inside `output_tokens`;
  - `login/src/auth/storage.rs`: `auth.json` is saved by `truncate(true).write(true)` and `write_all`, in place, not
    by a rename: a single-file bind mount survives a refresh (dl-019 bound 4);
  - `protocol/src/error.rs`: the usage limit's text ("You’ve hit your usage limit…"), "Quota exceeded. Check your
    plan and billing details.", "rate limit exceeded: …";
  - `models-manager/models.json`: `gpt-6.1-sol` has priority 1 among the listed models, is available on `plus`, is
    `supported_in_api`, 272 K context, default effort `low`, levels `low` … `ultra`; `manager.rs` takes the default
    model by priority;
  - `config/src/types.rs`, `features/src/lib.rs`: `history.persistence = "none"`, `analytics.enabled`,
    `features.memories` (off by default), `otel.exporter`.
  - **The price** (`out/f1/pricing.txt`): OpenAI's pricing page, Standard tier, read 2026-10-15: `gpt-6.1-sol` 2.00
    input, 0.10 cached input, 2.50 cache writes, 10.00 output per million tokens up to 272 K input tokens — the same
    list prices as Sonnet 5.5's. Its context window is 272 K, so the long-context tier is never reached.
- **F2, the binary** (`probe.sh F2`): `codex-cli 0.162.1`; `codex exec --help` and `codex exec resume --help` hold
  every flag the Design names (`--json`, `--model`, `-c`, `--dangerously-bypass-approvals-and-sandbox`,
  `--skip-git-repo-check`) and `--strict-config`, which the adapter adds so that a configuration key Codex does not
  know fails the session instead of being ignored. `codex login` has `--device-auth`.
- **F3, offline with the real binary** (`out/f3/strict-config-no-auth.txt`): the runner's `config.toml` passes
  `--strict-config`; with no network and no credential, Codex starts a thread and retries its connection
  (`error` events "Reconnecting… n/5", not terminal) until `timeout` kills it. It wrote sqlite stores to `CODEX_HOME`
  (state, logs, goals, memories, thread history, a queue) and an `installation_id`, with `features.memories = false`.
  It read stdin ("Reading additional input from stdin…"): the runner's `docker exec` attaches none, so it reads EOF.
- **F3, the rehearsal with a stub** (`out/fake-rehearsal.txt`, `78cc4b7`): `probe.sh P0 READ SCAN` with
  `BENCH_SPIKE_FAKE=1`, a stub `codex` and a fake credential made at run time:
  - the session and its resume read by the adapter (`completed`, cost by `price-table`);
  - the host's fake `auth.json` rewritten in place by the stub through the single-file mount;
  - P0 refused a second time (exit 2), and refused without `BENCH_SPIKE_CONFIRM=1` (exit 64);
  - the original token planted in the stream, with the credential refreshed after it, found by the scan (exit 4);
  - a credential holding no value fails the scan (exit 3).
  - The rehearsal **found a defect in the scan as first written**: it read the credential's values at the end only,
    so a refresh hid the original token. It now reads them before the session too, as the adapter does.

### Where the build departs from the Design

1. **Usage is a running total.** The Design summed `turn.completed`; Codex's is the thread's total, so an
   invocation's tokens are its last total less the thread's total before it (the adapter keeps it per thread), and
   the cost is the thread's total, as the port asks of every agent.
2. **Cache writes are counted.** The Design set `cacheCreationInputTokens` to 0; Codex reports
   `cache_write_input_tokens`, which the adapter maps to it and prices at 2.50.
3. **`CODEX_HOME` is emptied before every step** (but `auth.json` and `config.toml`), as Claude Code's auto-memory is
   cleared (bug-006). The Design said to turn off whatever a new session reads and to stop and ask if it could not:
   history, memories, analytics and the exporter are off, but the sqlite stores cannot be turned off, so clearing
   them is the measure taken. A resume within a step keeps its session. **For the approver to confirm.**
4. **The model and its effort:** `gpt-6.1-sol` (Codex's default for a ChatGPT plan at 0.162.1, with a published API
   price), at `medium` as dl-018 sets for Claude; its own default is `low`.
5. **No new requirement id:** the adapter's rules amend REQ-RUN-04, -09, -12, -13, -15 and -16 (requirements 1.32);
   the Design had said "REQ-RUN for the adapter".
6. **The site reads comparison version 2.** The page is unchanged; its parser accepts versions 1 and 2.
7. **A comparison whose scores cannot be read** records `note: not measured: …` for the across-agent M-R instead of
   refusing, since the rows need the aggregates only.
8. **`campaign validate`** lists the effort of every real agent's models, Codex's included.
9. **The run image** creates `/home/node/.codex-run` owned by `node`: without it, the credential's single-file mount
   makes Docker create the directory owned by root, and Codex cannot write its `config.toml` (the docker red test's
   failure, `e68c256`).

### Checks (offline, niced)

- `npx tsc --noEmit -p .` clean, `npm run lint` clean after every commit.
- Docker (`vitest.docker.config.ts`, touched files only): `run-image.test.ts` 2/2 (Codex 0.162.1 installed, its home
  owned by `node`), `codex.test.ts` 1/1 (a Codex campaign end to end with a stub: the credential mounted read-write
  and refreshed on the host, `config.toml`, `AGENTS.md`, the token scrubbed, nothing of it in `results/`). No
  `bench-` container left.
- vitest `--maxWorkers=2`, niced, over `test/unit` and `test/acceptance` (every directory the branch touches):
  103 files, 1599 passed, 8 skipped. `npm run test:bin` 8/8. The full suites (`scripts/full-suites.sh`) are not run:
  they are the approver's to ask for.
