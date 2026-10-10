---
id: F-001
title: "init's Kanban template scaffolds a life cycle with empty phases, no plan type and ingest workflows with no actions"
kind: gap
status: open
wingfoil_version: 0.1.0-7a65580
answered_by: []
---

Formerly N1.

## Observed

In a scratch repository (`git init`, `git config user.name/user.email`, `wingfoil init --template Kanban`):

- `.wingfoil/workflows/custom/sw-life-cycle.yaml` has four phases; `inception`, `specification` and `sunset` declare
  nothing (no `include`, no `actions`, no `produces`), and `delivery` includes `kanban-delivery` by file path.
- `bug-ingest.yaml`, `decision-log-ingest.yaml` and `adr-ingest.yaml` each have one phase, `capture`, with no
  `actions`, no `role` and no `produces`: none says which document it creates.
- `.wingfoil/memory.yaml` declares no `plan` type, although WingFoil's own process asks for a plan element when a
  workflow phase starts.
- `wingfoil workflow list` exits 0 with no warning and echoes each capture phase as `{"name":"capture","optional":false}`.

A project that follows WingFoil's own process has to copy an inception workflow, a plan type and the ingest actions
from WingFoil's repository by hand. Re-run on 2026-10-10 on `0.2-pre-3df305e` and on `0.2.2`: the same files, the same exit 0.

## Expected

`init` scaffolds a life cycle a project can run: each phase either includes a workflow or declares what it
produces, each ingest workflow declares the `memory.add(type: …)` action of the document it captures, and the
types the process needs exist. `workflow list` reports a startable workflow whose phases declare nothing.
WingFoil bug-144 (closed) fixed the include by path of the same template.
