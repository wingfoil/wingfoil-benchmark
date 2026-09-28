---
id: plan-003-release-v0-1
type: plan
title: "Release v0.1"
status: active
workflow: release-cycle
phase: release-cycle
---

## Context

Inception and specification are complete (plan-001 and plan-002 `done`). All the documents in
`docs/01_vision/` and `docs/02_specification/` are approved. The `release-cycle` phase of
`sw-life-cycle` now runs its first iteration, on the release element
[rel-v0-1](../memory/release/rel-v0-1.md), through the `release-cycle` sub-workflow
(`.wingfoil/workflows/custom/release-cycle.yaml`).

**Scope:** release **v0.1 — First preliminary result**
([07_sequencer.md](../01_vision/07_sequencer.md) 1.1): 11 waves (W1–W11), 33 features, the scenarios
S1, S2, S3 and S8. The reference campaign has 21 runs on Sonnet 5, plus the Opus 5 comparison slice on
S1 ([09_experiment-design.md](../01_vision/09_experiment-design.md) 1.1).

**Inputs:**

- [requirements.md](../02_specification/requirements.md) 1.1: architecture, formats, commands,
  runner, scoring, results.
- [acceptance/](../02_specification/acceptance/): the `.feature` files of the 33 features.
- [scenarios/](../02_specification/scenarios/): conventions K1–K5 and the specs of S1, S2, S3, S8.
- [traceability.md](../02_specification/traceability.md): feature → acceptance → requirement → wave.

**Constraints:**

- The benchmark is developed against the WingFoil v0.2 pre-release pinned to `3df305e`
  (`vendor/wingfoil-0.2-pre-3df305e.tgz`), always through `npx wingfoil`. After every `wingfoil`
  command, its observed effect is compared with its declared behaviour, and the comparison is
  recorded in the task's Execution notes.
- Nothing about the benchmark is written into the WingFoil repository.
- Hold-out oracle content is written only in the private `WingFoil2-Benchmark-HoldOut` repository.
- The budget gate stays loose (K4) until calibration. No run with a real agent starts without the
  approver's explicit consent. Where that consent is given and how each run is counted is declared
  since W4 ([dl-006](../memory/decision-log/dl-006-real-agent-runs-during-delivery-are-declared-by-the-workflow.md),
  task-020): a spike's at its pending → backlog gate and a wave's in `kanban-delivery`'s optional
  `real-agent-check` phase; every run is a line of the release's spending ledger,
  [docs/calibration/v0.1-ledger.md](../calibration/v0.1-ledger.md), which calibration reads.
- Subscription credentials never reach disk, logs, transcripts or results (security-secrets).

## Steps

| # | Phase | Role | Produces | Gate |
|---|-------|------|----------|------|
| 1 | release-planning | product-owner | `rel-v0-1` filled (version, waves, features, Goal, Scope); triage of open bugs and decision-logs; the W1 tasks | approver: `rel-v0-1` planning → in-development |
| 2 | delivery | developer, reviewer | W1 → W11 through `kanban-delivery`, one task at a time; each wave's "Ends with" recorded in `rel-v0-1` | approver: every task pending → backlog and in-review → approved |
| 3 | calibration | scenario-author | `docs/calibration/v0.1.md`: dry runs of S1, S2, S3, S8 in every arm, measured costs, revised budget | approver: revised budget; approver: every real-agent run |
| 4 | validation | qa | acceptance tests green against the fake agent, coverage above 80%, lint clean, one end-to-end real-agent run on the cheapest scenario | approver: the real-agent run |
| 5 | campaign | scenario-author, qa | the reference campaign through `campaign-cycle` (a `campaign` element) | approver: spending, scored results, publication |
| 6 | publishing | tech-lead | tag `v0.1`, repository public, site published, release notes, transcripts as release assets | approver: `rel-v0-1` releasing → released |
| 7 | retrospective | facilitator | `rel-v0-1` Retrospective section; bugs and decision-logs for the benchmark; WingFoil usage notes handed to the approver | approver review |

**Release-planning details (step 1):**

- Triage: no bug or decision-log element exists yet, so there is nothing to carry into v0.1. v0.1 was
  specified by plan-002, so `benchmark-specification` does not run again.
- Traceability additions for W1 (accepted at kickoff): REQ-RUN-16 (F1.1) and REQ-CLI-10 (F2.1) join
  the W1 requirements, as `traceability.md` §2 already maps them.
- Content and state changes are committed separately. The body of an element is committed by hand
  first (`docs(...)`), then `memory submit` moves only its `status`. This is needed because `submit`
  commits the whole file under a subject that names no transition.

**Delivery rules (step 2):**

- Wave order from the sequencer. A wave starts only when the previous wave's "Ends with" is verified.
- WIP limits: at most 1 task `in-progress` and 1 task `in-review`, checked in the plan phase with
  `npx wingfoil memory search --type task --status in-progress` and `--status in-review`.
- One branch `task/<id>` per task, test-first (TDD), merged into `main` with `--no-ff` after approval,
  then `approved → done`.
- Scenario content tasks (F6.x) follow `scenario-authoring`.
- Review findings become elements (bug or decision-log). Changes to approved documents are
  amendments with a raised version and a recorded review decision.

## Handoff

- **Agent:** drafts the release scope, the tasks, the designs and the code. Executes every `wingfoil`
  command and records declared-vs-observed behaviour. Records new WingFoil friction as notes in the
  untracked `docs/wingfoil-feedback/X_wingfoil-usage-notes.md`.
- **Approver (Roberto):** approves the release scope, every task gate, the revised budget, every
  real-agent run, the campaign gates and the publication. Runs `memory approve`/`reject` only follow
  the approver's explicit consent, always with `--reason`.
- **Checkpoints:** `rel-v0-1` in `in-development` (end of step 1); each wave's "Ends with" recorded
  (step 2); calibration report approved (step 3); campaign `published` (step 5); `rel-v0-1`
  `released` (step 6).
- **Completion:** `rel-v0-1` is `released` and its Retrospective section is written. The plan then
  moves `active → done`, and the next iteration (`rel-v0-2`) gets its own plan.
