---
id: bug-031-findings-cite-the-v0-2-2-template-through-template-commit
type: bug
title: "Findings cite the v0.2.2 template through TEMPLATE_COMMIT"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3"]
---

## Context

Found by the v0.2 retrospective ([rel-v0-2](../release/rel-v0-2.md), "What to change" 7) and task-095's notes.

## Expected

A finding note names the WingFoil template of the version it is filed against.

## Actual

`src/results/finding.ts:53` hard-codes `TEMPLATE_COMMIT = 'v0.2.2 (12537b62)'`; findings of the v0.3.0 campaign cite
v0.2.2's template.

## Impact

A finding pasted into WingFoil names the wrong template; low severity, but every finding of v0.3 would carry it.

## Resolution

The template's version read from the campaign's WingFoil pin. A W16 task of
[plan-005](../../plans/plan-005-release-v0-3.md).
