---
id: rel-v0.4
type: release
title: "v0.4"
status: in-development
version: v0.4
waves: [W20, W21, W22, W23, W24, W25]
features: [F6.4, F6.7, F6.5, F4.6, F6.6, F2.8, F6.14]
---

## Goal

**Broader categories, and WingFoil driven step by step.** Cover categories A and B and widen D and F with S4, S7, S5
(with the blind rubric judge) and S6, as the sequencer plans (1.2); add the role-isolation scenario (dl-036); measure
the wingfoil arm's step B, per-role launches by an external workflow runner (dl-037), beside step A; read every group
at n = 3 (dl-023), so that the next results are more than preliminary. It serves Dana and Avery (more of a project's
life covered), Riley (WingFoil's workflow measured as its projects use it) and the Maintainer (WingFoil 0.4 included
if it is released before this release closes). The benchmark's own process moves to the published Kanban methodology,
run by the same runner (task-127).

## Scope

Waves, features and the triage: [plan-006](../../plans/plan-006-release-v0.4.md) (the approver's decisions in chat,
2026-11-23). The specification amends `docs/01_vision/` and `docs/02_specification/` through W20's specification task
and each wave's first task; the sequencer's amendment 1.3 inserts W20, W21 and W25 around its W20–W22, renumbered
W22–W24, and v1.0's waves become W26–W28.

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W20 — Foundations | the governance adoption (task-127, bug-046); the retrospective's fixes; the quota wait (dl-037 F) | the runner as governance | the pilot's exit criteria read; the suites green on the new methodology | |
| W21 — Step B | F2.8 the wingfoil arm's step B (dl-037, dl-021); the arms' pin (dl-037 G); repetitions (dl-023); costs by component (dl-033); the release watch (dl-034) | the step-B spike | an S1 dry run driven by the runner in its container, measured like every arm | |
| W22 — Knowledge and legacy | F6.4 S4 · F6.7 S7 | — | F and D covered with two more scenarios | |
| W23 — Specification | F6.5 S5 · F4.6 blind rubric judge | F6.5 | category A covered | |
| W24 — Planning | F6.6 S6 | F6.6 | category B covered | |
| W25 — Role isolation | F6.14 S11, a rule only the reviewer receives (dl-036); S10's self-approval temptation (H5) | the Spec Kit and OpenSpec spike | Q-E4 measured in a dry run | |

**Not in v0.4:** dl-035 (mirrors on Hugging Face, provider arms), moved to v1.0; dl-021's step C; the macro projects
(v1.0).

## Release checklist

<!-- delivery done · calibration (dry runs, budget revision) · validation · reference campaign ·
     publishing · retrospective — with links to the elements that prove each one. -->

## Retrospective

<!-- What went well, what to change, and the notes added to the WingFoil feedback inbox. -->
