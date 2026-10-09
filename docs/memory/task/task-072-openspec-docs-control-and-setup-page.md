---
id: task-072-openspec-docs-control-and-setup-page
type: task
title: "OpenSpec docs control and setup page"
status: approved
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
- `npx wingfoil memory submit task-072-…` (backlog → in-progress), after the Design commit. Declared: moves the task
  to its next state and commits it. Observed: `wf(task): submit task-072-…`, `status: in-progress`. Matches.
- Build (under dl-016, approved on 2026-10-08: by day only niced runs with 2 workers on the touched tests; the full
  suites at night):
  - **Red first:** `test/unit/arms/docs-controls.test.ts`:
    - openspec in the declarations' loop;
    - the copies of baseline-docs' manual and setup, for every docs control;
    - `renderOpenSpecDocs` on task-071's rendered configuration, on none, and its determinism;
    - the arm loads.
  - **Then the code:**
    - `DOCS_GENERATORS.openspec` (kept `openspec/`; render; five declared kinds);
    - `renderOpenSpecDocs`, which parses `config.yaml` with the `yaml` library and moves each heading one level
      down under "Rules";
    - `arms/openspec-docs/`;
    - speckit-docs and openspec-docs now share the "no rules" text.
  - **Acceptance:**
    - "Each harness has its own docs control" gains the openspec row;
    - "A scenario's project rules reach every arm" gains openspec-docs;
    - the snapshot double leaves what OpenSpec's init leaves (task-070's B2).

    These assertions were written after the code and passed at once: a deviation from test-first, the same as in
    task-069 and task-071. The unit tests above were the red ones.
  - **Unit:** the setup page of openspec (telemetry, rules path, docs control, its declaration, no bundle note).
  - **Docker:** `test/docker/openspec.test.ts`'s campaign gains openspec-docs. Its real snapshot runs the arm's setup
    in a one-off container, and its `PROJECT_RULES.md` must hold the rule. Left to the night's run, not run by day.
  - **method.md:** seven arms; openspec-docs in `{#baseline-docs-control}` and in the manuals' links; the
    statements' sources.
- Review round 1 fixes:
  1. **(should-fix) Headings.** `renderOpenSpecDocs` shifted every `#` line, fenced code and subheadings included,
     and uncapped. It now moves only the rules' `## ` titles outside fences: the bodies' headings are already shifted
     by the rules generator. A red test holds openspec-docs **byte-identical to speckit-docs** for the same rules,
     with a subheading and fenced `#` lines.
  2. **(nits)**
     - The start is anchored to a line.
     - A configuration that is not YAML is refused (with its cause) rather than read as having no rules (red test).
     - The `rules:`/`operations:` row's "why" is "absent: the rules generator writes the schema and the context
       only", in line with task-070.
     - The snapshot double is renamed `harnessSetups`, and its `config.yaml` carries init's commented keys.
     - `NO_RULES` is declared above both renderers.

## Review notes

Independent read-only agents reviewed `git diff main...HEAD` against the Design, REQ-RUN-11, REQ-FMT-05 and
REQ-RES-09, and competitors.feature's two scenarios. By day no suite ran (dl-016); the reviewers read and typechecked.

- **Round 1** (the build, before 07b7188): design coverage complete. The kept path and the docker test's paths are right.
  - **Should-fix:** the heading shift touched fenced code and subheadings, and was uncapped, so the control would
    differ from the harness it stands for.
  - **Nits:**
    1. the start was not anchored to a line;
    2. a YAML error was read as no rules;
    3. the `rules:`/`operations:` "why";
    4. the double's name and its `config.yaml`;
    5. `NO_RULES`'s place.
  - All fixed in 07b7188. The should-fix's red test holds openspec-docs byte-identical to speckit-docs.
- **Round 2** (07b7188): every fix verified. Byte-identity holds in general:
  - a body's headings are always at level 4–6 after the rules generator's shift;
  - the fence logic is the same as `shiftHeadings`';
  - the trailing blank lines are trimmed in both;
  - the YAML round trip is exact.

  **Clean.** Three nits were left, each needing malformed or unusual input; the assumption is LF Markdown with
  balanced fences:
  1. trailing spaces on a body heading line are kept by the constitution and stripped by the context (invisible once
     rendered);
  2. an unclosed fence in one rule's body carries into the next rule's title;
  3. CRLF directive files, which `shiftHeadings` already does not handle (pre-existing).
- **For the approver:** the acceptance assertions for openspec and openspec-docs were written after the code
  (Execution notes). The unit tests were the red ones.
- **Suites at 3819b0f**, run on demand on 2026-10-09 at the lowest priority with 2 workers (the 02:00 cron never fired,
  because the PC sleeps at night, so the approver chose on-demand runs). Log in the main checkout's
  `.cache/full-suites/2026-10-09-task-072.txt`:
  - `npm run lint` clean;
  - `npm test` 1389 passed, coverage 98.03 % statements, 90.8 % branches;
  - `test:bin` 8 passed;
  - `test:docker` 22 passed. The openspec-docs control's real snapshot (OpenSpec's setup in a one-off container) gave
    a `PROJECT_RULES.md` holding the rule.
- `npx wingfoil memory submit task-072-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.
