---
id: task-140-w18-configuration-places-the-configuring-profile-and-stored-configurations
type: task
title: "W18: configuration places, the configuring profile and stored configurations"
status: in-progress
release: v0.3
wave: W18
features: [F7.5]
acceptance:
  [
    "scenarios.feature#A symbolic link in a configuration is refused",
    "scenarios.feature#A version 1.0 holding a configuration is refused",
    "scenarios.feature#The leak scan covers a configuration",
  ]
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

- **Globs** (`src/core/glob.ts`): `*`, `?` and `**` (a whole segment), a trailing `/` for a directory; a dot segment
  is matched like any other (`path.matchesGlob` skips them, and a tool's state may live in one). Anything else
  (classes, braces, `..`, absolute paths, backslashes, empty segments) is refused when the arm is loaded.
- **Places** (`src/core/arm.ts`, `src/arms/load.ts`, `src/arms/places.ts`): `configuration` and `state` are lists of
  `{glob, source}`. Beyond 1.50's rules, `state` without `configuration` and places on an arm with no `requires` are
  refused, so that the fields mean one thing. The manual's paths are every agent profile's `manualFile` (`CLAUDE.md`,
  `AGENTS.md`), a test keeping the two lists equal. The project rules' place is checked by a probe path:
  REQ-FMT-14's generator path for Spec Kit and OpenSpec, a file under `.wingfoil/directives/custom/` for WingFoil; it
  must be configuration and not state. `isConfigurationPath` (state wins) and `seedClashes` (glob and file) are for the
  next tasks' session and `campaign validate`.
- **The arms' places**: read by a read-only helper agent from each tool's material in a temporary directory (WingFoil
  v0.3.1's tree, exported by `git archive`; the Spec Kit wheel and the OpenSpec package from `.cache/harnesses/`; the
  setup patches of the latest dry run of each arm), spot-checked by hand. WingFoil: `.wingfoil/**` (its own documents
  keep every configuration there), state `docs/memory/**` and `docs/runs/**`. Spec Kit: the constitution, template
  overrides, presets, extensions, `extensions.yml`, workflows, the init options, the integration file and its skills
  under `.claude/skills/speckit-*/`; the scripts, templates and manifests init installs are the tool's own files.
  OpenSpec: `openspec/config.yaml` (and `.yml`), `openspec/schemas/**`, its commands and skills under `.claude/`;
  state its changes and specs. Left out on purpose: `.mcp.json` (the arm's MCP server is the runner's, from
  `mcp.json`), `.claude/settings.json` and a whole `.claude/**` (Claude Code's own settings, hooks and permissions,
  which no harness's documentation names as its configuration).
- **The profile and the prompt** (`src/core/configuring.ts`, `src/scenario/configuring.ts`, `configuring/`): the
  profile's schema picks a campaign's `harnesses`, `agent`, `caps` and `currency`, and a single `models.default`. Its
  pins are campaign-008's agent (Claude Code 2.1.300) and the three arms' tool versions; caps and rate are the dry-run
  profile's (a session's ceiling is `run_cost_eur`, 5 EUR). The prompt names no tool, describes what configuration is
  in general terms and lists what the session must not touch, REQ-RUN-20's refusals in plain words.
- **Stored configurations** (`src/core/configured.ts`, `src/scenario/configurations.ts`): `arms/<name>-configured/`
  directories are configurations, kept out of `armDirs` (the runner copies those by arm name, and the leak scan reads
  their lines in the seed) and loaded into `Scenario.configurations`. The record file is a JSON array, oldest first;
  `usage` has a step's shape (`SessionUsage`). A record states its own consistency: a `written` one lists files and
  reported its cost; only it lists files; a `refused` one has a reason. `configured/` holds `<name>.json` and
  `<name>.patch` only. `configured/` joins the hidden paths of the overlap check. The scenario hash already covered
  both directories.
- **The leak scan** (`src/scenario/leak-scan.ts`): the oracle and hold-out sources are kept apart from the arms' lines;
  prompts are searched for all of them and the configurations' lines, the seed for the first two, each configuration
  file for the oracle and hold-out literals only.

## Execution notes

- Red first: the unit tests of each criterion (globs, places, the arms' places, profile and prompt scan, stored
  configurations, leak scan) failed before their code. **Departure:** the three acceptance scenarios were written
  after the code of criteria 4 and 5, so they passed when added, as in task-139; the unit tests stated the same
  behaviour red first.
- The published campaigns' pins (criterion 2): `bench campaign validate` on each of the 13 campaign files (dry-run
  profiles aside), on main and on the branch, outputs compared by a script: 13 of 13 exit 0 on both; the branch's
  output adds 4 lines and removes none, `arm speckit` and `arm openspec` each read twice from the commit that holds
  its pinned digest (two campaigns pin them). No campaign file was changed.
- The arms' places were read by a read-only helper agent from a temporary directory holding the three tools' material
  (no command in WingFoil's checkout but one `git archive v0.3.1`, nothing written there); its citations were
  spot-checked (WingFoil's pillars table and spec-011's `.wingfoil/` rule, OpenSpec's project schemas directory, Spec
  Kit's template resolution order).
- `requirements.md` 1.52 records what was made precise (REQ-FMT-04, REQ-FMT-05, REQ-RUN-20).
- For the approver at the gate: the prompt's text (`configuring/prompt.md`); the places left out (`.mcp.json`,
  `.claude/settings.json`, a whole `.claude/**`); the profile's 5 EUR ceiling per session (the dry-run profile's cap).
- No real-agent session, nothing spent; no scenario version holds a configuration.

## Review

### Round 1 (a fresh read-only agent, clone `/tmp/claude-1000/review1-t140-*`, at `162975ca`)

Main's HEAD and reflog the same before and after (`d989138f`).

| Severity   | Finding                                                                                         | Outcome                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| should-fix | A `configured` that is a file crashed the loader (`ENOTDIR`)                                    | Refused, named; red test first                                                                                |
| should-fix | The open-fence rule reaches a configuration, which 1.52 did not state                          | Kept and stated in 1.52 (REQ-FMT-04): the session refuses such a result (next task); characterization test    |
| should-fix | No test for `configured/` among the paths a seed or a prompt must not overlap                  | Test added (characterization: the code already refused it)                                                    |
| nit        | An orphan patch was accepted                                                                    | Refused, named; 1.52; red test first                                                                          |
| nit        | A record's file paths: duplicates, `..`, absolute paths, backslashes accepted; dates not ordered | Paths refused (red tests first), 1.52; the order of dates left to the next task, which appends the records    |
| nit        | A `.` segment passed the glob check and never matched                                           | Refused; 1.52; red test first                                                                                 |
| nit        | WingFoil's rules place checked by one probe file                                                | A nested probe added (red test first), 1.52; a state glob over part of the place stays allowed (task-138's drafted scenario has one) |
| nit        | The profile loader does not check `harnesses` keys or the effort against `models.default`      | Left to the next task's command, which reads the profile with the arms; noted here                            |
| nit        | The prompt's step 2 could lead the agent to the agent's own settings, outside every place      | A line added: new files only where the tool's documentation puts its configuration, not the agent's settings or MCP setup |

