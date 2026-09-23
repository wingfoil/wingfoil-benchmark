---
id: task-003-isolated-run-in-a-container
type: task
title: "Isolated run in a container"
status: approved
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
  (`DockerPort`: `build`, `create`, `start`, `exec`, `remove`, `mountsOf`) and `git.ts`
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

`docker/run-image/Dockerfile`, versioned, from `node:22-bookworm` pinned by the digest of its
**multi-architecture index** (`sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844`,
resolved with `docker buildx imagetools inspect` on 2026-09-23), plus `git`. `docker manifest inspect`
prints the per-architecture manifests, and pinning one of those would tie the benchmark to amd64.

Claude Code is installed at the campaign's
`agent.version` only when `agent.name` is `claude-code`; a `fake` campaign skips it, so W1 needs no
agent package. The image is built once per campaign and tagged `<campaign-id>`; a second run reuses
it.

### Run (REQ-RUN-02, REQ-CLI-10)

For each scenario × arm × repetition (models: the campaign's default; slices are W5):

1. **Workspace:** `runs/<campaign-id>/<n>/<scenario>@<version>/<arm>/<model>/r<k>/workspace`
   (git-ignored), **removed before it is rebuilt**, so a run never inherits another's files or `.git`.
   The seed is copied into it **without following symbolic links** (task-001's follow-up), then the
   arm's environment: arm definitions arrive in W3, so W1 copies nothing. A seed that is itself a
   symbolic link is refused.
2. **Git:** `git init`, one commit `seed`, with the benchmark's own identity, no global or system
   configuration (`GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`), no commit template, no
   hooks and no signing. All of it matters because `.git/` sits **inside the bind mount**: the host's
   hooks and template files would otherwise be carried into the container, and a host that signs
   commits would fail every seed commit.
3. **Container:** created from the campaign image with the workspace as its **only** bind mount, at
   `/workspace`, user `node`, no other host path. The runner then asks Docker what the container
   actually holds (`mountsOf`) and fails the run if it is anything but that one mount: the check does
   not trust what the runner asked for. It is defence in depth, not a proof of isolation: Docker's
   `.Mounts` shows binds, volumes and tmpfs, but not what the daemon injects itself (`/etc/hosts`,
   `/etc/resolv.conf`, `/etc/hostname`) nor devices or shared namespaces. The hold-out is never mounted, whatever
   `BENCH_HOLDOUT_PATH` says (REQ-CLI-10); the runner never reads that variable.
4. **Steps:** the agent port runs each step in the container; the scripted fake agent executes the
   commands its script declares for that step. Per-step commits, diffs, usage and transcripts are W2
   (REQ-RUN-04, 05, 09).
5. **Teardown:** the container is removed, whatever the outcome, and a removal that fails is logged
   without losing the run's result. Every failure — preparing the workspace, creating, starting, a
   step — makes that one run `failed`; the campaign carries on (REQ-NFR-03).

**Fake agent script (W1 seam).** The fake agent reads a JSON script from the path in
`BENCH_FAKE_SCRIPT`: `{ "<scenario id>": { "<step n>": ["<shell command>", …] } }`. It is a seam for
this wave only: W2 replaces it with recorded sessions (F2.2). A missing script for a step is an error,
not a silent no-op, so a test cannot pass by doing nothing.

### `bench campaign run <file>` (REQ-CLI-03, partly)

- Validates the campaign and its scenarios (`checkCampaign`), then runs it.
- **Refuses any agent other than `fake`** with `agent '<name>' is not available yet: W1 runs the
  scripted fake agent`, exit 1
  (adr-001 default 7). This is what keeps a real agent from starting before W2, and it is the reason
  this task can be developed without spending a token.
- Estimate, warning, ceiling and the `--holdout` surface are W5 (F1.2, F1.3).
- Prints one line per run and a final summary on stdout, failures on stderr; exit 0 when every run
  completed, 1 otherwise.
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
  asked to create exists in the workspace, that the workspace is a git repository, that the execution
  was recorded, that no container is left and that the image carries the campaign's identity. The
  mount check runs inside the run itself (step 3 above), not after it: by then the container is gone.
  This run is the evidence of W1's "Ends with".

## Execution notes

### Build

- **TDD order, in the history:** ports (red `8266f5a`) → `dockerCli`/`gitCli`; the fake agent (red `6e4f06b`)
  → `fakeAgent`; the runner's acceptance and unit tests (red `08b56ff`) → `runCampaign`; the command's tests
  (red `af3e93a`) → `bench campaign run`. Each red run failed for its stated reason (missing module, or the
  assertion the commit describes).
- **`checkCampaign` moved from `cli` to `runner`**, as task-002's Design foresaw: the runner needs the
  campaign and its scenarios, and `runner` may import both `campaign` and `scenario` (REQ-ARC-02).
  `cli` re-exports it, so task-002's tests did not change.
- **The command's ports are injectable.** `main(argv, io, ports?)` takes the Docker, git and agent
  ports; the bin passes the real ones, tests pass doubles. Without this the CLI could only be tested
  with Docker running.
- **Output order:** the runner logs `campaign <id>, execution <n>` itself, so the header precedes the
  run lines whatever calls it.
- **Tests written after the code (characterization), to close coverage:** the system process port,
  `processFailure`, the git port's failure path, `realPorts`, and the agent's command closure. They
  passed on their first run; the behaviour was already there. One branch stays uncovered on purpose:
  the `?? 1` fallback for a repetition count the schema already guarantees.
- **The Docker test is not red-first:** it is the end-to-end verification of W1's "Ends with", written
  once the runner existed, and it passed on its first run. Its commit message said "(red)"; the commit
  was amended, while still local, to say what it is.
- **W1 "Ends with", verified** (`npm run test:docker`, 93 s including the image build): the trivial
  scenario T0 runs in a real container from `campaigns/smoke.yaml`; `hello.txt` is in the workspace
  with the expected content, the workspace is a git repository, `results/<id>/1/campaign.yaml` exists,
  no container is left behind, and the image is tagged with the campaign's identity.
- **REQ-ARC-05:** `.wingfoil/dna.yaml` lists `agents` and `runner` (hand edit, N14).

### Review, round 1

- **Reviewer:** an independent reviewer that did not write the code, read-only, every finding proven by
  a probe, with the checklist run on an export of HEAD.
- **Result:** 1 blocker, 8 majors, 9 minors, 2 nits.
- **Blocker, and my own gap:** `npm run test:bin` was red at HEAD — the usage grew a second line when
  `campaign run` arrived, and that suite runs outside `npm test`. I had not run it in this task. It is
  part of the checklist from now on.
- **Majors fixed** (red `e3cacce`, `88b3dc3`, then `a0fb2fb`, `3cec00e`):
  1. a failure in `prepareWorkspace`, `create` or `remove` threw out of `runCampaign` and ended the
     whole campaign (REQ-NFR-03); all of it now happens inside the run, and a failed run is a result;
  2. a workspace was reused as it stood, keeping the previous run's files and `.git`; it is now removed
     first, which is what REQ-RUN-02's "fresh workspace" means;
  3. the host's git configuration reached `.git/` **inside the bind mount** (templates, hooks), and a
     host with `commit.gpgsign` would have failed every seed commit;
  4. `models.default` reached run paths, container names and the `--mount` value unchecked: `../..`
     escaped `runs/`, and a colon or a comma broke Docker;
  5. `packageRoot()` used `URL.pathname`, so a checkout path with a space broke the image build;
  6. the base image was pinned to the amd64 manifest rather than the multi-architecture index;
  7. the `@F2.1 @error` assertion was vacuous — the double answered from its own argument. The double
     now derives its mounts from the recorded request, and the runner checks the container's mounts
     against Docker itself;
  8. **deferred, not fixed:** the W1 "Ends with" is recorded in `rel-v0-1` in the deliver phase, once
     the task is approved.
- **Minors and nits fixed:** a symlinked seed silently produced an empty workspace; `mountsOf` had no
  production caller and is now the isolation check; the Design overstated what the Docker test asserts;
  run failures went to stdout; two exports had no caller; the
  fake agent's script is size-capped; the campaign carries its own `repoRoot`; the refusal message
  matches the Design; `exec`'s behaviour on Docker errors is documented.
- **Open, for the approver:** adr-001 default 5 says Claude Code is "installed and never invoked in
  W1". The image installs it only for a `claude-code` campaign, which W1 refuses, so W1 installs
  nothing at all. The ADR asks for a new ADR when a default changes.

### Review, round 2

- **Result:** the blocker and 7 of 8 majors confirmed fixed (the eighth is deferred by design);
  2 new majors, 2 minors, 4 nits; the whole checklist green on an export of HEAD.
- **Corrections to my round-1 notes**, all three found by the reviewer:
  - the DNA's `cli` description was listed as fixed and was not — the edit had never reached the file;
    it is fixed now;
  - the `rel-v0-1` record was listed under "fixed" while it is deferred to the deliver phase;
  - the finding count was wrong (9 minors and 2 nits, not "9 minors and nits").
- **New majors fixed** (red `2c8e029`, then `f795242`):
  1. a `docker build` that fails — the daemon not running is the ordinary case — still threw out of the
     command: the user got a stack trace. It is now reported on stderr as `campaign: <what failed>`
     with exit 1 (the port's message names the command and quotes Docker, so it spans a few lines);
  2. the git isolation missed the host's `GIT_*` **variables**, which beat `-c` settings:
     `GIT_TEMPLATE_DIR` still copied host files and a `pre-commit` hook into `.git/` inside the bind
     mount, and `GIT_AUTHOR_*` replaced the fixed identity. My first attempt set `GIT_DIR` and its
     siblings to the empty string, which made `git init` fail with code 128: git refuses an empty
     `GIT_DIR` instead of ignoring it. They are now **removed** from the environment. Verified against
     real git with a hostile template and identity: no host file in `.git`, no hooks directory, author
     `WingFoil Benchmark <benchmark@localhost>`.
- **Minors fixed:** a checkout path holding a comma or an equals sign broke the `--mount` value and is
  now refused; model ids may not hold `..` and are bounded in length.
- **Documented:** the mount check is defence in depth, not a proof (the Design says what it cannot
  see). A half-prepared workspace survives a failed run on purpose, as debris to look at: it stays
  under `runs/<campaign-id>/<n>/`, which is git-ignored, and only a rerun of that same execution
  number clears it.

### Review, round 3

- **Result:** no blocker, no major. Findings A–F fixed, G and H unchanged on purpose; 1 new minor,
  1 robustness defect and 2 inaccurate sentences in my round-2 notes, both corrected above.
- **Fixed** (red `f7532aa`, then `48574b3`):
  - `GIT_COMMON_DIR` was the one `GIT_*` variable left unanswered; a host that exports it — git does
    inside worktrees and while running hooks — made every seed commit fail. Every run would have been
    `failed`, which the round-2 teardown fix at least keeps from ending the campaign;
  - a thrown value that is not an `Error` was reported as `undefined`; `reasonOf` now renders it;
  - a model id may no longer end in a dot or a dash.
- **Accepted as they are:** the script's size check is stat-then-read (operator-supplied input); the
  CLI's catch also swallows a programming error, which reads as a campaign failure — acceptable for a
  command line, and worth a debug flag when one exists.

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
- `npx wingfoil memory submit task-003-…` → `377d7d9` (`in-progress → in-review`) and
  `npx wingfoil memory approve task-003-… --reason "…"` → `2ad8011` (`in-review → approved`), after the
  approver's explicit consent. Observed for each: exit 0, empty stderr, the declared subject and body,
  a diff limited to `status`. Matches.
- **adr-001's amendment has no verb.** The element is `approved`, and no Memory transition amends a
  document in a terminal state, so the amendment was recorded the way non-Memory documents are: the
  edit plus an approval commit carrying `Approver:` and `Reason:` (`f6c5a4f`). `memory history` shows
  that commit with `operation: null`. Recorded as usage note N16.
