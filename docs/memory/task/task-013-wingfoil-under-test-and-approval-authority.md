---
id: task-013-wingfoil-under-test-and-approval-authority
type: task
title: "WingFoil under test and approval authority"
status: in-review
release: v0.1
wave: W3
features: [F2.6]
acceptance: [runner.feature]
requirements: [REQ-RUN-14, REQ-RUN-17, REQ-FMT-04, REQ-ARC-03]
---

## Context

Third task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It builds on
task-012 (arm definitions, the setup phase) and follows adr-003, written by the spike
[task-011](task-011-wingfoil-in-the-run-container-spike.md).

Scope of F2.6, and the wingfoil arm's setup:

- **The WingFoil under test (REQ-RUN-14).** The runner builds the tarball of the commit the campaign
  pins (`harnesses.wingfoil`) with `npm pack` from a clean `git archive`, taken from a **configured
  local WingFoil clone**, read-only (W3 plan-phase decision 3). It checks that the commit exists there,
  never takes WingFoil from `vendor/` (the managing WingFoil) or from the host's `PATH`, and records
  the tarball's full commit in `run.json`. Where the tarball is built and cached is adr-003's.
- **The wingfoil arm's setup** installs that tarball in the container, initialises the project, and
  lays the scenario's `arms/wingfoil/` configuration over it
  ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)),
  in the way the spike found valid.
- **Approval authority (REQ-RUN-17), the half W2 left.** The arm's WingFoil configuration declares a
  member "Benchmark Approver" with the `approver` role, and the container's git identity is that
  member. The decision stays the neutral approver's; the agent only executes it. The statement on the
  method page is W11.
- **Requirements 1.5.** REQ-FMT-04 is amended with a scenario's optional `arms/wingfoil/` directory,
  and REQ-ARC-03 gets a note on it, as dl-005 planned. It is a review decision on an approved
  document, recorded with the approver's reason.
- A T-scenario fixture with a small `arms/wingfoil/` configuration stands in for S8 (benchmark
  content, W8), the way T1 stood in for S3 in W2.

Out of scope: the manual that tells the agent how to use WingFoil (task-014); what baseline-docs
generates from the same configuration (task-015).

**Done** means: `runner.feature` @F2.6 passes — with the real Docker, since it is about what the
container holds — and a wingfoil run's container has WingFoil built from the pinned commit, the
scenario's configuration and the Benchmark Approver identity; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.6 "The WingFoil under test is the version pinned by the campaign" — the WingFoil
  in the container is built from `3df305e`, independently of the managing WingFoil. **red-first**
- REQ-RUN-14 error paths — a pinned commit missing from the clone, or no clone configured, fails the
  campaign before any run starts, with a message naming the commit. **red-first**
- REQ-RUN-14 — `run.json` records the tarball's full commit. **red-first**
- REQ-RUN-17 — the container's git identity is the declared Benchmark Approver, and an approval command
  run by the agent is accepted by WingFoil. **red-first**
- dl-005 — the scenario's `arms/wingfoil/` configuration is present in a wingfoil run and absent from
  the other arms. **red-first**

## Design

Follows [adr-003](../adr/adr-003-w3-arm-conventions.md) decisions 1–9 and builds on task-012 (arm
definitions, the setup phase, `DockerPort.copyTo`). **Classification confirmed:** all five criteria
red-first.

### Where the clone comes from (W3 plan-phase decision 3)

`BENCH_WINGFOIL_REPO` names the local WingFoil clone, as `BENCH_FAKE_SCRIPT` names the fake's script:
read by the CLI, reported against the variable's name when missing, and passed to the runner as
`RunnerOptions.harnessSources: { wingfoil: <path> }`. Only a campaign with a harness whose `tool` is
`wingfoil` needs it. The runner reads the clone only through `git rev-parse` and `git archive`, by
SHA, never its working tree or `HEAD` (adr-003 decision 1; task-011 saw `HEAD` move under it).

### Building the WingFoil under test (REQ-RUN-14, adr-003 decisions 1–5) — `runner/harness.ts`

Once per campaign, after the image is built and before the first run, for every harness the campaign
pins:

1. **Resolve** `version` (or `commit`) to the full SHA in the clone: `git rev-parse --verify
   <rev>^{commit}`. Not found → the campaign does not start, with a message naming the commit and the
   clone.
2. **Look in the cache** `<repoRoot>/.cache/harness/wingfoil/<sha>/`: an `installed.tgz` next to a
   `harness.json` (`{ tool, commit, tarball_sha256, installed_sha256 }`) whose digest matches the file
   is reused. `.cache/` is git-ignored.
