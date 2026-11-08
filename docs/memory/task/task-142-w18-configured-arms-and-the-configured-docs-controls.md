---
id: task-142-w18-configured-arms-and-the-configured-docs-controls
type: task
title: "W18: configured arms and the configured docs controls"
status: approved
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
requirements: [REQ-FMT-01, REQ-FMT-04, REQ-FMT-05, REQ-FMT-06, REQ-FMT-13, REQ-RUN-03, REQ-RUN-11, REQ-SCO-08,
  REQ-SCO-14, REQ-RES-09, REQ-CLI-05, REQ-CLI-14]
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

- Red first: the ten scenarios went into their `.feature` files with their tests in
  `test/acceptance/configured-arms.test.ts` (commit `9f44336c`, the six arm directories with them), all failing before
  the code (`f6cd1fcf`). The unit tests of the edge cases (`test/unit/arms/configured-arm.test.ts`,
  `test/unit/runner/configured-pins.test.ts`, `test/unit/runner/configured-run.test.ts`, one in
  `test/unit/cli/configure.test.ts`) came after the code: characterization of it, not red first.
- Scenario wordings kept as task-138 drafted them. Two scenarios' tests read beyond the drafted text: the setup page of
  a configured arm is checked on the page `setupHtml` renders for the loaded arm (its base arm's script, manual link and
  rules), not on a whole site build; M-K3 is checked in two halves, the runner recording the configuration's cost in
  `run.json` and the aggregate reading it.
- **Decisions** (requirements 1.54): `run.json` records `configured` (`of`, `records`, `cost_eur`) for a configured
  arm and a configured docs control, and M-K3 reads it, so that an execution aggregates from its results alone; a dry
  run of a configured arm or docs control is refused as `validate` refuses a campaign's; `bench scenario configure`
  refuses a configured arm as `--arm`.
- **Where the code reads a configured arm as its base arm:** `baseArmOf` (`src/core/arm.ts`) keys the `harnesses`
  entry (harness coverage, eligibility, the harness build, the estimate's provenance, a dry run's key) and the
  scenario's base configuration (the run's setup, the docs control's snapshot). `campaignConsistency` accepts a
  `harnesses` entry for the base of a configured arm the campaign runs, run or not; harness coverage refuses an entry
  named by the configured arm itself.
- **History:** a pinned configured arm is read from the newest commit whose two directories digest to the pin, both
  written under `.cache/arms/<commit>/` (`armFromHistory`); the site's `recordedArm` reads both the same way. The
  commits searched touch the configured arm or any base an `arm.yaml` of its history names, so a configured arm since
  removed or rebased still resolves. The site's commits come from separate `commitsTouching` calls, merged: when the
  arm and its base changed in different commits, the commit it reports among identical matches need not be the newest.
- **Site:** a configured arm's manual page and recorded manual are its base arm's `manual.md` (REQ-FMT-05 as amended
  in 1.50); its setup page names the base arm's directory and the configuration's copy; the method page's harness line
  counts the configured arm's runs under the entry it shares. Checked by a site build of an execution that ran
  `wingfoil-configured` (`test/unit/site/configured-site.test.ts`).
- **Guards:** a configured arm whose version holds no configuration fails its run before its workspace is made,
  rather than running as its base arm; the docs control's snapshot refuses rules other than the record's, as the run
  does.
- **Beyond the scope, noted:** the contest form's arm options gained the three configured arms, since a unit test
  holds them to every harness arm of the repository; asking whether the setup or the configuration is contested stays
  with the later publishing task. The `execution()` helper of `test/unit/results/aggregate.test.ts` moved to
  `test/support/aggregate-fixture.ts` (with a version and extra `run.json` fields) to serve the acceptance tests.
- Characterization (criterion 8): `bench campaign validate` on each of the 13 campaign files (dry-run profiles aside),
  on main and on the branch, outputs compared by a script: 13 of 13 exit 0 on both, the outputs identical. No existing
  arm's file changed, so no existing digest.
