---
id: task-054-observed-models-recorded-per-invocation
type: task
title: "Observed models recorded per invocation"
status: in-progress
release: v0.1
wave: campaign
features: [F2.3]
acceptance: [runner.feature]
requirements: [REQ-RUN-09, REQ-FMT-06]
---

## Context

Asked by the approver on 2026-10-04, while discussing the models of v0.2
([dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md)) and WingFoil's future routing of
phases to different models. The runner records the model a run was *asked* to use (`--model`, the campaign's
`models`), never the models the agent actually *used*.

They are not always the same. Claude Code's `result` event carries `modelUsage`: tokens, cost and context window
**per model**. In execution `c82a5e74885b/1` it shows Claude Code calling **Haiku 4.5**
(`claude-haiku-4-5-20251001`) for its own work in 2 of the step results, beside the run's Sonnet or Opus. That was
0.06 USD in all: small, but invisible today. With a model slice, a weak-model slice (dl-007 option E) or WingFoil's
routing, the model is what is being measured, so it must be observed, not assumed.

**Scope:**

- The adapter reads `modelUsage` from every `result` event of an invocation.
- `run.json` records, per step, the models observed with their tokens by kind and their cost, summed over the
  step's invocations the way the step's usage already is: tokens added, the session's cost not double-counted
  (bug-004, task-051).
- `bench run show` lists them.
- A model observed that is not the run's model is not an error. It is shown, and the method page says that Claude
  Code may use a smaller model for its own work.

**No real agent, no spending:** the fixtures are `result` events from the stored transcripts, with nothing secret in
them; the fake agent replays a `modelUsage`.

**Ordering:** proposed before the reference campaign's re-run (`c82a5e74885b/2`), so that the re-run records the
models. It is small, and it changes no score.

**Done** means:

- `run.json` holds the observed models per step;
- `run show` prints them;
- `npm test` is green with coverage above 80 %, and lint is clean;
- the results format (REQ-FMT-06) is amended with a raised version.

## Acceptance criteria

- `readSession` reads `modelUsage` into the session's `models`. A resumed session's figures are its largest per
  model, not a sum (`test/fixtures/sessions/resumed.jsonl`, which reports two model keys). **Red-first.**
- The runner records `models` per step in `run.json`, sorted by model. It is absent when the agent reported none,
  as the trivial fake does. **Red-first.**
- `bench run show` prints a step's models. **Red-first.**
- A stored `run.json` without `models` (every run so far) still reads and shows. **Characterization.**
- `runner.feature` and the existing results tests stay green. **Characterization.**

## Design

**What `modelUsage` is** (observed in `c82a5e74885b/1`, S1 wingfoil r3):

- the `result` event's `modelUsage` maps a model key to `inputTokens`, `outputTokens`, `cacheReadInputTokens`,
  `cacheCreationInputTokens`, `costUSD` and more;
- it is **the session's running total**, like `total_cost_usd`, and unlike `usage`, which is the invocation's own.
  For example, step 01: the first result's `outputTokens` is 22 935, the resume's `usage.output_tokens` is 2 105, and
  its `modelUsage` reports 25 040;
- the keys are what Claude Code reports: the run's model (`claude-sonnet-5`), and models it uses for its own work,
  under an alias or a dated id (`claude-haiku-4-5`, `claude-haiku-4-5-20251001`, both in one fixture). They are kept
  as reported, not normalised: the record says what the agent said.

**Changes:**

1. `src/agents/claude-code.ts`:
   - `ModelUsage`: `inputTokens`, `outputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`, `costUsd`;
   - `Session.models`: `Readonly<Record<string, ModelUsage>>`;
   - `readSession` folds each `result` event's `modelUsage` into it, **field by field, the largest seen**. That is
     right for one session's running totals, and it never counts an earlier invocation twice (as `add` does for the
     cost).
2. `src/agents/port.ts`: `StepOutcome.models?`. The Claude Code adapter and the fake pass the session's on. The
   fake gets it for free: it replays recorded sessions through `readSession`.
3. `src/runner/run.ts`:
   - a step's models are its invocations' models folded the same way, since they are one session;
   - `run.json`'s step gets `models` with the keys sorted (REQ-NFR-05), in `usage`'s camelCase, and only when
     there are any.
4. `src/results/detail.ts` and `src/cli/show.ts`: the schema reads `models` as optional; `run show` prints one line
   per step, `- models: <key> (output …, cache read …, … USD), …`.
5. **Requirements 1.25:** REQ-RUN-09 (the models observed are taken from `modelUsage`) and REQ-FMT-06 (`run.json`'s
   step holds `models`), with the review decision recorded.

**Not changed:** scoring, the aggregate and the site. Which models a run used is a record, not a metric, in v0.1.
The method page's prose is re-read before publishing, as W11 left due. A sentence there that Claude Code may use a
smaller model for its own work is part of that re-read, not of this task.

## Execution notes

- `npx wingfoil memory add --type task --title "Observed models recorded per invocation"`. Declared: creates the
  element from the template and commits it. Observed: `wf(task): add task-054-…`, `status: draft`.
