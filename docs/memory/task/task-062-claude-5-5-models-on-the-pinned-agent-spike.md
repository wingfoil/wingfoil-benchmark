---
id: task-062-claude-5-5-models-on-the-pinned-agent-spike
type: task
title: "Claude 5.5 models on the pinned agent spike"
status: in-progress
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-RUN-16]
---

## Context

A spike for [dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md), approved at [rel-v0-2](../release/rel-v0-2.md)'s triage
with "a spike first checks the agent pin". v0.1 pins Claude Code 2.1.280; whether it runs `claude-sonnet-5-5`,
`claude-opus-5-5` and `claude-haiku-4-5` headless, and which effort it sends to each, is unknown.

**Questions:**

1. Does Claude Code 2.1.280 accept each model id in `-p` mode? If not, which agent version does, and what else does
   it change (stream-json shape, `modelUsage`, `--max-budget-usd`)?
2. Which effort does it send to each model by default, and can the campaign pin it?
3. Does `modelUsage` (task-054) report each model as expected?

**Real agent, with spending — consented by this task's pending → backlog approval:** at most **3 €**, on the
maintainer's subscription. One trivial prompt per model (T0), Haiku first. Every run is a line of
`docs/calibration/v0.2-ledger.md`, created by this task.

**Done** means: the answers recorded with their evidence, and a recommendation for v0.2's agent pin.

## Acceptance criteria

<!-- A spike: no Gherkin scenario. Its answers and the ledger lines are reviewed. -->

## Design

A spike: no product code, no Gherkin scenario. Its answers, their evidence and the ledger lines are what the review
reads. Consent: this task's pending → backlog approval (the W12 backlog, `accetta i task di W12`), **at most 3 €**,
on the maintainer's subscription.

### Read before anything is spent (free)

From the image `bench-spike-task-011-agent` (Claude Code **2.1.280**, v0.1's pin), on 2026-10-06:

- `claude --help` has `--effort <level>` (low, medium, high, xhigh, max) besides `--model` and `--max-budget-usd`;
- the native binary names `claude-opus-5-5` (41 times) and `claude-haiku-4-5`, but **not** `claude-sonnet-5-5`:
  a string search proves nothing about behaviour, but it says which question is open;
- `npm view @anthropic-ai/claude-code` gives **2.1.291**, published 2026-10-06, as the latest (2.1.280 is of
  2026-09-22).

### The probes

A script, `spikes/task-062/probe.sh`, in the shape of task-019's: refuses without `BENCH_SPIKE_CONFIRM=1`; the token
enters each `docker exec` by name, from `$HOME/.claude/bench-token`; one fresh container per agent version, the
workspace an empty git repository; each session `claude -p "Reply with the single word: OK" --output-format
stream-json --verbose --model <id> --max-budget-usd 0.40 --permission-mode bypassPermissions --setting-sources
project`, with `--debug` on stderr so that the request's effort can be read if Claude Code logs it. Before each
session the running total of `total_cost_usd` is checked against a **ceiling of 3.00 USD** (under 3 €); the output
goes to the **main checkout's** git-ignored `spikes/task-062/out/` (real-agent runs from the main checkout, rule 4 of
the `multi-session` directive), whatever checkout the script is run from.

| Probe | Agent | Model | Effort flag | Answers |
|---|---|---|---|---|
| P1 | 2.1.280 | `claude-haiku-4-5` | — | Q1, Q2 (default), Q3 |
| P2 | 2.1.280 | `claude-sonnet-5-5` | — | Q1 |
| P3 | 2.1.280 | `claude-opus-5-5` | — | Q1, Q2 (default), Q3 |
| P4 | 2.1.280 | the 5.5 model that works | `--effort high` | Q2 (can it be pinned) |
| P5–P7 | 2.1.291 | the three | — | Q1 for the newer pin, if P2 or P3 fail; also what else changes |

P5–P7 run only if a model fails on 2.1.280, in an image built from `docker/run-image` with `AGENT_VERSION=2.1.291`,
tagged `bench-spike-task-062-agent-2.1.291` (the prune never touches `bench-spike-*`). For each session the script
records: the `init` event's `model`, any effort field, the `result` event's `subtype`, `is_error`,
`total_cost_usd`, `modelUsage` (which models, which tokens), and the `--debug` lines naming effort or thinking.
Expected cost: a few cents a session (Claude Code's system prompt is cached once per session), well under 1 USD.

A secret scan closes the run: no file under `out/` or the script's directory contains the token.

### The ledger

`docs/calibration/v0.2-ledger.md` is created on the model of `v0.1-ledger.md` (same columns and preamble, for v0.2),
with this spike's line written when it has spent: date, element, kind, consent (`task-062 pending → backlog`, its
commit), models, ceiling, cost, source.

### Done

The three questions answered with their evidence in the Execution notes, the ledger line, and a recommendation for
v0.2's agent pin (and whether the runner should pass `--effort`), for calibration to adopt.

## Execution notes

