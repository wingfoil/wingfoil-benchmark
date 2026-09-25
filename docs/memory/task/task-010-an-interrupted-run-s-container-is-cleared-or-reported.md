---
id: task-010-an-interrupted-run-s-container-is-cleared-or-reported
type: task
title: "An interrupted run's container is cleared or reported"
status: in-progress
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

### Build

- **The bug's framing, confirmed in code.** `nextExecution` counts the `results/<id>/<n>/` directories
  the interrupted run already created, so an ordinary rerun gets `n + 1`: the Docker test shows both
  sides — with the results removed the rerun collides and is reported; the next rerun gets execution 2,
  warns about the leftover of execution 1, and completes.
- **TDD order, in the history:** every test red first (`0454001`, 9 red plus the Docker test); the
  process port's time limit, `containersNamed` and the runner's check (`37daba8`); one more assertion
  after a surviving mutation (`0db70de`); the README (`041c39a`).
- **Mutations, each made, observed and reverted — 9, all red after `0db70de`:** the collision check
  off; the warnings off; the warning emitted for the current execution too (**survived** the first
  suite: the collision test captured the error stream without asserting it; it now asserts the run's
  failure is the only line); a prefix of `bench-` alone; the listing without its time limit;
  `timedOut` never set; `timedOut` set on any kill; the port not filtering Docker's substring match;
  the stale container removed instead of reported.
- **The runner removes nothing it did not create.** Asserted in the unit test (`removes` holds only
  the containers the runs created) and against the real Docker (the stale container is still listed
  after both reruns, and the test removes it itself in a `finally`).
- **Suites:** `npm test` 454 passed, 100% statements / 98.33% branches / 100% functions / 100% lines;
  `npm run test:docker` 3; `npm run lint` clean.

### Review, round 1

- **Independent reviewer, on an export. Verdict: approvable**, 1 major, 3 minors, 3 nits; all fixed
  or recorded.
- **Major — a live run called interrupted.** The campaign id is a digest of the file, so the same
  campaign run from another checkout, or two `npm run test:docker` at once, shares the prefix: a
  **running** container of it may be someone's live run, and the first build would have told the
  operator it was interrupted and to `docker rm --force` it. The port now reads each container's
  state; a running one is reported as "another invocation of this campaign may be using it. If none
  is, remove it with: …", never as interrupted. The Design's "nothing but this campaign's own runs can
  add to it" was wrong across processes.
- **Minors fixed:** the execution was parsed with an anchored regex that no test pinned (a name like
  `…-manual2-…` now tested); the time limit sent SIGTERM only, so a process ignoring it outlived the
  limit (a `trap "" TERM` probe took 3 s against 300 ms) — it now kills with SIGKILL; the warning's
  direction was pinned only by the Docker suite (the ordinary case, a leftover of an **earlier**
  execution, now a unit test). Nit fixed: the refused run builds no workspace, now asserted.
- **Nits recorded:** a failed `docker ps` uses up an execution number, as a failed build already
  does; two surviving mutations are equivalent to the code (explained in the review).
- **Mutations of the round, all red:** unanchored parsing, warning only later executions, the state
  ignored by the run, by the warning, and by the port, no SIGKILL.
- **Suites:** `npm test` 458 passed, 100% statements / 98.12% branches / 100% functions / 100% lines;
  `npm run test:docker` 3; `npm run lint` clean.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `73de01d`, on main. Declared: one commit, one
  file from the template, `status: draft`. Observed: as declared; the id's slug renders the apostrophe
  of "run's" as `run-s`. Content filled by hand in `e7f96c7`.
- `npx wingfoil memory submit task-010-…` → `5a87f36` (`draft → pending`); approved by the approver in
  `4f46a22` (`pending → backlog`).
- `npx wingfoil memory submit task-010-…` → `d1ca432`, after the design commit `ee8f7c0`. Declared:
  `backlog → in-progress`, only `status` changed. Observed: exit 0, as declared. Matches.
