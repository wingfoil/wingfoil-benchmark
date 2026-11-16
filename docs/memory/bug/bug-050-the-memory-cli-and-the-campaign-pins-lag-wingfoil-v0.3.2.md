---
id: bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2
type: bug
title: "The memory CLI and the campaign pins lag WingFoil v0.3.2"
status: fixed
fixed_by: task-152-align-the-benchmark-to-wingfoil-v0.3.2-the-memory-cli-the-wingfoil-arm-and-the-next-campaigns-pins
tags: ["v0.3","wingfoil","config"]
---

## Context

WingFoil v0.3.2 is the latest release (tag `v0.3.2`, 2026-11-02, 1093 commits after `v0.3.1`). The benchmark pins
older versions in two places: the memory CLI that runs every `wingfoil memory` command of this repository, the gates
included, and the harness the campaigns measure. Raised by the approver on 2026-11-16, to be fixed after W19's task D.

## Expected

The memory CLI is the latest release, and the next campaigns measure the `wingfoil` arm on it, with the agents at
their latest release too; a dry run prices a key only if it ran the agent version the campaign pins.

## Actual

- `package.json` pins the devDependency `"wingfoil": "npm:wingfoil@0.3.1"`.
- `harnesses.wingfoil.version` is `v0.3.1` in `campaigns/claude-step-a.yaml` and `claude-step-a.dry-run.yaml`, and
  `v0.3.0` in `campaigns/codex-terra-harness-vs-docs.yaml`, `codex-terra-harness-vs-docs-v2.yaml` and
  `codex-terra-harness-vs-docs.dry-run.yaml`. These campaigns have published executions: their pins stay as they ran.
- `arms/wingfoil/manual.md` says it follows WingFoil's guide for AI agents "release 0.3.1", and
  `arms/wingfoil/arm.yaml`'s comments name v0.3.1.

What v0.3.2 changes for the benchmark (its `CHANGELOG.md` and the diff `v0.3.1..v0.3.2`, read on 2026-11-16 in the
WingFoil clone, nothing written there):

- **Memory:** nothing to migrate ("Nothing needs migrating"). A `memory.yaml` type `path` that is absolute or holds
  `.` or `..`, or a malformed `id_pattern`, is now refused; this repository's are relative and well formed.
- **Commands:** `memory add/submit/approve/reject/amend`, `--set` and `--dry-run` keep their flags, output and exit
  codes; commands that take an element id also accept a short reference (`task-1`, a unique prefix), which this
  repository does not use. The exit codes that changed are of commands it does not run (`help help`,
  `directives list` without a `roles.yaml`, `agent list`).
- **Scaffold:** `wingfoil init --template Kanban`, which the arm's `setup.sh` runs, commits without ` (P5.1.1)`, shows
  commented `team.members` and `paths.health` examples in `dna.yaml`, and its `adr`, `bug`, `decision-log` and
  `tech-spec` templates carry `contributor`, `credit` and `reported_by`, the `release` template `backlog_committed`,
  `waves` and a `## Scope changes` table: an agent on v0.3.2 reads another scaffold than on v0.3.1.
- **MCP server:** the same Resources and Tools; configuration errors name the file relative to the project, and
  `wingfoil://memory/{type}` warns only about that type's unreadable files. `arms/wingfoil/mcp.json` is unchanged.

**Added on 2026-11-16 (the approver's decision to refresh every pin before W19's dry runs):**

- **The agent pins lag too:** `agent.version` is `2.1.300` for Claude Code (pinned 2026-10-21, task-096) in
  `scenarios/dry-run.yaml`, its `review_loop` reviewer and the presets, while npm's latest is 2.1.325 (2026-11-13);
  Codex is pinned at 0.162.1 (2026-10-15, task-094), latest 0.169.0.
- **A step's dry run is matched without its agent's version:** `findDryRuns` (`src/results/dry-runs.ts`) compares the
  scenario's hash, arm, model, effort, arm digest and harness pin, and records `agent.version` without comparing it,
  while `findLoopDryRuns` requires the reviewer's. A dry run of another agent release would price a campaign's steps as
  if it were the same measure.

## Fix (proposed, for the approver's choice)

A task after W19's task D: the devDependency bumped to `npm:wingfoil@0.3.2` with its lockfile and checked with
`--version` and `--dry-run` commands; the `wingfoil` arm's manual and comments moved to v0.3.2 (an arm change with its
own digest, REQ-FMT-13, needing a dry run on the approver's consent); the pins moved in the next campaign files only;
the tests that treat 0.3.1 as the current WingFoil updated, the historical ones kept.
Widened on 2026-11-16: the same task moves the agents to their latest release (Codex only if it runs again) and makes
the agent's version part of a step key's match (REQ-CLI-02 amended), so that W19's dry runs run once, on the refreshed
pins.

**Narrowed on 2026-11-16 (the approver's decision, option 1):** v0.3's measured pins are frozen (the `wingfoil` arm on
WingFoil v0.3.1, Claude Code 2.1.300, Codex 0.162.1), since moving them within v0.3 needs v0.3.2's admission, the
configured variants re-run, REQ-RUN-20's and plan-005's pins amended, and would confound comparisons with v0.3's
published campaigns. Task-152 fixes the memory CLI's lag and the agent version's missing match; the measured pins'
lag is fixed at v0.4's start by the pin refresh task-152 files, so this bug goes to `fixed` with task-152 for what it
fixes and names that refresh for the rest.
