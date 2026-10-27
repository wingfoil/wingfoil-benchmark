---
id: wingfoil-cli
name: "Using the pinned WingFoil CLI"
type: directive
kind: custom
title: "Using the pinned WingFoil CLI"
tags: [custom, wingfoil, cli, governance]
---

# Directive — Using the pinned WingFoil CLI

**Version:** 1.1 · **Date:** 2026-10-27 (1.1: rule 8 for a published pin; entries re-checked, W-04, W-05, W-06,
W-10, W-11 and W-12 removed as fixed, W-18 and W-19 added — task-109) · **Checked against:** `wingfoil@0.3.1`
(`870bd440`)

Global. Applies to every role, human or agent, that runs the WingFoil CLI in this repository.

## Rules
1. Run the pinned CLI (`npm run -s wingfoil -- …`); never a global `wingfoil` of another version.
2. Every governance change goes through a CLI verb when one exists; hand edits only where an entry says so.
3. A wrong, missing or surprising behaviour gets an entry below. If it is a WingFoil defect or gap,
   also write a note in `docs/wingfoil-feedback/` (evidence: command, output, version, commit).
4. Do not work around silently: a workaround goes in the entry and in the Execution Notes of the
   element being worked on.
5. When the pin advances: re-check every entry, remove the fixed ones, bump this directive's version
   and *Checked against*. A note whose answer has shipped stays `resolved`; there is no `verified`
   status (WingFoil dl-163).
6. `answered_by` and the statuses `needs-info`, `captured`, `resolved`, `declined` and `duplicate`
   are set only by the sync, from what WingFoil published, never by judgement. WingFoil cites a note
   as `<service id>/F-<nnn>@<sha>`.
7. Run `wingfoil-sync` at every `release-planning` and at every pin bump, and record the sync in
   `docs/wingfoil-feedback/README.md`.
8. The pinned build is a published version, `package.json`'s devDependency `"wingfoil": "npm:wingfoil@<version>"`
   (WingFoil `COLLABORATION.md`, "Contributor setup"); `--version` prints `<version> (<sha>)`, which names the build.
   The pin moves forward only, to a published version, one commit per switch, through a task that runs `npm ci`,
   re-checks this directive (rule 5) and runs the sync (rule 7, `scripts/wingfoil-sync.mjs`).
9. The WingFoil builds the benchmark's arms run inside their containers are measured, not used to govern this
   repository. Friction they show is still a note, with that build as `wingfoil_version`; a note never carries a
   run's results, which stay in the benchmark's own records.

## Known behaviours (0.3.1)

| # | Behaviour | How to work with it | Note | WingFoil element |
|---|-----------|---------------------|------|------------------|
| W-01 | `memory submit` commits uncommitted edits of the element with the transition, naming them in a `Carries content:` body line; `approve`, `reject` and `deprecate` refuse an element with uncommitted edits. | Commit the content by hand, with its own `docs(…)` message, before any transition. | F-012 | bug-076, bug-182 |
| W-02 | `memory add` sets no frontmatter field but those of `id_pattern` and `path` tokens (`--set`); the other required fields come out empty. | Fill the frontmatter in a `docs(…)` commit before `submit`. | F-029 | dl-197 |
| W-03 | `approve` and `reject` require `--reason`; `submit` refuses one (`unknown option '--reason'`). | Never pass `--reason` to `submit`; every approval command handed over carries a drafted reason, never a placeholder. | F-038, F-037 | dl-201 |
| W-07 | `memory amend` exists, but no type here declares `amendable: true`, so it refuses (`type 'task' is not amendable`). | A hand edit whose commit body carries `Approver:` and `Reason:`, until a task adopts `amendable`. | F-015 | dl-108, task-127 |
| W-08 | `memory park` exists, but the `task` machine declares no `returns:` edge, so it refuses (`not a returns state`). | Freeing a WIP slot is a question for the approver, framed in the machine's terms, until a task adopts a `returns:` edge. | F-020 | dl-110, task-180 |
| W-09 | A gate commits on the branch checked out. | Every approval command starts with the `cd` to the checkout of the branch that should receive it (`multi-session` directive). | F-031 | |
| W-13 | No `memory validate`. | `memory submit <id> --dry-run` checks the required fields and writes nothing. | F-028 | dl-200 |
| W-14 | `submit` subjects carry no `[from → to]`. | Read the state from the frontmatter or `git log -p`, not from the subject. | F-008 | dl-054 |
| W-15 | `directive assign` binds a directive to one role only; `--role global` is refused. | Add the directive to `roles.yaml`'s `global:` list by hand, commit it, and check `directives list --role <r>` for every role. | F-039, F-018 | bug-410 |
| W-16 | The default `bug` machine ends at `approved`, and no field links a bug to the task that fixes it. | The `bug` type adds a `fixed` state, reached by `submit` once the fixing task is done; the bug's `fixed_by` and the task's `fixes` name each other, and the traceability test holds them together. | F-023 | |
| W-17 | A `waiting` state, once declared, has no verb that leaves it without a workflow engine; a `plan` closes by a plain `submit`, with no approver or reason. | The `task` machine drops WingFoil's `waiting` states; a plan is closed by `submit` only after the approver's go, which the plan's text or its completion criterion records (the first plan was closed by a hand-written commit carrying `Approver:` and `Reason:`). | F-009 | |
| W-18 | A required field holding a list is missing unless the type lists it in `template.frontmatter.lists`; there `[]` is filled. | Every required list field goes in its type's `lists` (`task.requirements`; `release.waves`, `features`). | F-045 | bug-147 |
| W-19 | A phase's `produces` must be a path pattern; prose fails `workflow list` and `workflow show` for every workflow. | Name the file that holds the evidence. `release-cycle`'s retrospective names the release element, which exists from planning, so that evidence is always present: the approver decides what closes the phase. | F-045 | |
