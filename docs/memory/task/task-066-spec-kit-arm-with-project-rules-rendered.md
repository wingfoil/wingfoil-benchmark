---
id: task-066-spec-kit-arm-with-project-rules-rendered
type: task
title: "Spec Kit arm with project rules rendered"
status: pending
release: v0.2
wave: W12
features: [F7.1]
acceptance: [competitors.feature]
requirements: [REQ-FMT-05, REQ-FMT-14, REQ-RUN-12, REQ-RUN-18, REQ-RES-09]
---

## Context

F7.1, the Spec Kit arm ([rel-v0-2](../release/rel-v0-2.md), W12), on task-064's groundwork and task-065's answers.

**Scope:**

- `arms/speckit/`: `arm.yaml` (`requires`, `provides`, `telemetry_off`), the setup script (REQ-RUN-18), the operating
  manual written to the parity rules (skills route, no workflow engine, the neutral approver);
- the **rules generator** (REQ-FMT-14): a scenario's project rules rendered into Spec Kit's constitution, outside the
  scenario hash, its output's digest in `run.json`;
- the `CLAUDE.md` merge rule (REQ-RUN-12);
- the arm's setup page (REQ-RES-09, its setup half).

**No real agent, no spending** (the fake agent). **Done** means: `competitors.feature` @F7.1 for speckit green;
W12's "Ends with" is checked after task-067.

## Acceptance criteria

- `competitors.feature` @F7.1: the speckit row of the outline; the rules reaching the arm without changing the
  scenario; the arm's setup published; the arm-definition errors. **Red-first.**

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Spec Kit arm with project rules rendered"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-066-spec-kit-arm-with-project-rules-rendered`, `status: draft`.
