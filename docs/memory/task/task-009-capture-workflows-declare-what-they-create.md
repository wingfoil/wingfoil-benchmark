---
id: task-009-capture-workflows-declare-what-they-create
type: task
title: "Capture workflows declare what they create"
status: in-progress
release: v0.1
wave: W2
requirements: [REQ-ARC-05]
---

## Context

Fixes [bug-002](../bug/bug-002-ingest-workflows-declare-no-actions.md): `bug-ingest`,
`decision-log-ingest` and `adr-ingest` are still the six-line scaffold `wingfoil init` produced —
one `capture` phase with no `actions`, no `role` and no `produces`. They parse and they are
`kind: main`, but none of them says **which document it would create**, so none can be offered as
something to start.

This task gives each of the three a phase that declares what it does, following WingFoil's own
`bug-ingest` (`actions: ['memory.add(type: bug)', memory.submit]`) and the two workflows of this
repository that already declare their actions, `campaign-cycle` and `kanban-delivery`.

**What it does not touch.** The two bare `memory.add` calls in `campaign-cycle` and
`kanban-delivery` stay as they are. Those phases carry an `element:`, so the type is recoverable and
the bare form is terse rather than incomplete; whether to spell it out everywhere is a style question
that deserves its own decision, and bug-002 keeps it separate on purpose. Widening this task to
"make every action explicit" would answer a question nobody has asked.

**On `requirements`.** As in [task-008](task-008-phase-includes-in-the-workflow-configuration.md), no
requirement covers the project's own process configuration, and the field cannot be left empty.
`REQ-ARC-05` is the nearest — it is the requirement about this repository's `.wingfoil/` describing
the project truthfully — and it is cited in that spirit, not because it mentions workflows. This is
the second task to hit it; it is recorded in usage note N21 and is with the approver for triage.

**Done** means: each of the three declares the document it creates and the role that creates it;
`npx wingfoil workflow list` still reports all of them; and the check that this is a fix and not a
removal is run explicitly — each file keeps its identity and stays in the manifest.

## Acceptance criteria

No Gherkin criterion: this changes declarative configuration, not code, so there is no test to
drive. The criteria are verified by hand and recorded in the Execution notes:

- each of `bug-ingest`, `decision-log-ingest` and `adr-ingest` declares, for its `capture` phase, the
  `memory.add(type: …)` of its own element type, the `memory.submit` that follows it, and a `role`;
- `npx wingfoil workflow list` reports all three, before and after, with their phases intact;
- **the adversarial check, from task-008's lesson:** a warning that disappears because the check
  stopped applying is not a fix. Each file is confirmed to still exist, to still be listed in
  `.wingfoil/workflows.yaml`, and to still carry its own `name`, `kind` and `description`.

## Design

**Classification confirmed:** there is no code and no Gherkin criterion; the three criteria above are
verified by hand, before and after, and recorded in the Execution notes (as in task-008).

Each `capture` phase gets what WingFoil2's own ingest workflows declare
(`docs/self/.wingfoil/workflows/custom/` in that repository, read-only), translated to this
repository's Memory paths from `.wingfoil/memory.yaml`:

| Workflow | `role` | `actions` | `produces` |
|---|---|---|---|
| `bug-ingest` | `developer` | `'memory.add(type: bug)'`, `memory.submit` | `docs/memory/bug/{id}.md` |
| `decision-log-ingest` | `product-owner` | `'memory.add(type: decision-log)'`, `memory.submit` | `docs/memory/decision-log/{id}.md` |
| `adr-ingest` | `architect` | `'memory.add(type: adr)'`, `memory.submit` | `docs/memory/adr/{id}.md` |

plus a one-line `description` of the phase. Decisions and their reasons:

- **The roles are WingFoil2's**, and each exists in this repository's `roles.yaml`. They say who
  *typically* captures the element, not who may; nothing enforces roles without a workflow engine.
- **`produces` is declared**, although bug-002 names only the actions as the defect: the task's own
  "Done" asks each workflow to declare *the document it creates*, and `produces` is where that is said.
  The paths are copied from `memory.yaml`, not re-invented, so the two cannot disagree today; nothing
  checks that they stay in step (worth a usage note, not a fix here).
- **No approval phase is added.** WingFoil2's versions have a second, gated phase (`triage` /
  `approve`). This repository's gates are real — every bug, dl and adr has gone through `approve` — but
  adding the phase is a process-design choice bug-002 explicitly leaves out, and this task's Context
  says not to widen it. Recorded as a follow-up question for the approver, not taken.
- **No `checks:` and no `version:`** — WingFoil2 declares them; this repository's other workflows do
  not, and adding them would be the "make everything explicit" widening the Context rules out.
- The two bare `memory.add` in `campaign-cycle` and `kanban-delivery` are left alone, as the Context
  says.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
