---
id: task-082-preliminary-below-n-3-and-the-harness-version-beside-every-value
type: task
title: "Preliminary below n = 3 and the harness version beside every value"
status: draft
release: v0.2
wave: W14
features: [F5.5]
acceptance:
  - "results.feature#Preliminary results are labelled"
requirements: [REQ-RES-03, REQ-SCO-14]
fixes: []
---

## Context

REQ-RES-03 as amended in 1.26 (dl-012, T15), not yet built: today a comparison is preliminary only when a
side has n = 1 (`src/results/compare.ts`).

**Scope:**
- a comparison is preliminary unless both sides have **n ≥ 3**;
- each arm's harness version is shown beside its values on the landing and category pages (T15);
- the harness-against-control comparisons (REQ-SCO-14) follow the same rule.

Before task-083, whose campaign comparison reuses these rules. **Done** means: the scenario's test, amended to the
n ≥ 3 rule, is green; v0.1's published execution re-renders with its comparisons preliminary where n < 3.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `results.feature#Preliminary results are labelled`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
