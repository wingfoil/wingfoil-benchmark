---
id: task-067-docs-control-per-harness-and-harness-against-its-control
type: task
title: "Docs control per harness and harness against its control"
status: in-progress
release: v0.2
wave: W12
features: [F7.1]
acceptance:
  - "competitors.feature#Each harness has its own docs control"
  - "competitors.feature#Every harness arm's setup is published"
requirements: [REQ-RUN-11, REQ-FMT-05, REQ-RES-09]
---

## Context

F7.1's docs controls ([rel-v0-2](../release/rel-v0-2.md), W12): the approver chose a docs control per harness at the triage (T3).

**Received from task-066 (2026-10-06):** this task also delivers `competitors.feature`'s "Every harness arm's setup is
published" (REQ-RES-09's setup half: each harness arm's page, which shows what its docs control renders, and states
that the shared git identity carries no approval authority in a competitor arm, and the speckit bundle's resolution
of its dependencies at build time), alongside "Each harness has its own docs control". "A scenario's project rules
reach every arm" waits for W13's OpenSpec arm. List the scenarios in `acceptance` as `competitors.feature#<title>`
(traceability per scenario, task-064).

**Scope:**

- one docs generator per harness (REQ-RUN-11): `baseline-docs` unchanged, `speckit-docs` new (`openspec-docs` comes
  with the OpenSpec arm in W13), each declaring what it renders and why, its output's digest in `run.json`;
- `docs_of` in arm definitions (REQ-FMT-05);
- **each harness compared with its own docs control** in the aggregate (REQ-SCO-14) and on the category pages
  (REQ-RES-03 as amended in 1.26); older aggregates read "not measured".

**No real agent, no spending.** **Done** means: `competitors.feature`'s docs-control outline green for wingfoil and
speckit; W12's "Ends with" ("Spec Kit runs S1–S3 and S8 under the same rules") checked with the fake agent; a
real-agent half decided in W12's plan phase.

## Acceptance criteria

- `competitors.feature` @F7.1 "Each harness has its own docs control" for baseline-docs and speckit-docs.
  **Red-first.**
- The aggregate and the category page hold each harness against its control. **Red-first.**

## Design

### Scope, as the approver split it (chat, 2026-10-06: "Dividere")

This task delivers the **speckit-docs control** (its generator, its arm, `docs_of` honoured by the runner for any
docs control) and the **harness setup pages** received from task-066 (REQ-RES-09's setup half). The comparison of each
harness with its control in the aggregate and on the category pages (REQ-SCO-14, REQ-RES-03) is
[task-068](task-068-each-harness-against-its-own-docs-control.md), W13 (`pending`). The Context's scope bullet on it, and
its acceptance criterion, are therefore not this task's; REQ-SCO-14 and REQ-RES-03 leave this task's requirements,
REQ-RES-09 joins them.

Scenarios (traceability per scenario): **Each harness has its own docs control** — its wingfoil and speckit rows;
openspec's comes with W13's arm — and **Every harness arm's setup is published** — for the harness arms that exist.
Both red-first.

### One docs generator per harness (REQ-RUN-11 as amended)

`src/arms/docs-controls.ts`, a registry by the source arm's tool, each entry a pure function of the source arm's
configuration as captured by running its setup, and of the scenario, with its declaration:

| Tool | Kept from the capture | Renders | Leaves out |
|---|---|---|---|
| wingfoil | `.wingfoil/`, `docs/memory/` | baseline-docs' `renderProjectRules`, unchanged | as today (settings, workflows' mechanics …) |
| speckit | `.specify/memory/` | the constitution's principles — the scenario's rules — as `PROJECT_RULES.md` | skills, templates, scripts, the workflow and its registry, integration and option files (mechanics) |

A constitution still holding `init`'s placeholders (no rules in the scenario) renders as a one-line `PROJECT_RULES.md`
saying the project declares no rules beyond its README, so the docs control's manual never points to a missing file.
Each declaration is data (kind, rendered or not, why), which the setup page publishes.

