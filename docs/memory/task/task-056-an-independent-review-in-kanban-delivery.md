---
id: task-056-an-independent-review-in-kanban-delivery
type: task
title: "An independent review in kanban-delivery"
status: pending
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-NFR-04]
---

## Context

Implements [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md), approved at
[rel-v0-2](../release/rel-v0-2.md)'s triage (option B). It is the first task of W12, so that every later task is reviewed under it.

**Scope:** `.wingfoil/workflows/custom/kanban-delivery.yaml` becomes version 3. Its review phase states:

- an independent, read-only agent reviews the task's branch against its Design, the requirements and its
  acceptance scenarios;
- each fix is reviewed again until clean;
- the rounds and the outcome of every finding are recorded in the task's Review notes;
- a task is not offered for approval on a self-review.

A WingFoil configuration change goes through a task, never straight to `main`.

**No real agent, no spending.** **Done** means: the workflow file at version 3, `npx wingfoil workflow list` reading
it, and the change recorded in plan-004's delivery rules.

## Acceptance criteria

- `npx wingfoil workflow list` reads `kanban-delivery` version 3 with the review phase's new text. **Characterization**
  by command.
- `npm test` stays green. **Characterization.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "An independent review in kanban-delivery"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-056-an-independent-review-in-kanban-delivery`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-04] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").
