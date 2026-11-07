---
id: task-139-bug-034-symlinks-spaces-and-line-endings-handled-one-way
type: task
title: "bug-034: symlinks, spaces and line endings handled one way"
status: draft
release: v0.3
wave: W18
features: [F3.1, F4.2, F7.1]
acceptance: []
requirements: [REQ-FMT-04, REQ-FMT-05, REQ-FMT-14, REQ-SCO-04, REQ-SCO-07]
fixes: [bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently]
tags: ["v0.3","w18","bug-034"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, delivery order item 4: bug-034 first, before the configured
variants add arm and scenario files written by an agent
([task-138](task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5.md), requirements 1.50).
[bug-034](../bug/bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently.md)
lists four items, collected from v0.1's and v0.2's task notes (task-001, task-042, task-064, task-072).

State read on 2026-11-06 (main `098bd427`): no symbolic link under `arms/` or `scenarios/`, in the working tree or in
any commit of the history, and no CRLF file in an arm or a scenario's arm configuration. Refusing links therefore
changes no pinned arm and no scenario hash. The approver's choices in chat (2026-11-07): an unclosed fence in a
directive file is refused, not closed; if a published run's scores would change through item 3, an erratum, the
published values unchanged.

Code and tests only: no real-agent session, nothing spent.

## Acceptance criteria

<!-- Each red first: a failing test before the code; `acceptance` lists the scenarios as they are written. -->

1. **A scenario version holds no symbolic link** (item 1, task-001): loading a scenario version refuses a symbolic
   link anywhere under its directory, `scenario.yaml` included, naming it; today a `scenario.yaml` link leading
   outside the scenario is followed. REQ-FMT-04 amended (1.51). Red first (`scenarios.feature`).
2. **An arm holds no symbolic link** (item 3, task-064): the arm loader refuses a link anywhere under `arms/<arm>/`,
   declared or not, naming it; today only the declared paths are checked. The digest keeps hashing a link by its
   target (REQ-FMT-13), since an arm read from history must still digest as it ran; task-064's Design statement is
   aligned with the code. REQ-FMT-05 amended (1.51). Red first (`competitors.feature`).
3. **The scoring's path helpers** (item 2, task-041 and task-042): `filesUnder` does not follow symbolic links (a
   link in a snapshot is not measured as the file it points to); the paths of a patch are read whatever they hold
   (spaces, quoted paths), from git's `-z` output or an equivalent; a list of files reaches a tool as separate
   arguments. REQ-SCO-04 and REQ-SCO-07 made precise (1.51). Red first (`scoring.feature`). **Before the change**, a
   script reads every published run's stored patch and snapshot paths and prints how many hold a space, a quoted
   path or a link (figures from the script); if any does, the work stops and the approver is told before any value
   changes, and the result goes into an erratum (the approver's choice).
4. **Directive files' heading shift** (item 4, task-072): CRLF is read as LF before the shift; a rule title's
   trailing spaces are always stripped; an unclosed code fence in a directive file is refused by
   `bench scenario validate`, naming the file, and so by every reader of it (the docs-control and rules generators,
   REQ-FMT-14). REQ-FMT-14 amended (1.51). Red first (`scenarios.feature` or `competitors.feature`).
5. `requirements.md` 1.51 records the amendments; checks green (prettier, tsc, eslint, `scripts/pre-review.sh main`);
   an independent review (dl-020); the full suites on the approver's go.

## Design

<!-- Filled when the task starts. -->

## Execution notes

## Review
