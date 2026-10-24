---
id: task-103-the-v0-3-vision-and-experiment-design-amendments
type: task
title: "The v0.3 vision and experiment design amendments"
status: backlog
release: v0.3
wave: release-planning
features: []
acceptance: []
requirements: [REQ-RES-03]
fixes: []
tags: ["specification","v0.3"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s release-planning, approved by the approver in chat on 2026-10-24:
v0.3 is split from the sequencer's "Broader categories", which move to v0.4, and the v0.2 retrospective's decisions
become features and experiment design. Part of `benchmark-specification` for v0.3; the requirements and acceptance of
each later wave are written by that wave's first task.

**Done** means: the vision and the experiment design describe v0.3 as planned, approved by the approver as a review
decision.

## Acceptance criteria

<!-- A documentation change: no Gherkin scenario. -->

1. `07_sequencer.md` 1.2: v0.3 "WingFoil as designed, harnesses as configured" (W15 presets and Codex, W16 the
   method, W17 WingFoil 0.3.1 step A, W18 configured variants, W19 the review loop); v0.4 "Broader categories" (the
   former W15–W17, renumbered W20–W22); v1.0's waves renumbered W23–W25. **Characterization** (the traceability
   test passes).
2. `06_features.md` 1.4: F7.5 configured variants (a harness configured for the project by an agent that sees only the
   seed and the README, with its configured docs control) and F4.9 the review loop per arm (the same independent
   reviewer, severities and closing rule in every arm; rounds to clean, fix-induced share, review cost), each traced to
   a journey step. **Characterization.**
3. `09_experiment-design.md` 1.7: the configured variants and their parity rules; the variance rule for ▲/▼, headline
   counts and M-K4 (REQ-RES-03); [dl-023](../decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md)'s
   repetitions; the wingfoil arm's step A ([dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md));
   the review loop as a measurement; the manual and docs-control sizes published. **Characterization.**
4. The scenario conventions (`scenarios/README.md`): the saturation rule of
   [dl-013](../decision-log/dl-013-saturation-levels-of-delegation-and-an-external-neutral-control.md) and the 1.1
   versions' convention (errata for 1.0, the configuration written per scenario). **Characterization.**

## Design

- Documents only; each amendment raises its version and records the review decision (doc-versioning).
- Written after dl-013's amendment and dl-023 are approved, so that the texts follow the options approved.

## Execution notes

- `npm run -s wingfoil -- memory add --type task --title "…" --tags "…"` on main, at v0.3's release-planning
  (2026-10-24). Declared: the element from the template in `draft`, one commit. Observed: as declared.
- The body committed by hand (`e7a5e1e2`), then `memory submit` (draft → pending). Declared and observed: one commit,
  `status: pending`.
- The first `memory submit` refused: "missing required field on submit: requirements" (the empty list, W-06 of the
  `wingfoil-cli` directive, as declared). `requirements: [REQ-RES-03]` committed by hand, then `submit` (draft →
  pending) passed.
