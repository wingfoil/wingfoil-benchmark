---
id: bug-050-the-memory-cli-and-the-campaign-pins-lag-wingfoil-v0.3.2
type: bug
title: "The memory CLI and the campaign pins lag WingFoil v0.3.2"
status: pending
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","wingfoil","config"]
---

## Context

WingFoil v0.3.2 is the latest release (tag `v0.3.2`, 2026-11-02, 1093 commits after `v0.3.1`). The benchmark pins
older versions in two places: the memory CLI that runs every `wingfoil memory` command of this repository, the gates
included, and the harness the campaigns measure. Raised by the approver on 2026-11-16, to be fixed after W19's task D.

## Expected

The memory CLI is the latest release, and the next campaigns measure the `wingfoil` arm on it.

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

## Fix (proposed, for the approver's choice)

A task after W19's task D: the devDependency bumped to `npm:wingfoil@0.3.2` with its lockfile and checked with
`--version` and `--dry-run` commands; the `wingfoil` arm's manual and comments moved to v0.3.2 (an arm change with its
own digest, REQ-FMT-13, needing a dry run on the approver's consent); the pins moved in the next campaign files only;
the tests that treat 0.3.1 as the current WingFoil updated, the historical ones kept.
