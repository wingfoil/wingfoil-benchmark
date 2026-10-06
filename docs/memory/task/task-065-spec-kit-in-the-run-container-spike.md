---
id: task-065-spec-kit-in-the-run-container-spike
type: task
title: "Spec Kit in the run container spike"
status: in-progress
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

The Context's "first with the fake agent" becomes B1 and B2, which run no agent: the scripted fake agent cannot follow
skills, so it would show nothing a run without an agent does not. No second real session: if R1 waits, the spike records where and what it asks, which is Q3's answer; the runner's
neutral approver (REQ-RUN-17) answers such waits in the arm.

### Done

The four answers with their evidence; the register's speckit entry re-assessed in the run container (a new date and
evidence, the verdict as the evidence says); `spikes/task-065/setup.sh`, the setup script drafted for task-066 (install
from the bundle, init, telemetry: none to turn off, said so); the ledger line.

## Execution notes

- `npx wingfoil memory add --type task --title "Spec Kit in the run container spike"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-065-spec-kit-in-the-run-container-spike`, `status: draft`.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-065-…`, in the linked worktree `WingFoil2-Benchmark-task-065` with its own `npm
  ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one file,
  `status` only. Matches.

### The spike (2026-10-06, from the main checkout; output in its `spikes/task-065/out/`)

- **B1, the wheel bundle:** in `bench-spike-task-065` (`docker/run-image` with Claude Code 2.1.280, uv 0.12.23, Python
  3.11.2), from `git archive` of tag v1.1.0 (`f1d3a4f8`): `uv build --wheel`, then `pip download` of its dependencies
  (through `uv run --with pip`). 14 wheels: `specify_cli-1.1.0` and typer 0.27.2, click 8.5.0, rich 15.0.0, readchar
  4.2.2, pyyaml 6.0.3 (cp311 manylinux), packaging 26.3, pathspec 1.1.1, json5 0.15.0, markdown-it-py 4.2.0, mdurl
  0.1.2, pygments 2.21.0, shellingham 1.5.4, annotated-doc 0.0.5; each digest in `out/b1/bundle.sha256`. pyyaml's
  wheel is platform-specific: the bundle is for this image's Python and architecture, as the air-gapped doc warns.
- **B2, install and init with `--network none`:** `uv tool install --offline --no-index --find-links /bundle
  specify-cli` installed the 14 packages and the `specify` executable; `specify init --here --force --integration
  claude --script sh --ignore-agent-tools` exited 0 in a git copy of S3@1.0's seed and added 30 files, nothing
  changed: ten skills (`.claude/skills/speckit-{analyze,checklist,clarify,constitution,converge,implement,plan,specify,
  tasks,taskstoissues}/SKILL.md`), and under `.specify/` a constitution (`memory/constitution.md`, a template of
  placeholders), five templates, six bash scripts, a workflow (`workflows/speckit/workflow.yml`), its registry,
  `init-options.json`, `integration.json`, two integration manifests and a `.gitignore`. **No `CLAUDE.md`.**
- **R1, one real session** (Sonnet 5 on Claude Code 2.1.280, ceiling 3.00 USD): S3 step 1's prompt plus two sentences
  saying the project follows Spec Kit through its skills. `success`, 68 turns, **1.4360 USD** (`modelUsage`: Sonnet 5
  only, `costBasis: list`), `terminal_reason: completed`. It invoked the skills in order — `speckit-specify` (with a
  restatement of the request as its argument), `speckit-plan`, `speckit-tasks`, `speckit-implement` — ran Spec Kit's
  bash scripts (`setup-plan.sh`, `setup-tasks.sh`, `check-prerequisites.sh`), wrote `specs/001-rental-module/`
  (spec, plan, research, data model, contract, quickstart, a requirements checklist, tasks) and then the code and its
  tests (15/15 green, `tsc` clean, as its last tool results show), changing `package.json` and `tsconfig.json` and
  adding `package-lock.json`. The secret scan found the token in no file.

### Answers

1. **Install and init headless:** yes. The pinned tag installs from a wheel bundle, offline, in the run image, and
   `specify init --here --force --integration claude --script sh --ignore-agent-tools` runs with no terminal and no
   network. `--integration claude` is required (a non-interactive init otherwise defaults to Copilot).
2. **What it writes:** the 30 files above. **Project information** (for the docs control, task-067): only the
   constitution, `.specify/memory/constitution.md`, which init leaves as placeholders — the place for a scenario's
   project rules (task-066). **Mechanics**: the skills, the templates, the scripts, the workflow and its registry,
   the options, integration and manifest files. No `CLAUDE.md`, so the arm's manual and rules do not collide with one.
