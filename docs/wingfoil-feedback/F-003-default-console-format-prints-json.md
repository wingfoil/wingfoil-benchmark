---
id: F-003
title: "The default console output format prints JSON"
kind: defect
status: open
wingfoil_version: 0.1.0-7a65580
answered_by: []
---

Formerly N3.

## Observed

Without `--format`, `wingfoil paths`, `wingfoil workflow list` and `wingfoil memory add` print JSON, both piped
and in a terminal (`script -qc "wingfoil paths" /dev/null`). The global option's help says
`output format (console|json|yaml)` with default `console`. Re-run on 2026-10-10: `wingfoil paths` prints a JSON object on
`0.2-pre-3df305e` and on `0.2.2`, exit 0.

## Expected

`console` is a human rendering, or the help says that it prints JSON for now. WingFoil dl-043
(in-discussion) and task-156 (done) address this.
