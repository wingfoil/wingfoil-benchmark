---
id: task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis
type: task
title: "The effort pinned per model and every model's tokens and price basis"
status: backlog
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-RUN-16, REQ-RUN-08, REQ-RUN-09]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

Planned at W13's plan phase (the approver in chat, 2026-10-07: "Sì, come proposto"). Three items that read
`modelUsage` and the agent pin, and must land **before v0.2's calibration** so that its dry runs are measured as the
campaign will be ([rel-v0-2](../release/rel-v0-2.md) triage §3 and §5):

- **[dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md), option C:**
  the effort pinned per model in the campaign file (`agent.effort: {<model>: <level>}`, required for a real agent),
  passed as `--effort` on every invocation, recorded with the run, part of the campaign's identity and of the
  estimate's key; the method page and the run detail show it. REQ-RUN-16 amended.
- **[bug-012](../bug/bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work.md):** a step's
  tokens are summed over every model in `modelUsage`, as its cost is; the `step_tokens` cap counts them all
  (REQ-RUN-08, REQ-RUN-09 amended).
- **[bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md):** the run
  records `costBasis` per model; a run whose cost the agent could not price is flagged in `run show`, refused by the
  estimate as a missing dry run is, and marked on the site.

The design phase declares bug-012 and bug-016 in `fixes`. **No real agent, no spending:** the levels themselves are
set at calibration with the approver. **Done** means: a campaign pins and records the effort, a step's tokens cover
every model, and an unpriced cost cannot pass unnoticed — each with the fake agent replaying recorded sessions.

## Acceptance criteria

- The effort pinned per model: required for a real agent, passed, recorded, in the identity. **Red-first.**
- A step's tokens summed over `modelUsage`; the cap counts them. **Red-first** (bug-012's evidence as a fixture).
- An unpriced model's cost flagged and refused by the estimate. **Red-first** (bug-016's P2 session as a fixture).
- A v0.1 run without these fields still reads, scores and builds. **Characterization.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "The effort pinned per model and every model's tokens and price basis"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis`, `status: draft`. Matches.
