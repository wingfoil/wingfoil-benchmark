---
id: task-019-agent-auto-memory-kept-out-of-the-next-step
type: task
title: "Agent auto-memory kept out of the next step"
status: pending
release: v0.1
wave: W4
features: []
acceptance: []
requirements: [REQ-RUN-04, REQ-RUN-02]
---

## Context

Fourth task of wave **W4** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It fixes
[bug-006](../bug/bug-006-claude-code-s-auto-memory-can-carry-state-between-the-steps-of-a-run.md)
(approved 2026-09-25): Claude Code 2.1.280 names an auto-memory directory,
`/home/node/.claude/projects/-workspace/memory/`, in the container's home and outside the workspace.
The container lives for the whole run, so a note written there in one step's session could be read in
the next, carrying state outside the repository — which REQ-RUN-04 and F2.2 forbid. The approver put
it in W4 so that the protocol holds before W5's dry runs, which are real runs (W4 plan-phase decision
3, task-016).

Scope:

- **Find out** whether the pinned agent writes there in headless sessions, and whether a setting or a
  flag turns auto-memory off; with the fake agent, prove what the runner does about it.
- **Fix** it in the way that keeps every arm the same: auto-memory off in the run image's settings if
  the agent honours that, otherwise the directory cleared between steps by the runner — or both.
- **Close bug-006** in prose here and in the bug's own notes (WingFoil has no element links, usage
  note N29).

It fixes a bug and delivers no feature, so `features` and `acceptance` are empty, as for task-004.

**Spending, proposed and to be confirmed at this task's pending → backlog gate:** one or two short
real sessions on Haiku 4.5, **up to about 0.30 € equivalent**, to observe whether the directory is
written and whether the chosen switch stops it. Without it the fix is built on the documented
behaviour and marked unverified.

**Done** means: nothing under `/home/node/.claude/projects/` written in one step is readable in the
next, proven with the fake agent in the docker suite; the real agent's behaviour observed within the
spending limit; bug-006's resolution recorded; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- REQ-RUN-04 — a file the agent leaves under `/home/node/.claude/projects/` in step 1 is gone, or never
  written, when step 2 starts. **red-first**
- REQ-RUN-02 — the fix adds no mount and keeps the credential out of the image and the workspace.
  **characterization**
- Whatever switch is chosen, the pinned agent is observed honouring it (real session, within the
  limit above). **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
