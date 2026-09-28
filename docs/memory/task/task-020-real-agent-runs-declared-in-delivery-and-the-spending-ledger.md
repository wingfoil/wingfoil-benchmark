---
id: task-020-real-agent-runs-declared-in-delivery-and-the-spending-ledger
type: task
title: "Real-agent runs declared in delivery, and the spending ledger"
status: in-progress
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

dl-006 was approved as proposed, **A together with C** (`4070548`: "A + C: optional real-agent half
of the wave check with a consent gate before the run, one spending ledger per release").

### What WingFoil `3df305e` can express

Read from `src/workflow/schema.ts` at the pin: a phase may declare `optional: true`, an
`approval: { by_role }`, `produces:` and `checks: { pre, post }`. So the real-agent half is declared
as **its own optional phase**, with its gate and its product, rather than as a sentence inside
`deliver`: what is optional, gated and produced is then data WingFoil reads, not prose.

### `kanban-delivery.yaml` (version 2)

- **A new phase, `real-agent-check`**, after `deliver`: `optional: true`, `role: developer`,
  `approval: { by_role: approver }`, `produces: [docs/calibration/{release}-ledger.md]`. Its
  description says when it applies (once per wave, after the wave's last task is done, when the
  wave's plan phase decided a real-agent half because the "Ends with" names behaviour the fake agent
  cannot show), what the approval is (consent with model and ceiling, **before** the run), where the
  run happens (a campaign outside the repository), and what it records (the release element's wave
  section — consent date, model, ceiling, campaign id, cost per arm, outcome — and a ledger line).
- **`plan`** says that a task which spends (a spike) states its ceiling in its Context, that the
  pending → backlog approval is the consent, and that its spending is a ledger line.
- **`deliver`** says that the fake-agent half of the wave check stays the mandatory one.
- `version: 2` is added to the file (it had none: the unversioned original is 1), as dl-006's
  consequences ask.

### `release-cycle.yaml` (version 2)

- **`calibration`** lists the ledger among its inputs and says that none of the delivery runs it
  holds is a dry run.
- **`validation`** says how its end-to-end run differs from a delivery wave check (the release's
  validation, on the cheapest scenario, versus one wave's "Ends with"), and that its cost is a
  ledger line too.
- `version: 2`, as above.

### `docs/calibration/v0.1-ledger.md`

One line per real-agent run of the release, in date order: date, element, kind (spike, wave check,
later calibration, validation, campaign), consent (where it was given), model, ceiling, cost in USD
and EUR, source (the commit or element that records it). Filled back with the three runs of delivery
so far:

| Date | Element | Kind | Consent | Model | Ceiling | Cost |
|---|---|---|---|---|---|---|
| 2026-09-23 | task-004 | spike | task-004 pending → backlog, `80ccf67` | Haiku 4.5, Sonnet 5 | 1.00 USD (~1 €) | 0.1266 USD |
| 2026-09-25 | task-011 | spike | task-011 pending → backlog, `e769c71` | Haiku 4.5 | 0.50 USD (~0.50 €) | 0.0402 USD |
| 2026-09-25 | W3 wave check, campaign `ccf207c46915` | wave check | at run time, recorded in rel-v0-1 `8a4950c` | Sonnet 5 | 3 € | 0.7809 USD (0.7184 €) |

Its total, 0.9477 USD, is what development has spent before calibration: the input dl-006 found
calibration lacked. The W3 row shows the gap dl-006 names — its consent was given at run time; from
now on the approval of `real-agent-check` precedes the run.

### plan-003

The constraint "No run with a real agent starts without the approver's explicit consent" keeps its
words and points to where they are now declared: `kanban-delivery`'s `plan` and `real-agent-check`,
`release-cycle`'s phases, and the ledger.

### Checks

- `npx wingfoil workflow list` before (saved: exit 0, no warning) and after; any new warning explained.
- `npm test` and `npm run lint` (the repository's own tests read `.wingfoil/`).

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
