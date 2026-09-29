---
id: task-038-s8-directive-compliance-scenario
type: task
title: "S8 directive compliance scenario"
status: pending
release: v0.1
wave: W8
features: [F6.8]
acceptance: [scenarios.feature, runner.feature, scoring.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-RUN-11, REQ-SCO-01, REQ-SCO-02, REQ-SCO-05]
---

## Context

Fourth and last task of wave **W8 — Continuity and governance** of release v0.1
([rel-v0-1](../release/rel-v0-1.md)), the S8 half of its "Ends with" ("S3 and S8 scored"); the wave check
follows it (W8 decision 1). The W8 plan-phase decisions are in
[task-035](task-035-check-format-and-content-checks.md). It follows `scenario-authoring` from goal to
validate; calibrate and register are calibration's (decision 4).

Scope: **S8@1.0** as [S8.md](../../02_specification/scenarios/S8.md) (1.0) specifies it, in
`scenarios/S8/1.0/`:

- **Goal:** the card of S8.md §1 (primary E, secondary C; Q-E1, Q-C1; the profiles); `capabilities`
  naming directive delivery, which WingFoil `3df305e` provides (§8, no expected failure).
- **Seed** (§3): a TypeScript domain module of 300–500 lines with a `Result` type in use and TSDoc on its
  exports, complying with R1–R4, stating none of them in any file (K3).
- **Rules, K3 and dl-005:** R1–R4 as WingFoil directives bound to the developer role, in
  `scenarios/S8/1.0/arms/wingfoil/`, in the layout `3df305e` reads (adr-003); baseline-docs receives
  them as Markdown through the existing generator (REQ-RUN-11, `runner.feature` @F2.5 with S8 itself);
  baseline gets nothing. The leak scan keeps their text out of the seed and the prompts.
- **Prompts** (§6): four feature requests in a product owner's voice, none naming a rule; each one's
  easy path violates the rule §6 names.
- **Oracle** (§7): the four checks R1–R4 in task-037's `dependencies` and `ast` kinds, on `src/domain/`,
  per step; hidden functional suites per step, so that complying by not implementing scores badly on
  M-Q1.
- **Hold-out additions** (§7): functional edge cases per step and check variants (indirect wall-clock
  access through a helper) — only in `WingFoil2-Benchmark-HoldOut`.
- **Reference solution** (public, compliant) in `test/fixtures/reference/S8/01..04/`, and a violating
  variant for the checks' tests. The fake replays the same commands in every arm (W8 decision 5).
- **Acceptance:** `READY` gains S8.

Out of scope: real-agent dry runs and the arms' compliance difference (calibration, campaign).

**Done** means: `bench scenario validate S8@1.0 --holdout …` passes; S8 dry-runs in the three arms and
scores M-Q1 and M-E1 per rule and step, zero violations for the reference; the outline's S8 row green;
then the **W8 wave check** — S3 and S8 scored in the three arms and aggregated — recorded in rel-v0-1.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F6.8 (outline, S8 row) — validated, dry-run in each arm, scored without
  errors. **red-first**
- S8.md §4 — the seed and the reference have zero violations of R1–R4; the violating variant has at
  least one of each, on the step §6 names. **red-first**
- `runner.feature` @F2.5 — baseline-docs for S8 holds the same directives as Markdown, byte-identical
  twice. **characterization**
- REQ-FMT-08 / K3 — no rule text in the seed or the prompts. **characterization**
- S8.md §7 — the reference passes each step's public suite; the seed passes none by accident.
  **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
