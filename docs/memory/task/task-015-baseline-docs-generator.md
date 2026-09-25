---
id: task-015-baseline-docs-generator
type: task
title: "Baseline-docs generator"
status: approved
release: v0.1
wave: W3
features: [F2.5]
acceptance: [runner.feature]
requirements: [REQ-RUN-11, REQ-FMT-05]
---

## Context

Fifth and last task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It
builds on task-013 (a scenario's `arms/wingfoil/` configuration, applied in the wingfoil arm) and
task-014 (the manuals, so that the baseline-docs `CLAUDE.md` is composed the same way).

Scope, the second half of F2.5:

- **The generator (REQ-RUN-11).** A pure function of the wingfoil arm's configuration and the scenario's
  `arms/wingfoil/` directory
  ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)).
  It renders the same directives, decisions and project description as free-form Markdown, with sorted
  keys and fixed templates, so that two generations are byte-identical. It runs in the runner, outside
  the container; its output becomes the baseline-docs arm's environment for that scenario. No
  hand-editing: parity of information is a property of the generator (experiment design §2, T3).
- **What counts as "the same information".** The design lists every kind of content the wingfoil
  configuration carries, and says for each whether it is rendered or left out, and why. A kind left out
  silently would be an arm asymmetry nobody can see.
- The fixture of task-013 (standing in for S8) is the generator's input in the acceptance test; S8
  itself is W8.

**This task declares F2.5**, although task-012 delivered its first scenario: the traceability test
reads `features` at feature level, so F2.5 is declared by the task that completes it (see task-012's
Context).

**The wave's "Ends with"** — the same scenario runs in the baseline, baseline-docs and wingfoil arms —
is checked once this task is done, as the W3 plan phase decided (task-011, decision 4): with the real
Docker and the fake agent, T1 in the three arms, and one real-agent run in the wingfoil arm with the
approver's consent. The evidence goes into rel-v0-1.

**Done** means: both `runner.feature` @F2.5 scenarios pass against the fake agent; the generator is
deterministic; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `runner.feature` @F2.5 "The baseline-docs environment is generated from the wingfoil arm's
  configuration" — the same directives, decisions and project description as Markdown, and two
  generations byte-identical. **red-first**
- `runner.feature` @F2.5 "Each arm's setup is scripted and measured apart from the steps" — delivered
  by task-012. **characterization**, re-run here because this task declares F2.5.
- REQ-RUN-11 — the output does not depend on the order in which files are read or on the machine it
  runs on. **red-first**

## Design

