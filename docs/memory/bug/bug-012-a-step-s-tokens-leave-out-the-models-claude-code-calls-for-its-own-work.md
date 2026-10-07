---
id: bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work
type: bug
title: "A step's tokens leave out the models Claude Code calls for its own work"
status: fixed
fixed_by: task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis
---

## Context

Found by the independent review of
[task-054](../task/task-054-observed-models-recorded-per-invocation.md) (finding 5), on the transcripts of execution
`c82a5e74885b/1`.

`readSession` (`src/agents/claude-code.ts`, `add`) takes a step's tokens from the `result` event's `usage`, and its
cost from `total_cost_usd`. The two do not cover the same work:

- `usage` counts **the run's model only**;
- `total_cost_usd` counts **every model**, including the ones Claude Code calls for its own work (Haiku 4.5 beside
  Sonnet 5 in that execution).

`modelUsage`, recorded per step since task-054, shows the difference.

## Expected

A step's tokens (REQ-RUN-09) are the work of every model the step used, as its cost is. `step_tokens` (REQ-RUN-08)
caps all of them.

## Actual

The tokens of the auxiliary model are left out of the step's `usage`, of `usage.json`, of the `step_tokens` cap, and
of every token metric. The cost includes them.

## Evidence

In 4 of the 80 steps of `c82a5e74885b/1`, the sum of input and output tokens over `modelUsage` is larger than the
step's `usage`. For example, S1 wingfoil Sonnet r1, step 03: Haiku 4.5 used 31 858 input and 1 616 output tokens,
which appear only in `modelUsage`. Haiku's cost in the whole execution was 0.06 USD; its tokens are a small share of
any step's.

## Suggested handling

- When `modelUsage` is present, take the step's tokens by kind as the sum over its models (each at its latest total),
  and keep `usage` as the fallback for a stream without `modelUsage`.
- State in REQ-RUN-09 which one is the step's token count.
- Not before the v0.1 campaign's re-run: the share is small, the change alters the token figures of every run, and
  calibration's dry runs were measured the current way. A decision for v0.2's planning.

## Resolution

Fixed by [task-069](../task/task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis.md) (merged in `73e7f20`). A step's tokens are the sum over the step's folded
`modelUsage`: each key at the session's latest total, every model, every kind. The same figure is in `usage.json` and
in the `step_tokens` cap. A session that reported no `modelUsage` keeps its result events' `usage`. REQ-RUN-08 and
REQ-RUN-09 were amended in requirements 1.27. Verified by unit tests (the step's `usage.json`, the cap), by the @F2.4
acceptance test, and by the W2 Docker test on the spike's real pair `question.jsonl` → `resumed.jsonl`. The pair's
20 858 + 289 720 tokens are its two invocations' work. Runs stored before keep their recorded figures.
