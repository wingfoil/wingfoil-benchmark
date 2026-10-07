---
id: task-070-openspec-in-the-run-container-spike
type: task
title: "OpenSpec in the run container spike"
status: in-progress
release: v0.2
wave: W13
features: []
acceptance: []
requirements: [REQ-RUN-18]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

A spike before the OpenSpec arm ([rel-v0-2](../release/rel-v0-2.md), W13; plan-004: "one spike per competitor,
… with the fake agent first, then one small real-agent run with consent"), as task-065 was for Spec Kit.

**Questions:**

1. Does OpenSpec **1.14.0** (`@fission-ai/openspec`, the register's admitted version) install offline from an `npm
   pack` tarball in the run image, and does `openspec init --tools claude --profile core --force` work headless?
2. What does it write: skills and commands (`/opsx:*`), `openspec/`, a `CLAUDE.md` or `AGENTS.md`? Which of it is
   project information (for REQ-FMT-14's rules and the docs control) and which is mechanics?
3. Where does OpenSpec keep a project's context and rules at 1.14.0 (REQ-FMT-14: "as its pinned version defines it")?
4. Can an agent follow propose → apply → archive under `claude -p` with the neutral approver; where do sessions
   wait; does `archive` need `--yes` with stdin closed?
5. Is `OPENSPEC_TELEMETRY=0` enough to turn telemetry off, and does anything reach the network?

**First with the fake agent, then one small real run, consented by this task's pending → backlog approval:** at most
**3 €**, Sonnet 5 on Claude Code 2.1.280, S3 step 1 only, from the main checkout with
`BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`. A line of `docs/calibration/v0.2-ledger.md`. A failed run is not
relaunched without new consent.

**Done** means: the answers with their evidence; the register's entry for OpenSpec re-assessed in the run container;
the setup script and the rules' place drafted for task-071.

## Acceptance criteria

<!-- A spike: no Gherkin scenario. Its answers and the ledger line are reviewed. -->

## Design

A spike: no product code and no Gherkin scenario.

- **Consent:** this task's pending → backlog approval (`e8edbd0`, "consents to spend at most 3 EUR on the real
  agent: one run, Sonnet 5 on Claude Code 2.1.280, S3 step 1, OpenSpec 1.14.0").
- **Ceiling:** 3.00 USD, under 3 €. A line of `docs/calibration/v0.2-ledger.md`.
- **The run:** from the main checkout, with `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`. The token reaches
  the container by name only, and a secret scan closes every stage that runs the agent. A failed run is not relaunched
  without new consent.

### Read before anything runs (free)

`npm view @fission-ai/openspec@1.14.0`:

- the bin is `openspec`, and Node ≥ 20.19 is required (the run image has Node 22);
- 10 dependencies as ranges (commander, @inquirer/*, ora, zod, yaml, chalk, diff, fast-glob, cross-spawn), so the
  **offline npm cache is what pins them**;
- 1.14.1 is published, and the register assessed 1.14.0 only.

### The stages

They are in `spikes/task-070/probe.sh`. Their output goes to the main checkout's git-ignored `spikes/task-070/out/`.
The image is the run image built from `docker/run-image` with Claude Code 2.1.280 (`bench-spike-task-070`).

1. **B1, the artifact (no agent, no spending).** With network:
   - `npm pack @fission-ai/openspec@1.14.0` gives the tarball;
   - `npm install --global --cache /bundle/cache <tarball>` fills an npm cache holding every dependency at the
     version it resolved;
   - the tarball's SHA-512 is checked against the registry's `dist.integrity`;
   - the stage records the bundle's files, their SHA-256, and the resolved dependency tree (`npm ls --global
     --all`).
2. **B2, install and init offline (no agent).** With `--network none` and `OPENSPEC_TELEMETRY=0`:
   - `npm install --global --offline --cache /bundle/cache /bundle/<tarball>`, then `openspec --version` and
     `openspec init --help` (the flags);
   - then, in a copy of S3@1.0's seed made a git repository, `openspec init --tools claude --profile core --force`
     (REQ-RUN-18's flags; the stage records any the version names otherwise);
   - it records every path added or changed and classifies each as **project information** (where OpenSpec keeps a
     project's context and rules at 1.14.0: Q2, Q3, for task-071's rules generator and task-072's docs generator)
     or **tool mechanics**;
   - `--network none` answers Q5's network half for install and init.
3. **R1, one real session (spends).** On B2's workspace:
   - `claude -p "<S3 step 1 prompt>"`, with a short instruction to follow the project's OpenSpec process
     (propose → apply → archive) through what init installed. That instruction stands in for the arm's manual,
     task-071's.
   - Sonnet 5, **`--effort high`**, `--max-budget-usd 2.50`, `--permission-mode bypassPermissions`,
     `OPENSPEC_TELEMETRY=0`, the token by name.
   - The ceiling is checked before it starts.
   - Read from the stream: the commands and skills it uses, whether it calls the network (WebFetch, WebSearch,
     curl, npm), where it waits (a final message asking something, which the neutral approver would answer),
     whether `archive` needs `--yes` with stdin closed, the files it writes (`openspec/changes/…`), and its cost
     and `modelUsage` with `costBasis`.
4. **R2, the same session resumed (spends, inside the ceiling).** `claude --resume <R1's session> -p "Continue."`
   with `--effort high` and `--max-budget-usd` set to what is left (at most 0.40). This measures **`--effort` under
   `--resume`**, which task-069 left to this run. A resume is part of the one consented run: the runner resumes a
   session the same way. If R1 already spent the ceiling, R2 is not run, and the measurement waits for calibration.

The Context's "first with the fake agent" becomes B1 and B2, as in task-065: the scripted fake cannot follow
OpenSpec's commands, so it would show nothing that a run without an agent does not.

### Done

- The five answers with their evidence.
- `--effort` under `--resume`, measured or said not to be.
- The register's openspec entry re-assessed in the run container (a new date and evidence, the verdict as the
  evidence says).
- `spikes/task-070/setup.sh`, the setup script drafted for task-071: install from the bundle, init, and
  `OPENSPEC_TELEMETRY=0`.
- Where the rules go, drafted for task-071.
- The ledger line.

## Execution notes

- `npx wingfoil memory add --type task --title "OpenSpec in the run container spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-070-openspec-in-the-run-container-spike`, `status: draft`. Matches.
