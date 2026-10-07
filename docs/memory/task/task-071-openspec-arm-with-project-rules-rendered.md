---
id: task-071-openspec-arm-with-project-rules-rendered
type: task
title: "OpenSpec arm with project rules rendered"
status: in-progress
release: v0.2
wave: W13
features: [F7.1]
acceptance:
  - "competitors.feature#A competitor arm runs a scenario under the same rules"
  - "competitors.feature#A scenario's project rules reach every arm without changing the scenario"
requirements: [REQ-FMT-05, REQ-FMT-12, REQ-FMT-14, REQ-RUN-18]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

The OpenSpec arm ([rel-v0-2](../release/rel-v0-2.md), W13, F7.1), as task-066 was Spec Kit's, from task-070's
spike:

- `arms/openspec/`: `arm.yaml` (`requires: openspec`, `telemetry_off: [OPENSPEC_TELEMETRY=0]`, its `provides` from
  the spike), the setup script (REQ-RUN-18: install from the artifact, `openspec init --tools claude --profile core
  --force`), and an operating manual written to the parity rules;
- the harness build: OpenSpec 1.14.0 as an `npm pack` tarball with its dependencies, cached and digested as every
  harness artifact (REQ-FMT-12), with its preflight variable;
- **the rules generator** (REQ-FMT-14): the scenario's rules rendered into OpenSpec's project context, where task-070
  finds it, registered beside Spec Kit's in `RULES_GENERATORS`; the scenario's content hash unchanged.

**No real agent, no spending.** **Done** means: S1–S3 and S8 run in the openspec arm with the fake agent, the rules in
OpenSpec's place, and the two scenarios' `openspec` rows green; the scenario "project rules reach every arm" green for
wingfoil, speckit and openspec (its docs controls with task-072).

## Acceptance criteria

- `competitors.feature#A competitor arm runs a scenario under the same rules` (openspec row). **Red-first.**
- `competitors.feature#A scenario's project rules reach every arm without changing the scenario`. **Red-first**
  (the openspec arm and its generator; the docs controls' half completed by task-072).

## Design

Built on task-070's answers (its Execution notes, and `spikes/task-070/setup.sh`).

### The harness, from the npm registry (REQ-FMT-12, REQ-RUN-14)

Today every harness is built from a local clone at a commit. OpenSpec is published to npm and is pinned by its
version, so the runner gains **registry tools**: `REGISTRY_PACKAGES = { openspec: '@fission-ai/openspec' }` in
`src/runner/harness.ts`.

- **No clone, no commit to resolve.** A registry tool needs no `harnessSources` entry and no preflight variable
  (preflight's table stays as it is). It must be pinned by a released `version`. A `commit` pin is refused, because
  the registry has no commits.
- **The build** runs in the campaign's image, with network, as task-070's B1 did:
  - `npm pack <package>@<version>` (npm checks the registry's integrity itself);
  - `npm install --global --prefix /build/install/openspec` of that tarball;
  - `installed.tgz` is that prefix, packed as `openspec/`. An npm cache alone does not install offline (task-070).
- **The cache** is keyed by the version, `.cache/harnesses/openspec/1.14.0/`. `harness.json` records `version`
  beside the digests, and a cache hit is checked as today. **The artifact's `commit`** for a registry tool is the npm
  tarball's SHA-256, its content's identity. `run.json`'s `harness.commit` and every reader keep a string there.
- **Wording.** REQ-FMT-12 already says "an npm tool's `npm pack`". Requirements 1.28 adds that a registry tool's
  artifact is the registry's tarball and its installed tree, and that its `commit` is the tarball's digest.

### `arms/openspec/` (REQ-FMT-05, REQ-RUN-18)

- `arm.yaml`:
  - `requires: openspec`;
  - `telemetry_off: [OPENSPEC_TELEMETRY=0]`;
  - `provides`: `directive-delivery: true` (the rules reach it in `openspec/config.yaml`, below);
    `memory-lifecycle: false`; `workflow-engine: false` (its CLI checks a change's state, and no engine runs the
    agent); `mcp-tools: false`.
- `setup.sh` is task-070's draft:
  - unpack `~/harness.tgz` into `~/.local`, and link `openspec` into `~/.local/bin`, the agent's PATH;
  - export `OPENSPEC_TELEMETRY=0` itself, for the snapshot's one-off container;
  - run `openspec init --tools claude --profile core --force`.
- `manual.md`: the shared preamble, then "This arm":
  - read `openspec/config.yaml`'s context and follow it;
  - for each request, propose the change (`/opsx:propose`), apply it (`/opsx:apply`), then archive it
    (`/opsx:archive`);
  - OpenSpec keeps its work under `openspec/`.

### The rules generator (REQ-FMT-14)

`RULES_GENERATORS.openspec` writes `openspec/config.yaml`, which init leaves with `schema: spec-driven` and its
optional keys commented out. The generator renders `schema: spec-driven` and **`context:`**: the scenario's
developer directives, each as its title and its body, as task-066's constitution does. The text goes in a YAML block
scalar, through the `yaml` library, so quoting is never by hand.

- The file's header asks to keep general project documentation out of the context. The rules are constraints, so
  they belong there.
- No rules: the generator renders nothing, and init's file stays.
- What it wrote is kept as `generated/config.yaml` with its `generated_sha256`, as Spec Kit's constitution is.

### Tests

- **unit:**
  - the registry build: the script, no git call, the version-keyed cache, a tampered artifact refused, a commit pin
    refused, `run.json`'s harness;
  - the generator: rules, none, YAML-safe text;
  - the arm: it loads, its telemetry and its manual.
- **acceptance:**
  - `competitors.feature#A competitor arm runs a scenario under the same rules`, its openspec row;
  - `#A scenario's project rules reach every arm without changing the scenario`, for wingfoil, speckit and openspec
    and the docs controls that exist (openspec-docs joins with task-072).
- **test:docker:** OpenSpec built from the registry. A campaign with the fake agent installs it, init writes its
  skills, `config.yaml` holds the rules, and `telemetry_off` is recorded.

## Execution notes

- `npx wingfoil memory add --type task --title "OpenSpec arm with project rules rendered"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-071-openspec-arm-with-project-rules-rendered`, `status: draft`. Matches.
