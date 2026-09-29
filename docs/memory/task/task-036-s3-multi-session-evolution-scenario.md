---
id: task-036-s3-multi-session-evolution-scenario
type: task
title: "S3 multi-session evolution scenario"
status: draft
release: v0.1
wave: W8
features: [F6.3]
acceptance: [scenarios.feature, scoring.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-02, REQ-SCO-06]
---

## Context

Second task of wave **W8 — Continuity and governance** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
the S3 half of its "Ends with" ("S3 and S8 scored"). The W8 plan-phase decisions are in
[task-035](task-035-check-format-and-content-checks.md). It follows `scenario-authoring` from goal to
validate; calibrate and register are calibration's (decision 4).

Scope: **S3@1.0** as [S3.md](../../02_specification/scenarios/S3.md) (1.0) specifies it, in
`scenarios/S3/1.0/`:

- **Goal:** the card of S3.md §1 in `scenario.yaml` (primary F, secondary C; Q-F1, Q-F2, Q-C1; the
  profiles; `capabilities: []` — §8, no expected failure in any arm).
- **Seed** (§3): an empty TypeScript project as S1's, its README describing a windsurf school renting
  boards and sails; no rental code and no statement of D1–D5.
- **Prompts** (§6, README §3): five, one fresh session each. Step 1 states D1–D5 and says D5 is not to
  be implemented yet and "will be needed later", nothing about recording; step 3 restates none of
  D1–D5; step 4 asks for hourly rentals and says nothing about D3; step 5 gives the `cancel` contract
  and not the policy. Entry points as §4.
- **Oracle** (§7): hidden functional suites per step (quotes, bookings, availability, discounts, hourly
  rentals, cancellations), including the scripted decision checks that are outcomes — D1 and D2 forms
  on every returned value, D4 overlaps (mixed day/hourly after step 4), D3's whole-day behaviour kept
  after step 4, D5's refunds after step 5 — each a named test, so that W9's M-F1 can read them;
  **D3's revision as a content check** in task-035's format (step 4, format-neutral patterns, no
  harness path). The patterns must not appear in the prompts or the seed (the leak scan).
- **Hold-out additions** (§7): the exact 24-hour limit, the 3-day threshold, UTC day boundaries, the
  mixed day/hourly overlap matrix — only in `WingFoil2-Benchmark-HoldOut`, under the suite ids.
- **Reference solution** (public) in `test/fixtures/reference/S3/01..05/`, one per step, with the D3
  revision recorded in one form in the reference and exercised in another (a WingFoil decision-log
  and a plain notes file) by the @F4.8 test task-037 closes (W8 decision 3).
- **Acceptance:** `READY` in the @F6.1 @F6.2 @F6.3 @F6.8 outline gains S3.

Out of scope: M-F1 and M-F2 (F4.7, W9); real-agent dry runs (calibration).

**Done** means: `bench scenario validate S3@1.0 --holdout …` passes; S3 dry-runs in the three arms with
the fake replaying the reference and scores without errors, D3's content check passing; the outline's S3
row green; tests, coverage, lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F6.3 (outline, S3 row) — validated, dry-run in each arm, scored by the public
  oracle without errors. **red-first**
- S3.md §7 — the reference passes every public suite on its step; the seed passes none by accident
  (adr-004 decision 10). **red-first**
- S3.md §7 — D3's content check passes on the reference's step 4 and fails on a step 4 that records no
  revision (a silent change). **red-first**
- REQ-FMT-08 — S3's prompts and seed hold no oracle literal, no check pattern and no harness name
  (`scenarios.feature` @F3.2 on S3's prompt). **characterization**
- S3.md §7 hold-out — the additions score apart, in counts. **characterization**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
