---
id: task-011-wingfoil-in-the-run-container-spike
type: task
title: "WingFoil in the run container spike"
status: in-progress
release: v0.1
wave: W3
features: []
acceptance: []
requirements: [REQ-RUN-14, REQ-RUN-17, REQ-RUN-03, REQ-FMT-05]
---

## Context

First task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). W3 has no
high-uncertainty feature in the sequencer. It still depends on how WingFoil `3df305e` behaves
**inside the run container**, which nothing in the repository has observed yet: every `wingfoil`
command so far ran on the host, against this repository, as the managing WingFoil. The approver asked
for a spike first (W3 plan phase), so that the design of the four delivery tasks rests on observed
behaviour, not on WingFoil's documentation.

It is a **knowledge task**: it adds no behaviour and no code under `src/`. Its probes are throwaway
scripts under `spikes/task-011/`, as task-004's were.

**Its `features` and `acceptance` are empty on purpose**, as in task-004: the traceability test reads
`features` as "this task delivers these", and this task delivers none of F2.5, F2.6 or F2.7.

### Questions to answer

1. **Building the WingFoil under test (REQ-RUN-14).** Does `npm pack` on a clean `git archive` of
   `3df305e`, taken from the local WingFoil clone, give an installable tarball, or does the package
   need a build step first? How long does it take, how large is it, and is its `sha256` the same on a
   second build?
2. **Installing it in the run image.** In `node:22-bookworm` as user `node`: global or
   workspace-local install, what the install downloads (dependencies need the network, which is
   allowed: experiment-design decision 4), how long it takes, and whether `npx wingfoil` then
   resolves to that build and nothing else.
3. **Initialising a project without a terminal.** `wingfoil init` in a workspace that already has the
   runner's `seed` commit: which files it writes, whether it commits, whether it prompts, and how its
   commits sit in the history the runner scores (`seed`, `step <NN>`, REQ-RUN-05).
4. **The scenario's configuration ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)).**
   Which files hold the DNA, the directives and the Memory decisions in `3df305e`. Can a prepared
   directory be copied in as it is, or must parts of it go through `wingfoil` commands to be valid?
   The answer fixes the layout of `scenarios/<id>/<version>/arms/wingfoil/`.
5. **Approval authority (REQ-RUN-17).** How `3df305e` declares a member and its role, how it maps the
   git identity to a member, and whether an agent committing as "Benchmark Approver" can run
   `memory approve` and `memory reject`.
6. **The MCP server.** The command that starts it, the `--mcp-config` JSON Claude Code needs, and
   whether it starts in the container with no terminal attached.
7. **With a real session (see spending below).** With `--setting-sources project`, is the workspace's
   `CLAUDE.md` loaded (REQ-RUN-12 relies on it)? Do the WingFoil MCP tools appear in the session's
   `init` event? Are `--mcp-config` and `--strict-mcp-config` accepted on `--resume` (the W2 carry-over
   in rel-v0-1)?

### W3 plan-phase decisions (accepted by the approver, 2026-09-25)

Recorded here because they shape the whole wave.

1. **Four delivery tasks, after this spike:** task-012 arm definitions and the setup phase, task-013
   WingFoil under test and approval authority, task-014 operating manuals, task-015 the baseline-docs
   generator.
2. **A scenario's project rules live in the scenario, in WingFoil's format**
   ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)).
3. **The runner reads the WingFoil source from a configured local clone**, read-only. It verifies that
   the pinned commit exists there and records the full SHA in `run.json`. Nothing is written into the
   WingFoil repository.
4. **W3's "Ends with" is verified with the real Docker and the fake agent**, as in W2 (T1 in the three
   arms, with the wingfoil arm really installing WingFoil `3df305e`), **plus one real-agent run** in
   the wingfoil arm. That run also covers the W2 carry-overs listed in rel-v0-1: a resumed Sonnet 5
   session stays on Sonnet, and what `--max-budget-usd` compares against on a resume. It needs the
   approver's explicit consent when it is run (plan-003 constraint).

