---
id: task-072-openspec-docs-control-and-setup-page
type: task
title: "OpenSpec docs control and setup page"
status: pending
release: v0.2
wave: W13
features: [F7.1]
acceptance:
  - "competitors.feature#Each harness has its own docs control"
requirements: [REQ-RUN-11, REQ-FMT-05, REQ-RES-09]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

OpenSpec's docs control ([rel-v0-2](../release/rel-v0-2.md), W13, F7.1; the approver's answer of 2026-10-05: a
docs control per harness), on task-067's registry:

- an `openspec` entry in `DOCS_GENERATORS`: what it keeps of the openspec arm's configuration as its setup leaves it,
  how it renders the project's rules as `PROJECT_RULES.md`, and its declaration, kind by kind (from task-070's
  answer to "project information or mechanics");
- `arms/openspec-docs/`: `docs_of: openspec`, baseline-docs' manual and setup, byte for byte;
- the setup page `material/setup-openspec.html` follows from task-067's code; its telemetry and bundle notes are
  checked for OpenSpec's.

**No real agent, no spending.** **Done** means: the scenario's `openspec | openspec-docs` row green; W13's arms are
seven, and a campaign with all seven validates and runs with the fake agent.

## Acceptance criteria

- `competitors.feature#Each harness has its own docs control` (openspec row). **Red-first.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "OpenSpec docs control and setup page"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-072-openspec-docs-control-and-setup-page`, `status: draft`. Matches.
