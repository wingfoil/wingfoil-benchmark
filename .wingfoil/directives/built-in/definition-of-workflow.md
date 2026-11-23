---
id: definition-of-workflow
name: definition-of-workflow
type: directive
kind: built-in
format: 1
title: "Definition of Workflow"
---

# Definition of Workflow

The project's Definition of Workflow, as the Kanban Guide asks. A project replaces these rules with
its own by a `custom/` directive of the same id.

- **Units of value:** the work items are the project's tasks.
- **Started and finished points:** a task is started when it moves to `in-progress` and finished
  when it moves to `done`.
- **States:** the task machine's states between them (`in-progress`, `in-review`, `approved`);
  before them the backlog, the tasks in `backlog`.
- **How WIP is controlled:** at most 1 tasks `in-progress` and 1
  `in-review`, in the whole repository.
- **Policies of each state:**
  - `backlog`: a task is ordered by value and carries its release; it is pulled only within the
    limit on `in-progress`;
  - `in-progress`: an item leaves it for review only once the work meets the project's quality
    measures (its tests and checks pass), with no step left for later;
  - `in-review`: someone other than the author has checked it;
  - `approved`: the approver has approved it;
  - `done`: it is integrated and verified as the project requires, and what a user or an operator
    needs to know about it is written down.
- **Service Level Expectation:** 85% of work items finish within 10 days.
