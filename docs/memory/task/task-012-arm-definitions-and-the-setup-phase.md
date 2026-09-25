---
id: task-012-arm-definitions-and-the-setup-phase
type: task
title: "Arm definitions and the setup phase"
status: in-review
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

Conventions from [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md),
[adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md) and, for everything about arms,
[adr-003](../adr/adr-003-w3-arm-conventions.md). Builds on task-003 (`runner`, the ports), task-005
(`step <NN>` snapshots) and task-006 (the adapter's command lines).

**Classification confirmed**, with the changes below: the criteria stay red-first except the two
characterizations the Context names.

### Two corrections to this task's Context

1. **Where the arm's environment goes.** The Context lays it over the seed *before* the `seed`
   commit. adr-003 decision 10 (approved after this task was planned) puts it **after**: the `seed`
   commit is the same in every arm, and the arm's environment and setup end in a runner commit
   `setup`. Step 01's patch is then taken against `setup`, so it holds only what the agent did.
2. **The fake agent does not learn to replay a setup.** A v0.1 setup is a shell script the runner
   runs in the container; no agent takes part in it (adr-003 decision 11), so there is nothing for
   the fake to replay. The setup's usage fields exist and are zero. The tests drive the setup through
   the Docker double (`exec`) and, in the docker suite, through the real container.

### The arm definition (REQ-FMT-05) — `core` and a new `arms` module

`core/arm.ts` holds the schema of `arms/<arm>/arm.yaml`, strict like the scenario's:

| Field | Type | Meaning |
|---|---|---|
| `name` | string | must equal the directory's name |
| `setup` | relative file | the script the runner runs in the container before step 1 |
| `manual` | relative file | the operating manual; copied as `CLAUDE.md` by task-014, only checked to exist here |
| `environment` | relative directory, optional | files copied into the workspace before the setup |
| `mcp` | relative file, optional | the arm's MCP configuration (JSON) |
| `requires` | string, optional | the harness tool the arm needs; absent for a plain-agent arm |

Every path is relative to the arm's directory, must stay inside it, and must not be a symbolic link
(the seed's rule, task-003). `src/arms/load.ts` (`loadArm(armsRoot, name)`) reads and validates it
and returns absolute paths, with issues reported against `arms/<arm>/arm.yaml` and the field, as the
scenario loader does. `arms` is already a middle module in REQ-ARC-01 and in the lint rule; this task
creates it.

### The campaign check follows `requires` (REQ-FMT-01, dl-003)

`loadCampaign` (module `campaign`) cannot read arm definitions (REQ-ARC-02), so the harness rule
moves out of `campaignConsistency` into a `core` function, `harnessCoverage(campaign, requires)`,
called by `checkCampaign` (module `runner`) once it has loaded every arm the campaign names:

- an arm with no `arms/<arm>/arm.yaml`, or one that does not load, is an issue at `arms[<i>]`;
- an arm whose definition `requires` a tool must have a harness entry, and its `tool` must be that
  tool; an arm that requires none must not have one;
- `HARNESS_FREE_ARMS` is deleted. The baseline rule (T7) stays where it is.

`Campaign` gains `armsRoot` (`arms/` beside `campaigns/`, REQ-ARC-03). `bench campaign validate`
already goes through `checkCampaign`, so it inherits the rule. The messages of the old rule change,
so the unit tests that asserted them are rewritten, not deleted: the three cases they covered
(baseline, baseline-docs, wingfoil) are the characterization.

### The setup phase (REQ-RUN-03, adr-003 decisions 6, 7, 10, 11)

In `executeRun`, between the container's start and step 1:

1. the runner writes the **git identity** into the workspace's own `.git/config` (`user.name
   "Benchmark Approver"`, `user.email approver@benchmark.localhost`), the same in every arm (decision
   7). `GitPort` gains `configureIdentity(directory, name, email)`. The runner's own commits keep
   their fixed identity through `git -c`, which wins over the repository's config, so `seed`, `setup`
   and `step <NN>` are still authored by `WingFoil Benchmark`;
2. it copies the arm's **environment** into the workspace (host side, symbolic links refused);
3. it copies the **arm's directory** into the container at `/home/node/arm/` — outside the workspace,
   so nothing of it reaches a patch — with a new `DockerPort.copyTo(container, source, target)`
   (`docker cp --archive`, so the files keep the `node` owner). If the arm has `mcp`, that file is
   also copied to `/home/node/mcp.json` (decision 12);
4. it runs `bash /home/node/arm/<setup>` in the container (working directory `/workspace`), timing
   it. A non-zero exit fails the run with the script's exit code and the tail of its stderr; the
   campaign goes on (REQ-NFR-03). The setup's output, scrubbed, is stored as `setup/log.txt` in the
   run's output directory;
5. it commits `setup`, **allowing an empty commit**, so that every run has the same shape.

`run.json` gains `setup: { duration_ms, usage, commit }`, where `usage` is a `SessionUsage` of zeros
and `commit` is the `setup` commit's SHA (`GitPort.head(directory)`, new). Nothing of it is added to
any step.

### MCP on both command lines (W2 carry-over, adr-003 decision 12)

`StepRequest` and `ResumeRequest` gain `mcpConfig?: string`, the path of the config inside the
container. The Claude Code adapter adds `--mcp-config <path> --strict-mcp-config` to **both** the
first command line and the resume line when it is set, and nothing when it is not. The runner sets it
for an arm with `mcp`. The fake ignores it; the doubles record it, which is how the runner is tested.

### The three v0.1 arms (REQ-ARC-03)

`arms/baseline/`, `arms/baseline-docs/` and `arms/wingfoil/`, each with an `arm.yaml`, a `setup.sh`
and a placeholder `manual.md` (task-014 writes the manuals). The baseline and baseline-docs setups do
nothing but exit 0; baseline-docs has no `environment` yet (task-015 generates it). The wingfoil arm
declares `requires: wingfoil` and an `mcp.json` pointing at the `wingfoil` wrapper, and its
`setup.sh` fails with a message naming task-013 until task-013 installs WingFoil — a wingfoil run
before then is refused loudly, not run as a baseline in disguise. The test fixtures get arms of their
own under `test/fixtures/arms/`, since their campaigns live in `test/fixtures/campaigns/`.

### Tests

- **Acceptance** (`test/acceptance/runner.test.ts`, fake ports): `@F2.5 Each arm's setup is scripted
  and measured apart from the steps` — the setup's `exec` precedes the first step, `run.json` records
  `setup` and no step carries it. `campaign.feature` @F1.1 @error stays green unchanged.
- **Unit:** the arm schema and loader (every field, the path rules, each error), `harnessCoverage`,
  the setup's order and failure path in the runner, the identity call, `copyTo`, the adapter's flags
  on both lines.
- **Docker** (`test/docker/run.test.ts`): the existing T0 and T1 runs now go through a real setup in
  the baseline arm — a real `docker cp`, a real `bash`, a `setup` commit in the history between `seed`
  and `step 01`, and `.git/config` holding the identity.
- The test support's `writeRepo` writes the arms the campaign names.

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
- The approver's `memory approve` → `8a78c69` (`pending → backlog`, `Approver:`/`Reason:` trailers).
  Matches.
- `npx wingfoil memory submit task-012-arm-definitions-and-the-setup-phase` → `a74d2df`, run in the
  linked worktree `WingFoil2-Benchmark-task-012` with its own `npm ci` (no `node_modules` link).
  Declared: `backlog → in-progress`, one commit. Observed: exit 0, empty stderr, one file, diff limited
  to `status`, on the task branch. Matches.

### Build (TDD, red first at each cycle)

1. **The arm definition** (`b975e8c`). 12 tests red (module missing), then green. One test changed
   before any code: the first draft let an MCP configuration that is not JSON pass, leaving Claude
   Code to find it — at a session already paid for. The loader now parses it and reports
   `'mcp.json' is not valid JSON: …` at the campaign check. The first green run then failed on the
   test fixture itself, which wrote `mcp.json\n` into `mcp.json`: the check caught its own fixture.
2. **Harness coverage from `requires`** (`a83825d`). 11 red, then green. `HARNESS_FREE_ARMS` is gone;
   the three old `loadCampaign` tests of the rule moved to `test/unit/runner/campaign.test.ts`,
   rewritten against `requires` (characterization: baseline, baseline-docs, wingfoil), plus the
   red-first cases the fixed list could not know (a new plain arm with no harness is accepted; a new
   arm that requires a tool needs one; a harness of the wrong tool is refused). `campaign.feature`
   @F1.1 @error stayed green unchanged. The whole suite then failed once, as expected, on
   `bench campaign validate test/fixtures/campaigns/smoke.yaml`: fixture campaigns need arms too, so
   `test/fixtures/arms/baseline/` exists now. The benchmark's own `arms/` got its three arms, and a
   test loads each of them. `4f95498` is the prettier pass the commit before it skipped.
3. **The setup phase and MCP on both lines** (`2b981ac`). 13 red, then green; four earlier tests
   failed on the new shape of a run (the identity, `setup` and `head` calls, the setup's `exec`) and
   were updated to the new exact sequences, not loosened. Two branches were left uncovered and got a
   test each: a nested environment directory with no link, and a setup that fails without a word.
4. **Docker** (`6d471d4`). The W1 and W2 runs now go through a real setup, green at the first run: a
   real `docker cp` of the arm to `/home/node/arm`, the script run as `node` in `/workspace`
   (`setup/log.txt` says so), the identity in `.git/config`, and the history `seed`, `setup`,
   `step 01`, all authored by `WingFoil Benchmark <benchmark@localhost>` — the runner's `-c` identity
   wins over the repository's, as the Design said.

### Deviations from the Design

- **`docker cp` without `--archive`.** The Design said `--archive`, "so the files keep the `node`
  owner". `--archive` keeps the *host's* uid and gid, which is `node`'s only on a host whose user is
  1000. Without it the files belong to root and stay readable, which is all a setup needs of its own
  directory; the docker suite confirms `bash /home/node/arm/setup.sh` runs as `node`.
- **The fixture arm's setup prints instead of leaving a file.** A mark in the container's home cannot
  be read after the run, because the container is removed; the docker suite reads `setup/log.txt`.

### Notes for the next tasks

- `arms/wingfoil/setup.sh` refuses to run (exit 1, naming task-013), so a wingfoil run fails at its
  setup until task-013; `arms/wingfoil/mcp.json` already points at `/home/node/.local/bin/wingfoil`,
  where adr-003 decision 3 puts the wrapper.
- The three `manual.md` files are placeholders for task-014; nothing copies them into the workspace
  yet (REQ-RUN-12 is task-014's).
- baseline-docs has no `environment` yet: task-015 generates it.

### Review readiness

`npm test` 494/494 (statements 100%, branches 98.42%, functions 100%, lines 100%), `npm run test:bin`
4/4, `npm run test:docker` 3/3, `npm run lint` clean; no `bench*` container left.
