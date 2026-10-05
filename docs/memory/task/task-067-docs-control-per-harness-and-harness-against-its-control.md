---
id: task-067-docs-control-per-harness-and-harness-against-its-control
type: task
title: "Docs control per harness and harness against its control"
status: draft
release: v0.2
wave: W12
features: [F7.1]
acceptance: [competitors.feature]
requirements: [REQ-RUN-11, REQ-FMT-05, REQ-SCO-14, REQ-RES-03]
---

## Context

F7.1's docs controls ([rel-v0-2](../release/rel-v0-2.md), W12): the approver chose a docs control per harness at the triage (T3).

**Scope:**

- one docs generator per harness (REQ-RUN-11): `baseline-docs` unchanged, `speckit-docs` new (`openspec-docs` comes
  with the OpenSpec arm in W13), each declaring what it renders and why, its output's digest in `run.json`;
- `docs_of` in arm definitions (REQ-FMT-05);
- **each harness compared with its own docs control** in the aggregate (REQ-SCO-14) and on the category pages
  (REQ-RES-03 as amended in 1.26); older aggregates read "not measured".

**No real agent, no spending.** **Done** means: `competitors.feature`'s docs-control outline green for wingfoil and
speckit; W12's "Ends with" ("Spec Kit runs S1–S3 and S8 under the same rules") checked with the fake agent; a
real-agent half decided in W12's plan phase.

## Acceptance criteria

- `competitors.feature` @F7.1 "Each harness has its own docs control" for baseline-docs and speckit-docs.
  **Red-first.**
- The aggregate and the category page hold each harness against its control. **Red-first.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Docs control per harness and harness against its control"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-067-docs-control-per-harness-and-harness-against-its-control`, `status: draft`.
