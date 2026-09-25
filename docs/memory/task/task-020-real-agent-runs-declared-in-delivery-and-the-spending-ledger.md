---
id: task-020-real-agent-runs-declared-in-delivery-and-the-spending-ledger
type: task
title: "Real-agent runs declared in delivery, and the spending ledger"
status: pending
release: v0.1
wave: W4
features: []
acceptance: []
requirements: [REQ-NFR-06]
---

## Context

Fifth task of wave **W4** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It implements
[dl-006](../decision-log/dl-006-real-agent-runs-during-delivery-are-declared-by-the-workflow.md),
"Real-agent runs during delivery are declared by the workflow", **once the approver has approved it**:
this task's pending → backlog gate follows dl-006's approval, and takes its outcome — options A and C,
as dl-006 proposes, or whatever the approver decides instead.

As dl-006 proposes (A together with C):

- **`kanban-delivery` `deliver` declares an optional real-agent half of the wave check**, for a wave
  whose "Ends with" names behaviour the fake agent cannot show; its consent gate
  (`approval: { by_role: approver }`), given with model and ceiling **before** the run; the run made
  outside the repository; and its record in the release element's wave section (consent date, model,
  ceiling, campaign id, cost per arm, outcome). The fake-agent half stays the one mandatory check.
- **One spending ledger per release** collects every real-agent run of delivery (spikes and wave
  checks): `docs/calibration/v0.1-ledger.md`, filled back from the three runs so far — task-004
  (0.1266 USD), task-011 (0.040 USD), campaign `ccf207c46915` of W3 (0.72 €). Calibration lists it among
  its inputs and states that none of those runs counts as a dry run.
- **`release-cycle`**: `calibration` and `validation` each gain one sentence saying how they differ from
  a delivery wave check.
- **plan-003**'s constraint on real-agent runs points to the declaration instead of standing in for
  it.

It changes `.wingfoil/` configuration, so it goes through a task on its own branch, never straight to
main (this repository's rule). It delivers no benchmark feature: `features` and `acceptance` are empty;
REQ-NFR-06, cost transparency, is the requirement it serves for the benchmark's own spending.

Planned before task-019, whose real sessions are the first spending the ledger records as it happens.

**Done** means: the two workflow files and plan-003 say what dl-006 decided, `npx wingfoil workflow
list` reads them without a new warning, the ledger holds the three runs with their sources, and every
`wingfoil` command's declared-vs-observed note is present.

## Acceptance criteria

No Gherkin criterion: this task changes the process's configuration and documents, not the benchmark's
behaviour. Its exit criteria:

- `kanban-delivery.yaml`'s `deliver` phase declares the optional real-agent half, its approval gate and
  its record; `release-cycle.yaml`'s `calibration` and `validation` say how they differ from it.
- `npx wingfoil workflow list` loads the changed configuration; any warning is either one that was
  already there or explained.
- `docs/calibration/v0.1-ledger.md` lists the three runs, each with its consent, model, ceiling, cost
  and the commit or element that records it.
- plan-003 points to the declaration.
- `npm test` and `npm run lint` still green (the repository's own tests read `.wingfoil/`).

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `7789190`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `7dbbe10`, so that `submit` carries only the state change
  (usage note N13).
- `npx wingfoil memory submit task-020-real-agent-runs-declared-in-delivery-and-the-spending-ledger` →
  `cf5121b`. Declared: `draft → pending`, one commit `wf(task): submit <id>`. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status`. Matches (subject without transition: N9).
