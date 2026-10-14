---
id: task-093-the-agent-pin-for-v0-2-checked-on-the-three-models-spike
type: task
title: "The agent pin for v0.2 checked on the three models spike"
status: in-progress
release: v0.2
wave: calibration
features: []
acceptance: []
requirements: [REQ-RUN-16, REQ-RUN-09]
fixes: []
tags: ["spike","calibration","agent"]
---

## Context

A spike of v0.2's calibration (plan-004 step 3), as [task-062](task-062-claude-5-5-models-on-the-pinned-agent-spike.md),
[task-065](task-065-spec-kit-in-the-run-container-spike.md) and [task-070](task-070-openspec-in-the-run-container-spike.md)
were. It checks the agent pin before any dry run, so that calibration's dry runs are made once, on the pin the campaign
keeps:

- [dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md) proposal 1: "a spike first checks the
  agent pin against the 5.5 models";
- [dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md): the effort
  levels per model "are set at calibration with the approver";
- [bug-012](../bug/bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work.md) and
  [bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md), fixed by
  task-069: a step's tokens are every model's, and a cost whose `costBasis` is not `list` is flagged;
- task-062's recommendation: Claude Code **2.1.291 or later**, since 2.1.280 misprices Sonnet 5.5.

`campaigns/v0-2-reference.yaml` and `v0-2-bridge.yaml` (task-091) hold the agent version (2.1.291) and the effort
(Sonnet 5.5 `high`, Opus 5.5 `high`, Haiku 4.5 `none`) as placeholders. Since task-062, Claude Code has moved on:
`npm view @anthropic-ai/claude-code dist-tags` on 2026-10-14 gives `latest` **2.1.300** (published 2026-10-14) and
`stable` **2.1.292** (2026-10-06).

**Questions:**

1. Does the latest release price Sonnet 5.5, Opus 5.5 and Haiku 4.5 at list (`costBasis: "list"`, and a cost that
   dl-007's prices recompute from the tokens)?
2. Does it record every model's tokens in `modelUsage` (task-069's step tokens), on a real step rather than a
   one-word probe?
3. Which effort levels does it accept per model, which is each model's default, and does a pinned level reach the
   session?
4. Do the fields the adapter (`src/agents/claude-code.ts`) reads still come out as task-069 reads them?

**Done** means: the answers with their evidence, the ledger lines, and the recommended pins (agent version, effort
per model) for calibration to adopt with the approver. The campaign files are not changed here: calibration sets
their placeholders.

## Acceptance criteria

<!-- A spike: no Gherkin scenario, no product code, so no criterion is red-first or characterization. Its answers,
     their evidence and the ledger lines are what the review reads. -->

## Design

A spike: no product code, no Gherkin scenario.

- **Consent:** this task's pending → backlog approval, for **three real sessions, one per model, at most 3 € each,
  at most 9 € in all**, on the maintainer's subscription. The approval's reason names them.
- **Where:** from the main checkout, with `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`. The token enters each
  container by name only (`-e ANTHROPIC_AUTH_TOKEN`). The output goes to the main checkout's git-ignored
  `spikes/task-093/out/`, whatever checkout the script is run from.
- **A failed session is not repeated** without new consent. A session stopped by its cap still counts as run: its
  `modelUsage` answers the questions all the same.
- **Everything else** is free: reads of the package and the binary, and the fake agent.

### Read before anything is spent (free)

`spikes/task-093/probe.sh F1 F2`, no token, no spending:

- **F1, the release.** `npm view @anthropic-ai/claude-code dist-tags time`. The candidate is `latest` on the day of
  the run (2.1.300 at design). If `latest` moved since, the newer one is the candidate and the Execution notes say so.
  The CHANGELOG shipped in the package, between 2.1.291 and the candidate, is read for model, pricing, effort and
  stream-json entries; `stable` (2.1.292) is noted beside it.
- **F2, the binary.** An image built from `docker/run-image` with `AGENT_VERSION=<candidate>`, tagged
  `bench-spike-task-093-agent-<candidate>` (the prune never touches `bench-spike-*`). In it, from
  `readlink -f $(which claude)`, as task-062 read 2.1.291:
  - `claude --help`: the `--effort` levels;
  - whether the binary names `claude-sonnet-5-5`, `claude-opus-5-5` and `claude-haiku-4-5`;
  - each model's `defaultEffort`, `capLevels` and `supportsXHigh`, with the `grep -a -o` command recorded. A string
    proves nothing about behaviour; it says which level to try and which question stays open.