**Spending, proposed and to be confirmed at this task's pending → backlog gate:** questions 1–6 need
no agent and spend nothing. Question 7 needs one short real session on the maintainer's subscription,
**up to about 0.50 € equivalent**. If the approver does not accept it, question 7 moves to the wave's
real-agent run, and task-012 and task-014 are designed on the documented behaviour, marked as
unverified.

### Produces

- **adr-003**, the W3 arm conventions: what this spike found, and the design defaults of the wave
  (where the tarball is built and cached, how the arm's setup is recorded, the layout of
  `arms/wingfoil/` in a scenario);
- the answers to questions 1–7 in the Execution notes, each with the command that was run and what it
  printed;
- if something observed departs from the specification, an amendment proposal for the approver,
  never a silent deviation;
- WingFoil friction as numbered notes in the usage-notes inbox.

**Done** means: the questions are answered with evidence, adr-003 is written, the spending (if any)
is reported, and no credential reached the workspace, the logs or this repository.

## Acceptance criteria

No Gherkin criterion and no classification: this task adds no behaviour. Its exit criteria are the
seven questions above.

## Design

The protocol below is written before anything is run, as task-004's was, so that what was probed and
what it cost can be read back against what was planned. **Nothing here has been executed yet.**

### What a read-only look at `3df305e` already shows

Read with `git -C ../WingFoil2 show 3df305e:<path>`, nothing written. Each point sharpens a question
rather than answering it; the probes still have to observe it.

- **The tarball needs a build.** `package.json` ships only `dist/` and `README.md` (`files`), and
  `prepack` runs `npm run build` (`tsc`). `npm pack` on a clean `git archive` therefore needs
  `npm ci` first, with the dev dependencies (TypeScript). The build needs the network and a Node
  runtime, and *which* Node builds it is part of what the tarball is (question 1).
- **The installed dependencies are not pinned by the tarball.** `npm pack` does not include
  `package-lock.json`, and the six runtime dependencies are `^` ranges (`@anthropic-ai/sdk`,
  `@modelcontextprotocol/sdk`, `chalk`, `commander`, `js-yaml`, `zod`). Installing the tarball resolves
  them on the day of the run, so two runs of the same campaign could exercise different code. That
  would break the determinism directive and REQ-NFR-02, so question 2 now asks how to install with the
  lockfile's versions.
- **`init` without a terminal needs `--template`.** `src/cli/init-command.ts`: with no TTY or with
  `--no-interactive`, a missing `--template` exits 2 (question 3).
- **Approval authority is keyed on the git email.** `src/core/approval-authority.ts`: a
  `dna.yaml` `team.members[]` entry whose `email` matches `git config user.email` (case-insensitive)
  and whose `roles` include `approver` may approve. `team.agents[].approval_authority` is documented
  as a governance fact, not checked (question 5).
- **There is an `mcp` command** (`src/cli/mcp-command.ts`, `src/mcp/server.ts`), with a read-only
  mode (`src/mcp/read-only.ts`) the probe must look at (question 6).

### Rules the protocol holds to

- **No production code.** Nothing under `src/`, `test/`, `docker/` or `arms/` changes. A probe that
  shows the run image or the runner needs a change produces a finding for task-012 or task-013, not an
  edit here.
- **Probes committed, output not.** One shell script per probe under `spikes/task-011/`, sharing a
  `lib.sh`; `spikes/task-011/out/` is already ignored by `spikes/*/out/`. Only P7 spends, and it
  refuses to run without `BENCH_SPIKE_CONFIRM=1`, as in task-004.
- **The WingFoil repository is only read.** The only command run against it is
  `git -C ../WingFoil2 archive 3df305e` (and `rev-parse` to resolve the full SHA). Its `git status`
  and `HEAD` are recorded before P1 and after P6 and must be identical (W3 plan-phase decision 3).
- **The build runs in the run image's base, not on the host.** The run image's `FROM` (the pinned
  `node:22-bookworm` digest) is the one Node the benchmark controls. P1 also builds once on the host,
  only to compare the two.
