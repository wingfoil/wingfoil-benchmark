---
id: task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget
type: task
title: "Calibration of v0.1: dry runs, measured costs and the revised budget"
status: draft
release: v0.1
wave: calibration
features: []
acceptance: []
requirements: [REQ-CLI-05, REQ-RES-01, REQ-RUN-08, REQ-RUN-16, REQ-NFR-06]
---

## Context

The second and last task of plan-003 step 3, **calibration**, in release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
after [task-049](task-049-wingfoil-v0-2-2-as-the-harness-under-test.md) made the released WingFoil v0.2.2 the
harness under test. It runs the `release-cycle` phase `calibration` (version 2): dry-run every scenario of the
release in every arm with the real agent, record the measured costs, revise the budget (K4). Like a spike, it
delivers no feature (`features: []`): its products are a profile, measurements and a report.

**What it produces:**

- `scenarios/dry-run.yaml`, the benchmark's dry-run profile (task-021): the wingfoil harness `v0.2.2`; agent
  `claude-code` **2.1.280** (REQ-RUN-16 as amended; the approver's choice of 2026-10-02, and the version the
  reference campaign is to pin, so that its estimate reads these costs); model `claude-sonnet-5`, with
  `claude-opus-5` given by `--model` for the slice; approver policy `v1`; the caps and the rate (design phase).
- **15 dry runs**, each stored under `results/dry-runs/<n>/` (REQ-RES-01) and committed, transcripts excepted
  (git-ignored), each a line of the [v0.1 ledger](../../calibration/v0.1-ledger.md):
  S1, S2, S3, S8 × baseline, baseline-docs, wingfoil on Sonnet 5 (12), and S1 × the three arms on Opus 5 (3;
  task-021 decision 2: no cost is scaled between models).
- each dry run scored (`bench score dry-runs/<n>`, with the hold-out), and one of them scored twice (W9's
  carry-over: M-Q2 with an agent's own tests may not be deterministic). No spending.
- `docs/calibration/v0.1.md`: measured costs per scenario, arm and model; the estimate of the reference
  campaign (21 runs) from them (`bench campaign estimate` on a draft campaign file, not run); the revised budget
  (`warn_eur`, `ceiling_eur`) proposed to the approver, and whether the Opus slice keeps three arms or shrinks
  to the wingfoil arm (experiment design §6); what the first real runs show of the items `rel-v0-1` lists for
  calibration (W7–W10: S2's and S3's checks, S8's arm difference, M-K4, M-Q2, M-R, M-R3's paths, scoring time);
  the "before the reference campaign" items task-049 settled; and, per scenario, whether its difficulty holds.
- **Registration** of S1@1.0, S2@1.0, S3@1.0 and S8@1.0 (`scenario-authoring`'s `register`), recorded in the
  report: from then on a change is a new version. A difficulty change found here is made before registration,
  in this task, and only with the approver's decision for that scenario; the scenario's dry runs then run again.

**Spending, in three stages, each with the approver's consent before it starts** (the approver's choice of
2026-10-02). The agent runs on the maintainer's subscription: costs are the API-equivalent the agent reports,
nothing is billed per token (ledger).

| Stage | Dry runs | Model | Cap per run (`run_cost_eur`) | Ceiling consented | Consent |
|---|---|---|---|---|---|
| 1 | S1 × baseline, baseline-docs, wingfoil | Sonnet 5 | 2.50 € | **7.50 €** (expected about 3.6 €) | **this task's pending → backlog approval** |
| 2 | S2, S3, S8 × the three arms (9) | Sonnet 5 | from stage 1 | from stage 1 | the approver, in chat, before it starts |
| 3 | S1 × the three arms (the slice) | Opus 5 | from stages 1–2 | from stages 1–2 | the approver, in chat, before it starts |

A dry run has no campaign ceiling: `run_cost_eur` bounds each run (REQ-RUN-08; the agent may run one turn past
its cap, task-024), so a stage's ceiling is the sum of its caps. Stages 2 and 3 are proposed with the costs
stage 1 measured; each consent is recorded with its date in the ledger's "Consent" column and in these notes.
A dry run that fails, or is killed at a cap, is still a ledger line; it is re-run only with a new consent.

**Who runs them:** the agent of this session, with `--allow-spending` and `BENCH_AGENT_TOKEN_FILE` naming the
token file the approver gives (created with `claude setup-token`). The token's content is never read, printed or
stored; the runner scrubs it from everything it keeps (REQ-RUN-15, security-secrets), and `bench transcripts
pack`'s token check is not needed here since nothing is packed.

**Out of scope:** the reference campaign and its campaign file (plan-003 step 5); validation's end-to-end run
(step 4); the site; changing a scorer rule (a finding here that calls for one is a bug or a decision-log).

**Done** means: `scenarios/dry-run.yaml` committed; 15 dry runs stored, scored and in the ledger, or the stages
the approver stopped said so; `docs/calibration/v0.1.md` written; the revised budget approved by the approver
(plan-003 step 3's gate, at this task's review); S1–S3 and S8 registered; `rel-v0-1`'s calibration checklist
line ticked at delivery.

## Acceptance criteria

<!-- A calibration task: no Gherkin scenario. What is checked at review: the profile against the schema
     (`bench scenario dry-run` accepts it), every dry run in the ledger with its consent, the report's numbers
     against the stored runs, the estimate reproducible from the report's command. -->

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Calibration of v0.1: dry runs, measured costs and the revised
  budget"` — declared: creates the element at `draft` and commits it. Observed: `2ab69d0 wf(task): add …`.
