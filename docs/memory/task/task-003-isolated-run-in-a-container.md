---
id: task-003-isolated-run-in-a-container
type: task
title: "Isolated run in a container"
status: backlog
release: v0.1
wave: W1
features: [F2.1]
acceptance: [runner.feature]
requirements: [REQ-RUN-01, REQ-RUN-02, REQ-ARC-04, REQ-CLI-10, REQ-ARC-03, REQ-ARC-05, REQ-NFR-04]
---

## Context

Third and last task of wave **W1 — Skeleton** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It depends on task-001 and task-002, and it closes the wave: "a trivial scenario runs in a container
from a campaign file".

Scope of F2.1:

- One Docker image per campaign, tagged `<campaign-id>`: `node:22-bookworm`, git and Claude Code at the
  campaign's `agent.version` (REQ-RUN-01).
- One container per run. The only bind mount is a fresh workspace: a copy of the seed plus the arm's
  environment, made a git repository with one initial commit. Nothing from the benchmark repository or
  the hold-out is mounted (REQ-RUN-02), even when the hold-out path is configured (REQ-CLI-10).
- Docker and git are called through port interfaces, so that acceptance tests use fakes (REQ-ARC-04).
- A minimal scripted fake agent executes the trivial scenario's steps inside the container. The full
  fake agent (sessions, questions, approvals) is W2 (F2.2–F2.4). No real agent is invoked in this task.
- A minimal `bench campaign run <file>` drives it. Estimate, warning and ceiling (REQ-CLI-03, F1.2,
  F1.3) arrive in W5.
- The `runner` and `agents` modules are created and added to `.wingfoil/dna.yaml` (REQ-ARC-05).

**Done** means: the acceptance tests pass against fake ports, and one integration run with the real
Docker executes the trivial scenario from a campaign file. That run is the evidence of the W1
"Ends with", recorded in `rel-v0-1`.

## Acceptance criteria

Classification confirmed in the design phase. All behaviour is new: **red-first**.

- `runner.feature` @F2.1 "Each run gets its own container with only the seed and the arm's environment"
  — a new container per run; it holds the seed and the arm's environment; no oracle, hold-out, runner
  code or other run. **red-first**
- `runner.feature` @F2.1 @error "A run cannot see the hold-out even if the path is configured" — with
  `BENCH_HOLDOUT_PATH` set, the container's mounts contain only the workspace. **red-first**
- REQ-RUN-01 — one image per campaign, tagged with the campaign id, built once and reused by every run.
  **red-first**
- REQ-RUN-02 — the workspace is a git repository with exactly one initial commit before the first
  step. **red-first**
- W1 "Ends with" — `bench campaign run` on a trivial campaign runs the trivial scenario in a real
  container (integration test, real Docker, fake agent). **red-first**

## Design

Conventions from [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md). Builds on task-001
(`core`, `scenario`) and task-002 (`campaign`, `results`, `cli`, `checkCampaign`).

### Modules created (REQ-ARC-01, REQ-ARC-05)

- **`core/ports/`**: the port interfaces of REQ-ARC-04 and their process-calling implementations —
  `process.ts` (a thin `execFile` wrapper returning `{code, stdout, stderr}`), `docker.ts`
  (`DockerPort`: `build`, `create`, `start`, `exec`, `remove`, `inspectMounts`) and `git.ts`
  (`GitPort`: `init`, `commitAll`). They live in `core` because `scoring` will need Docker in W6 and
  may not import `runner` (REQ-ARC-02). `core` already reads files, so calling processes there is the
  same kind of boundary, kept behind one interface each.
- **`agents`**: `AgentPort` (`runStep(request): Promise<StepOutcome>`) and the **scripted fake agent**.
  In W1 a step outcome is just "these commands ran"; sessions, usage and interventions are W2
  (F2.2–F2.4).
- **`runner`**: `runCampaign(checked, options): Promise<RunSummary>` — build the image once, then one
  container per run, in scenario × arm × repetition order.

`.wingfoil/dna.yaml` gains `agents` and `runner` (hand edit, N14).

### Image (REQ-RUN-01)