Follows [adr-003](../adr/adr-003-w3-arm-conventions.md) and
[dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md);
builds on task-013 (the WingFoil under test, a scenario's `arms/wingfoil/`, `arms/wingfoil/setup.sh`)
and task-014 (the baseline-docs manual names `PROJECT_RULES.md`). **Classification confirmed.**

### The input is the wingfoil arm's configuration as the agent meets it, not the overlay alone

The wingfoil agent does not see only the scenario's `arms/wingfoil/`: it sees everything `wingfoil
init --template Kanban` writes (built-in directives, role bindings, workflows), with the scenario's
overlay and the approver member on top. Those files are written by the WingFoil under test, inside the
container; they exist nowhere on the host. A generator reading the overlay alone would give
baseline-docs less than wingfoil gets — the asymmetry T3 exists to prevent.

So the work is split in two, and only the second part is the generator REQ-RUN-11 describes:

1. **A snapshot of the wingfoil configuration, per scenario** (`runner/wingfoil-config.ts`). Once per
   campaign and scenario, the runner runs **the wingfoil arm's own `setup.sh`** in a one-off container
   of the campaign image (`DockerPort.runOnce`), on an empty repository, with the campaign's WingFoil
   artefact and the scenario's `arms/wingfoil/`, and keeps what it leaves under `.wingfoil/` and
   `docs/memory/`. It is the same script, the same WingFoil and the same overlay the wingfoil arm's
   runs get, so the snapshot is the wingfoil arm's configuration byte for byte. `setup.sh` gains
   `WORKSPACE` (default `/workspace`) and puts `$HOME/.local/bin` on its own `PATH`, so it runs with the
   build directory as its home; in a run nothing changes.
2. **The generator** (`arms/baseline-docs.ts`, `renderProjectRules(files)`): a pure function of that
   snapshot, as a map from path to text, returning `PROJECT_RULES.md`.

The snapshot and the generated file are kept in the execution's results,
`results/<campaign-id>/<n>/generated/<scenario>@<version>/{wingfoil/, PROJECT_RULES.md}`, so that what
the baseline-docs arm received is published with the runs. In the setup phase of a baseline-docs run
the runner copies `PROJECT_RULES.md` into the workspace, like an environment file.

**A campaign with a baseline-docs arm must also have a wingfoil arm** (with its harness): there is no
configuration to render otherwise. The campaign check says so at `arms`. It is a rule about the arm
named `baseline-docs`, not a field of `arm.yaml`: v0.1 has one generated arm, and a general mechanism
would be designed for none.

### What counts as "the same information" (T3)

Every kind of content the snapshot holds, and what the generator does with it:

| Content | Rendered? | Why |
|---|---|---|
| `dna.yaml` `project` (name, description, methodology) | yes | the project description `runner.feature` names |
| `dna.yaml` `stacks`, `modules` | yes | the project's technologies and parts |
| `dna.yaml` `team.roles` | no | who does what in WingFoil's process; the baseline-docs agent has no roles |
| `dna.yaml` `team.members` | no | the Benchmark Approver is the approval mechanism of the arm (REQ-RUN-17), not project information |
| `dna.yaml` `paths` | no | query categories for WingFoil's navigation |
| directives bound to `developer`, and the `global` ones (`roles.yaml`) | yes, full text | what the wingfoil manual tells the agent to read (`directives list --role developer`) |
| directives bound only to other roles | no | the wingfoil manual does not send the agent to them either |
| Memory `decision-log` and `adr` elements with `status: approved` | yes, title and body | the decisions to follow; what the manual tells the agent to read |
| Memory elements in any other state, and other types (`task`, `bug`, `release`, …) | no | process state, not rules |
| workflows (`workflows/custom/*.yaml`) | yes: name, description, phases | the "workflow descriptions" of experiment design §2 |
| `memory.yaml`, Memory templates, `workflows.yaml` | no | the tool's own mechanics |

The table is also written as a comment at the top of the generator, next to the code that applies it.

### Determinism (REQ-RUN-11)

Fixed templates; sections in a fixed order; directives by id, Memory elements by id, workflows by
name; YAML read with the benchmark's own `yaml` package and never re-serialized; bodies copied as they
are, with their trailing whitespace normalized to one newline. No clock, no randomness, no dependence
on the order files are listed in. The same snapshot gives the same bytes twice, and in any order of
its entries.

### Fixture

T2's `arms/wingfoil/` gains a `dna.yaml` (the Kanban one, with T2's project name and description): the
scenario's configuration of a real scenario will bring one, and it exercises the member being added
after it (task-013's order). The acceptance test's input is **a snapshot of T2 committed as a fixture**
(`test/fixtures/wingfoil-config/T2/`), taken from a real run of the snapshot step, so the fake-port
test reads real WingFoil output.

### Tests

- **Acceptance** (`runner.feature` @F2.5, the generator): T2's snapshot rendered holds its directives,
  its decision and its project description as Markdown, and twice byte-identical; the setup scenario
  (task-012's) re-run as characterization.
- **Unit:** each row of the table (rendered or left out), order independence, missing sections; the
  snapshot step with doubles (its container, what it keeps, a failing one); the campaign rule; the
  file reaching the baseline-docs workspace and no other.
- **Docker:** T2 in the three arms against the real clone — the wave's "Ends with" with the fake agent:
  the baseline-docs workspace holds `PROJECT_RULES.md` with T2's `no-throw` text and `dl-001`, equal to
  the one kept in the results.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `ec3d21a`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W3 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-015-baseline-docs-generator` → `7300ca2`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- The approver's `memory approve` → `3684373` (`pending → backlog`). Matches.
- `npx wingfoil memory submit task-015-baseline-docs-generator` → `b214074`, in the linked worktree
  with its own `npm ci` (`backlog → in-progress`, one commit, only `status`). Matches.

### A finding of the design phase

The Context described the generator as a function of "the wingfoil arm's configuration and the
scenario's `arms/wingfoil/`". The wingfoil agent sees more than the overlay: everything `wingfoil init
--template Kanban` writes, which exists only inside the container. The design therefore adds a
snapshot step that runs the wingfoil arm's own `setup.sh` in a one-off container, and keeps the
generator pure over that snapshot. baseline-docs gets what wingfoil gets, byte for byte, not a
reconstruction of it.

### Build (TDD)

1. **The generator** (`8683798`). Its 8 tests were red (no module), then green. The edge-case test
   written for coverage found a real rendering bug: a workflow phase written as a plain string came
   out as `****`; it now renders its name.
2. **The snapshot step, the campaign rule, the wiring** (`78ab133`). 5 red, then green. Two earlier
   tests used `baseline` and `baseline-docs` as any two plain arms; the new rule rightly refuses
   baseline-docs without wingfoil, so they use another plain arm. One of my own assertions checked for
   a `.git` the git double never creates; it now checks the git calls instead.
3. **A real snapshot as the acceptance test's input** (`6c87d2e`). Captured by running the built CLI
   on the fixtures against the real clone. **WingFoil's schema caught my fixture twice**: T2's new
   `dna.yaml` gave technologies as strings, then without `category` — `E_VALIDATION
   stacks.technologies.0.category … expected string` — and the wingfoil run failed on the agent's
   first command. Read from `src/dna/schema.ts` at `3df305e`: a technology is `{name, category,
   version?, notes?}`. The generator now renders a technology's version and category too, which is
   project information baseline-docs would otherwise have missed. The snapshot (31 files) and the
   rendered `PROJECT_RULES.md` are committed under `test/fixtures/wingfoil-config/`, protected from
   prettier; the acceptance test compares against both. The first run of the new test failed on my
   own expectation (`####` where a `##` body heading shifted by three becomes `#####`).
4. **Docker** (`5706709`): T2 in the three arms against the real clone.

### What baseline-docs received for T2 (4 598 bytes)

Project (Orders, its description, Kanban, TypeScript, the `orders` module); **7 rules** — the
developer's `code-quality`, `determinism`, `no-throw`, `testing` and the global `doc-versioning`,
`documentation`, `security-secrets`; **1 decision**, T2's `dl-001` (the agent's own `dl-002` is made
during the run, not part of the configuration); **5 workflows**. No trace of the Benchmark Approver.

### W3 "Ends with", the fake-agent half

`npm run test:docker`: **the same scenario, T2, runs in the baseline, baseline-docs and wingfoil
arms** against WingFoil `3df305e` built from the clone, `3 runs completed, 0 failed`, none skipped.
The real-agent run in the wingfoil arm (W3 plan-phase decision 4) is the other half; it needs the
approver's consent and is done once this task is merged.

### Review readiness

`npm test` 550/550 (statements 100%, branches 97.81%, functions 100%, lines 100%), `npm run test:bin`
4/4, `npm run test:docker` 4/4, `npm run lint` clean; no `bench*` container left.

### Review and approval

- `npx wingfoil memory submit task-015-…` → `6d76592` (`in-progress → in-review`, one commit, only
  `status` changed). Matches.
- `npx wingfoil memory approve task-015-… --reason "…"` → `c2ffc22`, run by the approver from the
  worktree (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status` changed). Matches.
