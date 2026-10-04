---
id: task-054-observed-models-recorded-per-invocation
type: task
title: "Observed models recorded per invocation"
status: draft
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

<!-- One line per criterion (Gherkin scenario or requirement), each classified as red-first
     (new behaviour: a failing test precedes the code) or characterization (existing behaviour). -->

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Observed models recorded per invocation"`. Declared: creates the
  element from the template and commits it. Observed: `wf(task): add task-054-…`, `status: draft`.
