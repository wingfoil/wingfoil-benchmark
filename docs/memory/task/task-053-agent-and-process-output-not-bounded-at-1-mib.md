---
id: task-053-agent-and-process-output-not-bounded-at-1-mib
type: task
title: "Agent and process output not bounded at 1 MiB"
status: pending
release: v0.1
wave: campaign
features: [F2.3]
acceptance: [runner.feature]
requirements: [REQ-RUN-04, REQ-RUN-08, REQ-RUN-09]
---

## Context

Fixes [bug-011](../bug/bug-011-an-agent-step-whose-output-passes-1-mib-is-killed-by-execfile-s-default-maxbuffer-and-its-cost-is-lost.md),
found by the v0.1 reference campaign ([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), execution
`c82a5e74885b/1`). Three of its 19 runs failed at S1's step 03: the agent's stream-json output passed 1 MiB, Node's
default `maxBuffer` for `execFile` (`systemProcess`, `src/core/ports/process.ts`), and was cut. The step was then
read as "a line of the session is not valid JSON", with no cost. The approver sent the campaign back
(scored → running, `1ab1d67`) to fix this first, and then re-run it in full as a new execution.

`wave: campaign` names the `release-cycle` phase this task belongs to, as `validation` did for task-051.

**Scope:**

- The process port reads a command's output whole, up to a bound far above any step's output, for every command
  that goes through it. The agent's step is one of them, but so are the step's `git diff` (`diff.patch`), the setup
  log and the scoring container's output, which are bound by the same 1 MiB today.
- A command that does reach the bound says so. This must not look like invalid JSON, a failed git command or a
  timeout.
- The adapter turns a bounded step into a failed step whose error names the bound.

**No real agent, no spending.** The bound is tested with the real `systemProcess` on a local command, and the
adapter with the scripted fake agent.

**Done** means:

- an output of several MiB is read whole;
- reaching the bound is reported as such;
- `npm test` is green with coverage above 80 %, lint is clean, and `npm run test:docker` stays green;
- bug-011's Resolution names this task's commits.

Then the reference campaign is re-run in full as `c82a5e74885b/2`, with the approver's spending consent at
campaign-cycle's `approve-spend`.

## Acceptance criteria

- `systemProcess` returns an output of 3 MiB whole (`test/unit/ports/process.test.ts`). **Red-first**: today it is
  cut at 1 MiB.
- A command whose output passes the port's bound ends with `outputBounded`, the bound named in `stderr`, and is not
  reported as `timedOut` even with a time limit set. **Red-first**, with a small bound injected.
- The Claude Code adapter fails a step whose output was bounded with "the agent's output passed the … bound",
  not "not valid JSON". **Red-first**.
- `runner.feature` (@F2.2, @F2.3) and the caps tests stay green. **Characterization.**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Agent and process output not bounded at 1 MiB"`. Declared:
  creates the element from the template and commits it. Observed: `fe5c5e2 wf(task): add task-053-…`, `status:
  draft`, the template's fields empty.
