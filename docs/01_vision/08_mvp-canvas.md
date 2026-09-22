# MVP Canvas — WingFoil Benchmark

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Traces to:** [07_sequencer.md](07_sequencer.md) (release v0.1), [01_product-brief.md](01_product-brief.md)

---

## MVP proposal

**v0.1 — First preliminary result.** A WingFoil-only campaign on four micro scenarios (S1–S3, S8),
run with Claude Code in three arms (baseline, baseline-docs, wingfoil), and published on GitHub Pages
as a preliminary result. The repository becomes public at the same time.

## Segmented personas

- **Riley, the Curious Reader** (primary): gets a two-minute, honest answer to "does WingFoil do
  something my setup does not?".
- **The WingFoil Maintainer**: gets the runner, the first scores, and the first finding notes for
  WingFoil.

## Journeys

- J1 — Glance at the results (Riley)
- J2 — Run a campaign (Maintainer)
- J3 — Author a scenario (Maintainer)
- J4 — Turn findings into WingFoil work (Maintainer)

## Features

The 33 features of waves W1–W11 in [07_sequencer.md](07_sequencer.md). In short:

- a runner with isolated, fresh-session, multi-step runs;
- the neutral approver;
- three arms with operating manuals;
- cost estimate and budget guard;
- a scenario format, with a leak scan and the hold-out;
- scoring: hidden tests, cost, quality, next-change cost, governance, determinism;
- content: S1, S2, S3, S8;
- results store, run detail and finding notes;
- landing page, method page and manual publish.

## Expected result

- A public page that states, for categories C, D, E and F, where WingFoil helps, ties or loses
  against the baseline and the baseline-docs control. Results are labelled preliminary, and the
  missing categories are declared.
- A first post can quote it.

## Metrics to validate the MVP

| Hypothesis | Metric | Target |
|---|---|---|
| The benchmark fits the budget | API-equivalent cost of the published campaign, and the applicable quota | ≤ 30 € (hard ceiling 100 €) |
| Results are reproducible | rerunning the campaign file with the same pins reproduces the stored results within the reported variance | yes, on S1 (3 repetitions, sequencer decision 2) |
| The results say something | categories where the arms differ beyond the reported variance | at least one, in either direction |
| The benchmark steers WingFoil | WingFoil bugs or decision-logs created from finding notes | at least one |
| Riley engages | shares, or visits to WingFoil's README from the page | observed after the first post (no target yet) |

## Cost and schedule

- **Run cost:** one campaign at 20–30 €, plus dry runs to calibrate the scenarios (F3.3). Their cost
  is counted towards the same budget.
- **Build effort:** 11 waves. No dates are fixed. Wave W2 (neutral approver) and wave W10
  (determinism metric) carry the main uncertainty.
- **Dependencies:** Docker, Claude Code headless, and the WingFoil version under test. Development
  uses the pinned 0.1.0; the first public campaign uses the latest released WingFoil (sequencer
  decision 3).
