---
id: task-015-baseline-docs-generator
type: task
title: "Baseline-docs generator"
status: pending
release: v0.1
wave: W3
features: [F2.5]
acceptance: [runner.feature]
requirements: [REQ-RUN-11, REQ-FMT-05]
---

## Context

Fifth and last task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It
builds on task-013 (a scenario's `arms/wingfoil/` configuration, applied in the wingfoil arm) and
task-014 (the manuals, so that the baseline-docs `CLAUDE.md` is composed the same way).

Scope, the second half of F2.5:

- **The generator (REQ-RUN-11).** A pure function of the wingfoil arm's configuration and the scenario's
  `arms/wingfoil/` directory
  ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)).
  It renders the same directives, decisions and project description as free-form Markdown, with sorted
  keys and fixed templates, so that two generations are byte-identical. It runs in the runner, outside
  the container; its output becomes the baseline-docs arm's environment for that scenario. No
  hand-editing: parity of information is a property of the generator (experiment design §2, T3).
- **What counts as "the same information".** The design lists every kind of content the wingfoil
  configuration carries, and says for each whether it is rendered or left out, and why. A kind left out
  silently would be an arm asymmetry nobody can see.
- The fixture of task-013 (standing in for S8) is the generator's input in the acceptance test; S8
  itself is W8.

**This task declares F2.5**, although task-012 delivered its first scenario: the traceability test
reads `features` at feature level, so F2.5 is declared by the task that completes it (see task-012's
Context).

**The wave's "Ends with"** — the same scenario runs in the baseline, baseline-docs and wingfoil arms —
is checked once this task is done, as the W3 plan phase decided (task-011, decision 4): with the real
Docker and the fake agent, T1 in the three arms, and one real-agent run in the wingfoil arm with the
approver's consent. The evidence goes into rel-v0-1.

**Done** means: both `runner.feature` @F2.5 scenarios pass against the fake agent; the generator is
deterministic; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `runner.feature` @F2.5 "The baseline-docs environment is generated from the wingfoil arm's
  configuration" — the same directives, decisions and project description as Markdown, and two
  generations byte-identical. **red-first**
- `runner.feature` @F2.5 "Each arm's setup is scripted and measured apart from the steps" — delivered
  by task-012. **characterization**, re-run here because this task declares F2.5.
- REQ-RUN-11 — the output does not depend on the order in which files are read or on the machine it
  runs on. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