- No real-agent session, nothing spent; no scenario version gained a configuration.
- Full suites at `6878253a`: LINT 0, TEST 0, BUILD 0, BIN 0, DOCKER 0; unit 2291 passed and 10 skipped of 2301, in
  138 files.

## Review

### Round 1 (a fresh read-only agent, clone `/tmp/claude-1000/review1-t142-*`, at `4f5518e4`)

Main's HEAD and reflog the same before and after (`22fb17c1`).

| Severity   | Finding                                                                                              | Outcome                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| blocker    | The method page read a configured arm's manual at `arms/<arm>-configured/manual.md`, which never exists: a site build of an execution that ran one failed | The base arm's manual, as recorded; a site build of such an execution tested, failing first             |
| should-fix | `armFromHistory` and `recordedArm` searched the base's commits only when the working tree still had the configured arm | Every base an `arm.yaml` of the arm's history names; test of a removed configured arm, both readers   |
| should-fix | Two writers of the same configured arm could race on the base's directory, the loser throwing        | A base already in place, the same commit's, is used                                                     |
| should-fix | The method page's harness line counted only the base arm's own runs                                  | The configured arm's runs counted; asserted by the site build                                           |
| should-fix | "Before the setup commit" was checked after it, in the patch double                                 | Read at `commitAll('setup')`; a copy moved after the commit fails the test                              |
| should-fix | Untested: the dry run's refusal, `recordedArm`'s configured branch, the base digest from the history | Tests added (characterization of the code they test)                                                    |
| nit        | The setup page named `arms/<arm>-configured/` as the script's directory                              | Names the base arm's, and the configuration's copy                                                      |
| nit        | `campaignConsistency` accepts a base's `harnesses` entry by the configured arm's name alone          | Left: harness coverage checks it against the arm's definition                                           |
| nit        | The record's harness version compared as a string, so `v0.3.1` and `0.3.1` differ                   | Left: the record and the campaign pin the same tool by the same profile's spelling                     |
| nit        | `configuredOfIn` repeated the arm-name pattern                                                       | `ARM_NAME` imported                                                                                     |
| nit        | Two comment lines over 120 characters                                                                | Wrapped                                                                                                 |
| nit        | `configured.of` sliced from the name for a configured arm                                            | Its `configuredOf`; a docs control's still from the configured arm's name, as the suffix rule fixes it  |

### Round 2 (a fresh read-only agent, clone `/tmp/claude-1000/review2-t142-*`, at `60aff914`)

Main's HEAD and reflog the same before and after (`22fb17c1`). Every round-1 outcome verified, each fix's test failing
without it.

| Severity   | Finding                                                                                              | Outcome                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| should-fix | A `harnesses.<x>` entry passed when `<x>-configured` was a docs control's name: round 1's "harness coverage checks it" did not hold | `validate` refuses an entry no arm reads by its name or as a configured arm's base; test              |
| should-fix | The loader accepted a configured arm named other than `<base>-configured`, which every reader keys on | Refused, naming `configured_of`; test                                                                   |
| nit        | The configured arm's directory went into place before its base, so a concurrent reader rewrote it    | The base first                                                                                          |
| nit        | Three message lines over 120 characters                                                              | Split                                                                                                   |

### Round 3 (a fresh read-only agent, clone `/tmp/claude-1000/review3-t142-*`, at `61279e39`)

Main's HEAD and reflog the same before and after (`22fb17c1`). Every round-2 outcome verified; the 13 campaign files
validate with the same ids at `22fb17c1` and on the branch. Nits only: no further round.

| Severity | Finding                                                                                                  | Outcome                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| nit      | A base directory already in `.cache/arms/<commit>/` is kept unchecked, while a stale arm is replaced     | Left: reachable only by editing the cache, and the pinned digest check still refuses the result     |
| nit      | `campaignConsistency` checks a base's `harnesses` entry by name, `checkCampaign` by the arms' definitions | A comment on the first names the second                                                             |

