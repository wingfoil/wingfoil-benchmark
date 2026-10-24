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

Read from `git show v0.3.0:src/agent/execute.ts`, `src/agent/launch.ts` and `docs/agents.md`, 2026-10-23:

- `agent execute` launches the agent only interactively; with the built-in adapters `--dry-run` also needs a terminal
  (the guide: "the built-in adapters refuse a dry run whose stdin or stdout is redirected"; WingFoil bug-392).
- `--dry-run` prints an `AgentLaunchPlan` whose `bootstrap` only points at the context (`Read the MCP resource
  "wingfoil://session/<role>/<element>/<sha>".`); "no CLI command prints the context itself".
- Launched by WingFoil, the agent's output goes to the caller's terminal (`stdio: 'inherit'`), not to a stream the
  caller can read; with the built-in `claude-code` adapter (`usage.from: none`) its tokens and cost are not recorded.
  Its exit status is handed back and recorded in the run log.

A benchmark runner that launches Claude Code itself reads its stream-json (tokens, cost, the models used, the
transcript) for every run; it cannot hand the launch to `agent execute` without losing that measurement.

## Expected

A headless `agent execute` (WingFoil dl-181) that hands the agent's output stream and its usage, tokens and cost, to
its caller (dl-182), with the built-in adapters, and a `--dry-run` that works without a terminal and can print the
resolved context, not only the pointer to it.