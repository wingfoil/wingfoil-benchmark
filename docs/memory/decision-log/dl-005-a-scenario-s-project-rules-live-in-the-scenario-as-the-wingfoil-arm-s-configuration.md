---
id: dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration
type: decision-log
title: "A scenario's project rules live in the scenario, as the wingfoil arm's configuration"
status: pending
---

## Context

Found while planning wave W3 (arms) of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).

Scenario-specs kickoff decision **K3** ([scenarios/README.md](../../02_specification/scenarios/README.md))
says that a scenario's rules (directives, decisions to follow) live **only in the arm's environment**:
none in baseline, Markdown in baseline-docs, WingFoil directives and Memory in wingfoil. S8 depends on
it entirely: its four rules are what the scenario measures, and they differ from S1's, S2's and S3's.

The data formats give those rules no place:

- **REQ-FMT-04** (scenario file) has a seed, prompts and an oracle, and the seed must not state the
  rules (K3, S8 §3).
- **REQ-FMT-05** (arm definition, `arms/<arm>/arm.yaml`) is **per arm**, not per scenario: its
  `environment` is the same for every scenario the arm runs.
- **REQ-RUN-11** makes baseline-docs "a pure function of the wingfoil arm's configuration **and the
  scenario**", and experiment design §2 says it is generated from the wingfoil arm's configuration
  (DNA, directives, workflow descriptions). Both assume the scenario brings configuration of its own,
  without saying where it is.

`runner.feature` @F2.5 ("the wingfoil arm's configuration for S8") needs an answer before the W3 design.

## Decision

Accepted by the approver in the W3 plan phase (2026-09-25), from three options: configuration per
scenario in WingFoil's format (chosen); a harness-neutral rules file from which both the WingFoil
configuration and the Markdown are generated; an overlay per scenario inside `arms/wingfoil/`.

1. **A scenario's project rules live in the scenario directory, in WingFoil's own format**, under
   `scenarios/<id>/<version>/arms/wingfoil/`: the project's DNA, its directives and the decisions it
   must follow as WingFoil Memory. The exact file layout inside that directory is the layout WingFoil
   `3df305e` reads, and is settled by the W3 spike
   ([task-011](../task/task-011-wingfoil-in-the-run-container-spike.md)).
2. **It is outside the seed.** The seed stays rule-free (K3). The directory reaches a container only in
   the wingfoil arm, laid over the arm's own configuration by the arm's setup.
3. **baseline-docs is generated from it**, together with the wingfoil arm's own configuration
   (REQ-RUN-11). The baseline arm gets nothing from it.
4. **It is part of the scenario's version** (F3.4): changing a rule is a new scenario version, like
   changing a prompt.

The wingfoil configuration is the source, rather than a neutral file, because the experiment design
already names it as the source of baseline-docs, and because a translator into WingFoil's format would
be one more place where the two arms could drift apart. The parity of information is then a property of
the generator alone (experiment design §2).

## Consequences

- **REQ-FMT-04 is amended** (requirements 1.5) with the optional `arms/wingfoil/` directory of a
  scenario, and REQ-ARC-03 gets a note on it. The amendment is written in the design of
  [task-013](../task/task-013-wingfoil-under-test-and-approval-authority.md), the first task that
  reads the directory, and is a review decision on an approved document, recorded with the approver's
  reason.
- K3 is unchanged: the rules are still delivered only through the arm's environment. What changes is
  only where the benchmark keeps their source.
- The leak scan (F3.2, W4) must treat `arms/wingfoil/` like the oracle for the seed and the prompts:
  no rule text may appear in either, or the baseline arm would receive it.
- A competitor arm (v0.2) will need its own rendering of the same rules. That is a question for v0.2's
  specification, and this decision does not pre-empt it.
