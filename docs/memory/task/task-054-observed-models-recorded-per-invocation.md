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
- the keys are what Claude Code reports, kept as reported and not normalised: the record says what the agent said.
  - In `c82a5e74885b/1` they are the run's model (`claude-sonnet-5`) and a model Claude Code calls for its own work
    (`claude-haiku-4-5-20251001`).
  - **One model can appear under two keys.** The spike's fixtures (an older Claude Code) report the run's own model
    as `claude-haiku-4-5` in a session and as `claude-haiku-4-5-20251001` in its resume, the alias key holding the
    first invocation's figures and the dated key the resume's own (review, finding 1).
  - "The session's latest total" therefore holds **per key**. Two keys are not proof of two models.

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

- `npx wingfoil memory submit task-054-…` (draft → pending): `9ab3866`. `memory approve` (pending → backlog), run
  by the agent on the approver's request in chat (2026-10-04, "procedi con task 54"): `ddce0ca`, with `Approver:` and
  `Reason:` trailers. Branch `task/task-054-…` in its own worktree (`../WingFoil2-Benchmark-task-054`, its own
  `npm ci`). Design committed first (`658baac`); `memory submit` (backlog → in-progress): `4ddce85`. Each command
  did what it declares: it moved `status` and committed the file.

### Build

- **Red first:** four tests failed for the expected reason. `readSession` gave no `models`. The runner wrote no
  `models` (the first try of the runner test counted invocations from 1, where `invocationOf` counts from 0; it was
  corrected). `run show` printed no models line.
- **Then green** (`04e13b5`):
  - `ModelUsage`, `foldModels` and `modelsOf` in the adapter;
  - `StepOutcome.models`, passed on by the adapter and the fake;
  - the runner's fold and `run.json`'s step `models`;
  - `detail.ts`'s schema and `run show`'s line;
  - requirements 1.25.
- `npm test`: 77 files, 1223 tests; coverage 98.04 % statements. `npm run lint`: clean. `npm run test:bin`: 8/8.

### Review

An independent, read-only agent reviewed `main...04e13b5`. It found no blocker. It read all 80 step transcripts of
`c82a5e74885b/1`:

- in the 19 steps with a resume, every `modelUsage` key is non-decreasing and none disappears, so the largest
  reading is right;
- no step spans two sessions;
- in every step, the sum of `costUSD` over the keys equals `total_cost_usd`.

| # | Finding | Severity | Outcome |
|---|---|---|---|
| 1 | The Design called the fixture's two Haiku keys two models; they are one model, under an alias and a dated id | should-fix | **Fixed** (`d305ca8`): Design and REQ-RUN-09, "per key" |
| 2 | The Context's scope moved (fold instead of sum; the method-page sentence) without being listed | should-fix | **Fixed** (`d305ca8`): the deviations below, for the approver |
| 3 | The adapter's and the fake's passing of `models` untested | should-fix | **Fixed** (`d305ca8`): a test of each |
| 4 | The `readSession` test cannot tell the largest reading from the last | nit | **Fixed** (`d305ca8`): a `foldModels` unit test |
| 5 | A step's tokens leave out the auxiliary model's (pre-existing) | nit, out of scope | **Filed** as bug-012, on `main` |
| 6 | An invocation from a foreign session is folded in | nit | **Comment** in `run.ts` (`d305ca8`) |
| 7 | `models` is camelCase and has no EUR figure, undocumented | nit | **Fixed** (`d305ca8`): REQ-RUN-09 states both |
| 8 | `run compare` does not show models | nit | Left: not asked for |

A **re-review** of `d305ca8`: clean. Its one nit, to give the deviations a `##` section, is left: the template's
sections are fixed.

After the fixes: `npm test` 77 files, **1225 tests**; coverage **98.04 %** statements, 90.93 % branches, 98.77 %
functions, 99.18 % lines. `npm run lint`: clean.

`npm run test:docker` on `04e13b5`: **16/16**, none skipped, 444 s. `d305ca8` changes only tests, documents and a
comment.

### Deviations from the Context, for the approver

- **Fold, not sum.** The Context says the models are "summed over the step's invocations … tokens added". The
  Design takes the largest reading per key instead. `modelUsage` turned out to be a running total, and summing it
  would count every resume's earlier invocations twice. The real transcripts bear this out (review).
- **The method page's sentence** ("Claude Code may use a smaller model for its own work") moves out of this task,
  into the method page's re-read before publishing, which W11 left due.

