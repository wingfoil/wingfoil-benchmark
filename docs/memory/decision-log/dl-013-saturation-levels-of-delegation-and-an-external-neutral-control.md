---
id: dl-013-saturation-levels-of-delegation-and-an-external-neutral-control
type: decision-log
title: "Saturation, levels of delegation and an external neutral control"
status: approved
---

## Context

Calibration v0.1 §10 listed three decision-logs "to file after v0.1", for the benchmark's next specification. None
had been filed by the release.

1. **Saturation.** S1 was saturated: 135/135 in every arm until step 5 was added (task-050). There is no rule for when
   a scenario is too easy to separate arms, nor anchor scenarios that keep a stable level.
2. **Levels of delegation.** How much the agent is left to decide was set by each scenario by hand (§8, §11).
3. **External suites as a neutral control** (§11). Third-party conformance suites, which the benchmark's maintainer
   did not write, were proposed as a defence against T1.

A fourth item, an arm where the harness launches the agent (§7), is held by
[dl-008](dl-008-model-configurations-and-the-cost-quality-frontier.md) as its mechanism question.

## Options

For each item: adopt a rule in the next specification, defer to a later release, or drop it with a reason.

## Proposal

Deferred at v0.2's release-planning (v0.2 added no scenario). Starting points:

- **saturation:** a scenario version is saturated when every arm reaches the maximum on its final hidden tests in
  every run; a saturated version is revised (a new version), never edited;
- **levels of delegation:** declared per scenario as a field, low or high, so that results can be read by level;
- **the external control:** at least one scenario per release whose hidden tests are wholly a third-party suite, as
  S1 partly is.

**Amended at v0.3's release-planning (2026-10-24), the approver's choice in chat:**

- **saturation: adopted in v0.3**, as stated above, and applied first to S1 1.1
  ([bug-025](../bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md)):
  every scenario version 1.1 records whether its 1.0 was saturated, from the published campaigns;
- **levels of delegation and the external control: deferred to v0.4**, the release that adds scenarios (S4, S5, S6,
  S7; [plan-005](../../plans/plan-005-release-v0-3.md)); v0.3 adds none, so neither can be applied to a new scenario.

## Consequences

The scenario format and conventions (K1–K5) gain the saturation rule in v0.3's specification, by amendment; the other
two items return at v0.4's release-planning.
