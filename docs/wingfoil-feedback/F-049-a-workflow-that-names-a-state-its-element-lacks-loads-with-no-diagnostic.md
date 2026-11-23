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
and exit 0. The step can never select an element, which shows only when an instance reaches it.

Some `set_state` actions go unchecked the same way. Each case below was added to the included workflows, committed,
and read by `wingfoil workflow list`:

- `'bug.set_state(resolved)'` in `work-item`'s `done`, a step bound to `task` (the `bug` machine here: draft, pending,
  approved, fixed): empty `diagnostics`.
- `'element.set_state(bogus)'` in `end-of-life`'s `approve`, a step that selects with `where` and iterates nothing:
  empty `diagnostics`.
- `'element.set_state(bogus)'` in `work-item`'s `done`: `W_PHASE_EXIT_STATE_UNDETERMINED` ("'bogus' is not a state of
  task").

## Expected

A diagnostic when the configuration is read (a warning naming the workflow, the step, the state and the type's
machine) for every state a workflow names, wherever it names it: a `where` status filter, and every `set_state`,
typed or not, checked against the machine of the type it applies to, as 0.3.2 does in the last case above. It matters
most when a project composes packs and keeps some of its own Memory machines, where such a mismatch is easy to miss.