- **Nothing installed lands in the workspace.** WingFoil is installed outside `/workspace`, so a
  step's patch never contains it. The workspace keeps its single bind mount (REQ-RUN-02).
- **Every `wingfoil` command gets its declared-vs-observed note**, including those run *inside* the
  container against the WingFoil under test, marked as such so they are not confused with the managing
  WingFoil. Friction goes to the usage-notes inbox.
- **Credentials as in adr-002:** the long-lived token enters P7's container as an environment variable
  on each `exec`, never as a mount or a file. P8 scans everything recorded before any of it is quoted.

### Cost, and where it stops

The approver authorised **up to about 0.50 €** for question 7 (task-011 approval, `e769c71`). The
spike's own ceiling is **0.50 USD**, summed from the `total_cost_usd` the sessions report: at any
plausible rate that is at or below 0.50 €, so it errs on the side of spending less. On the subscription
that figure is the API-equivalent cost, not a charge (sequencer decision 1). The sum is checked before
every session; on reaching it the spike stops, and what is left of question 7 moves to the wave's
real-agent run, as the task's Context says.

The sessions test plumbing, not the model, so they run on **Haiku 4.5** (`claude-haiku-4-5`), with the
agent version adr-002 pinned. Whether a resumed **Sonnet** session stays on Sonnet is the W2
carry-over assigned to the wave's real-agent run, not to this spike.

### Probes

| # | Question | What it runs | Cost |
|---|---|---|---|
| P0 | — | Resolve `3df305e` to its full SHA in the clone; record the clone's `HEAD` and `git status --porcelain`. Build the run image twice: `AGENT_NAME=fake` (P1–P6) and `AGENT_NAME=claude-code` (P7). | none |
| P1 | 1 | `git archive 3df305e` → a temp directory; in a container of the pinned `node:22-bookworm`: `npm ci`, then `npm pack`. Twice, in two fresh containers: time, size, `sha256` of each tarball. Once more on the host. The three digests are compared with each other and with `vendor/wingfoil-0.2-pre-3df305e.tgz` (built from the same commit), for information only: REQ-RUN-14 never *uses* the vendored one. | none |
| P2 | 2 | In the run image as `node`, three installs, each outside `/workspace`: **(a)** `npm install --prefix <dir> <tarball>`, where dependencies float; **(b)** the archive's `package.json` + `package-lock.json` with `npm ci --omit=dev`, plus the built `dist/`, where dependencies are pinned by the lock; **(c)** whatever (b) needs to become a single artefact the runner can cache per commit. For each: time, network fetches, `npm ls --all --json` diffed against the lock, and which binary `npx wingfoil` and `wingfoil` resolve to on the `PATH`. | none |
| P3 | 3 | A workspace made the way the runner makes it (seed, `seed` commit, benchmark git identity). Then `wingfoil init --template <t> --no-interactive` with stdin closed, for the template(s) `3df305e` offers: exit code, files written, whether it commits and under which identity, `git log` afterwards. | none |
| P4 | 4 | Locate the DNA, directive and Memory files `init` produced. Then write a small prepared configuration (one DNA field, one directive bound to `developer`, one decision-log element) two ways: copied in as files, and created through `wingfoil dna set`, `directive create`/`assign` and `memory add`/`submit`. For both, WingFoil must read it back the same (`dna`, `directive list`, `memory search`, and `memory history` for the element). The layout that survives the copy fixes `arms/wingfoil/` (dl-005). | none |
| P5 | 5 | Add a member "Benchmark Approver" with the `approver` role to `dna.yaml`; set the container's git identity to that member; add a task, submit it, approve it with `--reason`. Then the same approve under a different email must be refused with `user not authorized to approve type 'task'`. `memory history` shows who approved. | none |
| P6 | 6 | Start `wingfoil mcp` in the container with no TTY; drive it over stdio with a scripted `initialize` and `tools/list` (and `prompts/list`); record the tools, whether any is read-only by default, and how it stops. Write the `--mcp-config` JSON that P7 uses. Record the clone's `HEAD` and status again (must match P0). | none |
| P7 | 7 | **Spends.** A workspace with a `CLAUDE.md` that asks for a fixed, otherwise unguessable codeword in the reply, and the P6 MCP config. **P7a:** one session with the REQ-RUN-04 command line, `--setting-sources project`, `--mcp-config <file> --strict-mcp-config`: does the reply carry the codeword, and does the `init` event list the WingFoil server and its tools? **P7b:** `--resume` of that session with the same two MCP flags: accepted, and are the tools still listed? **P7c**, only if P7b is refused: the resume without them, to see whether the tools persist anyway. | ~0.05 $ |
| P8 | — | No session: the secret scan of everything P7 recorded, by digest, as in task-004's P8. | none |