- `npx wingfoil memory add --type task --title "Claude 5.5 models on the pinned agent spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-062-claude-5-5-models-on-the-pinned-agent-spike`, `status: draft`.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-062-…`, in the linked worktree `WingFoil2-Benchmark-task-062` with its own `npm
  ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one file,
  `status` only. Matches.

### The spike (2026-10-06, from the main checkout)

`BENCH_SPIKE_CONFIRM=1 …/spikes/task-062/probe.sh P1`, then `P2 P3`, then `P4 P5 P6 P7`, with the working directory
the main checkout and the output in its git-ignored `spikes/task-062/out/`. Seven one-turn sessions, all `success`,
all answering "OK"; the image of 2.1.291 built from `docker/run-image` (`bench-spike-task-062-agent-2.1.291`). The
secret scan found the token in no file. **Spent: 0.2113 USD** of the 3.00 USD ceiling (the ledger's first line).

| Probe | Agent | Model | Outcome | Cost (USD) | `costBasis` | Context window | Thinking tokens |
|---|---|---|---|---|---|---|---|
| P1 | 2.1.280 | `claude-haiku-4-5` | success, "OK" | 0.0064 | list | 200,000 | 32 |
| P2 | 2.1.280 | `claude-sonnet-5-5` | success, "OK" | 0.1155 | unknown | 200,000 | 0 |
| P3 | 2.1.280 | `claude-opus-5-5` | success, "OK" | 0.0238 | list | 1,000,000 | 0 |
| P4 | 2.1.280 | `claude-opus-5-5` `--effort high` | success, "OK" | 0.0199 | list | 1,000,000 | 0 |
| P5 | 2.1.291 | `claude-haiku-4-5` | success, "OK" | 0.0068 | list | 200,000 | 33 |
| P6 | 2.1.291 | `claude-sonnet-5-5` | success, "OK" | 0.0134 | list | 1,000,000 | 0 |
| P7 | 2.1.291 | `claude-opus-5-5` | success, "OK" | 0.0255 | list | 1,000,000 | 0 |

Every reported cost was recomputed from `modelUsage`'s tokens with dl-007's list prices. All match the model's own
prices, **except P2**: 0.1155 USD reported against 0.0578 at Sonnet 5.5's list price — exactly Opus 5.5's prices
applied to Sonnet 5.5's tokens.

### Why P5–P7 ran

The Design ran them "only if a model fails on 2.1.280". None failed outright, but P2 is a failure of another kind:
`stderr.txt` reads `[claude-code:unrecognized_model] {"model":"claude-sonnet-5-5",…}`, and the cost is not Sonnet
5.5's. That was taken as the trigger. P5–P7 cost 0.0457 USD, within the ceiling.

### Answers

1. **Does 2.1.280 accept each model id headless?** Yes, all three answer. But **2.1.280 does not know Sonnet 5.5**:
   its stderr logs `unrecognized_model`, it reports `costBasis: "unknown"`, it prices the tokens at Opus 5.5's
   rates — 2× Sonnet 5.5's on input, output and cache writes, the same on cache reads (0.20 USD/M for both): 2× in
   P2, which read no cache, less in a real run, whose cost is mostly cache reads (dl-007) — and it gives the model a
   200 000-token context window where 2.1.291 gives 1 000 000 (the binary of 2.1.280 never names
   `claude-sonnet-5-5`). P2 also wrote 23 092 cache tokens and read none, where every other probe wrote about 4 000
   and read about 10 000–14 000: the unknown model's prompt is cached differently. Haiku 4.5 and Opus 5.5 are priced
   at list (`costBasis: "list"`) on both versions. **2.1.291** (published 2026-10-06) knows all three: list prices
   and the full context windows. What else it changes, seen from these sessions: the `init` event gains
   `per_turn_effort_active` (true for Sonnet and Opus 5.5, false for Haiku 4.5) and `view_mode`; every field the
   adapter (`src/agents/claude-code.ts`) reads on a successful session is present — `is_error`, `terminal_reason`,
   `result`, `usage.*`, `num_turns`, `duration_ms`, `session_id`, `total_cost_usd`, `modelUsage.<model>.{inputTokens,
   outputTokens, cacheReadInputTokens, cacheCreationInputTokens, costUSD}` — so task-054's folding and bug-012's
   summing are unaffected. The error path's fields (the result's `errors`, the assistant event's `error`) appear only
   when a session fails, which none did: the adapter's error handling on 2.1.291 is **unverified** here, for
   calibration's first runs to watch. `--max-budget-usd` is accepted by both.
2. **Which effort, and can the campaign pin it?** Neither version reports the effort it sends: not in the stream
   (`init`, `result`), not in `--debug`'s log. The binary of 2.1.291 names a per-model `defaultEffort`,
   `capLevels`, `supportsXHigh` and `defaultEffortPinnedAboveServed` (read with `grep -a -o` on
   `readlink -f $(which claude)` in `bench-spike-task-062-agent-2.1.291`): the default is per model, and the names
   suggest it may be served rather than fixed in the binary — a possibility, not an observation. **`--effort
   <level>` is accepted** (P4, `high`, on Opus 5.5, success), so the campaign *can* pin it — but only if the runner
   passes it: today it does not.
3. **Does `modelUsage` report each model?** Yes: one key per model, its tokens and `costUSD`; plus `costBasis`,
   `contextWindow` and `thinkingTokens`. `costBasis` is the signal that the agent knows the model's price:
   `unknown` means a cost the benchmark must not trust.

### Recommendation for v0.2's agent pin (for calibration to adopt)

- **Pin Claude Code 2.1.291 or later**, re-pinned at calibration as v0.1 did (task-049): 2.1.280 misprices Sonnet
  5.5, v0.2's default model (dl-007 B) — up to 2× on all but cache reads — and shrinks its context to 200 K.
- **Pin the effort**: the runner passes `--effort <level>` from the campaign file, one level per model, recorded with
  the run, so that the agent's default, unrecorded today and possibly served, cannot move results between
  executions. Filed as
  [dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md) (`pending`,
  on main: `819faf1`, `d958c92`), for the approver.
- **Refuse a cost the agent does not know**: a run whose `modelUsage` reports `costBasis` other than `list` is
  flagged (its cost is not the list price), so that a pin like 2.1.280 on Sonnet 5.5 cannot pass unnoticed. Filed
  as [bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md)
  (`pending`, on main: `819faf1`, `194c074`), for the approver.
- `npx wingfoil memory add` ×2 and `memory submit` ×2 for those, on main. Declared: `add` creates the element from
  its template in `draft` with one commit; `submit` takes `draft → pending`. Observed: `f2c854b`, `62f87f3` (add),
  the bodies by hand in `819faf1`, then `194c074`, `d958c92` (submit, `status` only). Matches.

### Review

- **Round 1** (independent read-only Explore subagent, on `446eb3b`; no spending, the token file never read): nothing
  blocking. It recomputed every probe's cost from `modelUsage` with dl-007's prices (all match; P2 at Opus 5.5's),
  the total (0.21129 USD), the table, the outcomes, the absence of effort in the logs, the adapter's fields against
  P6/P7, the ledger and its consent commit, and found no secret in `out/`. Findings and outcomes:
  1. should-fix — the script's closing scan put the token on `grep`'s command line. **Fixed:** `grep -rlFf
     <(tr -d '[:space:]' < "$TOKEN_FILE")`, the token read from a descriptor. The scan ran once that way already
     (three runs, a few seconds each, on a single-user host); the fix stops it for any later run.
  2. should-fix — "a factor of two" overstates: cache reads cost the same on both models. **Fixed** here and in
     bug-016.
  3. should-fix — `per_turn_effort_active` is false for Haiku 4.5; `view_mode` unmentioned. **Fixed** here and in
     dl-015.
  4. should-fix — "the default can change without a new agent version" rested on unrecorded strings. **Fixed:** the
     command is recorded, and the remote default is a possibility, here and in dl-015.
  5. should-fix — dl-015 was not linked (an earlier replacement had not matched). **Fixed.**
  6. nit — why P5–P7 ran is unsaid. **Fixed:** a section.
  7. nit — P2's `unrecognized_model` stderr and its cache pattern. **Fixed:** cited, here and in bug-016.
  8. nit — the adapter's fields listed partially. **Fixed:** all of them.
  9. nit — bug-016 cited REQ-RUN-09 for "list price". **Fixed:** dl-007's price table instead.
  The corrections to bug-016 and dl-015 are on main, `5c4f4a2`.
- **Round 2** (a new independent read-only Explore subagent, on `56eb85e` and main's `5c4f4a2`): nothing blocking;
  it verified every new statement against the raw output and both images' binaries, and the new scan's bash.
  Findings and outcomes:
  1. nit — "every field the adapter reads is present" overstated: the error path's fields were not exercised.
     **Fixed:** the success path's fields, and the error path named as unverified.
  2. nit — the commit of bug-016's and dl-015's corrections was not cited. **Fixed:** `5c4f4a2`.
  3. minor — the closing scan could not tell "no match" from a failed scan, and counted `out/` twice from the main
     checkout. **Fixed:** an empty token or a `grep` error now prints "secret scan failed" and exits 3; `out/` is
     scanned once.
- **Round 3** (a new independent read-only Explore subagent, on `666de27`): **clean**. It verified round 2's outcomes
  against the adapter and the raw output, and exercised the new scan alone with a fake token (once-only count, both
  trees when `out/` is elsewhere, exit 3 on an empty or missing token and on a `grep` error). One nit, **not
  changed**: `api_error_status`, which the adapter reads and which every result event carries as `null` on both
  versions, is not named among the fields; it changes nothing on 2.1.291.
- Final checks on `666de27`: `npm run lint` clean. No code changed: `npm test`, `test:bin`, `test:docker` not run.
