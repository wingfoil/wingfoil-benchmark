---
id: task-062-claude-5-5-models-on-the-pinned-agent-spike
type: task
title: "Claude 5.5 models on the pinned agent spike"
status: backlog
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

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Claude 5.5 models on the pinned agent spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-062-claude-5-5-models-on-the-pinned-agent-spike`, `status: draft`.
