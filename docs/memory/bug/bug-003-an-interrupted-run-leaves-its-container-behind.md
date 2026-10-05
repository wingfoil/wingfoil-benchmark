---
id: bug-003-an-interrupted-run-leaves-its-container-behind
type: bug
title: "An interrupted run leaves its container behind"
status: fixed
fixed_by: task-010-an-interrupted-run-s-container-is-cleared-or-reported
---

## Context

A run's container is named deterministically —
`bench-<campaign-id>-<execution>-<scenario>-<version>-<arm>-<model>-r<k>` (task-003) — and the runner
removes it in a `finally`, so an ordinary failure cleans up after itself (REQ-NFR-03).

A **killed process** does not reach that `finally`. The container stays, and the next run of the same
campaign, execution and run fails at `docker create` with Docker's own message:

```
Error response from daemon: Conflict. The container name "/bench-9491f7cd4bb7-1-T0-1.0-baseline-fake-model-r1"
is already in use by container "49ea3679…". You have to remove (or rename) that container.
```

Observed on 2026-09-24 while delivering task-006: `npm run test:docker` was killed by a wrapper
timeout, and every later run of that suite failed on the conflict until the container was removed by
hand.

Two things make this worth an element rather than a note.

- **The message does not name the cause.** It says a name is in use; it does not say the name belongs
  to a previous run of this very campaign, nor that removing it is safe. Whoever meets it has to know
  the naming scheme to understand what they are looking at.
- **It is the shape of a real campaign failure, not only a test annoyance.** A reference campaign is
  many runs long. A machine that reboots, a terminal that is closed, an operator who presses Ctrl-C:
  each leaves one container, and the rerun of that execution number then fails for a reason that has
  nothing to do with the benchmark.

## Expected

Rerunning a campaign after an interrupted run starts, or fails with a message that names what it
found and what to do about it.

## Actual

`docker create` fails with Docker's conflict message, the run is recorded as `failed`, and the
campaign continues to the next run — which will hit the same wall for its own container.

## Notes

Not fixed inside task-006: it is task-003's behaviour, it predates W2, and the task that met it was
about the agent adapter. Filed so that whoever touches the runner's container lifecycle next has it
in front of them.

Two candidate fixes, deliberately not chosen here:

1. **Remove a stale container of the same name before creating.** Self-healing, and it matches "a
   fresh workspace is removed before it is rebuilt" (REQ-RUN-02, task-003). The risk is that it makes
   the runner destructive towards something it did not create: a name collision with a container
   that is *not* ours would be removed silently. The name is prefixed `bench-` and carries the
   campaign digest, so the collision is improbable rather than impossible.
2. **Report it as what it is.** Detect the conflict and fail the run with a message naming the
   previous execution and the command to clear it. Safer, less convenient, and it leaves the operator
   to act.

### A correction to the first draft of this element

The first version of this element said the wedged container "also made `docker rm`, `docker rm -f`
and `docker inspect` hang". **That was wrong, and the mistake is worth recording.** Those commands
hung because the machine was in a kernel-level stall: about 300 threads in uninterruptible sleep on
ACPI embedded-controller queries (`kec_query`, `kacpi_notify`), load average 327, and `systemd`
itself in `D`. Docker was a victim of it, not the cause: containerd could not reap its shim, which
was already a zombie, so `runc create` never returned and every `docker rm` queued behind it. A
reboot cleared all of it, and the container removed itself in the normal way.

So the container **never** wedged Docker. The two problems happened at the same time on the same
machine and I read one as the cause of the other, because the symptom I checked — `docker version`
still answering — does not touch the stuck container and so proved nothing either way.

What survives of that paragraph is smaller and still true: a fix of the kind proposed above runs a
`docker rm` at the start of a run, and a `docker rm` can take an unbounded time on an unhealthy
host. Whichever fix is chosen should bound that call and report what it was waiting for, rather than
hanging the campaign at its first run.

What does **not** survive is the claim that this bug can wedge a host. It cannot.

## Resolution

Fixed in [task-010](../task/task-010-an-interrupted-run-s-container-is-cleared-or-reported.md) with
fix 2, the approver's choice: **reported, never removed**. At the start of a campaign the runner lists
this campaign's containers (bounded at 30 s). A run whose name is taken fails with the cause and the
`docker rm --force` that clears it; a leftover of another execution is warned about; a **running**
one is reported as possibly another invocation's, not as interrupted. Scoping the task corrected this
element's framing: an ordinary rerun gets the next execution number and does not collide — it leaks
the old container silently, which is now warned about; the collision needs the results to be gone.
