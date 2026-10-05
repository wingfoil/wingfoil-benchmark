---
id: dl-013-saturation-levels-of-delegation-and-an-external-neutral-control
type: decision-log
title: "Saturation, levels of delegation and an external neutral control"
status: draft
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

Decided at v0.2's release-planning. Proposed starting points:

- **saturation:** a scenario version is saturated when every arm reaches the maximum on its final hidden tests in
  every run; a saturated version is revised (a new version), never edited;
- **levels of delegation:** declared per scenario as a field, low or high, so that results can be read by level;
- **the external control:** at least one scenario per release whose hidden tests are wholly a third-party suite, as
  S1 partly is.

## Consequences

The scenario format and conventions (K1–K5) gain fields or rules, by amendment.
