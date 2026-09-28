---
id: task-022-cost-estimate
type: task
title: "Cost estimate"
status: backlog
release: v0.1
wave: W5
features: [F1.2]
acceptance: [campaign.feature]
requirements: [REQ-CLI-02, REQ-NFR-06]
---

## Context

Second task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It
reads the dry-run costs task-021 stores; the guard (task-023) compares its total with the budget.

Scope of F1.2:

- **`bench campaign estimate <file>` (REQ-CLI-02).** For every scenario × arm × model the campaign
  runs, the dry-run cost of that key times its repetitions; the total in euro, as an API-equivalent
  cost, at the campaign's rate. No agent session starts, no container is created.
- **Keys (W5 plan-phase decision 2, task-021):** scenario version (by content hash), arm and model. A
  key without a dry run fails the estimate, naming the scenario, the arm and the model, and saying to
  run a dry run first. One model's cost is never scaled into another's.
- **What the estimate says about its inputs.** Each line names the dry run it comes from, so that a
  cost measured on an older agent or harness is visible rather than silently reused (a campaign pins
  the released WingFoil, dry runs during development ran on `3df305e`).
- **Cost transparency (REQ-NFR-06), the campaign half:** `campaign run` prints the estimate before its
  first run starts, and the actual cost when it finishes.

The dry-run cost already holds what W2 and W3 left to W5 — the per-session cost floor (adr-002), the
cost of interventions, and a per-arm step cost — because it is measured, not modelled.

**Done** means: `campaign.feature` @F1.2 (both scenarios) passes; `campaign run` prints the estimate
and the actual cost; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `campaign.feature` @F1.2 "The cost is estimated before any run starts" — per scenario and arm, the
  dry-run cost times the repetitions, the total in euro, no session started. **red-first**
- `campaign.feature` @F1.2 @error "A scenario without a dry run cannot be estimated" — the message
  names the scenario and the arm (and the model), and says to run a dry run first. **red-first**
- REQ-NFR-06 — `campaign run` prints the estimate before starting and the actual cost when it
  finishes. **red-first**

## Design

**Classification confirmed:** all red-first. Built test-first (task-021's build was not; its notes say so).

### What is estimated — `runner/estimate.ts`

`estimateCampaign(checked)` returns, for every run the campaign file describes, one line per key —
scenario version, arm, model — in the campaign's order:

- the **default model** over every scenario × arm, times the scenario's `repetitions`;
- each **slice** (`models.slices`, REQ-FMT-01) over its scenarios × arms, times the slice's
  `repetitions`.

Each line holds the dry run that counts for the key (`latestDryRun`, task-021: the latest completed dry
run of the version's current hash, arm and model), its cost in USD, the repetitions, and their product.
The total is the sum of the lines, in USD, converted **at the campaign's rate** (`currency.usd_to_eur`),
not at the dry run's profile's: the estimate is the campaign's figure, in the campaign's currency.

Every key without a dry run is an issue, all of them at once, so that one command lists every dry run
still to do: `scenarios[<i>]: T3@1.0 has no completed dry run in arm wingfoil on model fake-model: run
bench scenario dry-run T3@1.0 --arm wingfoil --model fake-model first`. The path points at the
campaign's scenario entry, as every other scenario issue of a campaign does.

**Slices are estimated although the runner does not run them yet.** `runCampaign` runs the default
model only (task-003: "slices are W5"), and no W5 task runs them. The estimate counts what the campaign
file *says* it runs, so that the guard (task-023) never under-states the reference campaign, whose Opus 5
slice is part of its cost. Running slices is raised with the approver in this task's notes, not built
here.

### Provenance

Each line names its dry run (`results/dry-runs/<n>`) and, when it differs from the campaign's pin, what
it ran with: `agent claude-code 2.1.280, the campaign pins 2.1.290`; for a harness pinned by a commit
prefix, `wingfoil 3df305e…, the campaign pins abc1234`. A pin by released version cannot be compared
with a commit and is not flagged. The line still counts: the cost is the best measure there is, and the
difference is shown rather than hidden (Context).

### The command — `bench campaign estimate <file>` (REQ-CLI-02)

After `checkCampaign`, no Docker call, no agent session: the estimate reads files only. Output, one line
per key, then the total:

```
T3@1.0 baseline fake-model: 0.0400 USD × 3 = 0.1200 USD (results/dry-runs/1)
T3@1.0 wingfoil fake-model: 0.3000 USD × 3 = 0.9000 USD (results/dry-runs/2; agent fake 0.9.0, the campaign pins 1.0.0)
estimate: 1.0200 USD, 0.9384 EUR at 0.92 EUR/USD, API-equivalent
```

Exit 0 with an estimate, 1 with issues. The usage gains `bench campaign estimate <file>`; the unit
test that listed `campaign estimate` among the usage errors changes accordingly.

### Cost transparency in `campaign run` (REQ-NFR-06)

Before the image is built, `campaign run` prints the estimate's total line; when an estimate cannot be
made it prints `estimate: not available, <n> dry runs missing` and **still runs** — refusing is F1.3's,
task-023's. When the campaign ends: `cost: <USD> USD, <EUR> EUR at <rate> EUR/USD, API-equivalent`, the
sum over every run's steps, next to the `runs completed` line.

### Modules

- `runner/estimate.ts`: `estimateCampaign`, `Estimate`, `EstimateLine`, and the line formatting, so the
  two commands print the same words.
- `cli/run.ts`: `campaign estimate` parsed and dispatched; `campaign run` prints the estimate and the
  cost. `cli/shared.ts`: the usage line.

### Tests

- **Acceptance** (`campaign.feature` @F1.2): the estimate lists per scenario and arm the dry-run cost
  times the repetitions, shows the total in euro as an API-equivalent cost, and starts no session (the
  doubles record no build, no container, no step); @F1.2 @error: a missing dry run for T3 in the
  wingfoil arm fails the estimate, the message naming T3 and wingfoil and saying to run a dry run first.
- **Unit:** slices counted with their repetitions; the campaign's rate used, not the profile's; every
  missing key reported; a failed or stale dry run does not count; provenance notes for agent and
  harness; `campaign estimate` usage and exit codes; `campaign run` prints the estimate (or that it is
  not available) before the build and the cost after the runs.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `7bd1a73`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W5 tasks of release v0.1` (`40c7c46`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-022-cost-estimate` → `5951e28`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
