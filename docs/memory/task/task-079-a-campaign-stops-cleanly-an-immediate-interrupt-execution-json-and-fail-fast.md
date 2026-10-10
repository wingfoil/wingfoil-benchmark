---
id: task-079-a-campaign-stops-cleanly-an-immediate-interrupt-execution-json-and-fail-fast
type: task
title: "A campaign stops cleanly: an immediate interrupt, execution.json and fail_fast"
status: backlog
release: v0.2
wave: W14
features: [F1.4]
acceptance:
  - "campaign.feature#An interrupted campaign stops cleanly"
  - "campaign.feature#A campaign stops itself after the same failure repeats"
requirements: [REQ-RUN-19, REQ-FMT-06, REQ-NFR-03]
fixes:
  - bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures
---

## Context

First half of F1.4 and of bug-013's fix (approved for fixing at v0.2's triage, "fix with F1.4"). Today a
SIGINT leaves the current step's agent running and a campaign keeps spending after systematic failures.

**Scope** (REQ-RUN-19's first and last bullets, REQ-FMT-06's `execution.json`, REQ-NFR-03 as amended in 1.26):
- an interrupt (SIGINT or SIGTERM) kills the current step's agent at once, counts it at its bound as a killed step
  (REQ-RUN-08), records the run `interrupted`, removes its container;
- `results/<campaign-id>/<n>/execution.json` records the execution `running`, `completed` or `stopped`, with the
  reason (interrupt, quota, ceiling, `fail_fast`);
- `fail_fast`, opt-in in the campaign file: once *k* runs ended `failed` at the same step with the same `error`, no
  further run starts, as after an interrupt.

**Not here:** `--resume`, `attempts/`, `score --final` (task-080). bug-013 is declared in `fixes` by both tasks and
moves to `fixed` after task-080.

**Done** means: the two scenarios have acceptance tests, green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `campaign.feature#An interrupted campaign stops cleanly`: classified red-first or characterization in the design phase.
- `campaign.feature#A campaign stops itself after the same failure repeats`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