The estimate is under 0.10 $, well below the ceiling. The ceiling is there for the case the estimate is
wrong.

### Open risks the protocol admits

- **The build may not be reproducible.** If P1's two container digests differ, a tarball is not
  identified by its commit alone. adr-003 then records the tarball's own `sha256` in `run.json` next to
  the commit, and the question of a reproducible build goes to the approver as a proposal to amend
  REQ-RUN-14, not as a workaround.
- **Pinned dependencies may not fit REQ-RUN-14 as written**, which says "installs WingFoil from a
  tarball". If only install (b) pins the dependencies, the artefact the runner builds is more than a
  tarball, and that is an amendment for the approver to decide.
- **The copied configuration may not be valid as files.** If WingFoil only accepts some of it through
  its commands (for example Memory with a history), the wingfoil arm's setup has to *replay* commands
  rather than copy files. That changes dl-005's "exact layout" into a script, and is reported as a
  consequence of dl-005, not decided here.

### What the spike produces

- **adr-003**, the W3 arm conventions: what P0–P8 found, and the defaults of the wave: where and how
  the WingFoil under test is built and cached, how it is installed with pinned dependencies, how
  `init` and the scenario's configuration are applied, the approver member and git identity, the MCP
  config and its flags on both command lines, and how the setup is recorded.
- The layout of a scenario's `arms/wingfoil/`, recorded in adr-003 as dl-005 asked.
- Amendment proposals where the observed behaviour departs from REQ-RUN-14, REQ-RUN-12 or REQ-RUN-17.
- WingFoil friction as numbered notes in the usage-notes inbox.

### Review

This task has no tests of its own, so its review is: the seven questions answered with evidence, the
WingFoil clone untouched (P0 and P6 match), no secret anywhere in the repository or in the notes,
adr-003 written, the spending reported, and `npm test`, `npm run test:bin`, `npm run test:docker` and
`npm run lint` still green at HEAD.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `e69cce2`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W3 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-011-wingfoil-in-the-run-container-spike` → `064e519`. Declared: `draft → pending`,
  required fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed:
  exit 0, empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject
  without transition: N9).
- The same two commands on dl-005 (plan-phase decision 2): `memory add --type decision-log` →
  `1085158`, `memory submit` → `d1dbed9`, `draft → pending`. Observed as declared, as above. Its id
  is derived from the whole title, 92 characters long; nothing shortens it.
- `npx wingfoil memory submit task-011-wingfoil-in-the-run-container-spike` (run from the linked
  worktree `WingFoil2-Benchmark-task-011` with the main checkout's binary, no `node_modules` link) →
  `a5a4054` on the task branch. Declared: `backlog → in-progress`, one commit. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status`, and the commit landed on the worktree's branch, not on
  main (main stayed at `3684373`). Matches: WingFoil resolves the project from the working directory.

- adr-003 and bug-006, from the worktree: `memory add --type adr` → `8152d81`, `memory submit` →
  `380b594` (`draft → pending`); `memory add --type bug` → `92a9ce6`, `memory submit` → `ce7c893`
  (`draft → pending`). Each: exit 0, empty stderr, one commit, one file; the add from the template, the
  submit's diff limited to `status`. Matches. Bodies committed by hand before each submit (N13).

### Deviation from the Design: the clone's `HEAD` moves under us

