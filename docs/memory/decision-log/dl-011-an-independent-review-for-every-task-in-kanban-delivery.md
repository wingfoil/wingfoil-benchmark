---
id: dl-011-an-independent-review-for-every-task-in-kanban-delivery
type: decision-log
title: "An independent review for every task in kanban-delivery"
status: approved
---

## Context

In release v0.1, W1–W2 and W7–W11 tasks were reviewed by fresh, read-only agents, round after round. Those reviews
found real defects the tests had missed, among them:

- a token leaking into `run.json` (task-006);
- a doubled cost (task-007);
- a private repository read as public (task-047);
- a bounded step's cost lost (task-053).

But W3–W6 (tasks 008, 009 and 011–030, about 20 tasks) shipped on a self-run "review readiness" only. Independent
review came back at task-042, after the approver sent that task back. `kanban-delivery`'s review phase says what
must hold (tests, coverage, lint, traceability), not who reviews.

## Options

- **A. Leave it to each session.** As in v0.1: it lapsed for four waves.
- **B. State it in the review phase.** An independent, read-only agent reviews the branch against the Design, the
  requirements and the acceptance scenarios. Its findings and their outcomes are recorded in the task's Review notes,
  and each fix is reviewed again until clean.
- **C. B, plus a check.** The task's `in-review` submit is refused without a Review section naming the reviewer.

## Proposal

**B** now, through a task that amends `kanban-delivery.yaml` (version 3). C is considered once WingFoil can check
a section's presence.

## Consequences

- Every task carries a Review section with rounds and outcomes, as W10–W11 and the campaign's tasks did.
- A task is not offered for approval on a self-review.
