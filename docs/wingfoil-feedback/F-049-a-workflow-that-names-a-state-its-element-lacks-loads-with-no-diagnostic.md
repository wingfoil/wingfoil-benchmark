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

The same holds for a typed action on another type: `'bug.set_state(resolved)'` added to the `done` step of a workflow
bound to `task` (the `bug` machine here: draft, pending, approved, fixed) gives `workflow list` an empty
`diagnostics`; `'element.set_state(bogus)'` in the same step gives `W_PHASE_EXIT_STATE_UNDETERMINED` ("'bogus' is not
a state of task"). And `'element.set_state(bogus)'` added to `end-of-life`'s `approve`, a step that selects with
`where` and iterates nothing, gives an empty `diagnostics` too. The state a `set_state` names is checked only when it
applies to the bound element or to an element created earlier in the instance; a fallback's `set_state` is compared
with the held gate's reject target (`W_PHASE_FALLBACK_STATE_MISMATCH`), not with the machine.

## Expected

A diagnostic when the configuration is read (a warning naming the workflow, the step, the state and the type's
machine) for a state named in a `where` status filter and for the state of every `set_state`, typed or not, on a
selection or in a fallback, checked against the machine of the type it applies to, as 0.3.2 already does for the bound
element (`W_PHASE_EXIT_STATE_UNDETERMINED`). It
matters most when a project composes packs and keeps some of its own Memory machines, where such a mismatch is easy to
miss.
