---
id: bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price
type: bug
title: "A run's cost is trusted when the agent does not know the model's price"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
---

## Context

Found by [task-062](../task/task-062-claude-5-5-models-on-the-pinned-agent-spike.md)'s spike on 2026-10-06: Claude
Code 2.1.280, v0.1's agent pin, runs `claude-sonnet-5-5` but does not know it.

## Expected

A run's cost is the model's list price applied to its tokens (REQ-RUN-09). When the agent cannot price a model, the
run says so and its cost is not used as if it were right (not summed, estimated or compared silently).

## Actual

Probe P2: `modelUsage["claude-sonnet-5-5"].costBasis` is `"unknown"`, and `costUSD` (0.1155) is Opus 5.5's prices
applied to Sonnet 5.5's tokens, twice Sonnet 5.5's list price (0.0578); the context window reads 200 000 where
2.1.291 reads 1 000 000. The adapter reads `costUSD` and `total_cost_usd` and ignores `costBasis`, so a campaign on
that pin would record, estimate and budget Sonnet 5.5 at double its cost, with nothing to show it.

## Evidence

task-062 Execution notes (the probe table and the recomputation); `spikes/task-062/out/P2/` (main checkout,
git-ignored).

## Suggested handling

The adapter records `costBasis` per model with the run; a run with any model whose basis is not `list` is flagged in
`run show`, in the estimate (refused, as a missing dry run is) and on the site. The agent pin of v0.2 (2.1.291 or
later) avoids the case for the 5.5 models; the check keeps the next model change from passing unnoticed.

## Resolution

<!-- Filled when fixed: the task, the commit, and how it was verified. -->