`docker/run-image/Dockerfile`, versioned, from `node:22-bookworm` pinned by digest
(`sha256:ae9f58d5c9f5a537110310be6b3cf67cf9c67146a3bb9310c0cb515fe71c8392`, resolved with
`docker manifest inspect` on 2026-09-23), plus `git`. Claude Code is installed at the campaign's
`agent.version` only when `agent.name` is `claude-code`; a `fake` campaign skips it, so W1 needs no
agent package. The image is built once per campaign and tagged `<campaign-id>`; a second run reuses
it.

### Run (REQ-RUN-02, REQ-CLI-10)

For each scenario × arm × repetition (models: the campaign's default; slices are W5):

1. **Workspace:** `runs/<campaign-id>/<n>/<scenario>@<version>/<arm>/<model>/r<k>/workspace`
   (git-ignored). The seed is copied into it **without following symbolic links** (task-001's
   follow-up), then the arm's environment: arm definitions arrive in W3, so W1 copies nothing.
2. **Git:** `git init`, one commit `seed`, with the benchmark's own identity passed per command
   (`-c user.name … -c user.email …`), so the host's configuration never leaks into a run.
3. **Container:** created from the campaign image with the workspace as its **only** bind mount, at
   `/workspace`, user `node`, no other host path. The hold-out is never mounted, whatever
   `BENCH_HOLDOUT_PATH` says (REQ-CLI-10); the runner never reads that variable.
4. **Steps:** the agent port runs each step in the container; the scripted fake agent executes the
   commands its script declares for that step. Per-step commits, diffs, usage and transcripts are W2
   (REQ-RUN-04, 05, 09).
5. **Teardown:** the container is removed, whatever the outcome.

**Fake agent script (W1 seam).** The fake agent reads a JSON script from the path in
`BENCH_FAKE_SCRIPT`: `{ "<scenario id>": { "<step n>": ["<shell command>", …] } }`. It is a seam for
this wave only: W2 replaces it with recorded sessions (F2.2). A missing script for a step is an error,
not a silent no-op, so a test cannot pass by doing nothing.

### `bench campaign run <file>` (REQ-CLI-03, partly)

- Validates the campaign and its scenarios (`checkCampaign`), then runs it.
- **Refuses any agent other than `fake`** with `agent 'claude-code' is not available yet`, exit 1
  (adr-001 default 7). This is what keeps a real agent from starting before W2, and it is the reason
  this task can be developed without spending a token.
- Estimate, warning, ceiling and the `--holdout` surface are W5 (F1.2, F1.3).
- Prints one line per run and a final summary; exit 0 when every run completed, 1 otherwise.
- Creates `results/<campaign-id>/<n>/` with a copy of the campaign file (REQ-FMT-06's first bullet),
  `n` from `nextExecution`. The rest of the results layout is W7 (F5.1).

### Tests

- **Acceptance** (`test/acceptance/runner.test.ts`), the two `@F2.1` scenarios, against fake ports:
  they record every Docker and git call, so the test asserts what was mounted and what the container
  received, with no Docker running.
- **Unit:** the command lines each port builds; workspace preparation (seed copied, symlinks not
  followed, git identity); the run loop's order and teardown on failure; the fake agent's script
  handling; the CLI's refusal of a non-`fake` agent.
- **Integration** (`test/docker/run.test.ts`, `npm run test:docker`, outside `npm test` and coverage):
  the real Docker runs T0 from `test/fixtures/campaigns/smoke.yaml` and asserts the file the step was
  asked to create exists in the workspace, that the container is gone afterwards, and that its only
  mount was the workspace. This run is the evidence of W1's "Ends with".

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `ab0f37c`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W1 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-003-isolated-run-in-a-container` → `07bba23`. Declared: `draft → pending`, required fields checked,
  one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty stderr, 1 file,
  diff limited to `status: draft` → `status: pending`. Matches (subject without transition: N9).
- `npx wingfoil memory approve task-003-isolated-run-in-a-container --reason "…"` → `29ead9f`, run after the approver's explicit
  consent in chat. Declared: `pending → backlog` gate, approver role checked, subject with
  `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0, empty
  stderr, subject `wf(task): approve task-003-isolated-run-in-a-container [pending → backlog]`, both trailers present, 1-line diff.
  Matches.
