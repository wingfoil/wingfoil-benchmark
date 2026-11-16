---
id: task-152-align-the-benchmark-to-wingfoil-v0.3.2-the-memory-cli-the-wingfoil-arm-and-the-next-campaigns-pins
type: task
title: "Align the benchmark to WingFoil v0.3.2: the memory CLI, the wingfoil arm and the next campaigns' pins"
status: pending
release: v0.3
wave: maintenance
features: []
acceptance: []
requirements: [REQ-FMT-01, REQ-FMT-05, REQ-FMT-13, REQ-CLI-02, REQ-CLI-05, REQ-RUN-16]
fixes: [bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2]
tags: ["v0.3","wingfoil","config"]
---

## Context

Fixes [bug-050](../bug/bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2.md): the memory CLI is
pinned to WingFoil 0.3.1 and the `wingfoil` arm's manual names 0.3.1, while v0.3.2 is released (2026-11-02). The bug
records what v0.3.2 changes for the benchmark: nothing to migrate in `.wingfoil/`, the commands this repository runs
unchanged, another `init` scaffold for the arm, the MCP server's surface unchanged. A configuration change, so through
a bug and a task, never straight to main.

**Widened on 2026-11-16 (the approver's decision) to one pin refresh before W19's dry runs.** Bug-050 also records
that the agent pins lag (Claude Code 2.1.300, latest 2.1.325; Codex 0.162.1, latest 0.169.0) and that a step's dry run
is matched without its agent's version. W19's eight loop dry runs
([task-151](task-151-w19-the-review-loop-in-the-estimate-and-its-dry-runs-task-d.md)'s criterion 7) wait for this task:
run on today's pins, the `wingfoil` ones would be skipped after the harness and the arm move, and every loop would
miss the reviewer's agent pin. **When:** now, after task-151's merge (`a0132a52`) and before its dry runs; task-151
stays approved meanwhile.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

1. **The memory CLI** (characterization): the devDependency is `npm:wingfoil@0.3.2`, installed with `npm install` and
   its lockfile committed; `npx --no-install wingfoil --version` says 0.3.2; a `memory add --dry-run` and a
   `memory submit --dry-run` on a throwaway element read the committed `memory.yaml` and the existing elements
   unchanged, and write nothing. `.wingfoil/` is migrated only if the changelog requires it (it does not, per bug-050).
2. **The `wingfoil` arm** (red first where a test reads the arm): `arms/wingfoil/manual.md` follows WingFoil's guide
   for AI agents at 0.3.2 and `arm.yaml`'s comments name 0.3.2, after reading what the 0.3.2 guide and the `init`
   scaffold change for the arm's departures; the arm's new digest (REQ-FMT-13) recorded; a dry run of the arm on 0.3.2
   proposed with its upper bound and run only on the approver's spending consent.
3. **The campaign pins:** no campaign file with a published execution is edited; `harnesses.wingfoil.version: v0.3.2`
   goes into the next campaign files only (W19's loop campaigns from task D on, extending the presets per dl-022),
   and the dry-run profile's `harnesses.wingfoil` moves to v0.3.2 with them.
4. **Tests and fixtures:** those that treat 0.3.1 as the current WingFoil follow 0.3.2 (the manual's text test among
   them); those that pin a historical release on purpose (v0.2.2, v0.3.0, v0.3.1 in published campaigns and the
   errata) are left alone.
5. **The agent pins:** Claude Code moves to the latest release (2.1.325 when filed, the latest at the time of the work
   if newer, its changelog read from 2.1.300 for what touches the runner: the stream-JSON events, `modelUsage`, the
   result event, the flags the runner passes, the limit messages) in the dry-run profile, the review loop's reviewer
   pin, the presets the next campaign files extend and the agent image; the runner's parsing checked against a
   recorded session of the new version (red first where a fixture changes). No campaign file with a published
   execution is edited. Codex 0.169.0 only if the approver wants Codex to run again (its subscription ended
   2026-11-13): otherwise its pin stays and the choice is recorded here.
6. **The agent's version in the step key** (unit, red first; REQ-CLI-02 amended, the text proposed to the approver
   with the change): a step's dry run counts for a key only if it ran the campaign's agent at the pinned version (its
   recorded `agent.version`), as the loop's pins already require; otherwise the estimate names the dry run skipped
   and why. A dry run stored without an agent version counts, as one stored without an arm digest does.
7. Checks: prettier, tsc, `scripts/pre-review.sh main`; an independent read-only review (dl-020); the full suites on
   the approver's go.

## Design

- One worktree under `../WingFoil2-Benchmark-wt/`, no `node_modules` symlink; nothing written in the WingFoil clone.
- The pin refresh spends nothing by itself. The only spending it leads to is the dry runs on the refreshed pins: the
  `wingfoil` arm's (criterion 2) and W19's eight loop dry runs (task-151's criterion 7, S1, S2, S3 and S8 at 1.1 in
  `baseline` and `wingfoil` on `claude-sonnet-5-5`), proposed together after the merge with their upper bounds, and
  run only on the approver's spending consent.
- Then task-151's figures note and W19's "Ends with" close W19, and task-151 goes to done.

## Follow-up requested by the approver (2026-11-16)

A configuration that **watches WingFoil's releases**, and the agents' (Claude Code, Codex) as well (added 2026-11-16):
on a new release it updates the pins (the memory CLI, the `wingfoil` arm's harness pin, the agent pins in the next
campaign files and the dry-run profile) and prepares a **full campaign for a
major release, a partial one for a minor**, as the approver's `templates` project does to update the versions of its
packs. The campaigns it prepares still need the approver's spending consent before any session (the benchmark's
spending rule). Filed as its own element (a decision-log or a task, the approver's choice) once this task is done: it
is not built here.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
