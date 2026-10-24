---
id: F-040
title: "Review rounds follow each project's re-review rule, and neither the guide nor the templates set one"
kind: request
status: open
wingfoil_version: 0.3.0
answered_by: []
---

New note (task-100).

## Observed

The review records of four WingFoil-governed projects (this repository's release v0.2, 42 tasks; WingFoil v0.1–v0.3,
289 tasks; WingFoil UI v0.1–v0.2, 45 tasks; WingFoil Templates, 42 tasks), read on 2026-10-23. Observational: they
are the projects' Review and Execution notes, not a WingFoil command.

| Project | Re-review rule in its `kanban`/`dev-loop` review phase | Rounds a task | Round 1 with no blocker or should-fix | Later findings made by the previous fix |
|---|---|---|---|---|
| this benchmark, v0.2 | "each fix is reviewed again until clean", nits included | 2.8 | about 10 % | 40 % |
| WingFoil UI | "repeated until PASS"; a PASS with nits ends | 2.76 | 6.7 % | 86–89 % |
| WingFoil v0.3 | none written; about 80 % of round-1 fixes reach the approver unreviewed | 1.21 | ≤ 12 % | 76 % |
| WingFoil Templates | re-review only when a fix changes behaviour, a test or an Acceptance command | 1.55 | 27.5 % | 43 % |

In every project the first round is rarely clean, most later findings are made by the previous round's fix, and
rounds rise with a task's size; the count of rounds follows the project's re-review rule. Rounds opened after a
nit-only round found nothing serious in any project. None of the four projects has a review record before WingFoil
governed it, so these records cannot tell whether WingFoil adds or removes rounds. WingFoil's guide for agents
(`docs/agents.md`, 0.3.0) and its built-in `code-review` directive set no severity scale and no rule for when a fix is
reviewed again ("Every finding is either fixed in the change or recorded as a tracked element").

## Expected

WingFoil's guide or its built-in `code-review` directive (and the Kanban template's review phase) state a severity
on every finding (blocker, should-fix, nit) and a re-review rule, for example: re-review only after a blocker or a
should-fix, on the fix's diff only; a nit-only round closes the review, its nits fixed and listed.
