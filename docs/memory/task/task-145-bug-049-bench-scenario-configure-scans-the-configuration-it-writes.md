---
id: task-145-bug-049-bench-scenario-configure-scans-the-configuration-it-writes
type: task
title: "bug-049: bench scenario configure scans the configuration it writes"
status: in-progress
release: v0.3
wave: W18
features: [F7.5]
acceptance:
  - "scenarios.feature#A configuration that leaks is reported by the configure that wrote it"
  - "scenarios.feature#A configuration holding a literal of the hold-out is reported the same way"
requirements: [REQ-CLI-14, REQ-FMT-08]
fixes: [bug-049-bench-scenario-configure-writes-a-configuration-without-scanning-it-for-leaks-so-a-leaking-one-is-found-only-by-a-later-validate-or-dry-run]
tags: ["v0.3","configured","leak-scan"]
---

## Context

[bug-049](../bug/bug-049-bench-scenario-configure-writes-a-configuration-without-scanning-it-for-leaks-so-a-leaking-one-is-found-only-by-a-later-validate-or-dry-run.md),
approved by the approver on 2026-11-12, fix 1, to be done now, before W18's publishing task.
`bench scenario configure` (REQ-CLI-14) scans the configuring prompt before any session and checks the session's
changes for offences (the secrets among them) before writing, but the configuration it writes is leak-scanned only
by a later `bench scenario validate` or dry run. In task-143 that is how bug-047 surfaced: two configurations
`configure` had reported as written were refused by the suites after pre-review.

State read on 2026-11-12 (main `1bcec4a4`): the twelve 1.1 configurations validate; nothing in them changes here.

Code, tests and the requirement only: no real-agent session (the tests run `configure` with the fake agent of
`test/support/configure-fixture.ts`), nothing spent.

## Acceptance criteria

<!-- Each red first: a failing test before the code; `acceptance` lists the scenarios as they are written. -->

1. **A leaking configuration is reported by the configure that wrote it** (red first, `scenarios.feature`): a
   session whose configuration holds an oracle literal of the version (more than one prose word, as bug-047 left the
   rule) ends with the configuration and its record written, the record's outcome `written`; `configure` prints the
   scan's findings (by file and source, never the literal) and exits 1. Today it exits 0.
2. **The same with the hold-out** (red first, acceptance or unit): when `BENCH_HOLDOUT_PATH` is set, a literal of a
   hold-out file is found the same way, named only by the hold-out file, as `scanConfiguringPrompt` does.
3. **Only the configured arm's findings** (red first, unit): a finding of another configuration of the version, or
   of the version's prompts or seed, does not fail this `configure`; a step prompt repeating a line of the
   configuration just written does (the check `scanScenario` already makes, REQ-FMT-08 as amended in 1.50).
4. **Characterization:** a clean configuration still exits 0 with today's output; a refused, killed, failed or
   interrupted session is not scanned (no configuration written), its exit code unchanged; task-141's and
   task-143's configure tests stay green unchanged.
5. `requirements.md` 1.57: REQ-CLI-14 amended (the scan after writing, exit 1 on a finding, files and record kept,
   `--replace` or a fix of the scan then the approver's choice). Checks green (prettier, tsc, eslint,
   `scripts/pre-review.sh main`); an independent review (dl-020); the full suites on the approver's go.

## Design

- `src/scenario/leak-scan.ts`: `scanScenario`'s findings already name their place (`arms.<configured>` for a
  configuration's file, `steps[i].prompt_file` with the configuration file's label for a repeated line). A small
  exported `scanConfiguration(scenario, declarations, configured, holdout?)` keeps the findings of that arm only, so
  the filter lives beside the scan, not in the runner.
- `src/runner/configure.ts`: after the reload it does already (`loadScenario`), when the outcome is `written` and the
  version loads, it runs `scanConfiguration` with the declarations and hold-out it loaded before the session; the
  findings go into the result (a `leakIssues` beside `loadIssues`). Nothing is removed: the configuration is the
  evidence, and REQ-FMT-04's freeze (first dry run) has not happened yet, so `--replace` remains possible.
- `src/cli/configure.ts`: prints the findings after the outcome and exits 1 when there are any, as it does for
  `loadIssues`.
- Rejected, fix 2 (scan before writing, outcome `refused`): it needs the configuration check split to run on files
  not on disk, and it would discard the evidence of a paid session.
- Tests: the fixture's fake agent writes a file with an S2 1.1 multi-word literal; the hold-out case uses a temporary
  hold-out directory (not the real one), with `BENCH_HOLDOUT_PATH` set only inside that test.

## Execution notes

- 2026-11-12: backlog → in-progress on main (`5da48de2`); worktree `../WingFoil2-Benchmark-wt/t145`.
- **Red first** (`7cf70ec0`): four unit tests of `scanConfiguration` in `test/unit/scenario/leak-scan.test.ts` (red:
  the function did not exist) and two acceptance tests in `test/acceptance/scenarios.test.ts`, through the CLI with
  the fake agent, S2@1.1's oracle literal and a temporary hold-out (red: `configure` exited 0); the two scenarios
  added to `scenarios.feature`.
- **The fix** (`25d720c5`): `scanConfiguration` in `src/scenario/leak-scan.ts`, a filter of `scanScenario`'s
  findings by the configured arm's place; `CheckedConfigure` carries the declarations and the hold-out's additions it
  already loaded; `store` scans after the reload, on `written` only; `src/cli/configure.ts` reports the findings and
  exits 1 after printing the outcome, the files, the record and the transcript. Requirements 1.57 (REQ-CLI-14).
- Targeted tests green: `test/acceptance/scenarios.test.ts`, `test/unit/scenario/`, `test/unit/cli/configure.test.ts`
  (379 passed, 10 skipped); tsc and eslint clean. The criterion 4 characterization is the existing configure tests,
  unchanged and green. Nothing spent; the twelve 1.1 configurations unchanged.

## Review
