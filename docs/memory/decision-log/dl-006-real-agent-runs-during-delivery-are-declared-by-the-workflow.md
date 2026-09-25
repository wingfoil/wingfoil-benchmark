---
id: dl-006-real-agent-runs-during-delivery-are-declared-by-the-workflow
type: decision-log
title: "Real-agent runs during delivery are declared by the workflow"
status: draft
---

## Context

Found at the end of wave W3 of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), when the question
"is this run part of the workflow, and is it calibration?" had no answer written anywhere.

`release-cycle` declares where the real agent runs: **calibration** (dry runs of every scenario in
every arm), **validation** (one end-to-end run on the cheapest scenario) and the **campaign**. It
declares no real-agent run inside **delivery**. `kanban-delivery` does not mention the real agent at
all: its `deliver` phase only says to check the wave's "Ends with" and record it in the release element.

Delivery has used the real agent three times all the same, each time decided task by task:

| Where | Decided in | Consent and ceiling | Spent |
|---|---|---|---|
| task-004, W2 spike | its Context, at the pending → backlog gate | ~1 € | 0.1266 USD |
| task-011, W3 spike, question 7 | its Context, at the pending → backlog gate (`e769c71`) | ~0.50 € | 0.040 USD |
| W3 "Ends with", campaign `ccf207c46915` | task-011 decision 4, consent given at run time | 3 €, Sonnet 5 | 0.72 € |

W1 and W2 verified their "Ends with" with the fake agent only (W2: "the plan-time decision"), while W3
added a real-agent half. So the same phase (`deliver`) is verified in two different ways, and the only
record of which way applies is inside one task's Context.

The rule that holds this together is a constraint in [plan-003](../../plans/plan-003-release-v0-1.md)
("no run with a real agent starts without the approver's explicit consent"), not a workflow
declaration. That leaves four gaps:

1. **Not deducible.** Phase completion is deduced from element states and `produces:`, but nothing in
   `kanban-delivery` produces or requires a real-agent record, so a second agent following the workflow
   would not run one. Whether a wave is verified with the real agent depends on who plans it, which is
   the kind of non-determinism the benchmark measures in others.
2. **Easily taken for calibration.** A real-agent run on the arms after W3 looks like calibration, but
   it is not: calibration needs the dry run, the estimate and the budget guard (W5), runs S1, S2, S3
   and S8 in every arm, and produces `docs/calibration/v0.1.md`. Nothing states the difference.
3. **Consent has no fixed place.** For the spikes it is a backlog gate. For the W3 run it was given at
   run time and survives only as one sentence in rel-v0-1.
4. **No ledger.** Delivery spend is recorded in three different places (two task bodies and the
   release). Calibration will revise the budget (K4) without a declared input of what development has
   already spent, and the W3 figures (the wingfoil arm's first step cost eight times the baseline's)
   are exactly what W5's estimate needs.

## Options

- **A. Declare an optional real-agent check in `kanban-delivery` `deliver`.** When a wave's
  "Ends with" names behaviour the fake agent cannot show (a real session, a model, a live tool), the
  wave's plan phase may add a real-agent half. The phase declares its conditions: approver consent
  with model and ceiling *before* the run, a campaign run outside the repository, and a fixed record
  in the release element's wave section (consent date, model, ceiling, campaign id, cost per arm,
  outcome). The fake-agent half stays mandatory.
- **B. Keep delivery fake-only.** Only spike tasks may spend, through their own backlog gate. Every
  other real-agent check moves to `validation`. W3's run stays as it is, recorded as an exception.
- **C. A cross-cutting rule instead of a phase change.** A benchmark directive (or a `release-cycle`
  note) says that any real-agent run, in any phase, needs consent and appends to one spending ledger
  per release (for example `docs/calibration/{release}-ledger.md`), which calibration reads as an
  input. `kanban-delivery` itself is unchanged.

A and C are compatible: A says *when* delivery may use the real agent, and C says *how* every such
run is authorised and counted.

## Proposal

**A together with C**, for the approver to confirm or change:

1. `kanban-delivery` `deliver` declares the optional real-agent half of the wave check, its consent
   gate (`approval: { by_role: approver }`) and its record in the release element. The fake-agent
   half stays the one mandatory check.
2. One spending ledger per release collects every real-agent run of delivery (spikes and wave checks).
   Calibration lists it among its inputs and states that none of those runs counts as a dry run.
3. The ledger for v0.1 is filled back from the three runs above.
4. `calibration` and `validation` in `release-cycle` each add one sentence saying how they differ from
   a delivery wave check, so the two are not confused.

## Consequences

- `kanban-delivery.yaml` and `release-cycle.yaml` get a new version; plan-003's constraint on
  real-agent runs points to the declaration instead of standing in for it.
- The W4–W11 plan phases decide the real-agent half explicitly, yes or no, instead of implicitly.
- Calibration (plan-003 step 3) gets a declared input that it currently lacks.
- Does not change the budget (K4), which stays loose until calibration, or any past approval.