3. **Otherwise build it**: `git archive --format=tar <sha>` into a fresh build directory, then one
   container of the **campaign's own image** (the pinned `node:22-bookworm` base, adr-003 decision 1),
   as `node`, with that directory as its only mount: `npm ci`, `npm pack`; then the tarball unpacked
   next to the archive's `package-lock.json` and `npm ci --omit=dev --ignore-scripts` (decision 2), the
   commit written to `.wingfoil-commit` inside it, and the result packed as `installed.tgz`. The
   digests go into `harness.json`.

`DockerPort` gains `runOnce({ image, user, mount, command })` (`docker run --rm` with one bind mount);
`GitPort` gains `resolveCommit(repo, rev)` and `archive(repo, sha, file)`. A build container is not a
run container: REQ-RUN-02's single-mount rule is about runs, and this one mounts only its build
directory.

Only `wingfoil` has a builder in v0.1. A harness tool with none fails the campaign before it starts,
naming the tool, rather than running an arm without its harness.

### Installing it and configuring the arm (adr-003 decisions 3, 6, 8, 9; REQ-RUN-17)

In the setup phase of a run whose arm `requires` a tool, the runner copies that tool's `installed.tgz`
into the container at `/home/node/harness.tgz`, next to `/home/node/arm/`. `run.json` gains
`harness: { tool, commit, tarball_sha256, installed_sha256 }` (decision 4).

`arms/wingfoil/setup.sh` then, in the container:

1. unpacks the artefact into `/home/node/wingfoil/` and writes the wrapper
   `/home/node/.local/bin/wingfoil` (`exec node /home/node/wingfoil/dist/cli.js "$@"`). The run image
   puts `/home/node/.local/bin` first on its `PATH` (`ENV` in the Dockerfile), so the agent's shell
   finds `wingfoil` too. It is empty in the other arms, so the change is the same for all;
2. `wingfoil init --template Kanban` (it commits by itself, under the identity task-012 wrote);
3. lays the scenario's `arms/wingfoil/` overlay onto the workspace, if the scenario has one, and
   commits it as `chore(wingfoil): apply the scenario configuration`;
4. adds the member "Benchmark Approver" (`approver@benchmark.localhost`, roles `[approver]`) to
   `.wingfoil/dna.yaml` unless it is already there, with the `js-yaml` WingFoil itself ships, and
   commits `chore(wingfoil): declare the Benchmark Approver`.

**One change to adr-003 decision 8's order:** the member comes *after* the scenario's overlay, not
before. A scenario's configuration may bring its own `dna.yaml` (its project name and description),
which would replace the one holding the member. Adding it last, idempotently, keeps both.

### A scenario's `arms/<arm>/` directory (dl-005, REQ-FMT-04 → requirements 1.6)

The scenario loader reads an optional `arms/<arm>/` directory per arm, beside the seed, with no new
field in `scenario.yaml`: it is found by name, as dl-005 describes it. `Scenario` gains
`armDirs: Record<arm, absolute path>`. The overlap rule grows with it: the seed must not contain an
arm's directory, nor lie in one, and neither may a prompt, since the baseline arm must not receive a
rule (dl-005 consequence, K3). The runner copies `arms/<arm.name>/` of the scenario, if any, to
`/home/node/scenario/` in the container, outside the workspace; only that arm's setup sees it.

Requirements **1.6** amends REQ-FMT-04 with the optional directory and gives REQ-ARC-03 a note, as
dl-005 planned (it said 1.5; task-011 took that number).

### Fixture

**T2** (`test/fixtures/scenarios/T2/1.0/`), standing in for S8: a small seed, two steps, and an
`arms/wingfoil/` overlay with one custom directive bound to `developer` and one approved decision.

### Tests

- **Acceptance, fake ports** — `@F2.6 The WingFoil under test is the version pinned by the campaign`:
  with doubles, the build runs from the clone's archive of the pinned SHA, the run's container gets
  that artefact and nothing from `vendor/`, and `run.json` records the full commit. The part only a
  real container can show is in the docker suite.
- **Unit** — the builder (resolve, cache hit and miss, a missing commit, a missing clone, a tool with
  no builder), the new port methods, the scenario loader's `arms/` and its overlaps, the CLI's
  `BENCH_WINGFOIL_REPO` check, `run.json`'s `harness`.
