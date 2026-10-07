---
id: task-071-openspec-arm-with-project-rules-rendered
type: task
title: "OpenSpec arm with project rules rendered"
status: backlog
release: v0.2
wave: W13
features: [F7.1]
acceptance:
  - "competitors.feature#A competitor arm runs a scenario under the same rules"
  - "competitors.feature#A scenario's project rules reach every arm without changing the scenario"
requirements: [REQ-FMT-05, REQ-FMT-12, REQ-FMT-14, REQ-RUN-18]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

The OpenSpec arm ([rel-v0-2](../release/rel-v0-2.md), W13, F7.1), as task-066 was Spec Kit's, from task-070's
spike:

- `arms/openspec/`: `arm.yaml` (`requires: openspec`, `telemetry_off: [OPENSPEC_TELEMETRY=0]`, its `provides` from
  the spike), the setup script (REQ-RUN-18: install from the artifact, `openspec init --tools claude --profile core
  --force`), and an operating manual written to the parity rules;
- the harness build: OpenSpec 1.14.0 as an `npm pack` tarball with its dependencies, cached and digested as every
  harness artifact (REQ-FMT-12), with its preflight variable;
- **the rules generator** (REQ-FMT-14): the scenario's rules rendered into OpenSpec's project context, where task-070
  finds it, registered beside Spec Kit's in `RULES_GENERATORS`; the scenario's content hash unchanged.

**No real agent, no spending.** **Done** means: S1–S3 and S8 run in the openspec arm with the fake agent, the rules in
OpenSpec's place, and the two scenarios' `openspec` rows green; the scenario "project rules reach every arm" green for
wingfoil, speckit and openspec (its docs controls with task-072).

## Acceptance criteria

- `competitors.feature#A competitor arm runs a scenario under the same rules` (openspec row). **Red-first.**
- `competitors.feature#A scenario's project rules reach every arm without changing the scenario`. **Red-first**
  (the openspec arm and its generator; the docs controls' half completed by task-072).

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "OpenSpec arm with project rules rendered"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-071-openspec-arm-with-project-rules-rendered`, `status: draft`. Matches.
