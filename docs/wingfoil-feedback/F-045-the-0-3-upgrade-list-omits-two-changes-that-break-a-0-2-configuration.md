---
id: F-045
title: "The 0.3 upgrade list omits two changes that break a 0.2 configuration"
kind: defect
status: open
wingfoil_version: 0.3.1
answered_by: []
---

New note (task-109).

## Observed

A project whose configuration worked on a 0.2 build (here `0.2-pre-3df305e`) moved to `wingfoil@0.3.1`
(`870bd440`). `CHANGELOG.md`'s "Upgrading from 0.2.x" (0.3.0) lists what to change, as does the user guide's
*Upgrading from 0.2.x* section; two more changes broke the project, and neither is in either list:

- A required frontmatter field holding a list is now missing unless the type lists it in
  `template.frontmatter.lists`. With `required: [id, type, title, status, release, wave, requirements]` and
  `requirements: [REQ-NFR-02]` in a committed task, `memory submit <id>` printed `error: missing required field on
  submit: requirements`, exit 1, where 0.2-pre moved it to `pending`. The changelog mentions `lists` only as an
  addition (an explicit `[]` accepted there), not as a refusal of every non-empty list elsewhere. The fix also
  changes what `required` means for a list: once listed, `[]` is filled, so a list that must hold at least one
  value (a task's requirements) can no longer be required non-empty by `memory.yaml`.
- A phase's `produces` must be a path pattern. A workflow with `produces: ["release element: ## Retrospective
  section"]` made `workflow list`, and `workflow show` for every workflow, exit 1 with `E_PHASE_PRODUCES_NOT_A_PATH
  phases[6].produces[0] (workflows/custom/release-cycle.yaml): produces 'release element: ## Retrospective section'
  is not a path pattern (allowed: [A-Za-z0-9._/{}-], no whitespace)`; 0.2-pre listed the workflows with exit 0.

Reproducible with WingFoil alone: in a project whose configuration `0.2-pre-3df305e` accepts, give a type a required
field holding a list, or a phase a prose `produces`, then run `memory submit` and `workflow list` with 0.3.1.

## Expected

"Upgrading from 0.2.x" lists both: declare in `template.frontmatter.lists` every required field whose value is a
list, and replace a prose `produces` by a path (or remove it), each with the error a 0.2 configuration then meets.
