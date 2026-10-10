---
id: F-019
title: "kind decides both startable and includable"
kind: request
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N20.

## Observed

A workflow's `kind` decides two things: only a `main` can be started on its own, and only a `sub` can be
included by a phase. A workflow that is run on its own **and** composed into a larger life cycle (a recurring
campaign, an authoring journey) must give up one of the two; choosing `main` leaves the parent phase naming it in
prose, so the composed life cycle no longer shows it.

## Expected

Startability and includability are separate properties (for example an `includable` flag, or a `main` that a
phase may include). WingFoil task-136 (done) validates workflows as startable or includable.
