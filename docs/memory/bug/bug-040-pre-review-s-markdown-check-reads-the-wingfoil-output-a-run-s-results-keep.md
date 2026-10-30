---
id: bug-040-pre-review-s-markdown-check-reads-the-wingfoil-output-a-run-s-results-keep
type: bug
title: "pre-review's Markdown check reads the WingFoil output a run's results keep"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","scripts"]
---

## Context

Found by S10's calibration ([task-119](../task/task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029.md),
2026-10-30): its dry runs, committed on the task's branch, keep each docs control's generated environment under
`results/dry-runs/<n>/generated/`, WingFoil's captured output among it. Earlier dry runs were committed on main
directly, so `scripts/pre-review.sh` (task-098) never read them.

## Expected

The script's Markdown check leaves out the byte-pinned paths, as its own comment says: scenario versions and
WingFoil's captured output, which a run's records under `results/` are.

## Actual

It leaves out `scenarios/<id>/<version>/` and `test/fixtures/wingfoil-config/` only, and turns red on every long line
of the generated `PROJECT_RULES.md` and of WingFoil's own directives and templates the runs keep.

## Fix

`results/` joins the paths the check leaves out; a test of the script.
