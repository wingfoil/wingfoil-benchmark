---
id: task-171-dl-037-g-the-wingfoil-arms-pin-moved-to-wingfoil-s-latest-release
type: task
title: "dl-037 G: the wingfoil arms' pin moved to WingFoil's latest release"
status: pending
release: v0.4
wave: W21
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: []      # e.g. [REQ-FMT-01, REQ-FMT-02]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["wingfoil","pins","dl-037","v0.4"]
---

## Context

[dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md)'s option G, approved: before the next campaign, `wingfoil`, `wingfoil-configured` and
step B's arm move to WingFoil's latest release, 0.4 if it is released and admitted by then, otherwise 0.3.2.
This repository's governance pin stays 0.3.2. The WingFoil maintainer's points of 2026-10-24 that bear on 0.4 are
read here (triage row 8): dl-171 (`agent execute --next` stops at gates), bug-413 (`workflow start`'s context
element), bug-392 (built-in adapters). First in W21; re-run when the campaign is prepared if a newer release is out.

**Done** means: the arms' pin is admitted and recorded, with its bridge to campaign-009's 0.3.1.

## Acceptance criteria

1. The admission as task-107 did for 0.3.1: the telemetry and the capabilities re-read, the setup and the
   configuration places checked, `eligibility/register.yaml`'s entry with dry-run evidence, a new arm digest
   (REQ-FMT-13).
2. On 0.4: dl-171, bug-413 and bug-392 read, declared against observed behaviour in the notes.
3. The configured variant's configuration: re-run by the configuring agent only under the approver's spending
   consent, each session a ledger line; otherwise recorded as unchanged with the reason.
4. The bridge to campaign-009's 0.3.1 stated (what changes in the arm, what stays).
5. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
