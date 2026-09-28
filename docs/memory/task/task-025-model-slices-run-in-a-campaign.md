---
id: task-025-model-slices-run-in-a-campaign
type: task
title: "Model slices run in a campaign"
status: approved
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

**Classification confirmed**, with one criterion restated (below). Test-first.

### One list of keys for the estimate and the runner

`campaignPlan` (task-021) builds its runs from **`campaignKeys`** (task-022, exported by task-023):
every key — the default model over every scenario × arm, then each slice over its scenarios × arms —
expanded into its repetitions, `r1…r<n>`. The estimate prices the same keys, so the two cannot drift:
a test holds the runner's runs, grouped by key, equal to the estimate's lines with their repetitions.
A campaign without slices yields today's runs in today's order (characterization: the existing runner
tests are unchanged).

### What a slice run is

The same run as any other — image, harnesses, generated environments, approver policy, caps — with the
slice's model as `--model` on the step's first invocation. Its workspace, its output and its container
name already carry the model (REQ-FMT-06: `runs/<scenario>@<ver>/<arm>/<model>/r<k>/`), and its
`run.json` names it.

**Restated criterion — resumes.** The Context's "every agent invocation (first and resumes) names that
model" does not hold as written, on purpose: a resume names no model (adr-002: the resumed session keeps
the model it was started with, seen with Haiku in W2 and with Sonnet 5 in W3). A resume continues the
slice's session, so it runs on the slice's model without being told. The test checks the step's
request, and that resumes carry the step's session.

### Order and the ceiling

Slice runs come after every default-model run, as the campaign file lists them. With task-024's ceiling,
a campaign short of budget loses its slice runs first — the order experiment design §6 wants ("the slice
shrinks … at least one comparable run is always kept" is calibration's sizing, not the runner's).

### Modules

`runner/run.ts` (`campaignPlan`), `runner/estimate.ts` (`campaignKeys` unchanged).

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "Model slices run in a campaign"` → `7e85755`. Declared: one
  commit `wf(task): add <id>`, one new file from the template, `status: draft`, id from
  `task-{n}-{slug}`. Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the
  template. Matches.
- The approver's `memory approve` → `ee4c8e1` (`pending → backlog`). Matches.
- `npx wingfoil memory submit task-025-model-slices-run-in-a-campaign` → `7d9d993` (`draft → pending`,
  one commit, only `status`). Matches (subject without transition: N9).
- Design committed by hand on `task/task-025-model-slices-run-in-a-campaign` (`d68fc6c`), then
  `npx wingfoil memory submit task-025-model-slices-run-in-a-campaign` → `d6abee7`
  (`backlog → in-progress`, one commit, only `status`). Matches. WIP: this task `in-progress`, none
  `in-review`.

### Build (TDD) — `3c98726`

1. **Tests first:** three runner tests — the slice's runs, after the default model's, in order; the
   slice model given to the agent, the run stored under it, a resume continuing the slice's session;
   the runs equal to the estimate's keys and repetitions. **3 red**, then green at the first
   implementation, `campaignPlan` built from `campaignKeys`.
2. Every existing test green unchanged: a campaign without slices runs as before (characterization).

### Deviation from the Design

None; the restated criterion (resumes name no model) is the Design's.

### Known limits

- Cross-model results are stored side by side under their model; keeping them apart in reports (T14)
  is aggregation's, W7.

### Review readiness

`npm test` 703/703 (statements 99.81%, branches 96.99%, functions 100%, lines 100%), `npm run test:bin`
5/5, `npm run test:docker` 6/6, `npm run lint` clean, `npm run build` clean; no `bench-*` container
left. Nothing was spent.

### Review and approval

- `npx wingfoil memory submit task-025-model-slices-run-in-a-campaign` → `086b493`
  (`in-progress → in-review`, one commit, only `status` changed). Matches.
- `npx wingfoil memory approve task-025-model-slices-run-in-a-campaign --reason "…"` → `079293b`,
  run by the approver (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status`
  changed). Matches.
