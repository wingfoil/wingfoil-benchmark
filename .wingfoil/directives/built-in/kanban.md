---
id: kanban
name: kanban
type: directive
kind: built-in
format: 1
title: "Kanban"
---

# Kanban

The project runs Kanban as the Kanban Guide (May 2025) defines it: a strategy for optimizing the
flow of value through a visual, pull-based system, under a Definition of Workflow (the
`definition-of-workflow` directive).

- **The three practices.** Define and visualize the workflow (the task machine's states are the
  board's columns); actively manage the items in it; improve it.
- **Pull within the limits, never past them.** At most 1 tasks `in-progress` and
  1 `in-review`, counted over the whole repository and every branch WingFoil sees.
  A task starts only when there is room: WingFoil refuses `memory submit` past a limit. A reject is
  not checked against the limit: a state a reject pushed over its limit is brought back within it
  (an item finished, or another parked with `memory park`) before anything else moves into it.
- **Manage the items in the flow.** Finish before starting; unblock an item before pulling a new
  one; an item that waits is parked back to `backlog`, not left `in-progress`.
- **The four flow measures** are read from the tasks' history in Memory, since WingFoil computes
  none of them: WIP (the tasks started and not finished), throughput (the tasks finished per unit
  of time), work item age (the time since a task started) and cycle time (from `in-progress` to
  `done`).
- **The Service Level Expectation** is 85% of work items finish within 10 days. An item older than it is
  handled first, and the gap is discussed at the next retrospective.
- **Releases.** The Product Owner decides them. One release is kept `in-development` to carry the
  flow: the next one is added before the current one leaves `in-development`. A task carries the
  release it is delivered in, by its `version`, in its `release` field; a task not yet planned
  carries `release: "n/a — <reason>"` and stays out of the flow. A release moves to `releasing`
  only once its own tasks are done or moved to the next release, by rewriting their `release`.
- **Improve the workflow** at each release's retrospective (`base`'s `retrospective`), from the
  flow measures and the Service Level Expectation; a change to the workflow is a change of the
  Definition of Workflow.
- An agent works for the developers, as their tool, and never approves: it hands the approver the
  exact command.
