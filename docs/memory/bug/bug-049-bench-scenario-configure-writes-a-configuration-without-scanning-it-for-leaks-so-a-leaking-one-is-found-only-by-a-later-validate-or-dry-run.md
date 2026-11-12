---
id: bug-049-bench-scenario-configure-writes-a-configuration-without-scanning-it-for-leaks-so-a-leaking-one-is-found-only-by-a-later-validate-or-dry-run
type: bug
title: "bench scenario configure writes a configuration without scanning it for leaks, so a leaking one is found only by a later validate or dry run"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","configured","leak-scan"]
---

## Context

Offered as a follow-up of
[task-143](../task/task-143-w18-the-twelve-configurations-of-s1-s2-s3-and-s8-at-1.1.md)
(its review, 2026-11-09). `bench scenario configure` (REQ-CLI-14) runs the leak scan on the configuring prompt
before any session (`scanConfiguringPrompt`, REQ-FMT-08 as amended in 1.50), and checks the session's changes for
offences, the secrets among them, before writing (`offencesOf` in `src/runner/configure.ts`). The configuration it
then writes under `scenarios/<id>/<version>/arms/<arm>-configured/` is scanned only later, by `bench scenario
validate` or a dry run (`scanScenario`, whose configuration check searches every file for the oracle's literals and
the step prompts for the configuration's lines).

## Expected

`configure` runs the same configuration check on what it has just written, with the hold-out when one is set, as it
does for the prompt, and says the findings before it exits: a leaking configuration costs one session, not a late
discovery.

## Actual

`configure` exits 0 and prints "written" for a configuration that `bench scenario validate` then refuses. In
task-143, two of the twelve configurations (S2@1.1 and S8@1.1) held an ordinary word an oracle file quotes as a test
group's name; `configure` and `bench campaign validate` passed them, and the refusal surfaced only in the targeted
suites after pre-review, as
[bug-047](../bug/bug-047-the-leak-scan-refuses-a-configuration-that-uses-an-ordinary-word-the-oracle-quotes-such-as-a-test-group-s-name.md).
That case was the scan's own defect (fixed in 1.55), but a real leak would surface the same way: after the
session is paid for and its configuration written into the scenario.

## Fix (proposed, for the approver's choice)

1. **Recommended:** after writing, `configure` reloads the version (it does already) and runs `scanScenario` with
   the declarations and the hold-out it already holds, keeping only the findings of the arm it configured. On a
   finding it exits 1 and prints them (by file and source, never the literal); the configuration and its record stay
   written, the record's outcome unchanged, so the approver decides between `--replace` and a fix to the scan. A
   red acceptance test first: a session whose configuration quotes an oracle literal.
2. Or the same scan before writing, on the session's files in memory: a finding makes the outcome `refused`, nothing
   written but the record. Stricter, but it needs `scanScenario`'s configuration check split out to run on files
   that are not yet on disk.

No change to the 1.1 configurations: they validate today.
