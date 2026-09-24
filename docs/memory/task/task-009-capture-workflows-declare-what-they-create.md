---
id: task-009-capture-workflows-declare-what-they-create
type: task
title: "Capture workflows declare what they create"
status: in-review
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

### Build

- **Three commits, one per workflow**, each only adding lines to its `capture` phase: `11eeb89`
  `bug-ingest`, `3140747` `decision-log-ingest`, `132976c` `adr-ingest`. `git diff main` on the three
  files: 21 lines added, **0 removed** — `name`, `kind` and `description` untouched.
- **Criterion 1, the declarations.** `npx wingfoil --format json workflow list` after the change
  reports, for each capture phase, the declared `description`, `role`, `actions` and `produces`:
  `developer` / `memory.add(type: bug)` / `docs/memory/bug/{id}.md`; `product-owner` /
  `memory.add(type: decision-log)` / `docs/memory/decision-log/{id}.md`; `architect` /
  `memory.add(type: adr)` / `docs/memory/adr/{id}.md`, each followed by `memory.submit`. The roles
  were checked by hand against `roles.yaml` and the paths against `memory.yaml`'s `path:` patterns.
- **Criterion 2, `workflow list` before and after.** Both exit 0 with an empty stderr and list the
  same 10 workflows in the same order; the seven other workflows are byte-identical in the JSON output.
  Before, each ingest workflow read `phases: [{ name: capture, optional: false }]` and nothing else.
- **Criterion 3, the adversarial check (task-008's lesson).** Each of the three files still exists, is
  still listed once in `.wingfoil/workflows.yaml`, and keeps its `name`, `kind: main` and
  `description`: nothing was removed to make a finding go away.
- **A probe the criteria did not ask for, and what it showed.** `adr-ingest` was edited to
  `memory.add(type: nonsense)` and `role: nobody`, and `workflow list` still exited 0 with an empty
  stderr, then the file was restored. So "the tool accepts it" says nothing about whether a declared
  type, role or path is real; the by-hand check above is the only evidence they are. Recorded as usage
  note **N28**; bug-005's WingFoil side as **N29**.
- **Follow-up, not taken (approver's call):** WingFoil2's ingest workflows have a second, gated phase
  (`triage` / `approve`); this repository's are still capture-only although every capture here does go
  through an approval gate. Adding it is the process-design question bug-002 left out.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory search --type task --status in-progress` → no match: the WIP slot was free.
- `npx wingfoil memory submit task-009-capture-workflows-declare-what-they-create` → `70760fa`, after
  the design commit `ee6f145`. Declared: `backlog → in-progress`, one commit, only `status` changed.
  Observed: exit 0, JSON `{from: backlog, to: in-progress}`, 1 file, 1-line diff. Matches.
- `npx wingfoil workflow list` (before, after, and with the probe): exit 0 every time, including on a
  declaration naming a non-existent type and role — see N28.
