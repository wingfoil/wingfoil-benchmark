---
id: task-049-wingfoil-v0-2-2-as-the-harness-under-test
type: task
title: "WingFoil v0.2.2 as the harness under test"
status: pending
release: v0.1
wave: calibration
features: [F2.6, F3.6]
acceptance: [runner.feature, scenarios.feature]
requirements: [REQ-RUN-14, REQ-FMT-10, REQ-SCO-10]
---

## Context

The first task of plan-003 step 3, **calibration**, in release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It is not a wave: `wave: calibration` names the `release-cycle` phase it belongs to.

The reference campaign runs on **the latest released WingFoil** ([rel-v0-1](../release/rel-v0-1.md) Goal,
sequencer decision 3 as amended in 1.1). That is now **v0.2.2** (tag `v0.2.2`, 2026-09-29), 1168 commits
after the development pin `3df305e` every wave was delivered against. Calibration's dry runs price the
campaign, so the wingfoil arm must be dry-run on the WingFoil the campaign will run. A dry run on `3df305e`
would still be accepted by the estimate — a dry-run cost is keyed by scenario version, arm and model
(task-021 decision 2), not by harness — and would price the wrong harness without saying so. The approver's
choice of 2026-10-02: calibrate on v0.2.2, in two tasks, this one first, then the dry runs (task-050).

This task brings forward the items `rel-v0-1` lists as due "before the reference campaign" that depend on
the WingFoil pin, so that they hold when the first dry run starts:

- `arms/wingfoil/arm.yaml` `provides` re-assessed on v0.2.2 (W6, K5, REQ-FMT-10): `directive-delivery`
  beside the MCP probe (W3, W6), `memory-lifecycle`, `workflow-engine`, `mcp-tools`;
- the wingfoil arm's setup (`arms/wingfoil/setup.sh`) run on v0.2.2: `init --template Kanban`, the scenario
  configuration over it, the Benchmark Approver in `dna.yaml`;
- `test/fixtures/wingfoil-config/S8/` and `S8.PROJECT_RULES.md` refreshed from a run with v0.2.2 (W8);
- each place that states the pin `3df305e` as the WingFoil under test, rather than as a fixture value, read
  again: K5 in `scenarios/README.md`, T10 and `harness-gaps` in `site-content/method.md` (W11), the finding
  note's template commit (REQ-RES-05).

Scope: arm definition, setup, fixtures and the statements above; the Docker tests run with v0.2.2 as the
harness. **No real agent, no spending**: every run of this task uses the scripted fake agent.

Out of scope:

- `scenarios/dry-run.yaml`, the dry runs, the revised budget and the scenarios' registration: task-050.
- `vendor/wingfoil-0.2-pre-3df305e.tgz`, the WingFoil that manages this repository: it is not the WingFoil
  under test (`vendor/README.md`) and stays as it is.
- Unit-test fixtures that use `3df305e` as a sample SHA: a value, not the pin.

**Done** means:

- the wingfoil arm sets up on v0.2.2 in the runner's container, its `provides` stated from what v0.2.2 does,
  each with its evidence in the notes;
- `npm test` and `npm run test:docker` green with v0.2.2 as the harness, coverage above 80%, lint clean;
- each statement of the pin either names v0.2.2 or says why it keeps `3df305e`; a requirement or approved
  document that changes is an amendment with a raised version and a recorded review decision.

## Acceptance criteria

Classified in the design phase.

- `runner.feature` @F2.6 "The WingFoil under test is the version pinned by the campaign" — with a released
  version as the pin.
- `scenarios.feature` @F3.6 — expected failures read the re-assessed `provides`.
- REQ-RUN-14 — a released version (REQ-FMT-03) resolves to a commit of the clone and builds.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "WingFoil v0.2.2 as the harness under test"` — declared: creates
  the element from the template at `draft` and commits it. Observed: `1dc614b wf(task): add …`, the element
  at `draft`. The slug reads `v0-2-2`: the managing WingFoil (`3df305e`) turns a `.` into `-`; v0.2.2 keeps it
  (its changelog, task-110). Existing ids are untouched either way.
