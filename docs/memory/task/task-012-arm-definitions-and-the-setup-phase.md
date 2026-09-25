---
id: task-012-arm-definitions-and-the-setup-phase
type: task
title: "Arm definitions and the setup phase"
status: pending
release: v0.1
wave: W3
features: []
acceptance: [runner.feature, campaign.feature]
requirements: [REQ-FMT-05, REQ-RUN-03, REQ-FMT-01, REQ-ARC-03]
---

## Context

Second task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), after the
spike [task-011](task-011-wingfoil-in-the-run-container-spike.md), whose adr-003 it follows. It builds
the arm machinery that task-013, task-014 and task-015 fill: until now an arm is only a name in the
campaign file.

Scope:

- **Arm definitions (REQ-FMT-05, REQ-ARC-03).** `arms/<arm>/arm.yaml` with `name`, `setup`, `manual`,
  `environment`, `mcp` (optional) and `requires`; a schema and a loader in the style of the scenario
  loader, with the error paths reported the same way. The three v0.1 arms get their directories:
  `baseline`, `baseline-docs` and `wingfoil`. Their manuals are placeholders until task-014, and the
  wingfoil arm's setup is completed in task-013.
- **The arm's environment in the workspace.** The `environment` files are laid over the seed before
  the `seed` commit, so that every step's patch shows only what the agent did.
- **The setup phase (REQ-RUN-03).** The arm's setup script runs inside the container before step 1.
  Its wall time, and its Claude Code usage and cost if it has any, are recorded as `setup`, apart from
  the steps (`runner.feature` @F2.5, first scenario). A failing setup ends the run without stopping
  the campaign (REQ-NFR-03).
- **Harness coverage from `requires` (REQ-FMT-01).** The campaign check reads each arm's `requires`
  instead of the fixed list of harness-free arms, which retires the interim rule of
  [dl-003](../decision-log/dl-003-campaign-pins-harness-coverage-seed-and-the-models-shape.md) as it
  planned. An arm with no definition is a validation error.
- **MCP on both command lines.** An arm with `mcp` passes `--mcp-config` and `--strict-mcp-config` on
  the first command line **and on the resume line**, or a resumed session runs without the arm's
  tools (W2 carry-over in rel-v0-1; the resume line is `src/agents/claude-code.ts`).
- The fake agent learns to replay a setup, so that all of this is tested without spending.

**Why `features` is empty.** This task delivers the first of F2.5's two acceptance scenarios; task-015
delivers the second (the baseline-docs generator) and declares F2.5. The repository's traceability
test reads `features` at feature level, so declaring F2.5 here would demand the generator's
acceptance test as soon as this task starts. The acceptance test for "Each arm's setup is scripted and
measured apart from the steps" is written here, under its own title, and already counts when task-015
starts.

Out of scope: building and installing the WingFoil under test (task-013), the manuals' content and
their size (task-014), the baseline-docs content (task-015), cap and budget enforcement (W5).

**Done** means: `runner.feature` @F2.5 "Each arm's setup is scripted and measured apart from the
steps" passes against the fake agent, the campaign check follows `requires`, the resume line carries
the arm's MCP flags; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `runner.feature` @F2.5 "Each arm's setup is scripted and measured apart from the steps" — the setup
  runs before step 1, and its tokens, time and cost are recorded as setup, not as a step.
  **red-first**
- REQ-FMT-05 — an arm definition is loaded and checked; a missing or malformed field is reported with
  its path. **red-first**
- REQ-FMT-01 / dl-003 — harness coverage follows each arm's `requires`: an arm that requires a tool
  needs a harness entry, an arm that requires none must not have one. **characterization** of the
  baseline, baseline-docs and wingfoil cases the interim rule already enforces, then **red-first** for
  an arm the fixed list did not know.
- `campaign.feature` @F1.1 @error "A campaign with an unpinned harness is rejected" — still rejected
  once the rule reads `requires`. **characterization** (task-002's test, kept green across the change)
- REQ-FMT-05 — a campaign naming an arm with no `arms/<arm>/arm.yaml` is rejected. **red-first**
- W2 carry-over — the resume line of an arm with `mcp` carries `--mcp-config` and
  `--strict-mcp-config`. **red-first**
- REQ-NFR-03 — a failing setup ends its run, and the campaign goes on. **red-first** (new path,
  same rule as a failing step)

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `f57933e`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W3 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-012-arm-definitions-and-the-setup-phase` → `dd18ea0`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
