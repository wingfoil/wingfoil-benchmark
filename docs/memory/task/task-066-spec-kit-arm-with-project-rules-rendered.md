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
requirements: [REQ-FMT-05, REQ-FMT-14, REQ-RUN-12, REQ-RUN-18]
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
- **As delivered** (the Design, "Which scenarios this task delivers"): the speckit row of the outline and the
  arm-definition errors are this task's; the setup page (REQ-RES-09's setup half, dropped from this task's
  requirements) goes with task-067, and the rules reaching every arm with W13's OpenSpec task, which completes it.
  task-067's Context says so.

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
change. The template is Spec Kit's own state after `init`: in S1–S3 the manual sends the agent to a constitution of
placeholders, as any Spec Kit user starts from; the agent may fill it, which the step's patch shows.

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

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-066-…` → `9e5e076`, in the linked worktree `WingFoil2-Benchmark-task-066` with its
  own `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one
  file, `status` only. Matches.

### Build

1. `def41d4` `test(competitors)`: the two scenarios, red first (`ENOENT … arms/speckit`). `83ad649` fixed the test's
   way of telling the two arms' requests apart (by order; a step request carries no arm).
2. `5ce269f` `feat(arms, runner)`: `docs_of` and `telemetry_off` in the schema and `Arm`; `checkCampaign`'s three
   refusals, naming the arm and the field. (This commit was first made by mistake with a test's message, while a test
   edit had failed; it was reworded with `--amend` before anything else, local and unpushed.)
3. `0251ed2` `feat(arms, runner)`: `arms/speckit/` (arm.yaml, setup.sh from task-065's draft, manual.md); `telemetry_off:
   []` on wingfoil, `docs_of: wingfoil` on baseline-docs; the `speckit` builder (wheel and bundle) and a `.whl` as the
   package; the arm's telemetry settings in its container's environment; `harness.version` and `telemetry_off` in
   `run.json`; `TEST_REGISTER` admits speckit v1.1.0, the fixture's harness arm declares `telemetry_off: []`. Both
   acceptance scenarios green. Three runner unit tests stayed red at this commit and at `5ce269f` (harness arms written
   without `telemetry_off`; the harness record's `version`): they were adapted in `2b88b1e`.
4. `2b88b1e` `feat(cli)`: `BENCH_SPECKIT_REPO` in the preflight's table and purposes; `checkSpending` takes the list of
   tools the execution builds and gives each its clone (tests first, red: 3 failed); README's variables table.
5. `285a040` `feat(runner, arms)`: `renderConstitution` (tests first, red), the runner's `RULES_GENERATORS` (speckit →
   `.specify/memory/constitution.md`) writing the scenario's rules after the setup, keeping `generated/constitution.md`
   and recording `generated_sha256`; the `CLAUDE.md` merge rule, the record keeping the manual's digest and measuring
   the whole file (tests first, red: 2 failed); speckit added to the arm and manual tests.
6. `5f8b708` `test(docker)`: the speckit arm in a real container, run with `BENCH_SPECKIT_REPO` set to the scratchpad's
   clone at v1.1.0: the builder built the bundle (network for the dependencies), the setup installed it offline and
   initialized Spec Kit, T2's rule ("No throw") reached the constitution, and the manual is the agent's `CLAUDE.md`
   (Spec Kit writes none): passed. It skips when the variable is unset, as WingFoil's test skips without its clone.

### Review

- **Round 1** (independent read-only Explore subagent, on `0baff74`): nothing blocking. It inspected every removed
  line (none lost), ran four test files (40/40) and `tsc`, and checked the readers of the new `run.json` fields, the
  site's manual check, wingfoil's runs under the merge rule, the setup against task-065's draft, the builder against
  Spec Kit's air-gapped doc, the constitution against its template, the credential's precedence, and the manual's
  parity with wingfoil's. Findings and outcomes:
  1. should-fix — the task's Context, criteria and requirements still promised the setup page and the rules
     scenario; the hand-off lived only in the Design. **Fixed:** REQ-RES-09 dropped from the requirements, an "as
     delivered" line under the criteria, and task-067's Context records what it receives.
  2. should-fix — the notes put three test adaptations in the wrong commit. **Fixed:** `2b88b1e`, and the two
     earlier commits left them red.
  3. should-fix — promised unit tests were missing. **Fixed:** `docs_of` with `requires`, a bad `NAME=value`, the
     telemetry settings in the container with the runner's variables winning, the builder's script, `checkSpending`
     with two tools.
  4. should-fix — `telemetry_off` could set any variable, the agent's included. **Fixed:** `ANTHROPIC_*`, `CLAUDE_*`
     and `BENCH_*` are refused, naming the setting (a test).
  5. should-fix — the merge rule kept the manual twice when a tool wrote before it. **Fixed:** the manual is taken out
     wherever it lies, and kept once, first (a test).
  6. nit — the constitution took every directive, baseline-docs only the developer's and global ones. **Fixed:** both
     read `developerDirectives`, now exported, so each arm gets the same rules.
  7. nit — single-quoted titles and body headings. **Fixed** by the same reuse: titles read as YAML, headings shifted.
  8. nit — the "no other approval" check reads the arm's files only, and the shared git identity is named "Benchmark
     Approver". **Not changed:** adr-003 decision 7 gives every arm that identity; the setup page (task-067) states it
     carries no authority in a competitor arm.
  9. nit — the bundle's dependencies are resolved at build time. **Fixed in part:** the bundle carries `SHA256SUMS` of
     its wheels; the deviation (uv, resolution at build) is for the setup page.
  10. nit — README lacked the two fields; the template constitution in S1–S3. **Fixed:** README's paragraph and a
      Design sentence; the docker test's skip without `BENCH_SPECKIT_REPO` stays, as WingFoil's.
- **Round 2** (a new independent read-only Explore subagent, on `50e8bf2`): **clean** of blocking and should-fix. It
  checked every removed line, twelve test files (219/219), `tsc` and eslint, and each round-1 outcome (the owned
  variables, the merge on append, prepend, wrap and deletion, the pure refactor of baseline-docs, the heading strip, the
  `SHA256SUMS` harmless to `--find-links`). Four nits, **not changed**: task-067's `requirements` lacks REQ-RES-09
  (left to its own planning, its Context now names it); a tool editing the manual's text in place would leave two
  near copies (no admitted tool writes a `CLAUDE.md`); a `void` line in a test; baseline-docs keeps a heading repeating
  the title, the constitution strips it (a byte change of baseline-docs, left to task-067).
- Final checks on `50e8bf2` with `BENCH_SPECKIT_REPO` set: `npm run lint` clean; `npm test` 86 files, 1323/1323,
  coverage 98.04 % statements, 90.79 % branches; `npm run test:bin` 8/8; `npm run test:docker`: a first run met a
  failure in task-064's image-port test, which listed the first image and met one another test was removing — two suite
  runs were then overlapping; fixed in this branch (it picks an image no test builds), and the Docker suite re-run alone
  passed 21/21, the speckit arm's test included.
