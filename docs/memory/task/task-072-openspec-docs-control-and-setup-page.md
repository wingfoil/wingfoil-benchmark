---
id: task-072-openspec-docs-control-and-setup-page
type: task
title: "OpenSpec docs control and setup page"
status: in-progress
release: v0.2
wave: W13
features: [F7.1]
acceptance:
  - "competitors.feature#Each harness has its own docs control"
requirements: [REQ-RUN-11, REQ-FMT-05, REQ-RES-09]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

OpenSpec's docs control ([rel-v0-2](../release/rel-v0-2.md), W13, F7.1; the approver's answer of 2026-10-05: a
docs control per harness), on task-067's registry:

- an `openspec` entry in `DOCS_GENERATORS`: what it keeps of the openspec arm's configuration as its setup leaves it,
  how it renders the project's rules as `PROJECT_RULES.md`, and its declaration, kind by kind (from task-070's
  answer to "project information or mechanics");
- `arms/openspec-docs/`: `docs_of: openspec`, baseline-docs' manual and setup, byte for byte;
- the setup page `material/setup-openspec.html` follows from task-067's code; its telemetry and bundle notes are
  checked for OpenSpec's.

**No real agent, no spending.** **Done** means: the scenario's `openspec | openspec-docs` row green; W13's arms are
seven, and a campaign with all seven validates and runs with the fake agent.

## Acceptance criteria

- `competitors.feature#Each harness has its own docs control` (openspec row). **Red-first.**

## Design

On task-067's registry (`src/arms/docs-controls.ts`) and task-071's arm and rules generator.

### The docs generator (REQ-RUN-11)

`DOCS_GENERATORS.openspec`:

- **kept:** `openspec/`, the arm's configuration as its setup and rules generator leave it: `config.yaml`, and the
  empty `specs/` and `changes/archive/`.
- **render** (`renderOpenSpecDocs`): `config.yaml`'s `context:`, the scenario's rules as task-071's generator wrote
  them, rendered as `PROJECT_RULES.md` in the same shape as speckit-docs': `# Project rules`, a line, `## Rules`, then
  each rule as `### <title>` with its body. A configuration with no `context:` (no rules in the scenario) renders the
  one-line file saying the project declares no rules beyond its README, as speckit-docs' does.
- **declaration:**

  | Content | Rendered | Why |
  |---|---|---|
  | `config.yaml`'s `context:` | yes | the scenario's rules, which the manual sends the agent to read |
  | `config.yaml`'s `schema:` | no | the tool's own mechanics |
  | per-artifact `rules:` and `operations:` guidance | no | not written by the rules generator; the tool's settings |
  | commands and skills (`.claude/commands/opsx`, `.claude/skills/openspec-*`) | no | the tool's own mechanics: how its process is followed |
  | accepted specs and changes (`openspec/specs`, `openspec/changes`) | no | empty at setup: the agent's own work, not the project's rules |

### `arms/openspec-docs/` (REQ-FMT-05)

`docs_of: openspec`, with baseline-docs' manual and setup byte for byte (task-067's rule). The test that holds the
copies equal covers every docs control.

### The setup page (REQ-RES-09)

`material/setup-openspec.html` follows from task-067's code once a run records openspec's arm digest. It shows the
telemetry setting (`OPENSPEC_TELEMETRY=0`), the rules generator's path and description, and this declaration. The
"Bundle" note stays Spec Kit's only.

### Method page

`{#arms}` becomes seven arms, with openspec-docs; `{#baseline-docs-control}` names openspec-docs;
`{#operating-manuals}` links its manual.

### Tests

The day runs are light (niced, 2 workers, the touched tests); the full suites run at night (dl-016).

- **unit:**
  - the generator, on task-071's rendered configuration, on none, and its determinism;
  - the declaration present for openspec;
  - the arm loads, and its copies of baseline-docs are equal;
  - the setup page for openspec.
- **acceptance:**
  - `competitors.feature#Each harness has its own docs control`, the openspec row, with a double leaving what
    OpenSpec's init and rules generator leave;
  - "A scenario's project rules reach every arm" gains openspec-docs.
- **test:docker:** the openspec test's campaign gains openspec-docs. Its snapshot runs the real setup in a one-off
  container (`HOME=/build`, no environment), and its `PROJECT_RULES.md` holds the scenario's rule.

## Execution notes

- `npx wingfoil memory add --type task --title "OpenSpec docs control and setup page"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-072-openspec-docs-control-and-setup-page`, `status: draft`. Matches.
