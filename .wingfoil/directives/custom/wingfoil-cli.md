---
id: wingfoil-cli
name: "Using the pinned WingFoil CLI"
type: directive
kind: custom
title: "Using the pinned WingFoil CLI"
tags: [custom, wingfoil, cli, governance]
---

# Directive — Using the pinned WingFoil CLI

**Version:** 1.0 · **Date:** 2026-10-10 · **Checked against:** `wingfoil@0.2-pre-3df305e`

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
8. The pinned build is an unpublished tarball, `vendor/wingfoil-0.2-pre-3df305e.tgz`, installed as a `file:`
   devDependency; it prints `0.1.0` for `--version` (F-005), so the build is named after the tarball. The pin moves
   only through a task that replaces the tarball and `package.json`'s entry, and re-checks this directive (rule 5).
9. The WingFoil builds the benchmark's arms run inside their containers are measured, not used to govern this
   repository. Friction they show is still a note, with that build as `wingfoil_version`; a note never carries a
   run's results, which stay in the benchmark's own records.

## Known behaviours (0.2-pre-3df305e)

| # | Behaviour | How to work with it | Note | WingFoil element |
|---|-----------|---------------------|------|------------------|
| W-01 | `memory submit` and `memory approve` commit uncommitted edits of the element with the transition. | Commit the content by hand, with its own `docs(…)` message, before any transition. | F-012 | bug-076 |
| W-02 | `memory add` takes only `--type`, `--title` and `--tags`; required fields come out empty. | Fill the frontmatter in a `docs(…)` commit before `submit`. | F-029 | |
| W-03 | `approve` and `reject` require `--reason`; `submit` refuses one (`unknown option '--reason'`). | Never pass `--reason` to `submit`; every approval command handed over carries a drafted reason, never a placeholder. | F-038, F-037 | |
| W-04 | `memory history` prepends template commits with `operation: null` and prints `fatal:` on stderr, exit 0. | Read an element's trail with `git log -- <path>`; ignore entries with `operation: null` that do not touch the element. | F-006 | bug-077 |
| W-05 | "illegal transition" names a target the verb would never reach. | Read the type's machine in `memory.yaml` to see which verb applies from the current state. | F-011 | bug-127 |
| W-06 | `submit` reads an empty required list as missing. | Fields that may truly be empty (`features`, `acceptance`) are left out of the type's `required`; a near-true value is never written to satisfy the check. | F-016 | |
| W-07 | No verb amends an approved element. | A hand edit whose commit body carries `Approver:` and `Reason:`. | F-015 | dl-108, task-127 |
| W-08 | No verb parks a started task. | Freeing a WIP slot is a question for the approver, framed in the machine's terms. | F-020 | dl-110, task-180 |
| W-09 | A gate commits on the branch checked out. | Every approval command starts with the `cd` to the checkout of the branch that should receive it (`multi-session` directive). | F-031 | |
| W-10 | `dna set` writes scalars only. | Edit lists in `dna.yaml` by hand, commit, then check with `dna show`. | F-013 | dl-081 |
| W-11 | `workflow list` neither resolves phase includes nor checks actions, roles and `produces`. | Name the workflow in `include`; the repository's tests and the reviewer check the rest. | F-017, F-022 | bug-145, bug-150 |
| W-12 | `--version` prints `0.1.0`. | Name the build after the tarball (rule 8). | F-005 | |
| W-13 | No `memory validate`. | `submit` is the first check of required fields; fill them before it. | F-028 | |
| W-14 | `submit` subjects carry no `[from → to]`. | Read the state from the frontmatter or `git log -p`, not from the subject. | F-008 | dl-054 |
| W-15 | `directive assign` binds a directive to one role only; `--role global` is refused. | Add the directive to `roles.yaml`'s `global:` list by hand, commit it, and check `directives list --role <r>` for every role. | F-039 | |
