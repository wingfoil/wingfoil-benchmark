---
id: plan-001-benchmark-inception
type: plan
title: "Benchmark inception"
status: active
workflow: benchmark-inception
phase: inception
---

## Context

The repository has been bootstrapped (`git init`, pinned WingFoil 0.1.0 built from WingFoil commit
`7a65580`, `wingfoil init --template Kanban`, custom configuration). The `inception` phase of
`sw-life-cycle` now runs, through the `benchmark-inception` sub-workflow
(`.wingfoil/workflows/custom/benchmark-inception.yaml`).

The benchmark is two things at once, and the sub-workflow covers both:

- **a product** with readers and contributors, framed with a compact **Lean Inception**
  (brief → vision → personas → journeys → features → sequencer);
- **a measurement instrument**, framed with **Goal-Question-Metric** in a final
  `experiment-design` phase: goals per category, questions, metrics, arms, validity threats and a
  budget model. Lean Inception has no step for these, and without them the results could not be
  trusted.

The inception defines *what* the benchmark is and *how* it measures. It does **not** design
individual scenarios in detail; that belongs to the `specification` phase.

Inputs: the approver's answers from the kickoff session (2026-09-22), captured in the brief.

Standing constraints from the kickoff:

- Nothing about the benchmark is written into the WingFoil repository.
- A private sibling repository, `WingFoil2-Benchmark-HoldOut`, holds hold-out scenarios and
  oracles. It is a plain data repository and is not managed with WingFoil.
- Campaign budget: 20–30 € preferred, 100 € hard ceiling.
- The only agent available today is Claude Code (paid). Codex may be added once the benchmark runs.

## Steps

| # | Phase | Role | Produces | Gate |
|---|-------|------|----------|------|
| 1 | brief | facilitator | `docs/01_vision/01_product-brief.md` | approver review |
| 2 | vision | facilitator | `docs/01_vision/02_product-vision.md`, `docs/01_vision/03_is-isnot.md` | approver review |
| 3 | personas | facilitator | `docs/01_vision/04_personas.md` | approver review |
| 4 | journeys | facilitator | `docs/01_vision/05_journeys.md` | approver review |
| 5 | features | architect | `docs/01_vision/06_features.md` | approver review |
| 6 | sequencer | product-owner | `docs/01_vision/07_sequencer.md`, `docs/01_vision/08_mvp-canvas.md` | approver review |
| 7 | experiment-design | scenario-author | `docs/01_vision/09_experiment-design.md` | approver review |

Each step runs on its own branch, `design/inception_<step>`, and is merged into `main` after the
approver's review. The agent drafts. The approver corrects and confirms. Open points go into the
document's own "Open questions" section rather than being silently resolved.

## Handoff

- **Agent:** drafts every artifact, keeps traceability between them (personas → journeys →
  features → sequencer → GQM goals), and flags contradictions with earlier artifacts.
- **Approver (Roberto):** answers open questions, and approves each step before the next one starts.
- **Completion:** all seven `produces:` artifacts exist on `main` and are approved. The plan then
  moves `active → done`, and the `specification` phase can start.
