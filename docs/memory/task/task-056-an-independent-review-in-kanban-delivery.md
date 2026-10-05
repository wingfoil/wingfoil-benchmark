---
id: task-056-an-independent-review-in-kanban-delivery
type: task
title: "An independent review in kanban-delivery"
status: backlog
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

dl-011 was approved as option **B** at rel-v0-2's triage (`8488c61`: "option B, independent review written into
kanban-delivery version 3, a task at the head of W12"). Option C, a check that refuses `in-review` without a Review
section, waits until WingFoil can check a section's presence: this task adds no check.

### Classification of the acceptance criteria

Both are **characterization**: no product code changes, so there is no red test to write first.

- `workflow list` is captured before the change (exit 0, empty stderr, 18 785 bytes) and after it; the difference
  must be the version and the review phase's text, and nothing else.
- `npm test` and `npm run lint` before submit; the repository's tests read only `test/fixtures/wingfoil-config/`,
  not `.wingfoil/`, so they are expected unchanged.

### What WingFoil at the pin can express

From `node_modules/wingfoil/dist/workflow/schema.d.ts`: a phase has `description`, `role`, `optional`, `actions`,
`produces`, `checks: { pre, post }`, `approval` and `fallback`. None of them names *who* performs a phase as
distinct from its role, and `checks` has no declared semantics a reader can rely on. The rule is therefore written
in the review phase's **description**, as dl-011 B says, and not as a `checks` entry WingFoil would not run.

### `kanban-delivery.yaml` (version 3)

- **`version: 3`**, and the header comment says what version 3 adds and that it implements dl-011 B.
- **`review`'s description** keeps what must hold (tests, coverage, lint, traceability, declared-vs-observed notes)
  and adds who reviews and how:
  - an independent, read-only agent (a fresh session or subagent, not the one that built the task, without write
    tools) reviews the task's branch against its Design, the requirements it names and its acceptance scenarios;
  - every finding is fixed on the branch or recorded as a bug or decision-log (the `code-review` directive's rule);
  - each fix is reviewed again, by an independent agent, until a round finds nothing to fix;
  - the rounds, their reviewer and the outcome of every finding are recorded in the task's Review notes;
  - a task is not submitted `in-progress → in-review` on a self-review.
- The `fallback` (back to `build`, `in-progress`) is unchanged: a rejection by the approver starts a new round of
  build and independent review.
- No other phase changes. `role: reviewer` stays: the independent agent executes as `reviewer` (dna.yaml).

### plan-004

Its delivery rules already state the rule (dl-011). The bullet gains a pointer to where it is now declared:
`kanban-delivery` version 3's review phase.

### Commit

One `chore(wingfoil)` commit with dl-011's approval as `Approver:`/`Reason:` trailers, as task-020 did for
dl-006 (a WingFoil configuration change that implements an approver's decision, through a task).

## Execution notes

- `npx wingfoil memory add --type task --title "An independent review in kanban-delivery"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-056-an-independent-review-in-kanban-delivery`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-04] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").