- **Docker** — `@F2.6` for real, T2 in the wingfoil arm with the fake agent, against the clone in
  `BENCH_WINGFOIL_REPO` (default `../WingFoil2`; the test is skipped, saying why, where there is no
  clone): the WingFoil in the container reports `.wingfoil-commit` = `3df305e…` and resolves to
  `/home/node/.local/bin/wingfoil`; the scenario's directive and decision are there; and a step of the
  fake agent that adds, submits and **approves** a Memory element succeeds, recorded with
  `Approver: Benchmark Approver` (REQ-RUN-17). The same scenario in the baseline arm has no
  `.wingfoil/` at all.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `5fabdee`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W3 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-013-wingfoil-under-test-and-approval-authority` → `09ba006`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- The approver's `memory approve` → `68b8f14` (`pending → backlog`). Matches.
- `npx wingfoil memory submit task-013-wingfoil-under-test-and-approval-authority` → `b9c7e78`, in the
  linked worktree with its own `npm ci` (`backlog → in-progress`, one commit, only `status`). Matches.

### Build (TDD, red first at each cycle)

1. **A scenario's `arms/<arm>/` and the ports a build needs** (`bbc0ca1`). 9 red, then green. The
   traceability test went red at the same time, as it should: F2.6 had started with no acceptance test
   yet. It turned green in cycle 2 as soon as the `@F2.6` title existed.
2. **The builder and its wiring** (`7b7fbee`). 11 red, then green. Six earlier tests then failed
   because an arm that requires WingFoil now needs a clone and a build, which did not exist before:
   the doubles now answer a build the way the real one leaves it and resolve any revision, the
   runner's tests that use the wingfoil arm pass `harnessSources`, and in the CLI the
   `BENCH_WINGFOIL_REPO` check moved after the spending and credential checks, so that a refusal to
   spend is still the first thing said. One expectation grew by the harness copy, kept exact. Four
   error paths got a test each so that `harness.ts` and the ports are fully covered by statements.
3. **The real setup, T2, docker** (`7245ad9`). `arms/wingfoil/setup.sh` installs the artefact behind a
   `wingfoil` wrapper, `init`s, lays T2's configuration over it, declares the approver; the run image
   puts `/home/node/.local/bin` on its `PATH`. The docker test (44 s, of which the build is most) was
   **green at its first run**, so it was shown able to fail: with the member declared under another
   email, the agent's `memory approve` is refused by WingFoil itself (`user not authorized to approve
   type 'decision-log'`) and the test goes red; restored from a copy, green again. It also checked
   that it ran rather than skipped (`skipIf` on the clone).
4. `508a538`: `.cache/` was not git-ignored, although the Design said so. Fixed.
5. **Requirements 1.6** (`679fc9b`): REQ-FMT-04 and a note on REQ-ARC-03, as dl-005 planned. Written
   for the approver's review decision at this task's gate; its commit says it is not yet approved.

### WingFoil under test (declared vs observed), inside the container at `3df305e`

- `wingfoil init --template Kanban`: one commit `chore(wingfoil): initialize .wingfoil/ with the Kanban
  template (P5.1.1)`, authored by the repository's identity (Benchmark Approver). As in task-011 P3.
- `wingfoil memory add --type decision-log` / `submit` / `approve --reason`, run by the fake agent as
  Benchmark Approver: three `wf(decision-log)` commits, the last with `Approver: Benchmark Approver
  <approver@benchmark.localhost> (approver)`. Matches REQ-RUN-17.
- The same `approve` with the member declared under another email: exit 1, `user not authorized to
  approve type 'decision-log'`. Matches task-011 P5.

### Deviations from the Design

- **The build runs as the host's user**, not as `node`, with `HOME` inside the build directory: what
  the build writes into its mount stays the host's to read and remove, whatever its user ids are
  (task-012 met the same question with `docker cp`).
- **The history of a wingfoil run** is `seed`, `init`, `apply the scenario configuration`, `declare
  the Benchmark Approver`, `setup`, then the steps, with the agent's own `wf(...)` commits inside the
  step that made them. The docker test pins it.

### Notes for the next tasks

- The wingfoil manual (task-014) must name `wingfoil`, never `npx wingfoil` (adr-003 decision 3), and
  the approval commands the agent may run after the neutral approver's reply (REQ-RUN-17).
- The baseline-docs generator (task-015) reads the same `arms/wingfoil/` of a scenario: T2's is its
  input.
- `setup.sh` rewrites `dna.yaml` with `js-yaml` when it adds the member, which drops the file's
  comments; the agent sees a comment-free `dna.yaml`. Harmless for v0.1; a verb for members would
  remove it (usage note N33).

### Review readiness

`npm test` 518/518 (statements 100%, branches 98.27%, functions 100%, lines 100%), `npm run test:bin`
4/4, `npm run test:docker` 4/4 (the W3 test ran, against `../WingFoil2` at `3df305e`), `npm run lint`
clean; no `bench*` container left.
