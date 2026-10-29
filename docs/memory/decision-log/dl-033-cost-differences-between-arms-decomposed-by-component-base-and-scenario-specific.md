---
id: dl-033-cost-differences-between-arms-decomposed-by-component-base-and-scenario-specific
type: decision-log
title: "Cost differences between arms decomposed by component: base and scenario-specific"
status: pending
tags: ["method","cost","v0.4"]
---

## Context

Raised by the approver in chat on 2026-10-29, while S10 (task-116) was in review: the published cost comparisons
between arms are **one ratio of totals**, and a single ratio hides where and why one arm costs more.

- **Where ×1.55 comes from:** campaign-001 (v0.1, `c82a5e74885b/2`, WingFoil v0.2.2, Sonnet 5), the finding on M-K1
  for S1@1.0: the wingfoil arm's mean cost a run against the baseline's (3.62–4.12 € against 1.72–3.79 €), mostly
  cache reads; the same ratio was preliminary elsewhere (S2 ×1.96, S3 ×2.26, S8 ×1.70, n = 1). rel-v0-1's
  retrospective made it H1's baseline for v0.2. The v0.1 calibration (`docs/calibration/v0.1.md`) already broke a
  wingfoil run down by tool call into levers (role context, rediscovery, recording and approval round trips), but as a
  one-off estimate, not as a metric of every comparison, and not against baseline-docs.
- **Why a total misleads:** each arm pays and saves in different places, and how much depends on the scenario.
  - **Context initialisation:** wingfoil loads its role's directives and the relevant Memory at a session's start
    (more than the baseline, which loads nothing). The step-A docs control renders **every role's** directives
    (`docs_directives: every-role`, REQ-FMT-05 and REQ-RUN-11 as amended in 1.41, dl-021), roles the task never
    involves included, so its fixed context can exceed wingfoil's, which filters by role.
  - **Approvals and gates:** wingfoil stops at its workflow's gates and records each transition: round trips and
    recording the baseline does not pay; a docs control pays only what its agent chooses to do by compliance.
  - **Free process:** the baseline and the docs controls organise work as their agent likes, which can be cheaper or
    dearer (rediscovery of the code, repeated exploration) than a declared workflow.
- So a difference between two arms on a complex run is a sum of **base** differences (present in every run: the fixed
  context, the manual, the setup) and **scenario-specific** ones (present only where the scenario exercises them:
  gates in S10, continuity in S3, rules in S8), and each may be an advantage or a disadvantage.

## Options

1. **Keep one ratio of totals**, with prose for the reasons (today).
2. **Notes only**: the S10 spec and the campaigns' results reviews explain the differences case by case.
3. **A cost decomposition as part of the method:** a catalogue of cost components per arm, each with where it applies
   and whether it is base or specific; each run's cost attributed to them; comparisons between two arms reported as
   a total **and** its components, base and specific apart.

## Proposal

**Option 3**, scoped as a method change for v0.4's planning (F4.3's cost metrics extended), not for the W17 campaign:

1. **The catalogue of components**, each defined by what a transcript or a run's files show, never by one harness's
   format: fixed context (the session's first input: manual, rules, rendered or loaded directives, Memory read at
   start); setup (M-K3, already measured); exploration of the code; the work itself (edits, tests); process
   recording (writing records, transitions); gates and approvals (round trips with the approver, interventions);
   recovery (failed attempts, retries).
2. **Each component labelled per arm as an expected advantage or disadvantage**, and as **base** (expected in every
   scenario) or **specific** (expected only where a scenario exercises it), written before the runs, as hypotheses
   are.
3. **Attribution per run** from the transcripts and the runs' files (tokens and cost per tool call, as v0.1's
   calibration did once), with what cannot be attributed reported as such, never spread.
4. **Comparisons** between two arms report the total ratio and its decomposition; the base part is estimated from
   the scenarios whose specific components are absent or small, so that a complex run's difference can be split
   into what is always there and what that scenario adds.
5. **The docs controls' fixed context measured on its own**: the every-role rendering is a deliberate treatment
   (dl-021); its cost is reported, so that a docs control's higher fixed context is not read as a process cost.

## Consequences

- No published value changes: campaign-001's ×1.55 and later ratios stay as published; the decomposition can be
  computed afterwards from the stored transcripts, as an addition.
- The experiment design §4.2 and §4.6 and the requirements (REQ-SCO, the cost metrics; REQ-RES, their presentation)
  are amended by the task that implements it; S10's spec states its components (gates, recording, the docs
  controls' fixed context) as specific to it.
- **What would change the proposal:** transcripts that do not let tool calls be attributed reliably for one agent
  (then the decomposition is reported only where they do); a component whose base and specific parts cannot be
  separated with the scenarios available.
