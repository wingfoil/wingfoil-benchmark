---
id: task-022-cost-estimate
type: task
title: "Cost estimate"
status: done
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
- The approver's `memory approve` → `a2b689a` (`pending → backlog`). Matches.
- Design committed by hand on `task/task-022-cost-estimate` (`57491ab`), then
  `npx wingfoil memory submit task-022-cost-estimate` → `9cd283b` (`backlog → in-progress`, one commit,
  only `status`). Matches. WIP after it: this task `in-progress`, none `in-review`.

### Build (TDD)

1. **Tests first.** The two @F1.2 acceptance tests, five `estimateCampaign` unit tests, and the CLI's
   changed expectations (the usage gains `campaign estimate`; `campaign estimate <file>` stops being a
   usage error; `campaign run` prints the estimate before and the cost after): **19 red**, each for the
   missing command or module — the acceptance tests failed on exit 2, the usage error.
2. **`runner/estimate.ts`, then the CLI** (`2078fda`): the five unit tests green at the first
   implementation, then the CLI's. One existing test, "exits 1 when a run fails", went red on its
   anchored end-of-output and was updated for the cost line.
3. **Added after the code, for coverage:** `campaign run` printing an available estimate, `campaign
   estimate` on an invalid campaign, and an unknown campaign verb with a file (the branch
   `campaign estimate a.yaml` used to cover). They describe behaviour already written, so they were green
   when added.

### Deviation from the Design

None. One detail the Design left open: a harness note shows the first 7 characters of the dry run's
commit, the length of the shortest pin REQ-FMT-03 allows.

### For the approver: model slices are never run

The runner runs the default model only; `models.slices` is validated and, from this task, estimated, but
no code runs a slice. task-003 said "slices are W5", and none of W5's four tasks runs them. The
reference campaign's Opus 5 comparison on S1 (sequencer decision 2) is a slice, so it would be priced
and never executed. Not built here: it needs a place in the plan — task-024, a fifth W5 task, or W6.

### Known limits

- **task-023 will need dry runs in every `campaign run` test.** Once a campaign that cannot be
  estimated refuses to start, every test that runs a campaign — unit, acceptance and the docker suite —
  has to store a dry run for each of its keys first (`writeStoredDryRun` is in `test/support/`).
- The estimate is a sum of single dry runs: no variance, and one dry run per key, as decided in
  task-021's Design.

### Review readiness

`npm test` 668/668 (statements 99.8%, branches 96.86%, functions 100%, lines 100%), `npm run test:bin`
4/4, `npm run test:docker` 5/5, `npm run lint` clean, `npm run build` clean; no `bench-*` container
left. `campaign.feature` @F1.2 has its two acceptance tests. Nothing was spent.

### Review and approval

- `npx wingfoil memory submit task-022-cost-estimate` → `a80ce68` (`in-progress → in-review`, one
  commit, only `status` changed). Matches.
- `npx wingfoil memory approve task-022-cost-estimate --reason "…"` → `aa3d6fe`, run by the
  approver (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status` changed). Matches.
- **Model slices:** the approver chose a fifth W5 task to run them (2026-09-28), task-025.
