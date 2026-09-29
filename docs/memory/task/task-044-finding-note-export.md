---
id: task-044-finding-note-export
type: task
title: "Finding note export"
status: pending
release: v0.1
wave: W10
features: [F5.4]
acceptance: [results.feature]
requirements: [REQ-CLI-07, REQ-RES-05, REQ-FMT-07]
---

## Context

Third and last task of wave **W10 — Determinism and findings** of release v0.1
([rel-v0-1](../release/rel-v0-1.md)). The W10 plan-phase decisions are in
[task-042](task-042-determinism-metrics-across-repetitions.md). This task delivers **F5.4 finding note**:
it exports a finding (campaign, scenario, runs, evidence) in a form that can be copied into a WingFoil bug
or decision-log (features 1.2, J4.3). With it, the wave's "Ends with" can be checked: "a first finding
note ready for WingFoil".

What exists:

- `aggregate.json` per campaign execution: every value with its runs and `n` (REQ-FMT-07), per group of
  scenario, version, arm and model; the break-even pairs each arm with the baseline; M-R1–M-R3 after
  task-042.
- `run.json` records the WingFoil commit the wingfoil arm ran (`harness.commit`).
- `bench run show` (task-043) opens the runs a note names.

Scope:

- **`bench finding <campaign-id>/<n> --scenario … --metric … --arms …`** (REQ-CLI-07) writes
  `findings/<id>.md` in this repository, and nothing anywhere else: never the WingFoil repository.
- **The note** is Markdown with REQ-RES-05's fixed sections: campaign, WingFoil commit, scenario@version,
  runs, metric values, links. Concretely:
  - the campaign id and execution, and the model;
  - the WingFoil commit of the wingfoil arm's runs;
  - the metric's value in each named arm, with `n`, `preliminary` when n = 1, and the losses;
  - the runs each value comes from;
  - links: each run's path and the `bench run show` command that opens it (W10 decision 3), and
    `bench run compare` for a pair of arms.
  - a section shaped to be copied into a WingFoil `bug` or `decision-log` element (which one, and its
    fields, is the design's, from WingFoil's element templates at the pinned commit).
- **The finding id** and what happens when `findings/<id>.md` already exists are the design's. The same
  inputs give the same note bytes, apart from a creation date recorded as metadata (REQ-SCO-03's spirit).
- **Errors:** an unknown scenario, metric or arm, an execution not aggregated, or a metric with no value
  for an arm (for example M-R with `n = 1`) are refused or stated, naming what is missing.
- **Acceptance:** `results.feature` @F5.4 "A finding note is ready to become a WingFoil bug or
  decision-log", with a test titled `@F5.4 <Scenario name>`.

Out of scope:

- Choosing which difference is a finding: the maintainer does, by the command's arguments.
- Filing the finding in WingFoil: the maintainer copies it, by hand.
- A finding on the site: W11.

**Done** means:

- `bench finding` writes a note from a scored, aggregated execution, with every section of REQ-RES-05.
- The @F5.4 scenario is green.
- Tests, coverage and lint pass; `npm run test:bin` covers the command.
- The wave check (task-042, decision 2) writes the first note from the declared synthetic execution, and
  records it in rel-v0-1's W10 section.

## Acceptance criteria

Classified in the design phase.

- `results.feature` @F5.4 "A finding note is ready to become a WingFoil bug or decision-log": the campaign
  identity, the WingFoil commit, the scenario and version, the runs involved, the metric values and links
  to the run details; written as a file in the benchmark repository; nothing written to the WingFoil
  repository.
- REQ-CLI-07: an unknown scenario, metric or arm is refused, naming it.
- An execution with no `aggregate.json` is refused.
- A metric with no value for an arm is stated in the note (`n = 1`, not reached), never invented.
- The same inputs give the same note, apart from its creation date.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
