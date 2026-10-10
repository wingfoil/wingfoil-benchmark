---
id: task-080-a-stopped-campaign-resumes-without-repeating-completed-runs
type: task
title: "A stopped campaign resumes without repeating completed runs"
status: pending
release: v0.2
wave: W14
features: [F1.4]
acceptance:
  - "campaign.feature#A resume re-runs only what infrastructure stopped"
  - "campaign.feature#A resume is refused when it could mix results"
  - "campaign.feature#Scoring a stopped execution keeps it resumable"
requirements: [REQ-RUN-19, REQ-CLI-03, REQ-CLI-06, REQ-FMT-06]
fixes:
  - bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures
---

## Context

Second half of F1.4 and of bug-013's fix, after task-079's `execution.json`.

**Scope** (REQ-RUN-19's resume bullets, REQ-CLI-03 and REQ-CLI-06 as amended in 1.26):
- `bench campaign run <file> --resume <campaign-id>/<n>` runs, in execution *n*, only the runs never started and
  those `failed` (infrastructure), `interrupted` or `quota exhausted`; never a run that reached a cap or completed
  with a poor result;
- a re-run keeps the earlier attempt under `attempts/<k>/`, counts it in `attempts`; aggregation reads the last
  attempt only, and the site shows `attempts` beside the run;
- refusals: another campaign identity, an execution already aggregated;
- `bench score <campaign-id>/<n>` aggregates only a `completed` execution, or with `--final`; an execution without
  `execution.json` (v0.1's) aggregates as before.

**Done** means: the three scenarios have acceptance tests, green with the fake agent; bug-013 can move to `fixed`.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `campaign.feature#A resume re-runs only what infrastructure stopped`: classified red-first or characterization in the design phase.
- `campaign.feature#A resume is refused when it could mix results`: classified red-first or characterization in the design phase.
- `campaign.feature#Scoring a stopped execution keeps it resumable`: classified red-first or characterization in the design phase.

## Design

<!-- Written in the design phase. -->

## Execution notes

## Review notes
