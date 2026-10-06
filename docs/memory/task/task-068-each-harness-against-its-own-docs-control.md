---
id: task-068-each-harness-against-its-own-docs-control
type: task
title: "Each harness against its own docs control"
status: pending
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-SCO-14, REQ-RES-03]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

Split from [task-067](task-067-docs-control-per-harness-and-harness-against-its-control.md) by the approver in chat on
2026-10-06 ("Dividere"): task-067 delivers the speckit-docs control and the harness setup pages, which W12's "Ends
with" needs; this task delivers the comparison that uses the controls, before v0.2's calibration (W13).

**Scope:**

- **each harness arm compared with its own docs control** (REQ-SCO-14, T3), metric by metric and by the same rules as
  the comparison with the baseline; the aggregate stores it with both groups' runs. The pairing comes from the docs
  control's `docs_of`, recorded where the aggregator can read it (the runs or the aggregate), since today it reads only
  what the execution committed;
- **the category pages** (REQ-RES-03 as amended in 1.26) show each harness against its control beside the comparison
  with the baseline; an aggregate written before this task reads "not measured";
- the method page's comparisons paragraph names the second comparison.

It serves F7.1, but `features` stays empty: no `competitors.feature` scenario states this comparison, and a task that
names a feature and no scenario would require every scenario of the feature (traceability per scenario, task-064).

**No real agent, no spending.** **Done** means: an execution with a harness and its docs control shows the comparison
in its aggregate and on its category pages; v0.1's published execution still builds, reading "not measured".

## Acceptance criteria

- The aggregate and the category page hold each harness against its control. **Red-first.**
- An older aggregate still builds its site, the comparison "not measured". **Characterization.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Each harness against its own docs control"`. Declared: creates the
  element from the template and commits it. Observed: `wf(task): add task-068-each-harness-against-its-own-docs-control`,
  `status: draft`. Matches.
