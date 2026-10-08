---
id: task-071-openspec-arm-with-project-rules-rendered
type: task
title: "OpenSpec arm with project rules rendered"
status: in-review
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
- `npx wingfoil memory submit task-071-…` (backlog → in-progress), after the Design commit. Declared: moves the task
  to its next state and commits it. Observed: `wf(task): submit task-071-…`, `status: in-progress`. Matches.
- Build:
  - **Red first:** `test/unit/runner/openspec-arm.test.ts`, seven tests:
    - the registry build's script;
    - no git call, and the version-keyed cache;
    - a tampered artifact refused, and a commit pin refused;
    - `run.json`'s harness, its commit the tarball's SHA-256;
    - the rules written into `openspec/config.yaml`'s context, and the case without rules;
    - the telemetry setting.
  - **Then the code:**
    - `src/runner/harness.ts` gains `REGISTRY_PACKAGES`, `registryBuild` and `prepareFromRegistry`. The building
      and storing is factored into `buildInto`, shared with the clone builds, and `fromCache` takes a match
      predicate (by commit, or by version).
    - New `arms/openspec/`, with task-070's setup draft.
    - `src/arms/openspec.ts` holds `renderOpenSpecConfig`, which writes YAML through the `yaml` library as a block
      literal, keeping `schema: spec-driven`. `RULES_GENERATORS.openspec` registers it.
  - `harness.test.ts`'s "no builder" test used openspec as its example of an unbuilt tool. It now uses `unbuilt`,
    with a test register entry. The test register also admits `openspec 1.14.0`.
  - **Acceptance:**
    - The competitor-arm outline now runs both rows, speckit and openspec, in one `it`, because the traceability
      scanner reads literal titles. Its openspec row was written after the code: a deviation from test-first. The
      unit tests above were the red ones.
    - "A scenario's project rules reach every arm without changing the scenario" was red first (traceability).
      It covers wingfoil, speckit and openspec and the two docs controls that exist. openspec-docs joins with
      task-072. Its double applies the scenario's `.wingfoil/` overlay in the wingfoil snapshot, as the real setup
      does, so that baseline-docs renders the scenario's rule.
  - **Docker:** `test/docker/openspec.test.ts` builds OpenSpec from the npm registry for real. A campaign with the fake
    agent installs and initializes it and writes the rule into `config.yaml`; the commit equals the tarball's digest,
    and `telemetry_off` is recorded. It passed on its first run.
  - **Specification and method page:** requirements 1.28 (REQ-FMT-12 for registry tools). method.md: six arms, and
    the openspec manual and setup page linked.
- Review round 1 fixes:
  1. **(should-fix) `transcripts pack` publishes a registry harness.** It looks for an artifact at
     `.cache/harnesses/<tool>/<commit>/`, and a registry tool is cached by its version. It now also looks at
     `<tool>/<version>/` when the run recorded a version and that cache's record names the same commit. Red test
     first; the archive holds `openspec/1.14.0/…`.
  2. **(nits)**
     - The registry build installs without lifecycle scripts (`--ignore-scripts`), as WingFoil's installed tree does.
     - A registry pin must be a released version: one npm would read as a tag is refused.
     - A cached record whose commit is not its tarball's digest is refused, as a tampered one is.
     - The rules' extraction is shared by both generators (`developerRules` in `constitution.ts`).
  3. **Left as is:**
     - The commit pin of a registry tool is refused at run time, after the image builds, like every other harness
       error. An earlier refusal would need the campaign check to know the runner's registry.
     - The openspec context's headings skip a level (the shared shift is three, for the constitution's `###`). The
       Markdown is valid.
- Suites at 82ebc3c:
  - `npm run lint` clean;
  - `npm test` 1382 of 1383 passed. `@F4.8 Directive violations are counted per rule and per step` timed out at
    145 s against its 120 s limit with the machine under load. Run alone afterwards (`nice`, 2 workers), it passed.
    It passed in the earlier full run of this branch too, and this task does not touch scoring;
  - `test:bin` 8 passed;
  - `test:docker` 22 passed, the OpenSpec build from the registry included: a fresh cache, so a real build with
    `--ignore-scripts`. That answers round 2's check that the flag leaves OpenSpec working.
- The approver asked on 2026-10-08 for the heavy suites to load the machine less. From here on, the daytime runs are
  niced and limited to 2 workers, and the full suites run at night (dl-016, pending).
- `npx wingfoil memory submit task-071-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.

## Review notes

Independent read-only agents reviewed `git diff main...HEAD` against the Design, REQ-FMT-05, -12 (1.28), -14 and
REQ-RUN-18, and competitors.feature's two scenarios.

- **Round 1** (0f737f2): design coverage complete. No behaviour change for wingfoil or speckit. `renderOpenSpecConfig`
  was fuzzed and gave valid YAML for every input tried.
  - **Should-fix:** `transcripts pack` could not find a registry harness cached by version, so OpenSpec's artifact
    would never be published.
  - **Nits:**
    1. the commit pin is refused at run time;
    2. lifecycle scripts ran in the build;
    3. a non-release pin was not refused;
    4. the cached commit was not checked against the tarball's digest;
    5. the rule extraction was duplicated, and its headings skip a level.
  - Fixed in 82ebc3c: the should-fix, and nits 2, 3, 4 and the duplication. The run-time refusal and the heading
    level are left as is, with reasons.
- **Round 2** (82ebc3c): every fix verified. `cachedAt` is a no-op when the commit directory exists, and is
  digest-checked when it redirects. No regression. **Clean.**
  - One nit was fixed here: the stale doc comment.
  - The other, whether `--ignore-scripts` keeps OpenSpec working, is answered by the docker run above.
- **For the approver:** the acceptance test's openspec row was written after the code (Execution notes). The unit
  tests were the red ones.

