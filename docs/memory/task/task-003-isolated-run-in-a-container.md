---
id: task-003-isolated-run-in-a-container
type: task
title: "Isolated run in a container"
status: draft
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

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

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

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
