---
id: task-065-spec-kit-in-the-run-container-spike
type: task
title: "Spec Kit in the run container spike"
status: backlog
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-RUN-18]
---

## Context

A spike before the Spec Kit arm ([rel-v0-2](../release/rel-v0-2.md), W12, high uncertainty on F7.1).

**Questions:**

1. Does Spec Kit at its pinned version install from a wheel bundle in the run image, and does
   `specify init --integration claude` work headless (`--here`, `--force`, `--script sh`)?
2. What does it write into the workspace: skills, `.specify/`, a `CLAUDE.md`? Which of it is project information
   and which is mechanics (for its docs control)?
3. Can an agent follow its skills (`/speckit-specify` … `/speckit-implement`) under `claude -p` with the neutral
   approver, and where do the sessions wait?
4. Does any step reach for its workflow engine, its own LLM calls or the network?

**First with the fake agent, then one small real run, consented by this task's pending → backlog approval:** at most
**3 €**, Sonnet 5, S3 step 1 only. A line of `docs/calibration/v0.2-ledger.md`.

**Done** means: the answers with their evidence; the register's entry for Spec Kit updated; the setup script drafted
for task-066.

## Acceptance criteria

<!-- A spike: no Gherkin scenario. Its answers and the ledger line are reviewed. -->

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Spec Kit in the run container spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-065-spec-kit-in-the-run-container-spike`, `status: draft`.
