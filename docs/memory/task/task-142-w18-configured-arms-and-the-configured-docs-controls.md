---
id: task-142-w18-configured-arms-and-the-configured-docs-controls
type: task
title: "W18: configured arms and the configured docs controls"
status: backlog
release: v0.3
wave: W18
features: [F7.5]
acceptance:
  [
    "competitors.feature#A configured arm declares only its name and its base",
    "runner.feature#A configured arm runs its base arm with the scenario's configuration over it",
    "runner.feature#A configured arm's copy comes after the project rules and before the setup commit",
    "campaign.feature#A configured arm on a version with no configuration is refused",
    "campaign.feature#A campaign over a configuration place that matches a seed file is refused",
    "campaign.feature#A campaign whose pins differ from the configuration's record is refused",
    "campaign.feature#A campaign whose configurations disagree with their pins is refused",
    "competitors.feature#A configured docs control is generated from the configured arm",
    "scoring.feature#The configuring cost counts once in M-K3, every session's",
    "results.feature#A configured arm is compared with its configured docs control",
  ]
requirements: [REQ-FMT-01, REQ-FMT-04, REQ-FMT-05, REQ-FMT-13, REQ-RUN-03, REQ-RUN-11, REQ-SCO-08, REQ-SCO-14,
  REQ-RES-09]
