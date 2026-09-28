---
id: task-025-model-slices-run-in-a-campaign
type: task
title: "Model slices run in a campaign"
status: pending
release: v0.1
wave: W5
features: []
acceptance: [campaign.feature]
requirements: [REQ-FMT-01, REQ-FMT-06, REQ-RUN-01]
---

## Context

Fifth task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), added by
the approver on 2026-09-28, after task-022's review found the gap.

**The gap.** A campaign's `models.slices` (REQ-FMT-01: `{model, scenarios, arms, repetitions}`) is
validated since W1 and estimated since task-022, but `runCampaign` runs the default model only.
task-003 left slices to W5 ("slices are W5"), and none of W5's first four tasks runs them. The reference
campaign's Opus 5 comparison on S1 (sequencer decision 2; experiment design §6, threat T14) is a slice:
it would be priced by the estimate and never executed.

Scope:

- **The campaign's plan gains the slices** (task-021's `RunPlan`): after every default-model run, each
  slice's scenarios × arms × repetitions with the slice's model, in the campaign file's order. Each run is
  stored under its own model, which REQ-FMT-06's path already carries
  (`runs/<scenario>@<ver>/<arm>/<model>/r<k>/`), and its `run.json` names that model.
- **The same run in every other respect:** the same image, harnesses, generated environments, approver
  policy and caps; only `--model` differs, on the first invocation and on every resume.
- **What the estimate prices is what runs:** a test holds `estimateCampaign`'s keys and the runner's runs
  to the same list, so that the two cannot drift again.

**Why `features` is empty.** Slices are part of F1.1 (the campaign file, W1), whose acceptance scenario
"A campaign file pins every variable" already declares one; this task makes the runner honour it and
adds no feature. `campaign.feature` stays the acceptance file it is checked against.

**Order in W5 (W5 plan-phase decision 6: a fifth task is the approver's choice, 2026-09-28; the order is
proposed, and confirmed at this task's pending → backlog gate):** after task-023 and task-024, so the
wave's "Ends with" is not delayed; any order works, as the slices touch neither the guard nor the
caps. Cross-model results are reported apart from same-model ones (T14), but that is aggregation, W7.

No real agent runs here: the fake agent stands in, and nothing is spent.

**Done** means: a campaign with a slice runs the slice's runs with its model, stored under that model; the
estimate and the runs cover the same keys; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- REQ-FMT-01 / sequencer decision 2 — a campaign with a slice runs, besides its default-model runs, the
  slice's scenarios × arms × repetitions with the slice's model. **red-first**
- REQ-FMT-06 — each slice run is stored under its model, and its `run.json` and every agent invocation
  (first and resumes) name that model. **red-first**
- The estimate's keys equal the runner's runs, slices included (task-022). **red-first**
- A campaign without slices runs exactly as before. **characterization**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "Model slices run in a campaign"` → `7e85755`. Declared: one
  commit `wf(task): add <id>`, one new file from the template, `status: draft`, id from
  `task-{n}-{slug}`. Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the
  template. Matches.
