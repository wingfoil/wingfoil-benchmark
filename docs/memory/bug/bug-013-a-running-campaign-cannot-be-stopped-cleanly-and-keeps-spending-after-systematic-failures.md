---
id: bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures
type: bug
title: "A running campaign cannot be stopped cleanly and keeps spending after systematic failures"
status: draft
---

## Context

Found in the v0.1 reference campaign's first execution, `c82a5e74885b/1`
([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md)). The release retrospective listed it.

## Expected

A campaign whose runs fail for the same systematic reason can be stopped, by the maintainer or by a fail-fast rule,
without leaving containers behind or losing what the finished runs recorded. Spending stops with it.

## Actual

- `campaign run` has no stop command. Interrupting it is a signal to the process, and an interrupted run leaves its
  container behind (bug-003 only warns at the next start).
- Two runs failed the same way at the same step (S1 step 03, bug-011). The campaign still went on for 6 hours to its
  end, through the Opus run (7.53 USD reported and an unreported step), because nothing stops it after systematic
  failures. The agent's attempt to stop it was refused by its own permissions, and the approver did not stop it.
- The whole execution was re-run afterwards (37.44 USD of runs repeated), since no command re-runs only the failed
  runs of an execution.

## Evidence

campaign-001 Execution, `/1`; the v0.1 ledger; rel-v0-1 Retrospective.

## Suggested handling

- A clean stop: `campaign run` handles SIGINT by finishing or failing the current run, removing its container, and
  recording the execution as stopped.
- A fail-fast rule, declared in the campaign file: stop after *k* runs fail with the same error at the same step.
- Whether an execution can be completed by re-running only its failed runs is a decision: dl-012 holds the
  question.

## Resolution

<!-- Filled when fixed: the task, the commit, and how it was verified. -->
