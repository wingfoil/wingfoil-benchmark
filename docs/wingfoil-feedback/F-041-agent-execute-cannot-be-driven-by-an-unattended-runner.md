---
id: F-041
title: "agent execute cannot be driven by an unattended runner that must meter the agent"
kind: request
status: open
wingfoil_version: 0.3.0
answered_by: []
---

New note (task-100).

## Observed

Read from `git show v0.3.0:src/agent/execute.ts` and `docs/agents.md`, 2026-10-23:

- `agent execute` launches the agent only interactively; with the built-in adapters `--dry-run` also needs a terminal
  (the guide: "the built-in adapters refuse a dry run whose stdin or stdout is redirected"; WingFoil bug-392).
- `--dry-run` prints an `AgentLaunchPlan` whose `bootstrap` only points at the context ("Read the MCP resource
  `wingfoil://session/<role>/<element>/<sha>`"); "no CLI command prints the context itself".
- Launched by WingFoil, the agent's output stream, its token usage, its cost and its exit status are not handed back to
  whoever called `agent execute`.

A benchmark runner that launches Claude Code itself reads its stream-json (tokens, cost, the models used, the
transcript) for every run; it cannot hand the launch to `agent execute` without losing that measurement.

## Expected

A headless `agent execute` (WingFoil dl-181) that hands the agent's stream, its usage and its exit status to its
caller (dl-182), and a `--dry-run` that works without a terminal and can print the resolved context, not only the
pointer to it.
