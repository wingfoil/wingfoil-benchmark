---
id: task-011-wingfoil-in-the-run-container-spike
type: task
title: "WingFoil in the run container spike"
status: backlog
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
