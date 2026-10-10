---
id: F-023
title: "Elements cannot be linked, and a bug's machine never closes"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N29.

## Observed

A task cannot name the bug it fixes except in prose, which no search or check reads, and the default `bug`
machine ends at `approved`: a fixed bug and an untouched one have the same state. Every project that files bugs
adds its own field (for example `fixes:`) and its own final state.

## Expected

WingFoil knows relations between elements (`fixes`, `supersedes`, `implements`) and gives a bug a resolved
state reached through the relation.