fixes: []
tags: ["v0.3","w18","f7.5"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, "Configured variants" (F7.5), delivery order item 4, third
part. [task-140](task-140-w18-configuration-places-the-configuring-profile-and-stored-configurations.md) gave the
configuration places, the configuring profile and prompt, and the stored configurations;
[task-141](task-141-w18-bench-scenario-configure-and-the-configuring-session.md) gave `bench scenario configure` and
the configuring session. This task gives what runs a configuration: the configured arms `wingfoil-configured`,
`speckit-configured` and `openspec-configured` (REQ-FMT-05 as amended in 1.50), their runs (REQ-RUN-03 as amended in
1.50), the campaign checks on them (REQ-FMT-01 as amended in 1.50), the configured docs controls
`baseline-docs-configured`, `speckit-docs-configured` and `openspec-docs-configured` (REQ-RUN-11 as amended in 1.50),
M-K3's one-off part (REQ-SCO-08 as amended in 1.50) and the harness-versus-docs pairing with the setup page.

Then the configuring sessions (spending, on the approver's consent), then every arm's dry run, W18's "Ends with". The
two publishing scenarios task-138 drafted, "The contest form covers a configured arm's configuration" and "The method
page states the configuring agent and each configuration", are left to a task after the sessions, when the method page
has configurations to state.

Code, arm files and tests only, with runner doubles for Docker and the agent and fixture configurations: no
real-agent session, nothing spent; no scenario version gains a configuration here, so no scenario hash changes. The
rules are requirements 1.50 and 1.52; a wording or rule the implementation corrects goes to Execution notes and to
requirements 1.54.

## Acceptance criteria

Each scenario is drafted in task-138's Execution notes and added to the named `.feature` with its test here, red
first, unless the implementation finds a wording to correct.

1. **The configured arm's definition (red-first; REQ-FMT-05 as amended in 1.50):** `arms/<harness>-configured/arm.yaml`
   declares `name` and `configured_of` only; a `configured_of` that names no harness arm or names a configured arm, and
   any other field (`setup`, `manual`, `environment`, `mcp`, `requires`, `telemetry_off`, `provides`, `verdict_hook`,
   `docs_of`, places), are refused naming the field ("A configured arm declares only its name and its base"). Loaded,
   it reads as its base arm with its own name. The three arm directories are added.
2. **Its digest (red-first; REQ-FMT-13 as amended in 1.50):** covers its own files and its base arm's, so a change to
   either changes it; a pinned digest resolves from history to both directories, as a docs control's covers the
   manual of `baseline-docs`. Every existing arm's digest is unchanged (characterization).
3. **Its run (red-first; REQ-RUN-03 as amended in 1.50):** the base arm's whole setup runs as for the base arm (the
   scenario's configuration for the base arm copied to `~/scenario`, never the configured one), then the manual's
   merge and the project rules' generation, then the scenario version's `arms/<harness>-configured/` copied over the
   workspace, then the setup commit, so `setup/diff.patch` holds the configuration ("A configured arm runs its base
   arm with the scenario's configuration over it", "A configured arm's copy comes after the project rules and before
   the setup commit"). A run whose generated rules' SHA-256 differs from the record's is refused before step 1, naming
   the arm. The run records the configured arm's name and its base.
4. **The campaign's checks (red-first; REQ-FMT-01 as amended in 1.50):** `validate` refuses, naming the scenario, the
   arm and the field: a configured arm or its docs control on a version that holds no configuration for it; a
   configuration place of the base arm over a seed file of the version; a record's harness pin that differs from the
   campaign's `harnesses` entry of the base arm; a record's base-arm digest that the configured arm's pinned digest
   does not resolve; records of one campaign with different prompt SHA-256 or profile SHA-256, or a SHA-256 held by no
   commit ("A configured arm on a version with no configuration is refused", "A campaign over a configuration place
   that matches a seed file is refused", "A campaign whose pins differ from the configuration's record is refused",
   "A campaign whose configurations disagree with their pins is refused"). The configured arm shares its base arm's
   `harnesses` entry and declares none of its own. The published campaigns validate as on main (characterization).
5. **The configured docs controls (red-first; REQ-RUN-11 as amended in 1.50):** the three arm directories, each
   `docs_of: <harness>-configured` with the manual of `baseline-docs` (and `docs_directives` as `baseline-docs`
   declares it for `baseline-docs-configured`); generated by the harness's generator from the configured arm's
   workspace after its setup and the configuration's copy; refused, as a run is, when the generated project rules
   differ from the record's ("A configured docs control is generated from the configured arm").
6. **M-K3 (red-first; REQ-SCO-08 as amended in 1.50):** the sum of `cost_eur` over every record of the scenario version
   and harness, counted once in the M-K3 of the configured arm and of its configured docs control, never in the base
   arm's ("The configuring cost counts once in M-K3, every session's").
7. **Pairing and the setup page (red-first; REQ-SCO-14, REQ-RES-09):** the harness-versus-docs comparison pairs each
   configured arm with its configured docs control; the site gives a configured arm a setup page with its base arm's
   manual and setup script ("A configured arm is compared with its configured docs control").
8. Characterization: the published campaigns validate as on main; `scripts/pre-review.sh main` green; the full suites
   on the approver's go.

## Design

- **Arm files:** `arms/{wingfoil,speckit,openspec}-configured/arm.yaml` (`name`, `configured_of`) and
  `arms/{baseline,speckit,openspec}-docs-configured/` (`arm.yaml` with `docs_of`, setup and manual as the existing
  docs controls hold them).
- **Loading:** `src/core/arm.ts` gains `configured_of` (schema and `Arm.configuredOf`); `src/arms/load.ts` refuses
  every other field beside `name` on a configured arm and returns the base arm's definition under the configured name.
  `src/arms/digest.ts` and `src/arms/history.ts` cover both directories; `src/runner/pinned-arm.ts` resolves them.
- **Run:** `src/runner/run.ts` copies `scenarios/<id>/<version>/arms/<arm>/` for a configured arm after the project
  rules and before the setup commit, reusing the workspace copy (`src/runner/workspace.ts`); the rules' SHA-256 is
  compared with the newest `written` record's (`loadConfigurations`, task-140).
- **Campaign:** the checks in `src/runner/campaign.ts`, beside the docs controls' checks; the seed clash reuses
  task-141's `seedClashes`; the records read through `loadConfigurations`.
- **Docs controls:** `src/runner/project-rules.ts` and `src/arms/docs-controls.ts` generate from the configured arm,
  whose capture includes the configuration's copy.
- **Aggregation and site:** M-K3 in `src/results/aggregate.ts` (REQ-SCO-08's function) reads the records;
  REQ-SCO-14's pairing keys on `docs_of`, which names the configured arm; `src/site/method.ts`'s setup pages read the
  base arm's files for a configured arm.
- Left out: task-141's review nit (no `--strict-mcp-config` without an MCP server, so a seed's `.mcp.json` would be
  read) concerns every arm's runs, not configured ones; no seed holds one. A change is the approver's call.
- Decisions found while building go to Execution notes; a rule that changes goes to requirements 1.54.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
