---
id: task-013-wingfoil-under-test-and-approval-authority
type: task
title: "WingFoil under test and approval authority"
status: draft
release: v0.1
wave: W3
features: [F2.6]
acceptance: [runner.feature]
requirements: [REQ-RUN-14, REQ-RUN-17, REQ-FMT-04, REQ-ARC-03]
---

## Context

Third task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It builds on
task-012 (arm definitions, the setup phase) and follows adr-003, written by the spike
[task-011](task-011-wingfoil-in-the-run-container-spike.md).

Scope of F2.6, and the wingfoil arm's setup:

- **The WingFoil under test (REQ-RUN-14).** The runner builds the tarball of the commit the campaign
  pins (`harnesses.wingfoil`) with `npm pack` from a clean `git archive`, taken from a **configured
  local WingFoil clone**, read-only (W3 plan-phase decision 3). It checks that the commit exists there,
  never takes WingFoil from `vendor/` (the managing WingFoil) or from the host's `PATH`, and records
  the tarball's full commit in `run.json`. Where the tarball is built and cached is adr-003's.
- **The wingfoil arm's setup** installs that tarball in the container, initialises the project, and
  lays the scenario's `arms/wingfoil/` configuration over it
  ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)),
  in the way the spike found valid.
- **Approval authority (REQ-RUN-17), the half W2 left.** The arm's WingFoil configuration declares a
  member "Benchmark Approver" with the `approver` role, and the container's git identity is that
  member. The decision stays the neutral approver's; the agent only executes it. The statement on the
  method page is W11.
- **Requirements 1.5.** REQ-FMT-04 is amended with a scenario's optional `arms/wingfoil/` directory,
  and REQ-ARC-03 gets a note on it, as dl-005 planned. It is a review decision on an approved
  document, recorded with the approver's reason.
- A T-scenario fixture with a small `arms/wingfoil/` configuration stands in for S8 (benchmark
  content, W8), the way T1 stood in for S3 in W2.

Out of scope: the manual that tells the agent how to use WingFoil (task-014); what baseline-docs
generates from the same configuration (task-015).

**Done** means: `runner.feature` @F2.6 passes — with the real Docker, since it is about what the
container holds — and a wingfoil run's container has WingFoil built from the pinned commit, the
scenario's configuration and the Benchmark Approver identity; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.6 "The WingFoil under test is the version pinned by the campaign" — the WingFoil
  in the container is built from `3df305e`, independently of the managing WingFoil. **red-first**
- REQ-RUN-14 error paths — a pinned commit missing from the clone, or no clone configured, fails the
  campaign before any run starts, with a message naming the commit. **red-first**
- REQ-RUN-14 — `run.json` records the tarball's full commit. **red-first**
- REQ-RUN-17 — the container's git identity is the declared Benchmark Approver, and an approval command
  run by the agent is accepted by WingFoil. **red-first**
- dl-005 — the scenario's `arms/wingfoil/` configuration is present in a wingfoil run and absent from
  the other arms. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
