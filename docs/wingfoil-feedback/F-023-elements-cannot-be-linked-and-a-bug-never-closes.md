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
machine still ends at `approved` (`submit` from there: "the last state in `sequence` — there is no forward edge"),
and its `memory.yaml` declares no relation between elements. 0.3.1 reads one relation, `supersedes:`: approving an
element that lists another moves the other to `superseded`, but only where the other's type has a `superseded`
state behind a `waiting` state. No Kanban type has one, so in a fresh Kanban project an approved `dl-002` with
`supersedes: [dl-001-first-decision]` leaves `dl-001` approved. `fixes` and `implements` are not read.

## Expected

WingFoil knows relations between elements (`fixes`, `supersedes`, `implements`) and gives a bug a resolved
state reached through the relation.
