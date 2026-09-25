---
id: bug-002-ingest-workflows-declare-no-actions
type: bug
title: "The three ingest workflows declare no actions, so nothing knows what they create"
status: approved
---

## Context

`bug-ingest`, `decision-log-ingest` and `adr-ingest` are still the scaffold `wingfoil init` wrote.
Each is six lines: a name, a kind, a description, and a single phase with nothing in it.

```yaml
# Capture a bug on demand
name: bug-ingest
kind: main
description: "Capture a bug on demand"
phases:
  - name: capture
```

The same workflow in WingFoil2's own configuration declares what the phase does:

```yaml
  - name: capture
    role: developer
    actions:
      - 'memory.add(type: bug)'
      - memory.submit
    produces:
      - "docs/04_memory/bugs/{id}.md"
```

`decision-log-ingest.yaml` and `adr-ingest.yaml` are identical in shape to `bug-ingest.yaml` here:
six lines, one empty phase.

## Impact

A workflow that declares no action declares no work. These three are `kind: main` and carry no
`element:`, which is what makes them *startable on their own* — and the thing a reader has to know
before starting one is which document it would create. Nothing in the configuration says it.

The consequence is not cosmetic. Anything that composes a starting point from the configuration has
only three facts to go on — main, no element, and the phase's actions — and the third is empty, so
the three workflows cannot be offered at all. The roadmap viewer's "Capture something new" is empty
for this repository while listing three for WingFoil2. The same gap defeats a human: the description
says "Capture a bug on demand" and the phase says `capture`, and neither says that a `bug` document
at `docs/memory/bug/{id}.md` is what comes out.

It also leaves the two ingest paths this project actually uses undeclared. `bug-001` was captured by
hand, following WingFoil2's grammar rather than this repository's `bug-ingest`, because this
repository's `bug-ingest` does not describe the operation it names.

## Evidence

Read-only, at `6ff5fb4`.

- `wc -l` on the three files: 6, 6, 6. `grep -c actions:` on each: 0, 0, 0.
- `npx wingfoil workflow list` **exits 0 and reports no warning.** It echoes the workflow back as
  valid, with the phase reduced to what it declares:

  ```json
  { "name": "bug-ingest", "kind": "main", "description": "Capture a bug on demand",
    "phases": [ { "name": "capture", "optional": false } ] }
  ```

  A phase with no actions, no role and no `produces` is accepted silently — the same class of
  omission as `bug-001`, where a well-formed value that says nothing passes validation.
- Across the whole configuration, only three of ten workflows declare an action in any phase
  (`kanban-delivery` 4 phases of 5, `release-cycle` 2 of 7, `campaign-cycle` 7 of 8). The other
  seven, these three among them, declare none.

## Scope of the fix

Give each of the three phases the action that names what it creates, and the type it creates:

| File | Phase | Action to declare |
|---|---|---|
| `.wingfoil/workflows/custom/bug-ingest.yaml` | `capture` | `memory.add(type: bug)`, `memory.submit` |
| `.wingfoil/workflows/custom/decision-log-ingest.yaml` | `capture` | `memory.add(type: decision-log)`, `memory.submit` |
| `.wingfoil/workflows/custom/adr-ingest.yaml` | `capture` | `memory.add(type: adr)`, `memory.submit` |

Whether each also gets a `role:`, a `produces:` and a triage phase with an approval gate — as
WingFoil2's `bug-ingest` has — is a design question for this project and not part of this defect.
The defect is that the workflow does not say what it creates.

## Adjacent, and deliberately not the same thing

`memory.add` appears twice more in this configuration, in `campaign-cycle` and `kanban-delivery`, in
the **bare** form without `(type: ...)`. Those two phases sit in workflows that declare
`element: campaign` and `element: task`, so the type is recoverable from the element, and the bare
form there is terse rather than incomplete. It is worth deciding as a matter of style, separately.

The three ingest workflows are the case where it stops being style: with no `element` there is
nothing to recover the type from, and with no action at all there is not even a bare form to recover
it from. That is why this bug is about the missing actions and not about the bare form.

## Notes

Found from outside, by the roadmap viewer reading this repository through `--repo`: its "Capture
something new" widget was empty here and populated for WingFoil2, and the three conditions it checks
made the missing one obvious. The project's own CLI does not report it, which is the part worth
carrying back — see the usage notes, where this is recorded as a second manifestation of N1 (the
`init` scaffold produces something syntactically valid that cannot do its job, and nothing flags it)
rather than as a finding of its own.

## Resolution

Fixed in [task-009](../task/task-009-capture-workflows-declare-what-they-create.md): each capture phase
declares `memory.add(type: …)`, `memory.submit`, a `role` and the document it `produces`. The two bare
`memory.add` in `campaign-cycle` and `kanban-delivery` are untouched, as scoped above. `workflow list`
does not check a declared type, role or path against the schema (usage note N28), so their
correctness rests on the by-hand check recorded in the task.
