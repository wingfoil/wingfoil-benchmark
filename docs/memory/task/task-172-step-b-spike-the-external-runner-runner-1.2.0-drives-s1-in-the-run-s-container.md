---
id: task-172-step-b-spike-the-external-runner-runner-1.2.0-drives-s1-in-the-run-s-container
type: task
title: "Step-B spike: the external runner (runner-1.2.0) drives S1 in the run's container"
status: backlog
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-RUN-02, REQ-RUN-09, REQ-FMT-12]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["spike","runner","step-b","dl-037","v0.4"]
---

## Context

[dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md)'s option B and the approver's rulings of 2026-11-23: the campaign uses the external
workflow runner as WingFoil's projects do. The Benchmark prepares the run's environment; the runner drives the
scenario through WingFoil's commands; a wrapper answers its gates as the fixed approver, with an approver identity of
its own listed only in the campaign clone. `runner-1.2.0` (manifest sha256 `7deb889e…c47749`) states R1 to R6;
only a fixture covers subagent usage, and it was never run on WingFoil 0.4. A spike: at most one real-agent dry run,
with the approver's spending consent.

**Done** means: R1 to R6 are shown to hold in the run's container on the campaign's WingFoil, or the gap is named
and dl-037's fallback (E, or the following campaign) is put to the approver.

## Acceptance criteria

1. The runner's files at the tag packed as the campaign's `harnesses.tar.gz` would hold them (`common/`,
   `MANIFEST.sha256`, the adapters used, the Benchmark's runner config; never local overrides, the ledger or its key),
   and the digest checked with `manifest.mjs --digest`.
2. R1: container mode (`--container`, `--record-dir`, `DFD_RUNNER_CONTAINER=1`) in the run's image, exit 12 and
   `waiting.json` at a gate. R2: the wrapper rules each waiting item through `gate.mjs --container` as the fixed
   approver. R3: one adapter for every tier. R4: one record per launch, tokens including a real subagent's.
3. On WingFoil 0.4 (if G picked it): a doctor pass, a dry run and a scripted end-to-end story before the real run.
4. One real-agent dry run on S1, under the approver's consent and ceiling, its ledger line written.
5. A thin wrapper or not: what the Benchmark had to write, against dl-021's rule on drivers (T1, T12).
6. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
