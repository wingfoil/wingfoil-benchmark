---
id: task-141-w18-bench-scenario-configure-and-the-configuring-session
type: task
title: "W18: bench scenario configure and the configuring session"
status: done
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

- Red first: the fifteen scenarios and their tests were committed failing (`be4b8aca`), then the unit tests
  (`3769007c`); every one failed before its code but the transcript's ignore rule, which `.gitignore` already held
  (`results/**/transcript.jsonl`, `/runs/`): a characterization test.
- **Two drafted wordings corrected** (task-138's draft): WingFoil keeps its members and their roles in
  `.wingfoil/dna.yaml` (`team.members`, `team.roles`), not in `roles.yaml`, which binds directives to roles; the two
  examples of "A configuring session that writes outside its configuration places is refused" name `dna.yaml`. "A
  configuration place over a seed file is refused for that version" runs on S8 1.1: S1 1.1's seed has no `src/`, so
  `src/**` matched none of its files.
- **Reuse of the run's code** (`src/runner/run.ts`): the image build (`buildRunImage`) and the container's opening
  (`openContainer`: create, mount check, start, the agent's files) moved out of `executeRun`, which now calls them;
  `executeSetup`, `executeStep`, `setupFailure`, `remove`, `secretsNow` and `containerPrefix` exported. `executeStep`
  takes an optional policy (absent, nothing the session says is answered) and pins of its own shape (`StepPins`:
  agent, caps, currency), since the configuring profile has no approver policy. `portsFor` and `checkSpending` take
  the pins they read.
- **The session's workspace and output** go under `runs/configuring/<id>@<version>/<harness>/<n>/`, git-ignored as a
  run's; the transcript alone is copied, scrubbed, to `results/configuring/…/<n>/transcript.jsonl`.
- **Git**: `GitPort.changesBetween` (`git diff --raw --no-renames -z`) lists the paths the result differs by from the
  setup commit, after the restored manual and a `configured` commit; its mode tells a symbolic link or a submodule.
- **Found while building, in requirements 1.53**: the record's schema of 1.52 took a 40-character harness commit only,
  and OpenSpec's, fetched from the npm registry, is its tarball's SHA-256 (64): a session on OpenSpec could not have
  written its record. Also made precise: the session's outcomes and an unreported cost, a result that changes nothing
  (refused), the members and roles compared as sets, no record for a failure before the session, the transcript's
  `<n>` from 1, the session's workspace, the records' order and clock, and `--allow-spending` whatever the agent.
- Characterization (criterion 8): `bench campaign validate` on each of the 13 campaign files (dry-run profiles aside),
  on main and on the branch, outputs compared by a script: 13 of 13 exit 0 on both, the outputs identical.
- Checks: prettier, tsc and eslint clean; `scripts/pre-review.sh main` green on its second run (the first was red on
  `test/bin/bench.test.ts`, which pins the usage text, fixed in `d58760ca`); beside it, `test/unit/campaign`,
  `architecture`, `docs`, `arms`, `agents`, `scenarios` and every acceptance test green.
- No real-agent session, nothing spent; no scenario version gained a configuration, so no scenario hash changed.
- Full suites at `db00b495`: LINT 0, TEST 0, BUILD 0, BIN 0, DOCKER 0; unit 2260 passed and 10 skipped of 2270, in
  133 files.

## Review

### Round 1 (a fresh read-only agent, clone `/tmp/claude-1000/review1-t141-*`, at `88a7ba8b`)

Main's HEAD and reflog the same before and after (`3480f228`).

| Severity   | Finding                                                                                              | Outcome                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| should-fix | Only the patch was scrubbed: a configuration file holding the credential would be committed          | Such a file refuses the result, named (1.53); the reason scrubbed; tests of transcript, patch, record   |
| should-fix | A failure after the session returned counted the session at its bound, over the reported usage       | The reported usage stands once the step returned (1.53); test                                           |
| should-fix | A failure before the session left `runs/configuring/…/<n>/`, which refused the next session          | What it made under `runs/` is removed (1.53); test                                                      |
| should-fix | Untested: `interrupted`, `failed`, an unreported cost, an empty result, no record before the session, a `--replace` that writes | Tests added; the first four passed on the earlier code (characterization), the others failed first      |
| nit        | A type change to a regular file was accepted                                                         | Refused (1.53); test                                                                                    |
| nit        | An executable configuration file lost its mode                                                       | Kept (1.53); test                                                                                       |
| nit        | The manual was restored on `written` only                                                            | Restored on every outcome; test                                                                         |
| nit        | A record that failed its check lost the transcript                                                   | The transcript is written first                                                                         |
| nit        | The record's reason was not scrubbed                                                                 | Scrubbed                                                                                                |
| nit        | No `--strict-mcp-config` without an MCP server: a seed's `.mcp.json` would be read                   | Left: no seed holds one; noted for the configured arms' task                                            |
| nit        | `filesUnder` a third time; the spending block of dry-run copied                                      | `relativeFiles` exported and reused; `spendingOptions` shared by both commands                          |
| nit        | A line of 122 characters                                                                             | Wrapped                                                                                                 |
| nit        | No Codex scope or MCP checks, as dry-run has                                                         | Left: the profile pins Claude Code only (REQ-RUN-20)                                                    |

### Round 2 (a fresh read-only agent, clone `/tmp/claude-1000/review2-t141-*`, at `f39224db`)

Round 1's outcomes verified, each fix broken in turn and caught by its test, but the reason's scrub. Main's HEAD and
reflog the same (`3480f228`).

| Severity   | Finding                                                                                            | Outcome                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| should-fix | The removal of `runs/configuring/…/<n>/` on a failure before the session could remove the directory of a concurrent invocation of the same session | The directory is claimed at the start (`mkdir`, refused on EEXIST) and removed only by its claimant; test, red first |
| should-fix | The reason's scrub had no test                                                                     | Test; it fails with the scrub removed                                                       |
| nit        | A blank secret would refuse any file with a space; a binary file read as text                     | Blank values ignored, as the scrubber does; the file searched as bytes                      |
| nit        | `### Amendment 1.53`'s summary missed round 1's rules                                              | Added                                                                                       |
| nit        | The CLI's comment said a throw means no session                                                    | Reworded: or its record could not be written                                                |
| nit        | A test titled "refused" ran a failed session                                                       | Retitled                                                                                    |

### Round 3 (a fresh read-only agent, clone `/tmp/claude-1000/review3-t141-*`, at `d1903129`)

Round 2's outcomes verified by mutation, one at a time; no new correctness bug. Main's HEAD and reflog the same
(`3480f228`).

| Severity   | Finding                                                                                 | Outcome                                                                       |
| ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| should-fix | The blank-secret test passed without the `trim()` (the clean file held no space)        | The clean file holds a space; the test fails with the filter reverted         |
| nit        | The leftover's messages told to remove what may be a running session's directory        | Both say a session may be running: remove it once none runs                   |
| nit        | The parents' `mkdir` was outside the claim's message                                    | Inside it                                                                     |
| nit        | The session's log line came before the claim                                            | After it                                                                      |
| nit        | 1.53 did not state the claim                                                            | Stated in REQ-RUN-20 as amended in 1.53                                       |

### Round 4 (a fresh read-only agent, clone `/tmp/claude-1000/review4-t141-*`, at `57d4c9c8`)

Round 3's outcomes verified (the blank-secret test fails with the filter reverted); nits only, so no further round.
Main's HEAD and reflog the same (`3480f228`).

| Severity | Finding                                                                                   | Outcome                                             |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| nit      | The log line after the claim, and the parents' mkdir inside it, untested                  | The claim's test asserts nothing was logged         |
| nit      | A file where a parent directory should be gave the running-session message                | That message only when the claimed directory exists |
