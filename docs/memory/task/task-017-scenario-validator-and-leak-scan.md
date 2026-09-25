---
id: task-017-scenario-validator-and-leak-scan
type: task
title: "Scenario validator and leak scan"
status: draft
release: v0.1
wave: W4
features: [F3.2]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-08, REQ-CLI-04, REQ-FMT-04]
---

## Context

Second task of wave **W4 — Scenario hygiene** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It builds on task-016 (the hold-out's path and additions).

Scope of F3.2:

- **`bench scenario validate <id>@<version> [--holdout <path>]` (REQ-CLI-04).** The schema and the
  loader's checks (REQ-FMT-04, as `campaign validate` already runs them), then the leak scan.
- **The leak scan (REQ-FMT-08).** It fails when a step prompt names a harness or tool from a
  **declared list**, and when an **oracle literal** — an expected value or a test name of at least a
  **declared minimum length** — appears in the seed or in a prompt. With the hold-out configured, the
  hold-out oracles are scanned too, and their content is never printed: messages name only the file
  and the step. Where the list and the minimum length are declared, and what counts as an oracle
  literal in a test file, is this task's design.
- **W3's carry-overs (rel-v0-1, "Due before" W4):** a scenario's `arms/<arm>/` configuration must not
  leak into the seed or the prompts by content, not only by path (task-013 checks the path); a seed
  must not carry a `CLAUDE.md` or a `PROJECT_RULES.md`, which the runner would refuse only at run time.
- `scenarios.feature` names S1, S2 and S3, which are benchmark content (W7, W8): T-scenario fixtures
  stand in for them, as T1 did for S3 in W2 and T2 for S8 in W3.

**Done** means: `scenarios.feature` @F3.2 (three scenarios) passes; W4's "Ends with" — a scenario
validated, with its oracle kept outside the container — holds, checked as W4 plan-phase decision 4
(task-016) says; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `scenarios.feature` @F3.2 "A well-formed scenario passes the validator". **red-first**
- `scenarios.feature` @F3.2 @error "A step prompt that names a harness is rejected" — the message names
  the step and the offending text. **red-first**
- `scenarios.feature` @F3.2 @error "Oracle content that appears in the seed or the prompts is
  rejected" — with the hold-out configured; the message names the file and the step, without printing
  the hold-out content. **red-first**
- W3 carry-over — an `arms/<arm>/` text in the seed or a prompt is rejected; a seed `CLAUDE.md` or
  `PROJECT_RULES.md` is rejected. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
