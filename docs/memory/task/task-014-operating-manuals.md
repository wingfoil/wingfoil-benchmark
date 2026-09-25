---
id: task-014-operating-manuals
type: task
title: "Operating manuals"
status: draft
release: v0.1
wave: W3
features: [F2.7]
acceptance: [runner.feature]
requirements: [REQ-RUN-12, REQ-FMT-05]
---

## Context

Fourth task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It builds on
task-012 (the `manual` field of an arm definition) and task-013 (a wingfoil arm with a working
WingFoil and MCP server), and follows adr-003.

Scope of F2.7:

- **The three operating manuals.** One fixed file per arm, published with the benchmark: it maps a
  step's intent to the harness's commands. For wingfoil: WingFoil's CLI and MCP tools, as `3df305e`
  offers them, including the approval commands the agent runs after the neutral approver's reply
  (REQ-RUN-17). For baseline and baseline-docs: no harness, so the manual is only what every arm shares.
  They are written against observed behaviour (task-011), not against WingFoil's documentation, and
  the approver reviews their text at this task's review gate, because they shape the results.
- **Activation (REQ-RUN-12).** Each arm's manual is copied as `CLAUDE.md` into the workspace, before
  the `seed` commit. Whether the pinned agent loads it with `--setting-sources project` is question 7
  of the spike.
- **Its size.** The manual's size in tokens is measured with a **fixed tokenizer approximation** and
  recorded per run in `run.json`, because a longer manual is also more context (experiment design §2).
  Which approximation, and how it is pinned so that it cannot drift between campaigns, is this task's
  design decision.
- **Identical prompts.** The step prompt is byte-identical in every arm, and the test proves it across
  the three arms rather than assuming it from the code path.
- **The shared project description.** The experiment design gives every arm "the same one-paragraph
  project description". The design decides where it comes from and how it is composed with the manual
  into `CLAUDE.md`. If the scenario format needs a new field for it, that is an amendment for the
  approver, not a silent addition.

Out of scope: the rules and decisions of a scenario (task-013, task-015), a competitor arm's manual
(v0.2), and the method page that publishes the manuals (W11).

**Done** means: `runner.feature` @F2.7 passes against the fake agent, with T1's step 1 prepared in the
three arms; tests, coverage and lint pass; the approver has reviewed the manuals' text.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `runner.feature` @F2.7 "Each arm is activated by its operating manual, and prompts stay identical" —
  identical prompt bytes in every arm, each arm's manual in its environment, each manual's size in
  tokens recorded with the run. **red-first**
- REQ-RUN-12 — the manual is `CLAUDE.md` in the workspace, and the token count is stable: the same
  manual gives the same count on every run. **red-first**
- REQ-FMT-05 — an arm whose `manual` names a missing file is rejected when the campaign is checked,
  not when the run starts. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
