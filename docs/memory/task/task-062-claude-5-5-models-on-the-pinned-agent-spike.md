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
