---
id: task-066-spec-kit-arm-with-project-rules-rendered
type: task
title: "Spec Kit arm with project rules rendered"
status: in-progress
release: v0.2
wave: W12
features: [F7.1]
acceptance:
  - "competitors.feature#A competitor arm runs a scenario under the same rules"
  - "competitors.feature#An arm definition that misses what v0.2 requires is refused"
requirements: [REQ-FMT-05, REQ-FMT-14, REQ-RUN-12, REQ-RUN-18, REQ-RES-09]
---

## Context

F7.1, the Spec Kit arm ([rel-v0-2](../release/rel-v0-2.md), W12), on task-064's groundwork and task-065's answers.

**Scope:**

- `arms/speckit/`: `arm.yaml` (`requires`, `provides`, `telemetry_off`), the setup script (REQ-RUN-18), the operating
  manual written to the parity rules (skills route, no workflow engine, the neutral approver);
- the **rules generator** (REQ-FMT-14): a scenario's project rules rendered into Spec Kit's constitution, outside the
  scenario hash, its output's digest in `run.json`;
- the `CLAUDE.md` merge rule (REQ-RUN-12);
- the arm's setup page (REQ-RES-09, its setup half).

**No real agent, no spending** (the fake agent). **Done** means: `competitors.feature` @F7.1 for speckit green;
W12's "Ends with" is checked after task-067.

## Acceptance criteria

- `competitors.feature` @F7.1: the speckit row of the outline; the rules reaching the arm without changing the
  scenario; the arm's setup published; the arm-definition errors. **Red-first.**

## Design

### Which scenarios this task delivers (traceability per scenario, task-064)

- **A competitor arm runs a scenario under the same rules** — its speckit row; the openspec row joins the same test
  with W13's OpenSpec arm.
- **An arm definition that misses what v0.2 requires is refused** — both halves (`docs_of`, `telemetry_off`).
- Left to the tasks that complete them, as the Context's scope allows no other way: **Each harness has its own docs
  control** and **Every harness arm's setup is published** (the page shows what the docs control renders) go with
  task-067, the docs controls; **A scenario's project rules reach every arm** needs the openspec arm and the docs
  controls, so W13's OpenSpec task lists it. This task builds the Spec Kit half of the rules (REQ-FMT-14), unit-tested.

All red-first: the arm, the fields and the builder do not exist on `main`.

### The arm definition (REQ-FMT-05 as amended)

- `armSchema` gains `docs_of` (an arm name) and `telemetry_off` (a list of `NAME=value` environment settings; `[]`
  states the tool has none). `checkCampaign` refuses, naming the arm and the field: a harness arm (`requires`) without
  `telemetry_off`; a `docs_of` that names no arm under `arms/`; an arm with both `docs_of` and `requires`.
- `arms/wingfoil/arm.yaml` gains `telemetry_off: []` (WingFoil has none); `arms/baseline-docs/arm.yaml` gains
  `docs_of: wingfoil`.
- The runner sets an arm's `telemetry_off` in its container's environment (REQ-RUN-18), beside the credential, and
  records it in `run.json` (`telemetry_off`).

### `arms/speckit/` (REQ-RUN-18, REQ-RUN-12)

- `arm.yaml`: `requires: speckit`, `telemetry_off: []` (Spec Kit v1.1.0 has none: task-065), `provides:
  { directive-delivery: true, memory-lifecycle: false, workflow-engine: false, mcp-tools: false }`.
- `setup.sh`: task-065's draft — the bundle from `~/harness.tgz`, `uv tool install --offline --no-index`, `specify
  init --here --force --integration claude --script sh --ignore-agent-tools`. No approver member, no gate: Spec Kit's
  own gates belong to its workflow engine, which is not used.
- `manual.md`: the common core, then "## This arm": the process through its skills (`/speckit-specify`,
  `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`; `/speckit-clarify` when the request leaves a question), the
  project's rules in `.specify/memory/constitution.md`, never `specify workflow run`. Nothing about approvals: the
  arm has none but the neutral approver's replies, as every arm.
- **The `CLAUDE.md` merge rule** (REQ-RUN-12 as amended), general for every arm: after the setup, if the tool's setup
  changed `CLAUDE.md`, the runner rewrites it as the manual, then `## <tool>` and the tool's content; the size reported
  is the whole file's. Spec Kit writes none (task-065), so the rule is unit-tested with a double.

### The Spec Kit harness (REQ-FMT-12)

- A builder, `speckit`, in `src/runner/harness.ts`: in the campaign image, from `git archive` of the pinned tag, `uv
  build --wheel` and the dependencies downloaded beside it; the package is the tool's wheel, `installed.tgz` the
  bundle, flat (task-065's B1). The cache's package detection accepts a `.whl`.
- `BENCH_SPECKIT_REPO` (a clone of `github/spec-kit`) joins `HARNESS_SOURCE_VARIABLES`; `checkSpending` gives every
  pinned tool's clone, not WingFoil's only.

### The rules generator for Spec Kit (REQ-FMT-14)

A scenario's project rules stay declared once, as the wingfoil arm's directives (`scenarios/<id>/<v>/arms/wingfoil/
.wingfoil/directives/custom/*.md`, dl-005: S8's four). `renderConstitution(directives)` in `src/arms/`, a pure function:
"# Project constitution", then one "### " section per directive, in file-name order, its body unchanged. After the
speckit arm's setup the runner writes it to the workspace's `.specify/memory/constitution.md` (replacing the template
`init` left), keeps a copy in the run's results under `generated/constitution.md`, and records `generated_sha256` in
`run.json`. A scenario without rules leaves the template, and the run records none. The scenario and its hash do not
change.

### Out of this task

The setup page (REQ-RES-09's setup half) goes with task-067, since it shows what the docs control renders.

### Tests

- unit: the schema's two fields and `checkCampaign`'s three refusals; `renderConstitution` (order, determinism, empty);
  the merge rule; the speckit builder's script and the `.whl` package; preflight's table and `checkSpending` for two
  tools; the telemetry settings in the container's environment;
- acceptance: the two scenarios above, the speckit arm run with the fake agent and doubles;
- existing tests that pin the repository's arm list gain `speckit`;
- `test:bin`, `test:docker` (a Docker test of the speckit setup in the real image, from a bundle built once).

## Execution notes

- `npx wingfoil memory add --type task --title "Spec Kit arm with project rules rendered"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-066-spec-kit-arm-with-project-rules-rendered`, `status: draft`.