The Design asked for the WingFoil clone's `HEAD` and `git status` to be identical before P1 and after
P6. `HEAD` was not: `98871b8` at P0, `5eb60d4` at P6, because another session ("DEV v0.2 - Wave2") was
committing in that repository while the spike ran. `git status --porcelain` hashed the same
(`a621789c…`, clean) both times. What proves the clone was only read is therefore the scripts
themselves: `lib.sh` runs `git -C "$WINGFOIL_REPO"` with `rev-parse`, `archive` and `status` only. It is
also a fact for task-013: the configured clone is a *live* repository, so the runner must read the
pinned commit by SHA (as `git archive <sha>` does) and never its working tree or `HEAD`.

### Answers (probes P0–P8, 2026-09-25)

Scripts in `spikes/task-011/`, output in its git-ignored `out/`. Every `wingfoil` command in P3–P7 ran
**inside the container, against the WingFoil under test** (`3df305e` via the P2 (c) artefact), not
against the managing WingFoil.

**P0 — pins.** `3df305e` → `3df305ea198d7e2ca0da73bfb12b14af865e9922`. Run image built with
`AGENT_NAME=fake`; the base is `node:22-bookworm@sha256:dd5847a0…`.

**Q1 (P1) — the build is reproducible, byte for byte.** `git archive 3df305e`, then `npm ci` and
`npm pack` (whose `prepack` runs `tsc`): twice in fresh containers of the pinned base (Node 22.23.2,
npm 10.9.8; 8.9 s and 6.7 s) and once on the host (Node 22.21.0; 4.5 s). All three tarballs, and
`vendor/wingfoil-0.2-pre-3df305e.tgz` built earlier from the same commit, have the same SHA-256
(`a1939e10c77441c6…`) and size (315 974 bytes). So a commit identifies its tarball, and the Design's
first open risk did not materialise. The consequence worth stating: the WingFoil under test and the
managing WingFoil are today *the same bytes*. REQ-RUN-14's independence is about provenance and path,
and task-013 has to prove it that way (built from the clone, installed outside `vendor/` and the
host's `PATH`), not by a difference in content.

**Q2 (P2) — installing the tarball alone does not pin WingFoil's dependencies; the lockfile does.**

| Install, as `node`, outside `/workspace` | Time | Against `package-lock.json` at `3df305e` |
|---|---|---|
| (a) `npm install --prefix ~/wf <tarball>` | 11.8 s | 111 packages, **17 at another version** (e.g. `@modelcontextprotocol/sdk` 1.30.1 vs 1.29.0, `@hono/node-server` 2.1.1 vs 1.19.14), 1 not in the lock |
| (b) tarball unpacked + the archive's lockfile, `npm ci --omit=dev --ignore-scripts` | 11.2 s | 109 of 109 runtime entries, **0 differ** |
| (c) (b) packed once (5.2 MB), then only unpacked in the run container, `--network none` | ~3 s | as (b); `wingfoil --version` → `0.1.0` with no network |

(a) is what REQ-RUN-14's wording ("installs WingFoil from a tarball") gives, and it would let two runs
of one campaign exercise different code — in the MCP SDK among others. (b)/(c) pin it. `dist/cli.js` is
not executable in the tarball (mode 644), so (c) needs a small `wingfoil` wrapper on the `PATH`
(`exec node …/dist/cli.js "$@"`); `npm install` makes that shim itself in (a).

`npx wingfoil` does **not** resolve to the wrapper on the `PATH`: `npx --no-install wingfoil` went to
the registry (`EAI_AGAIN` with no network; 72 s of the (c) timing is that wait). Today `wingfoil` is
not on npm (`npm view wingfoil` → E404), so with the network `npx wingfoil` would fail; the day WingFoil
is published, it would silently fetch a *registry release* instead of the pinned commit. The arm's setup
and its manual must call `wingfoil`, never `npx wingfoil`.

**Q3 (P3) — `init` needs `--template` and a git identity in the repository's config, and commits.**

- With stdin closed and no `--template`: `error: missing required argument: --template`, exit 2, nothing
  written. `init --help` does not list the templates; the source does: `Scrum` (default) and `Kanban`
  (usage note N30).
- With the identity the runner uses today — environment only (`GIT_AUTHOR_*`, `GIT_CONFIG_GLOBAL=/dev/null`,
  no `user.email` in any config): `error: git identity not configured (user.name/user.email)`, exit 1,
  nothing written, for both templates. WingFoil reads `git config`, not the environment.
- With `user.name`/`user.email` in the workspace's own `.git/config`: exit 0, 27 files under
  `.wingfoil/` (6 built-in and 4 custom directives, `dna.yaml`, `memory.yaml`, 7 Memory templates,
  `roles.yaml`, `workflows.yaml`, 5 workflows), and **one commit of its own**,
  `chore(wingfoil): initialize .wingfoil/ with the Kanban template (P5.1.1)`, working tree clean. The
  history becomes `seed`, `chore(wingfoil): …`, then the steps: the setup adds commits between the seed
  and step 01, which adr-003 has to place.

**Q4 (P4) — a scenario's configuration can be copied in as files; only its history differs.**
DNA lives in `.wingfoil/dna.yaml`, directive bodies in `.wingfoil/directives/{built-in,custom}/*.md`,
role bindings in `.wingfoil/roles.yaml`, Memory in `docs/memory/<type>/<id>.md` (`memory.yaml` `path:`).
Workspace A built a small configuration by commands: `dna set project.name` / `project.description`,
`directive create --name no-throw`, `directive assign --directive no-throw --role developer`,
`memory add --type decision-log` → `submit` → `approve --reason`, all exit 0. Workspace B got the
same `.wingfoil/` and `docs/` as files (a `git archive` of A) in one hand-made commit. WingFoil read
both back the same: `dna show project`, `directives list` and `memory search --type decision-log` are
identical. Only `memory history` differs: in A each element has `add`, `submit` and an `approve` naming
the approver and the reason; in B the one commit shows `operation: null`, `to: approved`,
`approver: null`. So the layout of `arms/wingfoil/` is simply the paths above; whether the setup
**copies** it (fast, history-less) or **replays** it through commands (a real audit trail in the
container) is a choice for adr-003, not something WingFoil forces.

**Q5 (P5) — approval authority works as REQ-RUN-17 needs, keyed on `git config user.email`.**
`dna set` writes string leaves only (`dna show team.members` → `no DNA key named 'team.members'`;
there is no verb that adds a member), so the member is written into `dna.yaml` and committed by hand
(usage note N33): `team.members: [{name: Benchmark Approver, email: approver@benchmark.localhost,
roles: [approver]}]`. Then, with `git config user.email approver@benchmark.localhost`: `memory approve`
→ exit 0, commit body `Approver: Benchmark Approver <approver@benchmark.localhost> (approver)` and the
reason. With `user.email benchmark@localhost`: `error: user not authorized to approve type
'decision-log'`, exit 1. With the identity in the environment only: `git identity not configured`,
exit 1. The email match is case-insensitive (`APPROVER@…` accepted).

One trap, seen because the probe container carried the runner's `GIT_AUTHOR_*`/`GIT_COMMITTER_*`
variables: the approval commits were *authored* by `WingFoil Benchmark <benchmark@localhost>` while
their body named Benchmark Approver as approver. The commit's author comes from the environment,
WingFoil's check and record from `git config` (usage note N32). The runner does not pass those
variables into the container today (its own commits use `git -c` on the host side), and adr-003 must
keep it that way.

**Q6 (P6) — `wingfoil mcp` has no Tools at `3df305e`: Resources and Prompts only.** Started over stdio
with no TTY, it answers in 0.3 s: `serverInfo {name: wingfoil, version: 0.1.0}`, capabilities
`resources, prompts`. `tools/list` → `-32601 Method not found`. Prompts (7): `developer-session`,
`reviewer-session`, `qa-session`, `architect-session`, `product-owner-session`, `tech-lead-session`,
`approver-session`. Resources: `wingfoil://dna`, `wingfoil://workflows`; templates
`wingfoil://memory/{type}`, `wingfoil://memory/{type}/{id}`, `wingfoil://dna/{section}`,
`wingfoil://workflows/{name}`. It is deliberate: `src/mcp/server.ts` at `3df305e` says
`createMcpServer` "deliberately does NOT call `registerCoreModules`", Tools being a later work item
(P5.2.3). **This contradicts K5** ([scenarios/README.md](../../02_specification/scenarios/README.md)),
which lists "mutating MCP Tools" among what `3df305e` adds; an amendment is proposed below. For the
wave it means the agent *acts* through the CLI and *reads* through MCP (usage note N31).
The config Claude Code needs: `{"mcpServers": {"wingfoil": {"type": "stdio", "command": "<path to the
wingfoil wrapper>", "args": ["mcp"]}}}`.

**Q7 (P7, spent 0.040 USD) — `CLAUDE.md` is loaded, the server connects, and the MCP flags work on a
resume.** Claude Code 2.1.280, `claude-haiku-4-5`, token in `ANTHROPIC_AUTH_TOKEN` per adr-002.

- **P7a**, REQ-RUN-04 line plus `--mcp-config /home/node/mcp.json --strict-mcp-config`: the `init` event
  lists `mcp_servers: [{name: wingfoil, status: connected}]`, the tools `ListMcpResourcesTool`,
  `ReadMcpResourceDirTool`, `ReadMcpResourceTool`, and the seven prompts as slash commands
  `mcp__wingfoil__<role>-session`. The reply began with the codeword from `CLAUDE.md`
  (`PELICAN-7342`), so **`--setting-sources project` loads the workspace's `CLAUDE.md`** (REQ-RUN-12
  holds as written). 0.0130 USD.
