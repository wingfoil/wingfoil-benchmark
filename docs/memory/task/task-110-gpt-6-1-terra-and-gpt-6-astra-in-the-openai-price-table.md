---
id: task-110-gpt-6-1-terra-and-gpt-6-astra-in-the-openai-price-table
type: task
title: "gpt-6.1-terra and gpt-6-astra in the OpenAI price table"
status: draft
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-RUN-09]
fixes: []
tags: ["v0.3","codex"]
---

## Context

[dl-028](../decision-log/dl-028-gpt-6-1-terra-as-a-model-slice-of-campaign-007-beside-gpt-5-6-terra-s-bridge.md)
(pending) proposes `gpt-6.1-terra` as a model slice of campaign-007. Codex reports tokens and no cost, so the
benchmark prices a Codex session from its pinned table (`src/agents/openai-prices.ts`, REQ-RUN-09 as amended in
1.32, `costBasis: price-table`); a model without a row is `unpriced`. The table has `gpt-6.1-sol`, `gpt-5.6-terra` and
`gpt-6-luna`. W15, before any session on the new model.

**No real-agent session. Spending: 0 €.**

**Done** means: the two rows pinned with their source and date, a Codex session's cost on either computed from them.

## Acceptance criteria

1. `OPENAI_PRICES` gains, per million tokens (`developers.openai.com/api/docs/pricing`, Standard tier, short context,
   read 2026-10-27 with the browser): `gpt-6.1-terra` input 1.00, cached input 0.05, cache write (30 minutes) 1.25,
   output 5.00; `gpt-6-astra` input 10.00, cached input 1.00, cache write 12.50, output 50.00; each with its source in
   `OPENAI_PRICE_SOURCES`. The existing rows unchanged. **Red-first** (`openai-prices.test.ts`).
2. A Codex usage on `gpt-6.1-terra` is priced from its row, not `unpriced`. **Red-first.**

## Design

- New rows only, never an edit of a row (the table's rule: a changed price is a new row with its own source and date).
- `gpt-5.6-terra`'s row stays: the page no longer lists it among the flagship models, but campaign-004, 005 and 006
  were priced from it and campaign-007's default model is it.
- The pricing page's short-context prices only, as for the other rows (Codex's context window stays below the
  long-context tier).
- Not in this task: dl-028's scope in `src/cli/codex-scope.ts` and campaign-007's files (the step-A arm task's).

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