### The runner, for any docs control

- `prepareProjectRules` snapshots, per scenario, the configuration of every arm a docs control in the campaign names
  (`docs_of`), with that arm's setup, its harness and its scenario overlay; for a tool with a rules generator
  (REQ-FMT-14) it applies the generator to the capture as a run does after its setup. It writes
  `generated/<scenario>/<docs arm>/PROJECT_RULES.md` (the docs arm in the path: two controls would collide).
- A run of a docs control gets its `PROJECT_RULES.md` and records its digest as `generated_sha256` (REQ-RUN-11).
- `checkCampaign`: a docs control's `docs_of` arm must be in the campaign (generalizing today's baseline-docs check,
  its message naming the arm). `scenario dry-run` of a docs control also loads its `docs_of` arm.

### `arms/speckit-docs/` (REQ-FMT-05)

`docs_of: speckit`, no `requires`, a setup that does nothing (as baseline-docs'), and **baseline-docs' manual**,
copied byte for byte (REQ-RUN-11: a docs control gets that manual; a test holds the two equal, and the arm's digest
covers the copy).

### The setup pages (REQ-RES-09's setup half)

`material/setup-<arm>.html` for each harness arm of the execution, from the repository's `arms/<arm>/` as the manual
pages are: its setup script; its `telemetry_off` (or that the tool has none); its manual (linked); its rules generator
(where it writes and what) or that the tool needs none; its docs control and that generator's declaration; and two
statements — the shared git identity ("Benchmark Approver", adr-003 decision 7) carries no approval authority in a
competitor arm, and the speckit bundle resolves its dependencies when it is built (their digests in `SHA256SUMS`).
The method page links them beside the manuals.

### Method page

`{#arms}` and `{#operating-manuals}` name the speckit and speckit-docs arms; `{#baseline-docs-control}` says each
harness has its control, generated the same way; a new `{#setup-pages}` sentence (with its statement in
`method-statements.test.ts`).

### Tests

unit: the two generators and their declarations, `prepareProjectRules` for two controls, the campaign check, the
manual copy, the setup page; acceptance: the two scenarios; the site's file list gains the setup pages; `test:bin`,
`test:docker` (W3's baseline-docs path changes).

## Execution notes

- `npx wingfoil memory add --type task --title "Docs control per harness and harness against its control"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-067-docs-control-per-harness-and-harness-against-its-control`, `status: draft`.
- `npx wingfoil memory submit task-067-… --reason "…"` (backlog → in-progress), in the task's worktree after the
  Design commit. Declared: moves the task to its next state and commits it. Observed: `wf(task): submit
  task-067-docs-control-per-harness-and-harness-against-its-control`, `status: in-progress`; it refuses nothing on
  the worktree's branch.
- Build: red acceptance tests first (7c258fe), then the code (308663f) and the unit tests (d1e35e0).
  - The docs generator registry (`src/arms/docs-controls.ts`) and the rules generators moved to `src/arms/rules.ts`
    so that the runner and the site read the same declarations.
  - `prepareProjectRules` keys its result by docs arm, then scenario; the generated files are under
    `generated/<scenario>/<docs arm>/`, and the W3 docker test and the unit tests follow the new path.
  - A docs control's run records the digest of its `PROJECT_RULES.md` as `generated_sha256`.
  - The test fixture's `baseline-docs` arm now declares `docs_of: wingfoil`, as the repository's does: the
    name-based check it relied on is gone. A campaign check test now keeps the wingfoil arm in the repository and
    out of the campaign, so the loader's own `docs_of` check does not answer first.
  - The setup page shows the setup script HTML-escaped; the acceptance test compares the escaped line.
- `site-content/method.md`: `{#arms}` lists five arms, `{#baseline-docs-control}` says each harness has its
  control, `{#operating-manuals}` links the five manuals, new `{#setup-pages}` (its sources in
  `method-statements.test.ts`).
- task-068 (the comparison, split from this task) was approved into the W13 backlog by the approver meanwhile.
