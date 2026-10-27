---
id: task-103-the-v0-3-vision-and-experiment-design-amendments
type: task
title: "The v0.3 vision and experiment design amendments"
status: in-progress
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
- `memory submit` (backlog → in-progress) on main (2026-10-27); worktree `../WingFoil2-Benchmark-wt/task-103`, branch
  `task/task-103`.
- **Deviations from the criteria, each a decision taken since the task was written:**
  - the sequencer's v0.3 section also records W15's arm B on Codex (dl-025, campaigns 005 and 006), the classifier v2
    brought ahead (task-106, dl-026) and step A brought ahead with a Codex campaign (dl-027); the waves keep their
    features, the order of delivery moves (amendment 1.2, point 8);
  - the releases table counts v0.3's features as "2 new (F7.5, F4.9)", the five revisited ones named, since every
    feature is assigned to one release;
  - the experiment design also adds approver policy v2 (§3.5, dl-026) and T9's and T10's mitigations;
  - the review loop's three metrics are named M-V1 to M-V3 (§4.7), a new letter; W19's task defines them;
  - the scenario conventions' rules are numbered K6 and K7, after the kickoff's K1–K5.
- **Checks:** `scripts/pre-review.sh main` green; `test/acceptance/traceability.test.ts` green (27).
- **Why now:** plan-005's order puts step A before this task, but step A waits for WingFoil 0.3.1's tag (task-107 in
  draft); the approver chose this task meanwhile (2026-10-27).

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, from a `mktemp` directory; both reflogs unchanged): links, metric
  ids, amendment numbering and the wave table verified; no private project named.
  - **should-fix, fixed** (`027c7192`): step A described as already run (now: brought ahead once 0.3.1 is tagged,
    subject to dl-027's cut order); M-K4's variance attached to the quality condition, against bug-029 (now: W16's
    task settles which difference, bug-029 cited); the variance rule beyond bug-030 and silent on n < 3 (now: bug-030,
    REQ-RES-03 amended in W16, preliminary differences left to it); G-A, G-B, T11's judge, M-E2's schedule,
    `traceability.md` and K1 still saying v0.3 for v0.4's work; decision 4 and experiment-design decision 5 naming W19
    for what is now W24; the configured variants without a parity rule for the configuring agent (now in §2 and T12);
    "most later findings" overstating dl-020 (now 40–89 %).
  - **nits, fixed:** the reviewer strips harness files and the fixer is the arm's agent (§4.7); M-V1 counts a round
    with no finding as clean; dl-020's quick check left to W19; F4.9 traced to J2.5; policy v2's wording for a public
    reader; step A's "≥ 0.3.1", pending records, recording by evidence, agent-specific files, a new arm version per
    step; the repetition key spelled out; K6's line wrapped.
  - **nit, recorded:** the scenario conventions' title "(v0.1)" and Traces line are left as they are.
- **Round 2** (the same agent, the fix's diff only; reflogs unchanged): the seven should-fixes fixed against their
  sources, the rewrapped paragraphs intact, the added links resolving. **Nits only, fixed** (`68aa36d9`): a long
  line after dl-027's link wrapped; amendment 1.7 lists §1 for G-A and G-B; K2's hold-out scenarios read v0.4; the
  traceability matrix's T12 names the configuring agent's parity rule. The review closes.

