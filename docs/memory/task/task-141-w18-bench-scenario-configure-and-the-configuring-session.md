---
id: task-141-w18-bench-scenario-configure-and-the-configuring-session
type: task
title: "W18: bench scenario configure and the configuring session"
status: backlog
release: v0.3
wave: W18
features: [F7.5]
acceptance:
  [
    "scenarios.feature#The configuring agent sees the seed and the installed harness only",
    "scenarios.feature#The configuring agent writes what it added or changed, and its record",
    "scenarios.feature#A configuring session's result is refused when it touches what is not configuration",
    "scenarios.feature#A configuring session that writes outside its configuration places is refused",
    "scenarios.feature#A configuration place over a seed file is refused for that version",
    "scenarios.feature#A harness arm's configuration places hold its project rules",
    "scenarios.feature#The configuring agent for Spec Kit on S8 sees S8's project rules",
    "scenarios.feature#A version a run has recorded is never configured again",
    "scenarios.feature#An existing configuration is kept unless replaced",
    "scenarios.feature#A version 1.0 is never configured",
    "scenarios.feature#The configuring session runs without the arm's manual and MCP server",
    "scenarios.feature#A configuring session killed at a cap writes its record only",
    "scenarios.feature#A configuring prompt that names a harness is refused before any session",
    "scenarios.feature#Without --allow-spending nothing runs",
    "scenarios.feature#A failed replacement keeps the configuration",
  ]
requirements: [REQ-CLI-14, REQ-RUN-20, REQ-FMT-04, REQ-FMT-05, REQ-NFR-01]
fixes: []
tags: ["v0.3","w18","f7.5"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, "Configured variants" (F7.5), delivery order item 4, second
half: [task-140](task-140-w18-configuration-places-the-configuring-profile-and-stored-configurations.md) gave the
configuration places, the configuring profile and prompt, and the loading of stored configurations, with no session
(the split is the approver's choice in chat, 2026-11-07). This task gives `bench scenario configure` (REQ-CLI-14) and
the configuring session (REQ-RUN-20): the session's workspace, its result's checks, the configuration's files, patch
and record, and the transcript. Then the configured arms and docs controls, then the configuring sessions (spending,
on consent), then every arm's dry run, W18's "Ends with".

Code and tests only, with runner doubles for Docker and the agent: no real-agent session, nothing spent; no scenario
version gains a configuration here, so no scenario hash changes. The command is built so that the later task's
sessions run it as it is.

## Acceptance criteria

Each scenario below is drafted in task-138 (requirements 1.50) and added to `scenarios.feature` with its test here,
red first, unless the implementation finds a wording to correct (recorded in Execution notes and in requirements
1.53 if a rule changes).

1. **Refusals before any session (red-first; REQ-CLI-14, REQ-RUN-20), each exit 1 with nothing written:**
   - without `--allow-spending`, with `campaign run`'s message ("Without --allow-spending nothing runs");
   - a version 1.0, naming the approver's choice ("A version 1.0 is never configured");
   - a version a run has recorded, under `results/dry-runs/` or a campaign's results, `--replace` or not ("A version a
     run has recorded is never configured again");
   - an existing configuration without `--replace` ("An existing configuration is kept unless replaced");
   - a prompt the scan refuses, naming the prompt ("A configuring prompt that names a harness is refused before any
     session");
   - a `configuration` glob that matches a seed file of the version, naming the glob and the file ("A configuration
     place over a seed file is refused for that version");
   - an arm that is not a harness arm, or one with no `configuration`, or one whose harness the profile does not pin;
   - usage errors exit 2.
2. **The profile's consistency (red-first; deferred from task-140's review round 1):** the profile's `harnesses` hold a
   pin for the harness arm's tool and its `caps` and `currency` load as a dry-run profile's do; the image is the one a
   campaign with the same agent and harness pins builds (REQ-RUN-01). The ceiling (`caps.run_cost_eur`) is printed
   before the session.
3. **What the session sees (red-first; REQ-RUN-20):** the workspace as a run of the harness arm leaves it before step
   1 (the seed, the arm's whole setup, the scenario's configuration for the base arm, the generated project rules),
   with the merged manual moved aside and no MCP server attached; nothing else of the scenario ("The configuring agent
   sees the seed and the installed harness only", "The configuring session runs without the arm's manual and MCP
   server", "The configuring agent for Spec Kit on S8 sees S8's project rules"). The one prompt is
   `configuring/prompt.md`.
4. **The result's checks (red-first; REQ-RUN-20, REQ-FMT-05 as amended in 1.50):** after the session, a file at the
   manual's path refuses the result; then the manual is restored and the workspace compared by git with the setup
   commit (tracked and non-ignored untracked files). The result is refused, naming every offending path, for a
   deleted file, a symbolic link, any path outside the `configuration` places or inside a `state` place, and a change
   to the members, roles or a member's roles ("A configuring session's result is refused when it touches what is not
   configuration", "A configuring session that writes outside its configuration places is refused"). A written
   project-rules file inside the places is accepted ("A harness arm's configuration places hold its project rules").
5. **What is written (red-first):** on `written`, the files to `arms/<harness>-configured/` at their workspace paths
   and the patch to `configured/<harness>-configured.patch`; on every outcome, the record appended to
   `configured/<harness>-configured.json` with the fields task-140's schema holds, never a credential; on `--replace`,
   the directory and patch replaced only when the new outcome is `written`, earlier records kept ("The configuring
   agent writes what it added or changed, and its record", "A failed replacement keeps the configuration"). A session
   killed at a cap, failed or interrupted writes its record only, counted at its bound with `cost_reported: false`
   when the agent reported none ("A configuring session killed at a cap writes its record only"). The version then
   loads with task-140's checks.
6. **The transcript (red-first; REQ-RUN-20, REQ-NFR-01):** kept, scrubbed of the credential as a run's is, at
   `results/configuring/<id>@<version>/<harness>/<n>/transcript.jsonl` (`<n>` the record's index), git-ignored.
7. **The record's order (red-first; deferred from task-140's review):** the loader refuses records whose dates are not
   in non-decreasing order.
8. Characterization: the published campaigns validate as on main; `scripts/pre-review.sh main` green; the full suites
   on the approver's go.

## Design

- **CLI:** `src/cli/configure.ts`, `bench scenario configure <id>@<version> --arm <harness> [--allow-spending]
  [--replace]`, parsed as `src/cli/dry-run.ts` parses its arguments; prints the ceiling, then the outcome, the files,
  the record's path and the cost.
- **Checks:** `checkConfigure(request, root)` in `src/runner/configure.ts`, as `checkDryRun`: loads the scenario
  version, the arm, the profile (`loadConfiguringProfile`), the prompt (`scanConfiguringPrompt`), and refuses as
  criterion 1 states. The recorded-run check reads the run records under `results/` for the scenario id and version.
- **Session:** `runConfigure(checked, options)` reuses the run's machinery rather than copying it: the container,
  workspace preparation and `executeSetup` from `src/runner/run.ts`, then one session through the step path with the
  configuring prompt, the manual moved aside and no MCP configuration. Where `run.ts` keeps a piece private, it is
  exported or moved, not duplicated.
- **Result:** `src/runner/configured-result.ts` computes the changed paths from git against the setup commit and
  classifies them with `isConfigurationPath` and the identity files (REQ-RUN-17); writes the files, the patch and the
  record (`configuredRecordSchema` from task-140).
- **Transcript:** under `results/configuring/`, added to `.gitignore`; scrubbed by the run's scrubber.
- Decisions found while building go to Execution notes; a rule that changes goes to requirements 1.53.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
