---
id: task-063-eligibility-register-and-criteria
type: task
title: "Eligibility register and criteria"
status: pending
release: v0.2
wave: W12
features: [F7.4]
acceptance: [competitors.feature]
requirements: [REQ-FMT-01, REQ-FMT-11, REQ-RES-09]
---

## Context

F7.4, the first feature of W12 ([rel-v0-2](../release/rel-v0-2.md)): the published criteria a tool must meet to get an arm, written and applied
**before** any competitor arm is built, so that tools are admitted by a rule (T1).

**Scope:**

- `site-content/eligibility.md`, the five criteria (experiment design 1.2 §2);
- `eligibility/register.yaml` (REQ-FMT-11) with its schema. Entries for WingFoil v0.2.2, Spec Kit, OpenSpec and BMAD
  at their current versions, each criterion with its evidence, from
  [X_competitor-landscape-2026-10-05.md](../../01_vision/X_competitor-landscape-2026-10-05.md) and the spikes;
- `campaign validate` refuses a harness arm whose tool is not admitted at the pinned version (REQ-FMT-01);
- the eligibility page (REQ-RES-09, its eligibility half; the setup pages come with each arm).

**No real agent, no spending.** **Done** means: `competitors.feature` @F7.4 green.

## Acceptance criteria

- `competitors.feature` @F7.4: admitted, excluded (error), version not assessed (error), every assessed tool
  published. **Red-first.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Eligibility register and criteria"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-063-eligibility-register-and-criteria`, `status: draft`.
