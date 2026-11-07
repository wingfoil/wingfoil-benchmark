---
id: task-140-w18-configuration-places-the-configuring-profile-and-stored-configurations
type: task
title: "W18: configuration places, the configuring profile and stored configurations"
status: pending
release: v0.3
wave: W18
features: [F7.5]
acceptance: []
requirements: [REQ-FMT-04, REQ-FMT-05, REQ-FMT-08, REQ-RUN-20]
fixes: []
tags: ["v0.3","w18","f7.5"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, "Configured variants" (F7.5), delivery order item 4: after
[task-138](task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5.md) (requirements 1.50 and the drafted
scenarios) and [task-139](task-139-bug-034-symlinks-spaces-and-line-endings-handled-one-way.md) (bug-034), the
configuring agent. Split in two at the approver's choice in chat (2026-11-07): this task gives the formats and their
loading, with no session; the next one gives `bench scenario configure` (REQ-CLI-14) and the session (REQ-RUN-20).
Then the configured arms and docs controls, then the configuring sessions (spending, on consent), then every arm's dry
run, W18's "Ends with".

Code, arm and repository files and tests only: no real-agent session, nothing spent; no scenario version gains a
configuration here, so no scenario hash changes. Adding `configuration` and `state` to the three harness arms'
`arm.yaml` changes their digests; the published campaigns pin theirs and read the arms from history (REQ-FMT-13 as
amended in 1.33), which the checks confirm.

## Acceptance criteria

<!-- Red first, each: a failing test before the code; `acceptance` lists the scenarios as they are written. The drafted
     scenarios that need the command or the configured arms are the next tasks'. -->

1. **Configuration places** (REQ-FMT-05 as amended in 1.50): a harness arm may declare `configuration` and `state`,
   lists of globs relative to the workspace, each with the documentation it is read from; the loader refuses, naming
   the field: `configuration` without `state` (an empty `state` stated so is accepted), a `configuration` glob that
   matches the manual's path, and places that do not include the path REQ-FMT-14's generator writes the project rules
   to for that tool (and `.wingfoil/directives/custom/` for wingfoil). A function that checks a `configuration` glob
   against a scenario version's seed files, naming the glob and the file, is given for the next tasks'
   `scenario configure` and `campaign validate`. Red first (unit tests).
2. **The three harness arms declare them**: wingfoil, speckit and openspec, read from each tool's documentation at
   the version the configuring profile pins, each glob with its source in a comment; that a `state` glob wins inside
   a configuration place is honoured (WingFoil's workflow instances and Memory). The pinned digests of the published
   campaigns still resolve.
3. **The configuring profile and prompt** (REQ-RUN-20): `configuring/profile.yaml` holds exactly `agent`,
   `models.default`, `harnesses`, `caps` and `currency`, each as a dry-run profile's; any other field
   (`approver_policy`, `arm_digests` included) is refused by its loader, naming it; Claude Code with
   `claude-sonnet-5-5`. `configuring/prompt.md` names no harness; the scan that `bench scenario configure` runs before
   any session (REQ-FMT-08 as amended in 1.50: the harness names, the oracle literals of the version, the hold-out's
   when a hold-out path is set) is given as a function, red first. The prompt's text is the approver's to read at the
   gate.
4. **A scenario version's configurations** (REQ-FMT-04 as amended in 1.50): loading reads `arms/<harness>-configured/`
   and `configured/`: the records file `configured/<harness>-configured.json` (each record's fields as REQ-RUN-20
   lists them, anything else refused), the configuration's record (the newest `written` one), and the directory
   holding exactly that record's files with their SHA-256; a configuration directory with no `written` record, a
   missing, extra or changed file, a version 1.0 holding either directory, and a symbolic link in either are refused,
   naming the path. Both directories are in the scenario's hash. Red first, scenarios (`scenarios.feature`): "A
   symbolic link in a configuration is refused", "A version 1.0 holding a configuration is refused".
5. **The leak scan covers a configuration** (REQ-FMT-08 as amended in 1.50): (a) every configuration file searched
   for the oracle literals, the hold-out's too when set; (b) every step prompt searched for the configuration's `.md`
   lines, read as a scenario's `arms/<arm>/` lines are; not searched for in the seed; messages name the file and the
   configuration, never the literal. Red first, scenario (`scenarios.feature`): "The leak scan covers a configuration".
6. Where a rule needs to be made precise while building, `requirements.md` records it in a 1.52 amendment; checks
   green (prettier, tsc, eslint, `scripts/pre-review.sh main`); an independent review (dl-020); the full suites on the
   approver's go.

## Design

<!-- Filled when the task starts. -->

## Execution notes

## Review
