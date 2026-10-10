---
id: task-084-the-comparison-page-linked-from-the-landing-page
type: task
title: "The comparison page, linked from the landing page"
status: backlog
release: v0.2
wave: W14
features: [F5.2]
acceptance:
  - "comparison.feature#The comparison is published with the newer execution"
requirements: [REQ-RES-07, REQ-RES-02]
fixes: []
---

## Context

F5.2, published: after task-083's record.

**Scope** (REQ-RES-07): for each comparison whose newer side is the execution being built, `compare-<earlier-id>-<m>.html`:
one row per category and arm with the delta change, its `n`, the differing pins, the **cross-model** mark, and "not
compared" where REQ-SCO-13 says so; the landing page links each comparison. Static HTML, no client script
(REQ-RES-02).

**Done** means: the scenario's test green; the W14 "Ends with" can be checked offline (a second fake execution
compared with the first and published).

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `comparison.feature#The comparison is published with the newer execution`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