- **F3, a rehearsal with a fake agent.** `probe.sh P1 P2 P3` with `BENCH_SPIKE_FAKE=1`: the same containers, but
  `claude` is a stub that replays a recorded stream (the adapter's fixtures, `test/fixtures/sessions/completed-sonnet.jsonl`) and no token is passed.
  It checks, without spending, the command line each session would get, the running total and the refusal over the
  ceiling (a stub cost set above it), the output's layout, the adapter's read (Q4 below) and the secret scan (with a
  fake token file). The benchmark's own fake agent (`agent.name: fake`) is not used: it replaces Claude Code, so its
  image would not hold the candidate.

### The sessions (spend)

`BENCH_SPIKE_CONFIRM=1 spikes/task-093/probe.sh P1`, then `P2`, then `P3`. Each is S3@1.0 step 1 in the baseline arm,
with the command line and environment the runner gives a step today:

- a fresh container from F2's image, the workspace S3@1.0's seed made a git repository (the baseline arm adds
  nothing to it), `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`;
- `claude -p "$(cat scenarios/S3/1.0/prompts/01.md)" --output-format stream-json --verbose --model <id>
  [--effort <level>] --session-id <uuid> --permission-mode bypassPermissions --setting-sources project
  --max-budget-usd 2.50`, with `--debug` on stderr in case the effort is logged.

| Session | Model | Effort sent | Cap (`--max-budget-usd`) | Answers |
|---|---|---|---|---|
| P1 | `claude-haiku-4-5` | none (the placeholder), unless F2 shows Haiku 4.5 takes a level: then its default, named | 2.50 USD | Q1, Q2, Q3, Q4 |
| P2 | `claude-sonnet-5-5` | `high` (the placeholder), or a level F2 shows the model caps below it | 2.50 USD | Q1, Q2, Q3, Q4 |
| P3 | `claude-opus-5-5` | `high` (the placeholder), or a level F2 shows the model caps below it | 2.50 USD | Q1, Q2, Q3, Q4 |

**Caps and total.** The cap is 2.50 USD a session (2.21 € at the campaigns' rate of 0.8851), so that a last turn
over it still leaves the session under **3 €** (3.39 USD). Before each session the script sums `total_cost_usd` of
the sessions already run and refuses to start one that could take the total over **7.50 USD** (6.64 €), under the
**9 €** consented. Expected, from v0.1's whole S3 baseline run (0.84 € on Sonnet 5 for five steps) and dl-007's
prices: about 0.2–0.5 USD for Haiku 4.5 and Sonnet 5.5, 0.4–1.2 USD for Opus 5.5, **about 1–2 USD in all**. Cheapest
first: if P1 or P2 shows a step costs far more than expected, the spike stops and asks before P3.

**Read from each session:** the `init` event's `model`, `per_turn_effort_active` and any effort field; the `result`
event's `subtype`, `is_error`, `terminal_reason`, `num_turns`, `duration_ms`, `total_cost_usd`; `modelUsage` per key
(every token kind, `costUSD`, `costBasis`, `contextWindow`, `thinkingTokens`); stderr's `unrecognized_model` or any
effort line; the files the step wrote (`git status` of the workspace, not scored). Each cost is recomputed from the
tokens with dl-007's prices.

**Q4, offline.** The three streams are read by the adapter itself (the built `dist/`, a throwaway script in
`spikes/task-093/`): the step's tokens summed over `modelUsage`, the folded `models` with `costBasis`, the outcome,
and the cost against `total_cost_usd`.

**Secret scan** closing every stage that ran the agent: `grep -rlFf <(tr -d '[:space:]' < "$TOKEN_FILE")` over
`out/` and the script's directory, the token read from a descriptor and never printed; an empty token or a `grep`
error prints "secret scan failed" and exits 3 (task-062's scan).

### The ledger

One line of `docs/calibration/v0.2-ledger.md` per session (P1, P2, P3), written when it has spent: date, element,
kind, consent (`task-093 pending → backlog`, its commit), model and agent version, ceiling (2.50 USD, under the 3 €
consented), cost, source. The total under the table is updated.

### Done

- Q1–Q4 answered with their evidence in the Execution notes, the ledger lines.
- **Recommended pins**, for calibration to adopt with the approver: the agent version, and the effort per model
  (`agent.effort`), each with its reason; and whether `stable` or `latest` is the channel to pin from.
- Anything the spike finds wrong in the benchmark is filed as a bug or a decision-log, not fixed here.
- Review by an independent read-only agent, rounds in the Review notes.

## Execution notes

- `npx wingfoil memory add --type task --title "The agent pin for v0.2 checked on the three models spike" --tags
  "spike,calibration,agent"`, on main. Declared: creates the element from the template in `draft`, one commit.
  Observed: `ff9e9cf` (`wf(task): add task-093-…`), `status: draft`, `tags` written to the frontmatter, the other
  fields empty (W-02). Matches.
- The Design by hand, `0978d50`. Then `npx wingfoil memory submit task-093-…`, on main. Declared: `draft →
  pending`, one commit. Observed: exit 0, JSON `from`/`to` as declared, `dba54c4`, one file, `status` only. Matches.
