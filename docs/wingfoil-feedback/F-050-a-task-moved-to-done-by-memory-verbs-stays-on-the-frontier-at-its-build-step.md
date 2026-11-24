---
id: F-050
title: "A task moved to done by Memory verbs stays on the frontier at its build step"
kind: gap
status: open
wingfoil_version: 0.3.2
answered_by: []
---

New note (task-177).

## Observed

On WingFoil 0.3.2 (`6de2e13c`), task-127 went backlog → in-progress → in-review → approved → done through
`memory submit` and `memory approve`, with no workflow command. The open instance of `sw-life-cycle` then still
listed `work-item.build@task:task-127-…` on its frontier (`workflow status`: "missing: record"). Its `start`,
`review`, `approve` and `done` steps were satisfied by the task's state; `build`, whose evidence is a run record,
was not. An external workflow runner, asked for its next step (`--dry-run`), proposed that build for a task already
done. `wingfoil workflow finalize --step work-item.build@task:<id> --reason …` closed it, as an empty commit. After
that, `work-item.real-agent-check` (manual, optional) stayed on the frontier as "human needed", routed to the
approver, and the runner's dry run announced a notice for it.

## Expected

A step that precedes, in its workflow, a step already satisfied by the element's state is not offered as ready: a
task in `done` has nothing left to build. Either the frontier leaves such a step out, or it marks it as passed by the
element's state and names `workflow finalize` as the way to record it. An optional manual step after the last
transition does not hold the element on the frontier unless someone starts it.