- **P7b**, `--resume <id>` with the same two MCP flags: accepted; the server connected again, and the
  agent read `wingfoil://dna` and answered `PELICAN-7342: Kanban`, the right value. 0.0273 USD. P7c
  was not needed.
- The `init` event also names `memory_paths.auto = /home/node/.claude/projects/-workspace/memory/`:
  Claude Code's auto-memory, in the container's home, outside the workspace. The container lives for
  the whole run, so a step's session could leave notes there that the next step's session reads — state
  carried between steps outside the repository, which REQ-RUN-04 forbids. Not a W3 matter; proposed to
  the approver as a bug below.

**P8.** No file under `spikes/task-011/` or its `out/` contains the token or its last 12 characters
(counts only, the value never printed). No stderr from either session.

**Spending:** 0.0402 USD API-equivalent, on the maintainer's subscription, of the 0.50 € authorised.

### For the approver

1. **K5 amendment (scenarios README):** "mutating MCP Tools" is not in `3df305e`; its MCP server
   offers read-only Resources and role Prompts. Proposed wording: "…`directive create/assign/remove`,
   MCP read-only Resources and MCP Prompts that load role directives (mutating MCP Tools come later)".
   F2.7's "WingFoil's CLI + MCP" stays true.
2. **REQ-RUN-14 amendment:** add that the WingFoil under test is installed **with the dependency
   versions of its lockfile at the pinned commit** (install (b)/(c)), and that it is invoked as
   `wingfoil`, never through `npx`. The tarball is still built exactly as the requirement says.
3. **A bug for the auto-memory** of Claude Code (`~/.claude/projects/-workspace/memory/`), which can
   carry state between the steps of a run: for `bug-ingest`, with the fix left to a later task.

Items 1 and 2 are review decisions on approved documents; the requirements amendment would be 1.5,
together with dl-005's REQ-FMT-04 change planned for task-013.

### Review readiness (2026-09-25, at `ce7c893` plus this note)

`npm test` green (statements 100%, branches 98.12%, functions 100%, lines 100%), `npm run test:bin`
4/4, `npm run test:docker` 3/3, `npm run lint` clean — run in the linked worktree with its own
`npm ci`, no `node_modules` link. No `bench*` container left, the spike's included. No code under
`src/`, `test/` or `docker/` changed.
