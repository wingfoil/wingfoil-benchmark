---
id: dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it
type: decision-log
title: "The wingfoil arm follows WingFoil's workflow model in three steps, each on the WingFoil release that enables it"
status: draft
tags: ["wingfoil","arm","workflow"]
---

## Context

Through v0.2 the wingfoil arm used WingFoil as a document register: a fixed `developer` role, a task and a
decision-log per request through `memory add` and `submit`, a workflow started "only when the request asks". The
workflow engine, which the arm's `arm.yaml` declares (`workflow-engine: true`), was never exercised: no instance
started, no step deduced, no role taken from a step ([calibration v0.2](../../calibration/v0.2.md) §7;
[rel-v0-2](../release/rel-v0-2.md) Retrospective). WingFoil 0.3.0's `init` scaffold could not drive it anyway: its
workflows declare no role, action or evidence (WingFoil bug-400).

WingFoil's maintainer described its working model to this retrospective (2026-10-22): `workflow status`, `workflow
next` (the step, its role, its directives, its element), the step's work through the verbs, a stop at gates,
`workflow finalize` for a step no element completes, `workflow end`; the instance's state deduced at `HEAD`. In 0.3.x
WingFoil records and routes but does not execute steps, and `agent execute` launches only interactively. WingFoil's
release lines (read on 2026-10-22, decisions `in-discussion` are not commitments):

- **0.3.1** (patch, in development): an `init` scaffold the engine can drive (bug-400); `workflow adopt` and `rekey`.
- **0.4** (planned): MCP Tools; `agent execute --next` refusing a step that waits; candidate headless launch
  (WingFoil dl-181), launch kind (dl-183) and agent output (dl-182), all `in-discussion`.
- **1.0**: the engine executes steps (P4.10) and checks (P4.12).

## Options

- **A. A driver script written by the benchmark** runs the cycle around the agent now. It measures the benchmark's
  script rather than WingFoil, and gives one arm a driver the others lack (T1, T12).
- **B. The session's agent drives the cycle**, as WingFoil's guide for agents (0.3.0 §7) says, and the runner hands
  the driving over to WingFoil only when WingFoil can do it headless.

## Proposal

**B, in three steps**, each a new version of the arm, adopted only when its WingFoil release is admitted:

| Step | WingFoil | The arm | Entry condition |
|---|---|---|---|
| **A** | ≥ 0.3.1 | The session agent drives the cycle (status, next, the step's role, gates, finalize). The setup opens one workflow instance per scenario. The context comes from the MCP session Resource (`wingfoil://session/<role>/<element>/<sha>`), pending records included. baseline-docs gets every role's directives, labelled. | 0.3.1 released and admitted; a spike on 0.3.1 confirms that one instance carries several requests, what `next` prints in a later session, and that Claude Code in `-p` reads the session Resource |
| **B** | 0.4 | The runner calls `wingfoil agent execute --next` instead of launching the agent itself; the gates stay with the fixed approver. | WingFoil's headless launch approved (dl-181) **and** the agent's stream, usage and exit status reaching the launcher, so that cost and transcripts are measured as in every other arm |
| **C** | 1.0 | The engine executes the steps and the checks; the arm answers the gates. | WingFoil 1.0 admitted |

## Consequences

- Step A is planned for the benchmark's v0.3; B and C are not commitments.
- Each step is a new arm version (a new digest): its effect is read through a bridge or a recalibration, as
  v0.2.2 → v0.3.0 was.
- Step B amends the runner's requirements for the wingfoil arm alone, a difference of treatment the method page
  states; `no-own-llm` in the eligibility register is re-assessed when 0.4 is admitted.
- What each step lacks in WingFoil becomes a note of the feedback inbox (F-041 for step B).