3. **Can the agent follow the skills under `claude -p`?** Yes, and it did not wait: one session ran specify → plan →
   tasks → implement to green tests. That order was the stand-in instruction's ("specify, then plan, tasks and
   implement"), so the constitution and the optional clarify, analyze and checklist steps were not asked for and not
   run; the constitution stayed a template. No neutral approver was wired into R1 (plain `claude -p`), and the session
   ended without a question. Where Spec Kit would wait is therefore not observed on S3 step 1: its documented place is
   `speckit-specify`'s `[NEEDS CLARIFICATION]` markers (at most three), and the spec R1 wrote has none. For the arm,
   the manual maps the step prompts to these skills, and the runner's neutral approver answers any question.
4. **Workflow engine, own LLM calls, network:** none from Spec Kit. The session never ran `specify` or `specify
   workflow`; its scripts are local shell; install and init ran with `--network none`; no telemetry or analytics in
   its source (the CLI's `self check` and auth helpers can reach GitHub, but neither init nor the session called
   them). The network the session used was the agent's own npm: `npx tsc -p .` fetched the unrelated `tsc@2.0.4`
   placeholder package before `npm install --save-dev typescript` and then `npm install --save-dev @types/node` — what
   any arm's agent may do.

### For task-066

- `spikes/task-065/setup.sh`: the setup drafted — the bundle extracted from the harness artifact, installed offline,
  `init` with the four flags; no telemetry to turn off, said so.
- The harness artifact is the bundle, packed as a `.tgz` with the wheels flat at its root (REQ-FMT-12): built once per
  pin by a builder like WingFoil's, in the campaign image (amd64), so that pyyaml's wheel matches its Python.
- The project rules go into `.specify/memory/constitution.md`, Spec Kit's own place for them.

### Register and ledger

- `eligibility/register.yaml`: the speckit v1.1.0 entry re-assessed in the run container (each criterion's evidence
  now observed, not read); verdict admitted, as before; its date is today's, unchanged, the spike running the day of
  the first assessment.
- `docs/calibration/v0.2-ledger.md`: R1's line; **total so far 1.6473 USD**.

### Review

- **Round 1** (independent read-only Explore subagent, on `4c4a55c`; no spending, the token never read): nothing
  blocking. It checked the bundle's digests (`sha256sum -c`), B2's 30 untracked files and no `CLAUDE.md`, R1's one
  result (68 turns, 1.43595 USD, Sonnet 5 only, list basis), the four skills in order, no `specify` call and no web
  tool, the files written, the green tests, the ceiling, the ledger's sum, the register against its schema, the
  clone's absence of telemetry, and found no secret. Findings and outcomes:
  1. should-fix — the session's network use was understated (`npx tsc` fetched `tsc@2.0.4` first; two separate
     installs). **Fixed** in Q4.
  2. should-fix — Q3 credited Spec Kit for the order the stand-in instruction gave, and spoke of a neutral approver
     R1 did not have. **Fixed**, with `speckit-specify`'s clarification markers as the documented place to wait.
  3. should-fix — the Context's "first with the fake agent" was replaced unsaid. **Fixed:** the Design says why B1
     and B2 stand for it.
  4. should-fix — the drafted setup hard-coded `/home/node` and did not `cd` to the workspace, while the runner runs
     setups with its own `HOME` and `WORKSPACE`. **Fixed:** wingfoil's preamble, `$HOME`, executable, and the
     bundle's layout and architecture stated.
  5. should-fix — "PyPI lags behind the tag" lost its fact. **Fixed:** "listed 1.0.13 when assessed".
  6. nit — "made no network call" under `--network none`. **Fixed:** "ran with --network none".
  7. nit — R1's file list left out `package.json`, `tsconfig.json`, `package-lock.json`. **Fixed.**
  8. nit — Done's "a new date": the date is unchanged. **Said so.**
  9. nit — the script's ceiling check counts the last session only. **Not changed:** one session ran; the script is
     a spike's, not reused.
  10. nit — the bundle is amd64 only. **Said so** in "For task-066".
- **Round 2** (a new independent read-only Explore subagent, on `eff6ff3`): **clean**. It verified each round-1
  outcome against the raw output and the clone (`tsc@2.0.4`, the two installs, the stand-in instruction, the
  clarification markers, the CLI's GitHub calls, PyPI's 1.0.13 in task-063's notes), the drafted setup against
  wingfoil's and the runner's `HOME`/`WORKSPACE`, and the register. One nit, **not changed**: "its date is today's"
  reads as relative; the date is 2026-10-06, the day of both assessments.
- Final checks on `eff6ff3`: `npm run lint` clean; the site and eligibility tests (94/94) with the re-assessed
  register. No code changed: the full suite, `test:bin` and `test:docker` not run.
