---
id: F-035
title: "Records copied into a repository lose their approval provenance"
kind: gap
status: open
wingfoil_version: 0.2-pre-3df305e
answered_by: []
---

Formerly N45.

## Observed

Approved Memory records and configuration copied as files into another repository (a scaffold, a fixture, a
template project) show in `memory history` with `"operation": null` and `"approver": null`. The approval that made
them `approved` does not travel with them, and no import verb keeps it or marks them imported.

## Expected

An import verb keeps each record's approval, or marks the record as imported with its source.
