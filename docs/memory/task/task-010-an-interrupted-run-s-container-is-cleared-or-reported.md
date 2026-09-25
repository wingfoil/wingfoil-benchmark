---
id: task-010-an-interrupted-run-s-container-is-cleared-or-reported
type: task
title: "An interrupted run's container is cleared or reported"
status: backlog
release: v0.1
wave: W3
features: []
acceptance: []
requirements: [REQ-NFR-03, REQ-RUN-02]
---

## Context

Fixes [bug-003](../bug/bug-003-an-interrupted-run-leaves-its-container-behind.md): a run killed before
its `finally` leaves its container behind, and a later run that needs the same name fails at
`docker create` with Docker's own conflict message, which names a name and not a cause.

Planned for **W3**, the next wave to touch the container's lifecycle (arm setups, F2.5): that is where
"whoever touches the runner's container lifecycle next", as the bug puts it, will be working.

**A correction to the bug's framing, found while scoping this task and to be confirmed in the design
phase.** The container's name carries the execution number, and `nextExecution` counts the
`results/<campaign-id>/<n>/` directories, which the interrupted run already created. So a rerun **in
the same repository** gets `n + 1` and a different name: it does not collide, it silently leaves the
old container behind. The collision the bug observed needs the results to be gone while the container
is not — which is exactly what `npm run test:docker` does, since each run starts from a fresh temporary
directory. The two consequences are therefore:

- **a leak in real campaigns:** every interrupted run leaves one stopped container, holding its
  workspace mount, that nothing ever removes or reports;
- **a collision with a misleading message** whenever the results are cleared and a campaign is rerun,
  and in the Docker test suite after any interrupted run.

**The choice between the bug's two candidate fixes is the approver's**, and is asked for before the
design phase: (1) remove a stale container of the same name before creating one — self-healing, but
destructive towards something the run did not create; (2) detect it and fail the run with a message
naming the earlier execution and the command that clears it. Either way the fix bounds the Docker call
it adds, as the bug requires: a `docker rm` can take unbounded time on an unhealthy host.

Out of scope: a campaign-wide sweep of every `bench-` container, and recovery of an interrupted
execution's results.

**Done** means: after a run killed mid-step, a rerun either succeeds (fix 1) or fails with a message
that names the stale container, the execution it belongs to and the command to clear it (fix 2); the
leak is visible or gone; the new Docker call is bounded; tests, coverage and lint pass, and
`npm run test:docker` covers the interrupted case.

## Acceptance criteria

No Gherkin scenario covers it; the criteria are requirements, all **red-first** (new behaviour):

- REQ-NFR-03 — a stale container of the same name does not fail the rerun with Docker's unexplained
  conflict: it is removed (fix 1) or reported with its cause and remedy (fix 2). **red-first**
- REQ-RUN-02 — whatever the fix, the container of the rerun still has exactly one mount, its own
  workspace, checked against Docker. **red-first** (the check exists; its interaction with the fix is
  new)
- bug-003's condition — the added Docker call has a timeout, and reports what it was waiting for when
  it expires. **red-first**

## Design

**The approver's choice (2026-09-25): fix 2, report it.** The runner never removes a container it did
not create in this run; it names what it found and how to clear it. Offered alongside were fix 1
(remove blindly) and a labelled variant of it (remove only a container carrying the run's own label).

**Classification confirmed:** all three criteria red-first.

### One look, at the start of the campaign

Before the image is built, the runner asks Docker once for every container whose name starts with
`bench-<campaign-id>-` — the prefix every container of this campaign carries — and reads the execution
number out of each name. Two cases follow, which are the two consequences the Context found:

- **a container with the very name a run is about to use** (the results were cleared, or the test
  suite starts from a fresh directory): **that run fails** before `docker create`, with the message
  `container <name> already exists: an interrupted run of execution <n> of this campaign left it
  behind (bug-003). Remove it with: docker rm --force <name>`. The campaign goes on to its next run
  (REQ-NFR-03), and each run that collides says so for its own container;
- **containers of earlier executions** (the ordinary rerun, which gets `n + 1` and does not collide):
  **one warning per container** on the error stream, naming it, its execution and the same command.
  The runs proceed: the leak is made visible, not treated as a failure of a run it does not touch.

Asking once, up front, rather than before each `create`: the set cannot grow during the campaign
except by this campaign's own runs, which remove what they create; and a campaign of many runs would
otherwise pay one more Docker call per run.

### The ports

- `DockerPort.containersNamed(prefix)` — `docker ps --all --filter name=<prefix> --format
  {{.Names}}`, then filtered with `startsWith` in the runner's own terms: Docker's `name` filter
  matches anywhere in the name, which is not what "left by this campaign" means.
- **The call is bounded** (bug-003's condition): `ProcessPort.run` gains an optional `timeoutMs`, the
  real port passes it to `execFile`'s `timeout`, and a killed process comes back with
  `timedOut: true` instead of an opaque exit code. `containersNamed` uses 30 s and, when it expires,
  fails the **campaign** with `docker ps did not answer within 30 s while looking for containers
  left by earlier runs of this campaign`: a daemon that cannot list containers cannot create them
  either, and saying so at once beats a hang at the first run.

### Tests

- **Unit:** the process port's timeout, against a real `sleep`; `containersNamed`'s command line, its
  filtering and its timeout; the runner — a colliding container fails that run only, with the name,
  the execution and the command, and `create` is never called for it; containers of other executions
  produce one warning each and every run proceeds; a container of **another** campaign is ignored.
- **Docker** (`npm run test:docker`): the interrupted case for real — a container created by hand
  with the name a run will use makes that run fail with the message, and a rerun that gets the next
  execution warns about it and completes. The container is removed in a `finally`, so the test does
  not become the thing it tests.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
