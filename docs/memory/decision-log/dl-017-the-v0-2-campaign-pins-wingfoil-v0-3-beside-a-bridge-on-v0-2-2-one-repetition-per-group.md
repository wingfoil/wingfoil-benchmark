---
id: dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group
type: decision-log
title: "The v0.2 campaign pins WingFoil v0.3, beside a bridge on v0.2.2, with v0.1's repetitions"
status: approved
---

## Context

The approver, in chat on 2026-10-13 and 2026-10-14, before v0.2's calibration. WingFoil v0.3 is about to be
released. Everything so far has been built and measured on WingFoil **v0.2.2**:

| Campaign | Benchmark | WingFoil | Model | Claude Code | Arms | Runs | Cost |
|---|---|---|---|---|---|---|---|
| `d032e3e98de3/1` (validation) | v0.1 | — | Sonnet 5 | 2.1.280 | baseline | S3 × 1 | 0.89 € |
| `c82a5e74885b/1` | v0.1 | v0.2.2 (`12537b62`) | Sonnet 5, Opus 5 slice | 2.1.280 | baseline, baseline-docs, wingfoil | 19, 3 failed (bug-011) | 41.22 € |
| `c82a5e74885b/2` (published) | v0.1 | v0.2.2 | Sonnet 5, Opus 5 slice | 2.1.280 | the same | 19 | 61.38 € |

v0.2's campaign changes several things against `c82a5e74885b/2` at once:

1. the model, Sonnet 5 → Sonnet 5.5 (dl-007);
2. Claude Code, 2.1.280 → 2.1.291 or later (task-062);
3. the effort, now pinned per model (dl-015);
4. the wingfoil arm's manual (task-086);
5. the scoring code (bug-012, bug-016), which `bench campaign compare` does not list as a pin;
6. and, with v0.3, WingFoil itself.

`bench campaign compare` reads each arm's delta against its own execution's baseline and lists the pins that differ.
A difference is attributable only when one group of causes changes between the two executions. The rule of
2026-10-05 ("the latest WingFoil release at the campaign") would pin v0.3 and change all six at once.

## Options

- **A. Only v0.2.2.** Ready now. v0.1 → v0.2 isolates the model and tooling, WingFoil held. It does not measure v0.3,
  and contradicts the rule of 2026-10-05 once v0.3 is out.
- **B. Only v0.3, no bridge.** The latest release, but v0.1 → v0.2 changes all six causes together: nothing is
  attributable.
- **C. A full campaign per WingFoil version.** Comparable, but the competitor arms, which do not depend on WingFoil,
  run twice: about 30–40 % more spending for no more information.
- **D. v0.3 for the reference campaign, beside the bridge dl-007 already plans on v0.2.2.** A chain of two steps:
  `c82a5e74885b/2` → bridge (model and tooling, WingFoil held at v0.2.2), then bridge → reference campaign (WingFoil
  v0.2.2 → v0.3 alone). The bridge is already in dl-007's budget.

## Proposal

**D**, as the approver chose in chat on 2026-10-14 ("ok per la proposta sulle campagne"):

1. **The reference campaign** (`campaign-002`) pins **WingFoil v0.3** once released and admitted to the eligibility
   register (REQ-FMT-11), with the wingfoil arm's manual reviewed against v0.3's guide for AI agents, as task-086 did
   for v0.2.2.
2. **The bridge is kept**, as a campaign of its own (09_experiment-design.md §6, v0.2), and is not cut at calibration to
   fit the budget: it is the link between v0.1's published results and v0.2's. It re-runs v0.1's configuration —
   S1, S2, S3 and S8 in baseline, baseline-docs and wingfoil on **WingFoil v0.2.2** (`12537b62`), with task-086's
   manual, written against v0.2.2's guide — on the reference campaign's model, Claude Code version and effort. It
   widens dl-007's bridge slice (S1 × baseline and wingfoil) to v0.1's whole configuration.
3. **The same pins and the same code:** the bridge and the reference campaign share the model, Claude Code, effort,
   scenario versions and repetitions, and run from the same benchmark commit, one after the other. The commit is
   recorded in both campaign elements, since the comparison does not list it.
4. **Repetitions: one per group, as v0.1's shape (S1 × 3, S2, S3 and S8 × 1),** until WingFoil 1.0 or the benchmark's
   1.0, whichever comes first (the approver, 2026-10-14: "x1 fino a wf1.0 o wfb1.0"). No group is raised to three to
   leave "preliminary" (dl-012's n ≥ 3); the site says preliminary, as REQ-RES-03 requires.
5. **The deadline for v0.3 is 2026-10-31.** If WingFoil v0.3 is not released by then, the reference campaign pins
   v0.2.2 (option A), and the bridge is not run, since the reference campaign then holds the same three arms on
   v0.2.2.

## Consequences

- Calibration (plan-004 step 3) adds the bridge's dry runs only where the reference campaign has none of the same
  key: with v0.3, the wingfoil and baseline-docs arms on v0.2.2 (8 dry runs).
- Before calibration, a task admits v0.3 to the eligibility register, reviews the wingfoil arm's manual against v0.3's
  guide, checks the arm's setup and the docs control's generator with v0.3, and pins it in the campaign file.
- The comparisons published with v0.2 are `c82a5e74885b/2` → bridge and bridge → reference campaign; F5.2's
  comparison with `c82a5e74885b/2` is read through the bridge.
- About 35–40 € more than the reference campaign alone (18 runs at v0.1's measured cost), already within dl-007's
  bridge; calibration replaces the figure.
- If WingFoil 1.0 or the benchmark's 1.0 arrives, repetitions are decided again.
- `09_experiment-design.md` §6 and plan-004 step 5 are amended to name the bridge's shape and the v0.3 pin, through
  the task that records this decision.
