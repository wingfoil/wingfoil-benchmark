---
id: task-065-spec-kit-in-the-run-container-spike
type: task
title: "Spec Kit in the run container spike"
status: backlog
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-RUN-18]
---

## Context

A spike before the Spec Kit arm ([rel-v0-2](../release/rel-v0-2.md), W12, high uncertainty on F7.1).

**Questions:**

1. Does Spec Kit at its pinned version install from a wheel bundle in the run image, and does
   `specify init --integration claude` work headless (`--here`, `--force`, `--script sh`)?
2. What does it write into the workspace: skills, `.specify/`, a `CLAUDE.md`? Which of it is project information
   and which is mechanics (for its docs control)?
3. Can an agent follow its skills (`/speckit-specify` … `/speckit-implement`) under `claude -p` with the neutral
   approver, and where do the sessions wait?
4. Does any step reach for its workflow engine, its own LLM calls or the network?

**First with the fake agent, then one small real run, consented by this task's pending → backlog approval:** at most
**3 €**, Sonnet 5, S3 step 1 only. A line of `docs/calibration/v0.2-ledger.md`.

**Done** means: the answers with their evidence; the register's entry for Spec Kit updated; the setup script drafted
for task-066.

## Acceptance criteria

<!-- A spike: no Gherkin scenario. Its answers and the ledger line are reviewed. -->

## Design

A spike: no product code, no Gherkin scenario. Consent: this task's pending → backlog approval (`490018c`, "consent to
spend at most 3 EUR on the real agent"), **ceiling 3.00 USD** (under 3 €), Sonnet 5 on Claude Code 2.1.280 (v0.1's
pin, which knows Sonnet 5; task-062), S3 step 1 only. A line of `docs/calibration/v0.2-ledger.md`.

### Read before anything runs (free)

Spec Kit **v1.1.0** (`f1d3a4f8`, 2026-10-02), cloned into the scratchpad: Python ≥ 3.11; dependencies as ranges
(typer, click, rich, readchar, pyyaml, packaging, pathspec, json5), so the **wheel bundle is what pins them**; the
documented offline install (`docs/install/air-gapped.md`): build the wheel, download its dependencies, then
`pip install --no-index --find-links`; `specify init` takes `--here`, `--force`, `--integration claude`, `--script
sh`, `--ignore-agent-tools`, and "no network access is required — bundled assets are used by default"; without
`--integration` a non-interactive session defaults to Copilot, so the flag is required.

### The stages, in `spikes/task-065/probe.sh`, output in the main checkout's git-ignored `spikes/task-065/out/`

1. **B1 — the wheel bundle (no agent, no spending).** In the run image built from `docker/run-image` with Claude Code
   2.1.280 (`bench-spike-task-065`, uv 0.12.23, Python 3.11.2), from `git archive` of the tag: build the wheel and
   download its dependencies into `bundle/` (network allowed: building an artifact is fetching it once, REQ-FMT-12).
   Record the bundle's files and their SHA-256.
2. **B2 — install and init offline (no agent).** In a container with `--network none`: `uv tool install --offline
   --no-index --find-links /bundle specify-cli`, then, in a copy of S3@1.0's seed made a git repository, `specify init
   --here --force --integration claude --script sh --ignore-agent-tools`. Record exit codes, output, and every file
   it adds or changes (`git status --porcelain`, the tree of `.claude/` and `.specify/`), and classify each as project
   information (for the docs control, task-067) or tool mechanics. `--network none` answers Q4's network half for
   install and init.
3. **R1 — one real session (spends).** In a container of the same image with network (for the API only), on B2's
   workspace: `claude -p "<S3 step 1 prompt>"` with a short instruction to follow the project's Spec Kit process
   through its skills (the arm's manual does not exist yet; this is the spike's stand-in), stream-json, Sonnet 5,
   `--max-budget-usd 2.50`, `--permission-mode bypassPermissions`, the token by name. The ceiling is checked before
   it. Read from the stream: which skills it invokes, whether it runs `specify workflow` or any network tool
   (WebFetch, WebSearch, curl), whether it stops to wait (its final message asking a question, which the neutral
   approver would answer), the files it writes (`specs/…`), and its cost. A secret scan closes the run.

No second real session: if R1 waits, the spike records where and what it asks, which is Q3's answer; the runner's
neutral approver (REQ-RUN-17) answers such waits in the arm.

### Done

The four answers with their evidence; the register's speckit entry re-assessed in the run container (a new date and
evidence, the verdict as the evidence says); `spikes/task-065/setup.sh`, the setup script drafted for task-066 (install
from the bundle, init, telemetry: none to turn off, said so); the ledger line.

## Execution notes

- `npx wingfoil memory add --type task --title "Spec Kit in the run container spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-065-spec-kit-in-the-run-container-spike`, `status: draft`.
