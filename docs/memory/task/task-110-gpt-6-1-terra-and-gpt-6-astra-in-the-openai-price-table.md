---
id: task-110-gpt-6-1-terra-and-gpt-6-astra-in-the-openai-price-table
type: task
title: "gpt-6.1-terra and gpt-6-astra in the OpenAI price table"
status: in-review
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

- Drafted, approved (`a9afc1b8`) and submitted (backlog → in-progress) on main, 2026-10-27; worktree
  `../WingFoil2-Benchmark-wt/task-110`, its own `npm ci`.
- **The source:** `developers.openai.com/api/docs/pricing`, the "Flagship models" table, Standard, short context, read
  with the built-in browser on 2026-10-27 (WebFetch is refused on openai.com): `gpt-6.1-terra` 1.00 / 5.00, cached
  0.05, 30-minute write 1.25; `gpt-6-astra` 10.00 / 50.00, cached 1.00, write 12.50. `gpt-5.6-terra` is no longer
  in that table; its row stays (Design).
- **Red-first:** `44f113b2` before the rows.
- **Checks:** `scripts/pre-review.sh main` green; `test/unit/agents` and `test/unit/campaign` green (268).

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, from a `mktemp` directory; reflogs unchanged): values and field
  mapping right (the 30-minute write column, as the existing rows), red-first, no other reader of the table affected.
  **should-fix, fixed:** the session test asserted only a cost above 0; now the exact cost from `completed.jsonl`'s
  totals at the new row (0.0154 USD), on the model and the usage. **nit, fixed:** the table's five keys pinned.
- **Round 2** (the fix's diff only): the arithmetic and the key order verified; no finding. The review closes.

