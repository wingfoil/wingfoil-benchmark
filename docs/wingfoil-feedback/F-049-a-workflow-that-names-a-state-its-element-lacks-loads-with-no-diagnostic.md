---
id: F-049
title: "A workflow that names a state its element lacks loads with no diagnostic"
kind: gap
status: open
wingfoil_version: 0.3.2
answered_by: []
---

New note (task-127).

## Observed

On WingFoil 0.3.2 (`6de2e13c`), in a project whose `memory.yaml` gives `decision-log` the default machine (draft,
pending, approved), a workflow is included whose step selects `where: { type: decision-log, status: [in-discussion] }`
(software 1.0.0's `end-of-life`, written for base 2.0.1's decision-log machine). After a commit, `wingfoil workflow
list`, `wingfoil workflow show end-of-life` and `wingfoil workflow status` print no diagnostic about `in-discussion`
and exit 0. The step can never select an element, which shows only when an instance
reaches it.

## Expected

A diagnostic when the configuration is read (a warning naming the workflow, the step, the state and the type's
machine), for every state a workflow names: in a `where` status filter, a `set_state` action or a fallback's
`set_state`. It matters most when a project composes packs and keeps some of its own Memory
machines, where such a mismatch is easy to miss.
