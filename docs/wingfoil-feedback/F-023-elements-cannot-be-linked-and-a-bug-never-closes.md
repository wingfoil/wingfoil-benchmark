---
id: F-023
title: "Elements cannot be linked, and a bug's machine never closes"
kind: gap
status: needs-info
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N29.

## Observed

A task cannot name the bug it fixes except in prose, which no search or check reads, and the default `bug`
machine ends at `approved`: a fixed bug and an untouched one have the same state. Every project that files bugs
adds its own field (for example `fixes:`) and its own final state.

Answer for WingFoil's v0.3 retrospective (2026-11-05, wingfoil@0.3.1): unchanged for the Kanban scaffold. Its `bug`
machine still ends at `approved` (`submit` from there: "the last state in `sequence` — there is no forward edge"), and
its `memory.yaml` declares no relation between elements. 0.3.1 reads one relation, `supersedes:`, a single element id (a
list is refused where the field is read): approving an element whose `supersedes:` names another of its type moves the
other to `superseded`, but only where that type's approve leads to a `waiting` state whose forward edge is `superseded`,
and the named element is in that state. No Kanban type has a `superseded` state, so the field is never read there: in a
fresh Kanban project an approved second decision-log naming `dl-001-first-decision` in `supersedes:` leaves `dl-001`
approved. `fixes`, `fixed_by` and `implements` are not read.

## Expected

WingFoil knows relations between elements (`fixes`, `supersedes`, `implements`) and gives a bug a resolved
state reached through the relation.
